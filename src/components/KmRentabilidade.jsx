import { useState, useEffect, useMemo } from "react";
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ReferenceLine,
  ResponsiveContainer,
  BarChart,
  Bar,
  Cell,
} from "recharts";
import { TrendingUp, AlertCircle, CheckCircle, Calendar, ChevronLeft, ChevronRight } from "lucide-react";

// ─── Constantes do modelo de negócio ───────────────────────────────────────
const RENDA_SEMANAL = 350;
const KM_BASE = 2000;
const TAXA_ADICIONAL = 0.25;
const RECEITA_POR_KM = 0.50;
const CUSTO_BASE_POR_KM = RENDA_SEMANAL / KM_BASE; // 0.175€

// ─── Helpers ───────────────────────────────────────────────────────────────
function getWeekBounds(offset = 0) {
  const now = new Date();
  const day = now.getDay(); // 0=Dom, 1=Seg...
  const diffToMonday = (day === 0 ? -6 : 1 - day);
  const monday = new Date(now);
  monday.setDate(now.getDate() + diffToMonday + offset * 7);
  monday.setHours(0, 0, 0, 0);
  const sunday = new Date(monday);
  sunday.setDate(monday.getDate() + 6);
  sunday.setHours(23, 59, 59, 999);
  return { monday, sunday };
}

function formatDate(d) {
  return d.toLocaleDateString("pt-PT", { day: "2-digit", month: "2-digit" });
}

function formatEuro(v) {
  return v.toLocaleString("pt-PT", { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + "€";
}

function calcularMetricas(kmTotal) {
  const kmExtra = Math.max(0, kmTotal - KM_BASE);
  const sobretaxa = kmExtra * TAXA_ADICIONAL;
  const custoTotal = RENDA_SEMANAL + sobretaxa;
  const receita = kmTotal * RECEITA_POR_KM;
  const lucro = receita - custoTotal;
  const margem = kmTotal > 0 ? (lucro / receita) * 100 : 0;
  const custoPorKm = kmTotal > 0 ? custoTotal / kmTotal : CUSTO_BASE_POR_KM;
  const lucroExtra = kmExtra * (RECEITA_POR_KM - TAXA_ADICIONAL);
  return { kmExtra, sobretaxa, custoTotal, receita, lucro, margem, custoPorKm, lucroExtra };
}

// ─── Dados simulados para semanas anteriores (substituir por Firestore) ────
function gerarDadosSimulados(weekOffset) {
  // Em produção: ler shiftLogs do Firestore filtrados por date entre monday e sunday
  // Aqui geramos dados plausíveis baseados no offset
  const seed = Math.abs(weekOffset) * 17 + 42;
  const dias = ["Seg", "Ter", "Qua", "Qui", "Sex", "Sáb", "Dom"];
  return dias.map((dia, i) => {
    const isFolga = i === 0 && weekOffset < 0; // segunda é folga em semanas passadas
    const base = isFolga ? 0 : 200 + ((seed * (i + 1)) % 180);
    return { dia, km: Math.round(base) };
  });
}

// ─── Componente principal ──────────────────────────────────────────────────
export default function KmRentabilidade() {
  const [weekOffset, setWeekOffset] = useState(0);
  const [dadosDiarios, setDadosDiarios] = useState([]);
  const [loading, setLoading] = useState(true);

  const { monday, sunday } = useMemo(() => getWeekBounds(weekOffset), [weekOffset]);
  const isCurrentWeek = weekOffset === 0;

  // Simular carregamento de dados (em produção: Firestore query)
  useEffect(() => {
    setLoading(true);
    const timer = setTimeout(() => {
      setDadosDiarios(gerarDadosSimulados(weekOffset));
      setLoading(false);
    }, 400);
    return () => clearTimeout(timer);
  }, [weekOffset]);

  const kmTotal = useMemo(() => dadosDiarios.reduce((s, d) => s + d.km, 0), [dadosDiarios]);
  const metricas = useMemo(() => calcularMetricas(kmTotal), [kmTotal]);

  // Dados para o gráfico de evolução acumulada
  const dadosAcumulados = useMemo(() => {
    let acc = 0;
    return dadosDiarios.map((d) => {
      acc += d.km;
      const m = calcularMetricas(acc);
      return {
        dia: d.dia,
        km: acc,
        lucro: parseFloat(m.lucro.toFixed(2)),
        margem: parseFloat(m.margem.toFixed(1)),
        dentroBase: Math.min(acc, KM_BASE),
        extra: Math.max(0, acc - KM_BASE),
      };
    });
  }, [dadosDiarios]);

  // Projeção para semana atual
  const diasDecorridos = useMemo(() => {
    if (!isCurrentWeek) return 7;
    const hoje = new Date();
    const day = hoje.getDay();
    return day === 0 ? 7 : day;
  }, [isCurrentWeek]);

  const projecaoFinal = useMemo(() => {
    if (!isCurrentWeek || diasDecorridos === 0) return null;
    const kmPorDia = kmTotal / diasDecorridos;
    const kmProjetado = Math.round(kmPorDia * 7);
    return calcularMetricas(kmProjetado);
  }, [kmTotal, diasDecorridos, isCurrentWeek]);

  const statusColor =
    kmTotal >= KM_BASE ? "#10b981" : kmTotal >= KM_BASE * 0.75 ? "#f59e0b" : "#6366f1";

  return (
    <div className="min-h-screen bg-gray-950 text-gray-100 p-4 md:p-8">
      {/* ── Cabeçalho da página ── */}
      <div className="mb-8">
        <p className="text-xs font-mono tracking-widest text-indigo-400 uppercase mb-1">
          Análise de Rentabilidade
        </p>
        <h1 className="text-3xl font-bold text-white">Quilómetros & Margem</h1>
        <p className="text-gray-400 mt-1 text-sm">
          Modelo: renda 350€/sem · limiar 2.000 km · +0,25€/km extra · receita 0,50€/km
        </p>
      </div>

      {/* ── Seletor de semana ── */}
      <div className="flex items-center gap-3 mb-8 bg-gray-900 rounded-xl p-3 w-fit border border-gray-800">
        <button
          onClick={() => setWeekOffset((o) => o - 1)}
          className="p-1.5 rounded-lg hover:bg-gray-700 transition-colors text-gray-300"
        >
          <ChevronLeft size={18} />
        </button>
        <div className="flex items-center gap-2 min-w-[200px] justify-center">
          <Calendar size={15} className="text-indigo-400" />
          <span className="text-sm font-medium">
            {isCurrentWeek ? (
              <span className="text-indigo-300 font-semibold">Semana atual</span>
            ) : (
              <span className="text-gray-300">
                {formatDate(monday)} – {formatDate(sunday)}
              </span>
            )}
          </span>
        </div>
        <button
          onClick={() => setWeekOffset((o) => Math.min(0, o + 1))}
          disabled={isCurrentWeek}
          className="p-1.5 rounded-lg hover:bg-gray-700 transition-colors text-gray-300 disabled:opacity-30 disabled:cursor-not-allowed"
        >
          <ChevronRight size={18} />
        </button>
      </div>

      {loading ? (
        <div className="flex items-center justify-center h-64">
          <div className="w-8 h-8 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin" />
        </div>
      ) : (
        <>
          {/* ── KPIs principais ── */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
            <KpiCard
              label="Total km"
              value={`${kmTotal.toLocaleString("pt-PT")} km`}
              sub={`Limiar: ${KM_BASE.toLocaleString("pt-PT")} km`}
              accent={statusColor}
              icon={
                kmTotal >= KM_BASE ? (
                  <CheckCircle size={16} className="text-emerald-400" />
                ) : (
                  <AlertCircle size={16} className="text-amber-400" />
                )
              }
            />
            <KpiCard
              label="Km extra"
              value={`${metricas.kmExtra.toLocaleString("pt-PT")} km`}
              sub={metricas.kmExtra > 0 ? `Sobretaxa: ${formatEuro(metricas.sobretaxa)}` : "Dentro da renda"}
              accent={metricas.kmExtra > 0 ? "#10b981" : "#6366f1"}
            />
            <KpiCard
              label="Lucro líquido"
              value={formatEuro(metricas.lucro)}
              sub={`Receita: ${formatEuro(metricas.receita)}`}
              accent="#10b981"
            />
            <KpiCard
              label="Margem"
              value={`${metricas.margem.toFixed(1)}%`}
              sub={`Custo/km: ${metricas.custoPorKm.toFixed(3)}€`}
              accent={metricas.margem > 40 ? "#10b981" : "#f59e0b"}
            />
          </div>

          {/* ── Projeção (só semana atual) ── */}
          {isCurrentWeek && projecaoFinal && diasDecorridos < 7 && (
            <div className="bg-indigo-950 border border-indigo-800 rounded-xl p-4 mb-6 flex flex-wrap gap-6 items-center">
              <div>
                <p className="text-xs text-indigo-300 font-mono uppercase tracking-wider mb-1">
                  Projeção ao fim da semana
                </p>
                <p className="text-2xl font-bold text-indigo-100">
                  ~{Math.round((kmTotal / diasDecorridos) * 7).toLocaleString("pt-PT")} km
                </p>
              </div>
              <div className="h-10 w-px bg-indigo-800 hidden md:block" />
              <div>
                <p className="text-xs text-indigo-300 font-mono uppercase tracking-wider mb-1">Lucro projetado</p>
                <p className="text-2xl font-bold text-emerald-300">{formatEuro(projecaoFinal.lucro)}</p>
              </div>
              <div className="h-10 w-px bg-indigo-800 hidden md:block" />
              <div>
                <p className="text-xs text-indigo-300 font-mono uppercase tracking-wider mb-1">Km/dia necessários</p>
                <p className="text-2xl font-bold text-indigo-100">
                  {Math.ceil(Math.max(0, KM_BASE - kmTotal) / Math.max(1, 7 - diasDecorridos))} km
                </p>
                <p className="text-xs text-indigo-400">para atingir os 2.000 km</p>
              </div>
            </div>
          )}

          {/* ── Gráficos ── */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
            {/* Km acumulados por dia */}
            <div className="bg-gray-900 rounded-xl p-5 border border-gray-800">
              <h2 className="text-sm font-semibold text-gray-300 mb-4">Km acumulados na semana</h2>
              <ResponsiveContainer width="100%" height={220}>
                <AreaChart data={dadosAcumulados} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
                  <defs>
                    <linearGradient id="gradBase" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#6366f1" stopOpacity={0.3} />
                      <stop offset="95%" stopColor="#6366f1" stopOpacity={0} />
                    </linearGradient>
                    <linearGradient id="gradExtra" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#10b981" stopOpacity={0.4} />
                      <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#1f2937" />
                  <XAxis dataKey="dia" tick={{ fontSize: 11, fill: "#9ca3af" }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fontSize: 11, fill: "#9ca3af" }} axisLine={false} tickLine={false} />
                  <Tooltip
                    contentStyle={{ background: "#111827", border: "1px solid #374151", borderRadius: 8, fontSize: 12 }}
                    formatter={(v, n) => [
                      `${v.toLocaleString("pt-PT")} km`,
                      n === "km" ? "Total acumulado" : n,
                    ]}
                  />
                  <ReferenceLine y={KM_BASE} stroke="#f59e0b" strokeDasharray="4 4" label={{ value: "2.000 km", fill: "#f59e0b", fontSize: 10, position: "insideTopRight" }} />
                  <Area type="monotone" dataKey="km" stroke="#6366f1" strokeWidth={2} fill="url(#gradBase)" dot={false} />
                </AreaChart>
              </ResponsiveContainer>
            </div>

            {/* Lucro diário */}
            <div className="bg-gray-900 rounded-xl p-5 border border-gray-800">
              <h2 className="text-sm font-semibold text-gray-300 mb-4">Lucro acumulado na semana</h2>
              <ResponsiveContainer width="100%" height={220}>
                <AreaChart data={dadosAcumulados} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
                  <defs>
                    <linearGradient id="gradLucro" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#10b981" stopOpacity={0.3} />
                      <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#1f2937" />
                  <XAxis dataKey="dia" tick={{ fontSize: 11, fill: "#9ca3af" }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fontSize: 11, fill: "#9ca3af" }} axisLine={false} tickLine={false} tickFormatter={(v) => `${v}€`} />
                  <Tooltip
                    contentStyle={{ background: "#111827", border: "1px solid #374151", borderRadius: 8, fontSize: 12 }}
                    formatter={(v) => [`${formatEuro(v)}`, "Lucro acumulado"]}
                  />
                  <Area type="monotone" dataKey="lucro" stroke="#10b981" strokeWidth={2} fill="url(#gradLucro)" dot={false} />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* ── Detalhe diário ── */}
          <div className="bg-gray-900 rounded-xl p-5 border border-gray-800 mb-6">
            <h2 className="text-sm font-semibold text-gray-300 mb-4">Detalhe por dia</h2>
            <ResponsiveContainer width="100%" height={180}>
              <BarChart data={dadosDiarios} margin={{ top: 5, right: 10, left: -10, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#1f2937" />
                <XAxis dataKey="dia" tick={{ fontSize: 11, fill: "#9ca3af" }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 11, fill: "#9ca3af" }} axisLine={false} tickLine={false} />
                <Tooltip
                  contentStyle={{ background: "#111827", border: "1px solid #374151", borderRadius: 8, fontSize: 12 }}
                  formatter={(v) => [`${v} km`, "Km rodados"]}
                />
                <Bar dataKey="km" radius={[4, 4, 0, 0]}>
                  {dadosDiarios.map((d, i) => (
                    <Cell key={i} fill={d.km === 0 ? "#374151" : "#6366f1"} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>

          {/* ── Tabela de sensibilidade ── */}
          <div className="bg-gray-900 rounded-xl p-5 border border-gray-800">
            <h2 className="text-sm font-semibold text-gray-300 mb-4">
              Tabela de sensibilidade — lucro por volume semanal
            </h2>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-left border-b border-gray-800">
                    <th className="pb-2 pr-4 font-medium text-gray-400">Km/semana</th>
                    <th className="pb-2 pr-4 font-medium text-gray-400">Km extra</th>
                    <th className="pb-2 pr-4 font-medium text-gray-400">Sobretaxa</th>
                    <th className="pb-2 pr-4 font-medium text-gray-400">Receita</th>
                    <th className="pb-2 pr-4 font-medium text-gray-400">Lucro líquido</th>
                    <th className="pb-2 font-medium text-gray-400">Margem</th>
                  </tr>
                </thead>
                <tbody>
                  {[1500, 1800, 2000, 2200, 2500, 2800, 3000, 3500].map((km) => {
                    const m = calcularMetricas(km);
                    const isAtual = Math.abs(km - kmTotal) < 150;
                    return (
                      <tr
                        key={km}
                        className={`border-b border-gray-800/50 ${isAtual ? "bg-indigo-950/50" : ""}`}
                      >
                        <td className="py-2 pr-4 font-mono font-semibold text-white">
                          {km.toLocaleString("pt-PT")}
                          {isAtual && (
                            <span className="ml-2 text-[10px] bg-indigo-700 text-indigo-200 px-1.5 py-0.5 rounded">
                              atual
                            </span>
                          )}
                        </td>
                        <td className="py-2 pr-4 font-mono text-gray-300">
                          {m.kmExtra > 0 ? `+${m.kmExtra.toLocaleString("pt-PT")}` : "—"}
                        </td>
                        <td className="py-2 pr-4 font-mono text-amber-400">
                          {m.sobretaxa > 0 ? formatEuro(m.sobretaxa) : "—"}
                        </td>
                        <td className="py-2 pr-4 font-mono text-gray-300">{formatEuro(m.receita)}</td>
                        <td className="py-2 pr-4 font-mono font-bold text-emerald-400">
                          {formatEuro(m.lucro)}
                        </td>
                        <td className="py-2 font-mono text-gray-300">{m.margem.toFixed(1)}%</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
            <p className="text-xs text-gray-500 mt-3">
              A margem por km adicional (0,25€) é sempre positiva — não existe ponto de indiferença.
              O limite é a capacidade operacional, não a rentabilidade.
            </p>
          </div>
        </>
      )}
    </div>
  );
}

// ─── Sub-componente KPI ────────────────────────────────────────────────────
function KpiCard({ label, value, sub, accent, icon }) {
  return (
    <div
      className="bg-gray-900 rounded-xl p-4 border border-gray-800 relative overflow-hidden"
      style={{ borderLeftColor: accent, borderLeftWidth: 3 }}
    >
      <div className="flex items-center justify-between mb-1">
        <p className="text-xs font-mono text-gray-400 uppercase tracking-wider">{label}</p>
        {icon}
      </div>
      <p className="text-2xl font-bold text-white mb-0.5">{value}</p>
      <p className="text-xs text-gray-500">{sub}</p>
    </div>
  );
}
