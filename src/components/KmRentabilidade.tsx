// src/components/KmRentabilidade.tsx
// Actualizado: 13 correcÃ§Ãµes aplicadas â€” bugs lÃ³gicos, runtime, performance, UX/a11y.
// AfinaÃ§Ã£o: RECEITA_ESTIMADA_POR_KM=0.54 e ENERGIA_ESTIMADA_POR_KM=0.06 (dados reais)
// â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

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
import { RENDA_SEMANAL, KM_BASE, TAXA_ADICIONAL, RECEITA_ESTIMADA_POR_KM, ENERGIA_ESTIMADA_POR_KM } from '../constants/fleet';

// â”€â”€â”€ Constantes do modelo de negÃ³cio â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
const MAX_WEEK_HISTORY = 52; // limite de navegaÃ§Ã£o para o passado

// â”€â”€â”€ Helpers â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
function getWeekBounds(offset = 0) {
  const now = new Date();
  const day = now.getDay(); // 0=Dom, 1=Segâ€¦
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
    }) + "â‚¬"
  );
}

// Custo real: renda efectivamente paga + sobretaxa + carregamentos (Bug 1 original)
function calcularCustoReal(
  kmTotal: number,
  rendaReal: number,
  custoCarregamentos = 0
) {
  const kmExtra = Math.max(0, kmTotal - KM_BASE);
  const sobretaxa = kmExtra * TAXA_ADICIONAL;
  const custoTotal = rendaReal + sobretaxa + custoCarregamentos;
  return { kmExtra, sobretaxa, custoTotal };
}

// VersÃ£o inline sÃ³ com o total â€” evita alocaÃ§Ã£o de objecto no loop (Bug 11)
function calcularCustoTotal(
  km: number,
  renda: number,
  carregamento: number
): number {
  return renda + Math.max(0, km - KM_BASE) * TAXA_ADICIONAL + carregamento;
}

// Custo para tabela de sensibilidade: renda contratual fixa 350 â‚¬/sem
function calcularCustoSemanal(kmTotal: number) {
  const kmExtra = Math.max(0, kmTotal - KM_BASE);
  const sobretaxa = kmExtra * TAXA_ADICIONAL;
  const custoTotal = RENDA_SEMANAL + sobretaxa;
  return { kmExtra, sobretaxa, custoTotal };
}

// Receita / energia estimadas para a tabela de sensibilidade

function calcularMetricasTabela(kmTotal: number) {
  const {
    kmExtra,
    sobretaxa,
    custoTotal: custoBase,
  } = calcularCustoSemanal(kmTotal);
  const energiaEst = kmTotal * ENERGIA_ESTIMADA_POR_KM;
  const custoTotal = custoBase + energiaEst;
  const receita = kmTotal * RECEITA_ESTIMADA_POR_KM;
  const lucro = receita - custoTotal;
  const margem = receita > 0 ? (lucro / receita) * 100 : 0;
  const custoPorKm =
    kmTotal > 0 ? custoTotal / kmTotal : RENDA_SEMANAL / KM_BASE;
  return {
    kmExtra,
    sobretaxa,
    energiaEst,
    custoTotal,
    receita,
    lucro,
    margem,
    custoPorKm,
  };
}

const DIAS_SEMANA = ["Seg", "Ter", "Qua", "Qui", "Sex", "SÃ¡b", "Dom"];

// â”€â”€â”€ Componente principal â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
export function KmRentabilidade() {
  // Bug 10: defaults defensivos caso o contexto devolva undefined
  const { shiftLogs = [], expenses = [] } = useTVDE();
  const [weekOffset, setWeekOffset] = useState(0);

  const { monday, sunday } = useMemo(
    () => getWeekBounds(weekOffset),
    [weekOffset]
  );
  const isCurrentWeek = weekOffset === 0;

  // Bug 3 original: strings estÃ¡veis para dependÃªncia dos useMemo seguintes
  const mondayStr = useMemo(() => toDateStr(monday), [monday]);
  const sundayStr = useMemo(() => toDateStr(sunday), [sunday]);

  // â”€â”€ Dados diÃ¡rios â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  const dadosDiarios = useMemo(() => {
    const safeShifts = shiftLogs ?? [];
    const safeExpenses = expenses ?? [];

    const shiftsNaSemana = safeShifts.filter(
      (s) => s.date >= mondayStr && s.date <= sundayStr
    );

    const [y, m, d] = mondayStr.split("-").map(Number);
    const mondayLocal = new Date(y, m - 1, d);

    return DIAS_SEMANA.map((dia, i) => {
      const diaDate = new Date(mondayLocal);
      diaDate.setDate(mondayLocal.getDate() + i);
      const diaStr = toDateStr(diaDate);

      const shiftsNoDia = shiftsNaSemana.filter((s) => s.date === diaStr);
      const km = shiftsNoDia.reduce((acc, s) => acc + s.kilometers, 0);
      const receita = shiftsNoDia.reduce(
        (acc, s) => acc + s.grossEarnings,
        0
      );
      const renda = shiftsNoDia.reduce(
        (acc, s) => acc + (s.rentalExpenseAmount || 0),
        0
      );
      const carregamentoStandalone = safeExpenses
        .filter(
          (e) =>
            e.date === diaStr &&
            e.category === "fuel_charging" &&
            !e.id.startsWith("exp-fuel-shift-")
        )
        .reduce((acc, e) => acc + e.amount, 0);
      const fuelTurnos = shiftsNoDia.reduce(
        (acc, s) => acc + (s.fuelExpenseAmount || 0),
        0
      );
      const carregamento = carregamentoStandalone + fuelTurnos;

      return { dia, km, receita, renda, carregamento };
    });
  }, [shiftLogs, expenses, mondayStr, sundayStr]);

  // â”€â”€ Totais semanais â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
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
  const carregamentoTotal = useMemo(
    () => dadosDiarios.reduce((s, d) => s + d.carregamento, 0),
    [dadosDiarios]
  );

  const { kmExtra, sobretaxa, custoTotal } = useMemo(
    () => calcularCustoReal(kmTotal, rendaTotal, carregamentoTotal),
    [kmTotal, rendaTotal, carregamentoTotal]
  );

  const lucroReal = receitaTotal - custoTotal;
  const margemReal = receitaTotal > 0 ? (lucroReal / receitaTotal) * 100 : 0;
  const custoPorKm =
    kmTotal > 0
      ? custoTotal / kmTotal
      : rendaTotal > 0
        ? rendaTotal / KM_BASE
        : RENDA_SEMANAL / KM_BASE;
  const receitaPorKm = kmTotal > 0 ? receitaTotal / kmTotal : 0;

  // â”€â”€ Dados acumulados para grÃ¡ficos (Bug 11: sem alocaÃ§Ã£o de objecto) â”€â”€â”€â”€â”€
  const dadosAcumulados = useMemo(() => {
    let accKm = 0;
    let accReceita = 0;
    let accRenda = 0;
    let accCarregamento = 0;
    return dadosDiarios.map((d) => {
      accKm += d.km;
      accReceita += d.receita;
      accRenda += d.renda;
      accCarregamento += d.carregamento;
      const custoAcc = calcularCustoTotal(accKm, accRenda, accCarregamento);
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

  // â”€â”€ Dias decorridos â€” Bug 7: conta sÃ³ dias com dados reais â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  const diasDecorridos = useMemo(() => {
    if (!isCurrentWeek) return 7;
    const diasComDados = dadosDiarios.filter(
      (d) => d.km > 0 || d.receita > 0
    ).length;
    return diasComDados === 0 ? 1 : diasComDados;
  }, [isCurrentWeek, dadosDiarios]);

  // â”€â”€ ProjecÃ§Ã£o â€” Bugs 1 orig + 8 + 12 â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  const projecao = useMemo(() => {
    if (!isCurrentWeek || kmTotal === 0) return null;

    const kmPorDia = kmTotal / diasDecorridos;
    const receitaPorDia = receitaTotal / diasDecorridos;
    const carregPorDia = carregamentoTotal / diasDecorridos;
    const rendaPorDia = rendaTotal / diasDecorridos;

    const kmProjetado = Math.round(kmPorDia * 7);
    const receitaProjetada = receitaPorDia * 7;
    const rendaProjetada = rendaPorDia * 7;
    const carregProjetado = carregPorDia * 7;

    const custoProj = calcularCustoTotal(
      kmProjetado,
      rendaProjetada,
      carregProjetado
    );
    const lucroProjetado = receitaProjetada - custoProj;

    // Bug 8: dias restantes â€” null se jÃ¡ nÃ£o hÃ¡ dias
    const diasRestantes = 7 - diasDecorridos;
    const kmFaltam =
      diasRestantes <= 0
        ? null
        : Math.ceil(Math.max(0, KM_BASE - kmTotal) / diasRestantes);

    return { kmProjetado, lucro: lucroProjetado, kmFaltam };
  }, [
    kmTotal,
    receitaTotal,
    rendaTotal,
    carregamentoTotal,
    diasDecorridos,
    isCurrentWeek,
  ]);

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
      {/* â”€â”€ CabeÃ§alho â”€â”€ */}
      <div className="mb-8">
        <p className="text-xs font-mono tracking-widest text-indigo-400 uppercase mb-1">
          AnÃ¡lise de Rentabilidade
        </p>
        <h1 className="text-3xl font-bold text-white">
          QuilÃ³metros &amp; Margem
        </h1>
        <p className="text-gray-400 mt-1 text-sm">
          Modelo: renda 350â‚¬/sem Â· limiar 2.000 km Â· sobretaxa +0,25â‚¬/km acima
          do limite Â· energia real incluÃ­da Â· semana Segâ€“Dom
        </p>
      </div>

      {/* â”€â”€ Selector de semana â€” Bugs 6 + 13 â”€â”€ */}
      <div className="flex items-center gap-3 mb-8 bg-gray-900 rounded-xl p-3 w-fit border border-gray-800">
        <button
          aria-label="Semana anterior"
          onClick={() =>
            setWeekOffset((o) => Math.max(-MAX_WEEK_HISTORY, o - 1))
          }
          disabled={weekOffset <= -MAX_WEEK_HISTORY}
          className="p-1.5 rounded-lg hover:bg-gray-700 transition-colors text-gray-300 disabled:opacity-30 disabled:cursor-not-allowed"
        >
          <ChevronLeft size={18} />
        </button>
        <div className="flex items-center gap-2 min-w-[200px] justify-center">
          <Calendar size={15} className="text-indigo-400" />
          <span className="text-sm font-medium">
            {isCurrentWeek ? (
              <span className="text-indigo-300 font-semibold">
                Semana actual
              </span>
            ) : (
              <span className="text-gray-300">
                {formatDate(monday)} â€“ {formatDate(sunday)}
              </span>
            )}
          </span>
        </div>
        <button
          aria-label="Semana seguinte"
          onClick={() => setWeekOffset((o) => Math.min(0, o + 1))}
          disabled={isCurrentWeek}
          className="p-1.5 rounded-lg hover:bg-gray-700 transition-colors text-gray-300 disabled:opacity-30 disabled:cursor-not-allowed"
        >
          <ChevronRight size={18} />
        </button>
      </div>

      {/* â”€â”€ Sem dados â”€â”€ */}
      {!temDados ? (
        <div className="flex flex-col items-center justify-center h-64 text-gray-500">
          <AlertCircle size={40} className="mb-3 text-gray-700" />
          <p className="text-sm">Sem turnos registados para esta semana.</p>
        </div>
      ) : (
        <>
          {/* â”€â”€ KPIs â”€â”€ */}
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
              value={`${kmExtra.toLocaleString("pt-PT")} km`}
              sub={
                kmExtra > 0
                  ? `Sobretaxa: ${formatEuro(sobretaxa)}`
                  : "Dentro da renda"
              }
              accent={kmExtra > 0 ? "#10b981" : "#6366f1"}
            />
            <KpiCard
              label="Lucro lÃ­quido"
              value={formatEuro(lucroReal)}
              sub={`Receita: ${formatEuro(receitaTotal)}${
                carregamentoTotal > 0
                  ? ` Â· Energia: ${formatEuro(carregamentoTotal)}`
                  : ""
              }`}
              accent={lucroReal >= 0 ? "#10b981" : "#ef4444"}
            />
            <KpiCard
              label="Margem"
              value={`${margemReal.toFixed(1)}%`}
              sub={`Custo/km: ${custoPorKm.toFixed(3)}â‚¬ Â· Rec/km: ${receitaPorKm.toFixed(3)}â‚¬`}
              accent={margemReal > 40 ? "#10b981" : "#f59e0b"}
            />
          </div>

          {/* â”€â”€ ProjecÃ§Ã£o â€” Bugs 1 + 8 + 12 â”€â”€ */}
          {isCurrentWeek && projecao && diasDecorridos < 7 && (
            <div className="bg-indigo-950 border border-indigo-800 rounded-xl p-4 mb-6 flex flex-wrap gap-6 items-center">
              <div>
                <p className="text-xs text-indigo-300 font-mono uppercase tracking-wider mb-1">
                  ProjecÃ§Ã£o ao fim da semana
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
                {/* Bug 12: cor condicional */}
                <p
                  className={`text-2xl font-bold ${
                    projecao.lucro >= 0 ? "text-emerald-300" : "text-red-400"
                  }`}
                >
                  {formatEuro(projecao.lucro)}
                </p>
                <p className="text-xs text-indigo-400 mt-0.5">
                  baseado nos dados reais da semana
                </p>
              </div>
              <div className="h-10 w-px bg-indigo-800 hidden md:block" />
              <div>
                <p className="text-xs text-indigo-300 font-mono uppercase tracking-wider mb-1">
                  Km/dia necessÃ¡rios
                </p>
                {/* Bug 8: null se jÃ¡ nÃ£o hÃ¡ dias restantes */}
                <p className="text-2xl font-bold text-indigo-100">
                  {projecao.kmFaltam !== null ? `${projecao.kmFaltam} km` : "â€”"}
                </p>
                <p className="text-xs text-indigo-400">
                  {projecao.kmFaltam !== null
                    ? "para atingir os 2.000 km"
                    : "sem dias restantes"}
                </p>
              </div>
            </div>
          )}

          {/* â”€â”€ GrÃ¡ficos â€” Bugs 4 + 5 originais â”€â”€ */}
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
                    <linearGradient
                      id="kmRent-gradBase"
                      x1="0"
                      y1="0"
                      x2="0"
                      y2="1"
                    >
                      <stop
                        offset="5%"
                        stopColor="#6366f1"
                        stopOpacity={0.3}
                      />
                      <stop
                        offset="95%"
                        stopColor="#6366f1"
                        stopOpacity={0}
                      />
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
                    formatter={(v: number | string) => {
                      const num =
                        typeof v === "number" ? v : parseFloat(String(v));
                      return [
                        `${num.toLocaleString("pt-PT")} km`,
                        "Total acumulado",
                      ];
                    }}
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
                    fill="url(#kmRent-gradBase)"
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
                    <linearGradient
                      id="kmRent-gradLucro"
                      x1="0"
                      y1="0"
                      x2="0"
                      y2="1"
                    >
                      <stop
                        offset="5%"
                        stopColor="#10b981"
                        stopOpacity={0.3}
                      />
                      <stop
                        offset="95%"
                        stopColor="#10b981"
                        stopOpacity={0}
                      />
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
                    tickFormatter={(v) => `${v}â‚¬`}
                  />
                  <Tooltip
                    contentStyle={{
                      background: "#111827",
                      border: "1px solid #374151",
                      borderRadius: 8,
                      fontSize: 12,
                    }}
                    formatter={(v: number | string) => {
                      const num =
                        typeof v === "number" ? v : parseFloat(String(v));
                      return [formatEuro(num), "Lucro acumulado"];
                    }}
                  />
                  <Area
                    type="monotone"
                    dataKey="lucro"
                    stroke="#10b981"
                    strokeWidth={2}
                    fill="url(#kmRent-gradLucro)"
                    dot={false}
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* â”€â”€ Detalhe diÃ¡rio â”€â”€ */}
          <div className="bg-gray-900 rounded-xl p-5 border border-gray-800 mb-6">
            <h2 className="text-sm font-semibold text-gray-300 mb-1">
              Km rodados e receita por dia
            </h2>
            <p className="text-xs text-gray-500 mb-4">
              Barras azuis = km (eixo esquerdo) Â· barras verdes = receita bruta
              (eixo direito)
            </p>
            {apenasDesp ? (
              <div className="flex flex-col items-center justify-center h-32 rounded-lg border border-amber-800/40 bg-amber-950/20">
                <p className="text-sm text-amber-400 font-medium">
                  Dias de custo sem actividade registada
                </p>
                <p className="text-xs text-amber-600 mt-1">
                  Renda paga: {formatEuro(rendaTotal)} Â· Km e receita: 0
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
                  <YAxis
                    yAxisId="km"
                    orientation="left"
                    tick={{ fontSize: 11, fill: "#818cf8" }}
                    axisLine={false}
                    tickLine={false}
                    tickFormatter={(v) => `${v} km`}
                    width={55}
                  />
                  <YAxis
                    yAxisId="receita"
                    orientation="right"
                    tick={{ fontSize: 11, fill: "#34d399" }}
                    axisLine={false}
                    tickLine={false}
                    tickFormatter={(v) => `${v}â‚¬`}
                    width={55}
                  />
                  <Tooltip
                    contentStyle={{
                      background: "#111827",
                      border: "1px solid #374151",
                      borderRadius: 8,
                      fontSize: 12,
                    }}
                    formatter={(v: number | string, name: string) => {
                      const num =
                        typeof v === "number" ? v : parseFloat(String(v));
                      return [
                        name === "km" ? `${num} km` : formatEuro(num),
                        name === "km" ? "Km rodados" : "Receita bruta",
                      ];
                    }}
                  />
                  <Legend
                    formatter={(value) =>
                      value === "km" ? "Km rodados" : "Receita bruta (â‚¬)"
                    }
                    wrapperStyle={{
                      fontSize: 11,
                      color: "#9ca3af",
                      paddingTop: 8,
                    }}
                  />
                  <Bar
                    yAxisId="km"
                    dataKey="km"
                    radius={[4, 4, 0, 0]}
                    name="km"
                    fill="#6366f1"
                  >
                    {dadosDiarios.map((d, i) => (
                      <Cell
                        key={i}
                        fill={d.km === 0 ? "#374151" : "#6366f1"}
                      />
                    ))}
                  </Bar>
                  <Bar
                    yAxisId="receita"
                    dataKey="receita"
                    radius={[4, 4, 0, 0]}
                    name="receita"
                    fill="#10b981"
                  >
                    {dadosDiarios.map((d, i) => (
                      <Cell
                        key={i}
                        fill={d.receita === 0 ? "#374151" : "#10b981"}
                      />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>

          {/* â”€â”€ Tabela de sensibilidade â€” Bugs 2 + 6 + 9 â”€â”€ */}
          <div className="bg-gray-900 rounded-xl p-5 border border-gray-800">
            <h2 className="text-sm font-semibold text-gray-300 mb-1">
              Tabela de sensibilidade â€” custo semanal por volume de km
            </h2>
            <p className="text-xs text-gray-500 mb-4">
              Receita estimada a {RECEITA_ESTIMADA_POR_KM.toFixed(2)}â‚¬/km Â·
              energia estimada a {ENERGIA_ESTIMADA_POR_KM.toFixed(3)}â‚¬/km
              (Tesla Model Y Â· carregamento a 0,41â‚¬/kWh Â· ~15 kWh/100km)
            </p>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-left border-b border-gray-800">
                    <th className="pb-2 pr-4 font-medium text-gray-400">
                      Km/semana
                    </th>
                    <th className="pb-2 pr-4 font-medium text-gray-400">
                      Km extra
                    </th>
                    <th className="pb-2 pr-4 font-medium text-gray-400">
                      Sobretaxa
                    </th>
                    <th className="pb-2 pr-4 font-medium text-gray-400 hidden md:table-cell">
                      Energia est.
                    </th>
                    <th className="pb-2 pr-4 font-medium text-gray-400">
                      Custo total
                    </th>
                    <th className="pb-2 pr-4 font-medium text-gray-400 hidden md:table-cell">
                      Rec. estimada
                    </th>
                    <th className="pb-2 pr-4 font-medium text-gray-400">
                      Lucro est.
                    </th>
                    <th className="pb-2 pr-4 font-medium text-gray-400">
                      Margem est.
                    </th>
                    <th className="pb-2 font-medium text-gray-400 hidden md:table-cell">
                      Custo/km
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {[1500, 1800, 2000, 2200, 2500, 2800, 3000, 3500].map(
                    (km) => {
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
                            {/* Bug 9: alerta de divergÃªncia real vs estimado */}
                            {isAtual &&
                              Math.abs(m.lucro - lucroReal) > 50 && (
                                <span
                                  className="ml-1 text-[10px] bg-amber-800 text-amber-200 px-1.5 py-0.5 rounded cursor-help"
                                  title={`Lucro real: ${formatEuro(lucroReal)} â€” diferenÃ§a deve-se Ã  receita/km real vs estimada`}
                                >
                                  â‰  real
                                </span>
                              )}
                          </td>
                          <td className="py-2 pr-4 font-mono text-gray-300">
                            {m.kmExtra > 0
                              ? `+${m.kmExtra.toLocaleString("pt-PT")}`
                              : "â€”"}
                          </td>
                          <td className="py-2 pr-4 font-mono text-amber-400">
                            {m.sobretaxa > 0 ? formatEuro(m.sobretaxa) : "â€”"}
                          </td>
                          <td className="py-2 pr-4 font-mono text-cyan-400 hidden md:table-cell">
                            {formatEuro(m.energiaEst)}
                          </td>
                          <td className="py-2 pr-4 font-mono text-gray-300">
                            {formatEuro(m.custoTotal)}
                          </td>
                          <td className="py-2 pr-4 font-mono text-gray-300 hidden md:table-cell">
                            {formatEuro(m.receita)}
                          </td>
                          <td
                            className={`py-2 pr-4 font-mono ${
                              m.lucro >= 0
                                ? "text-emerald-400"
                                : "text-red-400"
                            }`}
                          >
                            {formatEuro(m.lucro)}
                          </td>
                          <td className="py-2 pr-4 font-mono text-gray-300">
                            {m.margem.toFixed(1)}%
                          </td>
                          <td className="py-2 font-mono text-gray-300 hidden md:table-cell">
                            {m.custoPorKm.toFixed(3)}â‚¬
                          </td>
                        </tr>
                      );
                    }
                  )}
                </tbody>
              </table>
            </div>
            <p className="text-xs text-gray-500 mt-3">
              Acima dos 2.000 km cada km adicional custa mais 0,25â‚¬ â€” mas
              continua rentÃ¡vel enquanto a receita por km superar esse valor.
            </p>
          </div>
        </>
      )}
    </div>
  );
}

// â”€â”€â”€ KPI Card â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
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

