// src/components/KmRentabilidade.tsx
import React, { useState, useMemo } from "react";
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
  Legend,
} from "recharts";
import {
  AlertCircle,
  CheckCircle,
  Calendar,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import { useTVDE } from "../contexts/TVDEContext";

// \u2500\u2500\u2500 Constantes do modelo de neg\u00F3cio \u2500\u2500\u2500
const RENDA_SEMANAL = 350;
const KM_BASE = 2000;
const TAXA_ADICIONAL = 0.25; // \u20AC/km acima dos 2.000 km

// \u2500\u2500\u2500 Helpers \u2500\u2500\u2500
function getWeekBounds(offset = 0) {
  const now = new Date();
  const day = now.getDay(); // 0=Dom, 1=Seg...
  // Semana operacional: Seg \u2192 Dom
  // Se hoje \u00E9 domingo (day=0), recuar 6 dias para a segunda anterior
  const diffToMonday = day === 0 ? -6 : 1 - day;
  const monday = new Date(now);
  monday.setDate(now.getDate() + diffToMonday + offset * 7);
  monday.setHours(0, 0, 0, 0);
  const sunday = new Date(monday);
  sunday.setDate(monday.getDate() + 6);
  sunday.setHours(23, 59, 59, 999);
  return { monday, sunday };
}

function toDateStr(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function formatDate(d: Date) {
  return d.toLocaleDateString("pt-PT", { day: "2-digit", month: "2-digit" });
}

function formatEuro(v: number) {
  return (
    v.toLocaleString("pt-PT", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }) + "\u20AC"
  );
}

// Custo real da semana: renda efectivamente paga (dos shiftLogs) + sobretaxa
function calcularCustoReal(kmTotal: number, rendaReal: number) {
  const kmExtra = Math.max(0, kmTotal - KM_BASE);
  const sobretaxa = kmExtra * TAXA_ADICIONAL;
  const custoTotal = rendaReal + sobretaxa;
  return { kmExtra, sobretaxa, custoTotal };
}

// Custo para tabela de sensibilidade: assume renda contratual fixa (350\u20AC/sem)
function calcularCustoSemanal(kmTotal: number) {
  const kmExtra = Math.max(0, kmTotal - KM_BASE);
  const sobretaxa = kmExtra * TAXA_ADICIONAL;
  const custoTotal = RENDA_SEMANAL + sobretaxa;
  return { kmExtra, sobretaxa, custoTotal };
}

// Para a tabela de sensibilidade usamos receita estimada (0,35\u20AC/km \u2014 valor ilustrativo)
const RECEITA_ESTIMADA_POR_KM = 0.35;

function calcularMetricasTabela(kmTotal: number) {
  const { kmExtra, sobretaxa, custoTotal } = calcularCustoSemanal(kmTotal);
  const receita = kmTotal * RECEITA_ESTIMADA_POR_KM;
  const lucro = receita - custoTotal;
  const margem = receita > 0 ? (lucro / receita) * 100 : 0;
  const custoPorKm = kmTotal > 0 ? custoTotal / kmTotal : RENDA_SEMANAL / KM_BASE;
  return { kmExtra, sobretaxa, custoTotal, receita, lucro, margem, custoPorKm };
}

const DIAS_SEMANA = ["Seg", "Ter", "Qua", "Qui", "Sex", "S\u00E1b", "Dom"];

// \u2500\u2500\u2500 Componente principal \u2500\u2500\u2500
export function KmRentabilidade() {
  const { shiftLogs } = useTVDE();
  const [weekOffset, setWeekOffset] = useState(0);

  const { monday, sunday } = useMemo(
    () => getWeekBounds(weekOffset),
    [weekOffset]
  );
  const isCurrentWeek = weekOffset === 0;

  const mondayStr = useMemo(() => toDateStr(monday), [monday]);
  const sundayStr = useMemo(() => toDateStr(sunday), [sunday]);

  // Filtrar shiftLogs da semana seleccionada e agrupar por dia da semana
  const dadosDiarios = useMemo(() => {
    const shiftsNaSemana = shiftLogs.filter(
      (s) => s.date >= mondayStr && s.date <= sundayStr
    );

    // Construir array de 7 dias (Seg\u2192Dom) com km e receita reais
    return DIAS_SEMANA.map((dia, i) => {
      const diaDate = new Date(monday);
      diaDate.setDate(monday.getDate() + i);
      const diaStr = toDateStr(diaDate);

      const shiftsNoDia = shiftsNaSemana.filter((s) => s.date === diaStr);
      const km = shiftsNoDia.reduce((acc, s) => acc + s.kilometers, 0);
      const receita = shiftsNoDia.reduce((acc, s) => acc + s.grossEarnings, 0);
      const renda = shiftsNoDia.reduce((acc, s) => acc + (s.rentalExpenseAmount || 0), 0);
      const horas = shiftsNoDia.reduce((acc, s) => acc + (s.hoursWorked || 0), 0);

      return { dia, km, receita, renda, horas };
    });
  }, [shiftLogs, mondayStr, sundayStr, monday]);

  const kmTotal = useMemo(
    () => dadosDiarios.reduce((s, d) => s + d.km, 0),
    [dadosDiarios]
  );
  const receitaTotal = useMemo(
    () => dadosDiarios.reduce((s, d) => s + d.receita, 0),
    [dadosDiarios]
  );
  const rendaTotal = useMemo(
    () => dadosDiarios.reduce((s, d) => s + d.renda, 0),
    [dadosDiarios]
  );

  const { kmExtra, sobretaxa, custoTotal } = useMemo(
    () => calcularCustoReal(kmTotal, rendaTotal),
    [kmTotal, rendaTotal]
  );

  const lucroReal = receitaTotal - custoTotal;
  const margemReal = receitaTotal > 0 ? (lucroReal / receitaTotal) * 100 : 0;
  const custoPorKm = kmTotal > 0 ? custoTotal / kmTotal : rendaTotal > 0 ? rendaTotal / KM_BASE : RENDA_SEMANAL / KM_BASE;
  const receitaPorKm = kmTotal > 0 ? receitaTotal / kmTotal : 0;

  const horasTotal = useMemo(
    () => dadosDiarios.reduce((s, d) => s + (d.horas || 0), 0),
    [dadosDiarios]
  );
  const rendimentoHorario = horasTotal > 0 ? lucroReal / horasTotal : 0;

  // Dados acumulados para os gr\u00E1ficos
  const dadosAcumulados = useMemo(() => {
    let accKm = 0;
    let accReceita = 0;
    let accRenda = 0;
    return dadosDiarios.map((d) => {
      accKm += d.km;
      accReceita += d.receita;
      accRenda += d.renda;
      const { custoTotal: custoAcc } = calcularCustoReal(accKm, accRenda);
      const lucroAcc = accReceita - custoAcc;
      const margemAcc = accReceita > 0 ? (lucroAcc / accReceita) * 100 : 0;
      return {
        dia: d.dia,
        km: accKm,
        lucro: parseFloat(lucroAcc.toFixed(2)),
        margem: parseFloat(margemAcc.toFixed(1)),
      };
    });
  }, [dadosDiarios]);

  // Projec\u00E7\u00E3o para semana actual
  const diasDecorridos = useMemo(() => {
    if (!isCurrentWeek) return 7;
    const hoje = new Date();
    const day = hoje.getDay(); // 0=Dom, 1=Seg...
    // Seg=1, Ter=2, ..., S\u00E1b=6, Dom=7
    return day === 0 ? 7 : day;
  }, [isCurrentWeek]);

  const projecao = useMemo(() => {
    if (!isCurrentWeek || diasDecorridos === 0 || kmTotal === 0) return null;
    const kmPorDia = kmTotal / diasDecorridos;
    const receitaPorDia = receitaTotal / diasDecorridos;
    const kmProjetado = Math.round(kmPorDia * 7);
    const receitaProjetada = receitaPorDia * 7;
    const { custoTotal: custoProj } = calcularCustoSemanal(kmProjetado);
    return {
      kmProjetado,
      lucro: receitaProjetada - custoProj,
      kmFaltam: Math.ceil(
        Math.max(0, KM_BASE - kmTotal) / Math.max(1, 7 - diasDecorridos)
      ),
    };
  }, [kmTotal, receitaTotal, diasDecorridos, isCurrentWeek]);

  const statusColor =
    kmTotal >= KM_BASE
      ? "#10b981"
      : kmTotal >= KM_BASE * 0.75
      ? "#f59e0b"
      : "#6366f1";

  const temDados = kmTotal > 0 || rendaTotal > 0;
  const apenasDesp = kmTotal === 0 && rendaTotal > 0;

  return (
    <div className="min-h-screen bg-gray-950 text-gray-100 p-4 md:p-8">
      {/* \u2500\u2500 Cabe\u00E7alho \u2500\u2500 */}
      <div className="mb-8">
        <p className="text-xs font-mono tracking-widest text-indigo-400 uppercase mb-1">
          An\u00E1lise de Rentabilidade
        </p>
        <h1 className="text-3xl font-bold text-white">Quil\u00F3metros & Margem</h1>
        <p className="text-gray-400 mt-1 text-sm">
          Modelo: renda 350\u20AC/sem \u00B7 limiar 2.000 km \u00B7 sobretaxa +0,25\u20AC/km acima do limite \u00B7 semana Seg\u2013Dom
        </p>
      </div>

      {/* \u2500\u2500 Seletor de semana \u2500\u2500 */}
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
              <span className="text-indigo-300 font-semibold">Semana actual</span>
            ) : (
              <span className="text-gray-300">
                {formatDate(monday)} \u2013 {formatDate(sunday)}
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

      {/* \u2500\u2500 Sem dados \u2500\u2500 */}
      {!temDados ? (
        <div className="flex flex-col items-center justify-center h-64 text-gray-500">
          <AlertCircle size={40} className="mb-3 text-gray-700" />
          <p className="text-sm">Sem turnos registados para esta semana.</p>
        </div>
      ) : (
        <>
          {/* \u2500\u2500 KPIs \u2500\u2500 */}
          <div className="grid grid-cols-2 md:grid-cols-5 gap-3 mb-6">
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
              value={`${kmExtra.toLocaleString("pt-PT")} km`}
              sub={
                kmExtra > 0
                  ? `Sobretaxa: ${formatEuro(sobretaxa)}`
                  : "Dentro da renda"
              }
              accent={kmExtra > 0 ? "#10b981" : "#6366f1"}
            />
            <KpiCard
              label="Lucro l\u00EDquido"
              value={formatEuro(lucroReal)}
              sub={`Receita: ${formatEuro(receitaTotal)}`}
              accent={lucroReal >= 0 ? "#10b981" : "#ef4444"}
            />
            <KpiCard
              label="Margem"
              value={`${margemReal.toFixed(1)}%`}
              sub={`Custo/km: ${custoPorKm.toFixed(3)}\u20AC \u00B7 Rec/km: ${receitaPorKm.toFixed(3)}\u20AC`}
              accent={margemReal > 40 ? "#10b981" : "#f59e0b"}
            />
            <KpiCard
              label="Rendimento/hora"
              value={horasTotal > 0 ? `${rendimentoHorario.toFixed(2)}\u20AC/h` : "\u2014"}
              sub={horasTotal > 0 ? `${horasTotal.toFixed(1)}h trabalhadas` : "Sem horas registadas"}
              accent={rendimentoHorario >= 10 ? "#10b981" : rendimentoHorario >= 0 ? "#f59e0b" : "#ef4444"}
            />
          </div>

          {/* \u2500\u2500 Projec\u00E7\u00E3o (s\u00F3 semana actual com dados parciais) \u2500\u2500 */}
          {isCurrentWeek && projecao && diasDecorridos < 7 && (
            <div className="bg-indigo-950 border border-indigo-800 rounded-xl p-4 mb-6 flex flex-wrap gap-6 items-center">
              <div>
                <p className="text-xs text-indigo-300 font-mono uppercase tracking-wider mb-1">
                  Projec\u00E7\u00E3o ao fim da semana
                </p>
                <p className="text-2xl font-bold text-indigo-100">
                  ~{projecao.kmProjetado.toLocaleString("pt-PT")} km
                </p>
              </div>
              <div className="h-10 w-px bg-indigo-800 hidden md:block" />
              <div>
                <p className="text-xs text-indigo-300 font-mono uppercase tracking-wider mb-1">
                  Lucro projetado
                </p>
                <p className="text-2xl font-bold text-emerald-300">
                  {formatEuro(projecao.lucro)}
                </p>
                <p className="text-xs text-indigo-400 mt-0.5">
                  assume renda m\u00E1x. 350\u20AC/sem
                </p>
              </div>
              <div className="h-10 w-px bg-indigo-800 hidden md:block" />
              <div>
                <p className="text-xs text-indigo-300 font-mono uppercase tracking-wider mb-1">
                  Km/dia necess\u00E1rios
                </p>
                <p className="text-2xl font-bold text-indigo-100">
                  {projecao.kmFaltam} km
                </p>
                <p className="text-xs text-indigo-400">para atingir os 2.000 km</p>
              </div>
            </div>
          )}

          {/* \u2500\u2500 Gr\u00E1ficos \u2500\u2500 */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
            {/* Km acumulados */}
            <div className="bg-gray-900 rounded-xl p-5 border border-gray-800">
              <h2 className="text-sm font-semibold text-gray-300 mb-4">
                Km acumulados na semana
              </h2>
              <ResponsiveContainer width="100%" height={220}>
                <AreaChart
                  data={dadosAcumulados}
                  margin={{ top: 10, right: 10, left: -10, bottom: 0 }}
                >
                  <defs>
                    <linearGradient id="gradBase" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#6366f1" stopOpacity={0.3} />
                      <stop offset="95%" stopColor="#6366f1" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#1f2937" />
                  <XAxis
                    dataKey="dia"
                    tick={{ fontSize: 11, fill: "#9ca3af" }}
                    axisLine={false}
                    tickLine={false}
                  />
                  <YAxis
                    tick={{ fontSize: 11, fill: "#9ca3af" }}
                    axisLine={false}
                    tickLine={false}
                  />
                  <Tooltip
                    contentStyle={{
                      background: "#111827",
                      border: "1px solid #374151",
                      borderRadius: 8,
                      fontSize: 12,
                    }}
                    formatter={(v: number) => [
                      `${v.toLocaleString("pt-PT")} km`,
                      "Total acumulado",
                    ]}
                  />
                  <ReferenceLine
                    y={KM_BASE}
                    stroke="#f59e0b"
                    strokeDasharray="4 4"
                    label={{
                      value: "2.000 km",
                      fill: "#f59e0b",
                      fontSize: 10,
                      position: "insideTopRight",
                    }}
                  />
                  <Area
                    type="monotone"
                    dataKey="km"
                    stroke="#6366f1"
                    strokeWidth={2}
                    fill="url(#gradBase)"
                    dot={false}
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>

            {/* Lucro acumulado */}
            <div className="bg-gray-900 rounded-xl p-5 border border-gray-800">
              <h2 className="text-sm font-semibold text-gray-300 mb-4">
                Lucro acumulado na semana
              </h2>
              <ResponsiveContainer width="100%" height={220}>
                <AreaChart
                  data={dadosAcumulados}
                  margin={{ top: 10, right: 10, left: -10, bottom: 0 }}
                >
                  <defs>
                    <linearGradient id="gradLucro" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#10b981" stopOpacity={0.3} />
                      <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#1f2937" />
                  <XAxis
                    dataKey="dia"
                    tick={{ fontSize: 11, fill: "#9ca3af" }}
                    axisLine={false}
                    tickLine={false}
                  />
                  <YAxis
                    tick={{ fontSize: 11, fill: "#9ca3af" }}
                    axisLine={false}
                    tickLine={false}
                    tickFormatter={(v) => `${v}\u20AC`}
                  />
                  <Tooltip
                    contentStyle={{
                      background: "#111827",
                      border: "1px solid #374151",
                      borderRadius: 8,
                      fontSize: 12,
                    }}
                    formatter={(v: number) => [formatEuro(v), "Lucro acumulado"]}
                  />
                  <Area
                    type="monotone"
                    dataKey="lucro"
                    stroke="#10b981"
                    strokeWidth={2}
                    fill="url(#gradLucro)"
                    dot={false}
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* \u2500\u2500 Detalhe di\u00E1rio \u2500\u2500 */}
          <div className="bg-gray-900 rounded-xl p-5 border border-gray-800 mb-6">
            <h2 className="text-sm font-semibold text-gray-300 mb-1">
              Km rodados e receita por dia
            </h2>
            <p className="text-xs text-gray-500 mb-4">
              Barras azuis = km (eixo esquerdo) \u00B7 barras verdes = receita bruta (eixo direito)
            </p>
            {apenasDesp ? (
              <div className="flex flex-col items-center justify-center h-32 rounded-lg border border-amber-800/40 bg-amber-950/20">
                <p className="text-sm text-amber-400 font-medium">Dias de custo sem actividade registada</p>
                <p className="text-xs text-amber-600 mt-1">
                  Renda paga: {formatEuro(rendaTotal)} \u00B7 Km e receita: 0
                </p>
              </div>
            ) : (
              <ResponsiveContainer width="100%" height={200}>
                <BarChart
                  data={dadosDiarios}
                  margin={{ top: 5, right: 10, left: 0, bottom: 0 }}
                  barCategoryGap="25%"
                  barGap={3}
                >
                  <CartesianGrid strokeDasharray="3 3" stroke="#1f2937" />
                  <XAxis
                    dataKey="dia"
                    tick={{ fontSize: 11, fill: "#9ca3af" }}
                    axisLine={false}
                    tickLine={false}
                  />
                  {/* Eixo esquerdo \u2014 km */}
                  <YAxis
                    yAxisId="km"
                    orientation="left"
                    tick={{ fontSize: 11, fill: "#818cf8" }}
                    axisLine={false}
                    tickLine={false}
                    tickFormatter={(v) => `${v} km`}
                    width={55}
                  />
                  {/* Eixo direito \u2014 receita */}
                  <YAxis
                    yAxisId="receita"
                    orientation="right"
                    tick={{ fontSize: 11, fill: "#34d399" }}
                    axisLine={false}
                    tickLine={false}
                    tickFormatter={(v) => `${v}\u20AC`}
                    width={55}
                  />
                  <Tooltip
                    contentStyle={{
                      background: "#111827",
                      border: "1px solid #374151",
                      borderRadius: 8,
                      fontSize: 12,
                    }}
                    formatter={(v: number, name: string) => [
                      name === "km" ? `${v} km` : formatEuro(v),
                      name === "km" ? "Km rodados" : "Receita bruta",
                    ]}
                  />
                  <Legend
                    formatter={(value) =>
                      value === "km" ? "Km rodados" : "Receita bruta (\u20AC)"
                    }
                    wrapperStyle={{ fontSize: 11, color: "#9ca3af", paddingTop: 8 }}
                  />
                  <Bar yAxisId="km" dataKey="km" radius={[4, 4, 0, 0]} name="km" fill="#6366f1">
                    {dadosDiarios.map((d, i) => (
                      <Cell key={i} fill={d.km === 0 ? "#374151" : "#6366f1"} />
                    ))}
                  </Bar>
                  <Bar yAxisId="receita" dataKey="receita" radius={[4, 4, 0, 0]} name="receita" fill="#10b981">
                    {dadosDiarios.map((d, i) => (
                      <Cell key={i} fill={d.receita === 0 ? "#374151" : "#10b981"} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>

          {/* \u2500\u2500 Tabela de sensibilidade \u2500\u2500 */}
          <div className="bg-gray-900 rounded-xl p-5 border border-gray-800">
            <h2 className="text-sm font-semibold text-gray-300 mb-1">
              Tabela de sensibilidade \u2014 custo semanal por volume de km
            </h2>
            <p className="text-xs text-gray-500 mb-4">
              Receita estimada a {RECEITA_ESTIMADA_POR_KM.toFixed(2)}\u20AC/km (m\u00E9dia ilustrativa \u2014 o valor real varia por turno)
            </p>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-left border-b border-gray-800">
                    <th className="pb-2 pr-4 font-medium text-gray-400">Km/semana</th>
                    <th className="pb-2 pr-4 font-medium text-gray-400">Km extra</th>
                    <th className="pb-2 pr-4 font-medium text-gray-400">Sobretaxa</th>
                    <th className="pb-2 pr-4 font-medium text-gray-400">Custo total</th>
                    <th className="pb-2 pr-4 font-medium text-gray-400">Rec. estimada</th>
                    <th className="pb-2 pr-4 font-medium text-gray-400">Margem est.</th>
                  </tr>
                </thead>
                <tbody>
                  {[1500, 1800, 2000, 2200, 2500, 2800, 3000, 3500].map((km) => {
                    const m = calcularMetricasTabela(km);
                    const isAtual = Math.abs(km - kmTotal) < 150;
                    return (
                      <tr
                        key={km}
                        className={`border-b border-gray-800/50 ${
                          isAtual ? "bg-indigo-950/50" : ""
                        }`}
                      >
                        <td className="py-2 pr-4 font-mono font-semibold text-white">
                          {km.toLocaleString("pt-PT")}
                          {isAtual && (
                            <span className="ml-2 text-[10px] bg-indigo-700 text-indigo-200 px-1.5 py-0.5 rounded">
                              actual
                            </span>
                          )}
                        </td>
                        <td className="py-2 pr-4 font-mono text-gray-300">
                          {m.kmExtra > 0
                            ? `+${m.kmExtra.toLocaleString("pt-PT")}`
                            : "\u2014"}
                        </td>
                        <td className="py-2 pr-4 font-mono text-amber-400">
                          {m.sobretaxa > 0 ? formatEuro(m.sobretaxa) : "\u2014"}
                        </td>
                        <td className="py-2 pr-4 font-mono text-gray-300">
                          {formatEuro(m.custoTotal)}
                        </td>
                        <td className="py-2 pr-4 font-mono text-gray-300">
                          {formatEuro(m.receita)}
                        </td>
                        <td className="py-2 font-mono text-gray-300">
                          {m.margem.toFixed(1)}%
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
            <p className="text-xs text-gray-500 mt-3">
              Acima dos 2.000 km cada km adicional custa mais 0,25\u20AC \u2014 mas continua
              rent\u00E1vel enquanto a receita por km superar esse valor.
            </p>
          </div>
        </>
      )}
    </div>
  );
}

// \u2500\u2500\u2500 KPI Card \u2500\u2500\u2500
function KpiCard({
  label,
  value,
  sub,
  accent,
  icon,
}: {
  label: string;
  value: string;
  sub: string;
  accent: string;
  icon?: React.ReactNode;
}) {
  return (
    <div
      className="bg-gray-900 rounded-xl p-4 border border-gray-800 relative overflow-hidden"
      style={{ borderLeftColor: accent, borderLeftWidth: 3 }}
    >
      <div className="flex items-center justify-between mb-1">
        <p className="text-xs font-mono text-gray-400 uppercase tracking-wider">
          {label}
        </p>
        {icon}
      </div>
      <p className="text-2xl font-bold text-white mb-0.5">{value}</p>
      <p className="text-xs text-gray-500">{sub}</p>
    </div>
  );
}
