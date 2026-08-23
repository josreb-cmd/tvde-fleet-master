// src/components/rentabilidade/KmRentabilidadeMotorista.tsx
// Vista Motorista — linguagem simples, métricas acionáveis, gamificação leve
import React from "react";
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
  TrendingUp,
  TrendingDown,
  Zap,
  Clock,
  Target,
  Star,
  Flame,
  AlertTriangle,
} from "lucide-react";
import type { KmRentabilidadeData } from "./types";
import { KM_BASE, ENERGIA_POR_KM } from "./constants";

function formatEuro(v: number) {
  return (
    v.toLocaleString("pt-PT", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }) + "€"
  );
}

export function KmRentabilidadeMotorista({
  data,
}: {
  data: KmRentabilidadeData;
}) {
  const {
    kmTotal,
    kmExtra,
    sobretaxa,
    receitaTotal,
    lucroLiquido,
    lucroLiquidoPorDia,
    rendimentoHoraLiquido,
    receitaPorKm,
    horasTotal,
    diasTrabalhados,
    custoEnergia,
    custoComEnergia,
    eurosPorDezFaturados,
    melhorDia,
    piorDia,
    variacaoVsSemanaAnterior,
    diasAcimaTarget,
    breakEvenDia,
    progressoSemanal,
    kmPorDiaNecessarios,
    rankingDias,
    statusColor,
    apenasDesp,
    isCurrentWeek,
    diasDecorridos,
    projecao,
    dadosDiarios,
    dadosAcumulados,
    rendaTotal,
  } = data;

  const KM_DIA_TARGET = Math.ceil(KM_BASE / 7);

  return (
    <>
      {/* ═══ BARRA DE PROGRESSO SEMANAL ═══ */}
      <div className="bg-gray-900 rounded-xl p-4 border border-gray-800 mb-3">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2">
            <Target size={16} className="text-indigo-400" />
            <span className="text-sm font-medium text-gray-300">
              Progresso semanal
            </span>
          </div>
          <span className="text-sm font-mono font-bold text-white">
            {kmTotal.toLocaleString("pt-PT")} / {KM_BASE.toLocaleString("pt-PT")} km
          </span>
        </div>
        <div className="w-full bg-gray-800 rounded-full h-3 overflow-hidden">
          <div
            className="h-full rounded-full transition-all duration-700 ease-out"
            style={{
              width: `${Math.min(100, progressoSemanal)}%`,
              background:
                progressoSemanal >= 100
                  ? "linear-gradient(90deg, #10b981, #34d399)"
                  : progressoSemanal >= 75
                  ? "linear-gradient(90deg, #f59e0b, #fbbf24)"
                  : "linear-gradient(90deg, #6366f1, #818cf8)",
            }}
          />
        </div>
        <div className="flex justify-between mt-2">
          <span className="text-xs text-gray-500">
            {progressoSemanal.toFixed(0)}% do objetivo
          </span>
          {kmTotal < KM_BASE && isCurrentWeek && diasDecorridos < 7 ? (
            <span className="text-xs text-indigo-400">
              Faltam {(KM_BASE - kmTotal).toLocaleString("pt-PT")} km ·{" "}
              {kmPorDiaNecessarios} km/dia
            </span>
          ) : kmTotal >= KM_BASE ? (
            <span className="text-xs text-emerald-400">
              ✅ Objetivo atingido! +{kmExtra.toLocaleString("pt-PT")} km extra
            </span>
          ) : null}
        </div>

        {/* Mensagem motivacional */}
        {isCurrentWeek && diasDecorridos < 7 && (
          <div className="mt-3 pt-3 border-t border-gray-800">
            <p className="text-xs text-gray-400 italic">
              {kmTotal >= KM_BASE
                ? "🎯 Objetivo atingido! Cada km extra rende receita, mas custa +0,25€. Avalia se compensa."
                : kmTotal >= KM_BASE * 0.8
                ? `💪 Quase lá! Faltam apenas ${(KM_BASE - kmTotal).toLocaleString("pt-PT")} km.`
                : kmTotal >= KM_BASE * 0.5
                ? `🚗 Bom ritmo! Mantém ${kmPorDiaNecessarios} km/dia e chegas lá.`
                : kmTotal > 0
                ? `📈 Ainda há tempo. Precisas de ${kmPorDiaNecessarios} km/dia nos dias restantes.`
                : "🔑 A semana acaba de começar. Bora!"}
            </p>
          </div>
        )}
      </div>

      {/* ═══ KPIs LINHA 1: Lucro/dia · €/hora · Receita/km ═══ */}
      <div className="grid grid-cols-2 md:grid-cols-3 gap-3 mb-3">
        {/* 💰 Lucro líquido por dia */}
        <div
          className="bg-gray-900 rounded-xl p-4 border border-gray-800 relative overflow-hidden"
          style={{
            borderLeftColor: lucroLiquidoPorDia >= 0 ? "#10b981" : "#ef4444",
            borderLeftWidth: 3,
          }}
        >
          <p className="text-xs font-mono text-gray-400 uppercase tracking-wider mb-1">
            Lucro / dia
          </p>
          <p className="text-2xl font-bold text-white mb-0.5">
            {diasTrabalhados > 0
              ? formatEuro(lucroLiquidoPorDia)
              : "—"}
          </p>
          <p className="text-xs text-gray-500">
            {diasTrabalhados > 0
              ? `${diasTrabalhados} dias trabalhados`
              : "Sem actividade"}
          </p>
          <div className="border-t border-gray-700 pt-2 mt-2">
            <p className="text-xs text-gray-600">
              Total líquido: {formatEuro(lucroLiquido)}
            </p>
          </div>
        </div>

        {/* ⏱ €/hora líquido */}
        <div
          className="bg-gray-900 rounded-xl p-4 border border-gray-800 relative overflow-hidden"
          style={{
            borderLeftColor:
              rendimentoHoraLiquido >= 10
                ? "#10b981"
                : rendimentoHoraLiquido >= 6.5
                ? "#f59e0b"
                : "#ef4444",
            borderLeftWidth: 3,
          }}
        >
          <div className="flex items-center justify-between mb-1">
            <p className="text-xs font-mono text-gray-400 uppercase tracking-wider">
              €/hora líquido
            </p>
            <Clock size={14} className="text-gray-500" />
          </div>
          <p className="text-2xl font-bold text-white mb-0.5">
            {horasTotal > 0
              ? `${rendimentoHoraLiquido.toFixed(2)}€`
              : "—"}
          </p>
          <p className="text-xs text-gray-500">
            {horasTotal > 0
              ? `${horasTotal.toFixed(1)}h trabalhadas`
              : "Sem horas registadas"}
          </p>
          {rendimentoHoraLiquido > 0 && rendimentoHoraLiquido < 6.5 && (
            <div className="flex items-center gap-1 mt-2 pt-2 border-t border-gray-700">
              <AlertTriangle size={12} className="text-red-400" />
              <span className="text-[10px] text-red-400">
                Abaixo do salário mínimo (6,50€/h)
              </span>
            </div>
          )}
        </div>

        {/* 📊 Receita/km — qualidade das corridas */}
        <div
          className="bg-gray-900 rounded-xl p-4 border border-gray-800 relative overflow-hidden col-span-2 md:col-span-1"
          style={{
            borderLeftColor:
              receitaPorKm >= 0.4
                ? "#10b981"
                : receitaPorKm >= 0.35
                ? "#f59e0b"
                : "#ef4444",
            borderLeftWidth: 3,
          }}
        >
          <div className="flex items-center justify-between mb-1">
            <p className="text-xs font-mono text-gray-400 uppercase tracking-wider">
              Qualidade das corridas
            </p>
            <Zap size={14} className="text-yellow-400" />
          </div>
          <p className="text-2xl font-bold text-white mb-0.5">
            {receitaPorKm > 0 ? `${receitaPorKm.toFixed(3)}€/km` : "—"}
          </p>
          <p className="text-xs text-gray-500">
            {receitaPorKm >= 0.4
              ? "Excelente — corridas eficientes"
              : receitaPorKm >= 0.35
              ? "Bom — dentro da média"
              : receitaPorKm > 0
              ? "Abaixo da média — muitos km mortos?"
              : "Sem dados"}
          </p>
          <div className="border-t border-gray-700 pt-2 mt-2">
            <p className="text-xs text-gray-600">
              Objetivo: ≥ 0,35€/km · Receita total: {formatEuro(receitaTotal)}
            </p>
          </div>
        </div>
      </div>

      {/* ═══ KPIs LINHA 2: De cada 10€ · Melhor dia · Streak/Variação ═══ */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mb-6">
        {/* 🪙 "De cada 10€, ficas com…" */}
        <div className="bg-gray-900 rounded-xl p-4 border border-gray-800 border-l-[3px] border-l-yellow-500">
          <p className="text-xs font-mono text-gray-400 uppercase tracking-wider mb-3">
            O que fica no bolso
          </p>
          <div className="text-center py-2">
            <p className="text-3xl font-bold text-yellow-400">
              {eurosPorDezFaturados > 0
                ? `${eurosPorDezFaturados.toFixed(2)}€`
                : "—"}
            </p>
            <p className="text-sm text-gray-400 mt-1">
              de cada 10€ faturados
            </p>
          </div>
          <div className="border-t border-gray-700 pt-2 mt-2 space-y-0.5">
            <p className="text-xs text-gray-600">
              Renda: {formatEuro(rendaTotal)} · Sobretaxa: {formatEuro(sobretaxa)}
            </p>
            <p className="text-xs text-gray-600">
              Energia: {formatEuro(custoEnergia)} · Custo total: {formatEuro(custoComEnergia)}
            </p>
          </div>
        </div>

        {/* ⭐ Melhor dia */}
        <div className="bg-gray-900 rounded-xl p-4 border border-gray-800 border-l-[3px] border-l-emerald-500">
          <p className="text-xs font-mono text-gray-400 uppercase tracking-wider mb-3">
            Destaque da semana
          </p>
          {melhorDia ? (
            <>
              <div className="flex items-center gap-2 mb-3">
                <Star size={20} className="text-yellow-400 fill-yellow-400" />
                <div>
                  <p className="text-lg font-bold text-white">
                    {melhorDia.dia} — {formatEuro(melhorDia.valor)}
                  </p>
                  <p className="text-xs text-emerald-400">Melhor dia em receita</p>
                </div>
              </div>
              {piorDia && piorDia.dia !== melhorDia.dia && (
                <div className="border-t border-gray-700 pt-2">
                  <p className="text-xs text-gray-500">
                    Dia mais fraco: {piorDia.dia} — {formatEuro(piorDia.valor)}
                  </p>
                  <p className="text-xs text-gray-600 mt-0.5">
                    Diferença:{" "}
                    {formatEuro(melhorDia.valor - piorDia.valor)}
                  </p>
                </div>
              )}
            </>
          ) : (
            <p className="text-sm text-gray-500">Sem dados ainda</p>
          )}
        </div>

        {/* 🔥 Streak + Variação semanal */}
        <div className="bg-gray-900 rounded-xl p-4 border border-gray-800 border-l-[3px] border-l-indigo-500">
          <p className="text-xs font-mono text-gray-400 uppercase tracking-wider mb-3">
            Ritmo & tendência
          </p>
          {/* Streak */}
          <div className="flex items-center gap-2 mb-3">
            <Flame
              size={18}
              className={
                diasAcimaTarget >= 3
                  ? "text-orange-400"
                  : "text-gray-600"
              }
            />
            <div>
              <p className="text-sm font-semibold text-white">
                {diasAcimaTarget} {diasAcimaTarget === 1 ? "dia" : "dias"} acima
                de {Math.ceil(KM_BASE / 7)} km
              </p>
              <p className="text-xs text-gray-500">
                Ritmo diário para atingir os {KM_BASE.toLocaleString("pt-PT")} km
              </p>
            </div>
          </div>
          {/* Variação vs semana anterior */}
          {variacaoVsSemanaAnterior !== null && (
            <div className="border-t border-gray-700 pt-2">
              <div className="flex items-center gap-2">
                {variacaoVsSemanaAnterior >= 0 ? (
                  <TrendingUp size={16} className="text-emerald-400" />
                ) : (
                  <TrendingDown size={16} className="text-red-400" />
                )}
                <span
                  className={`text-sm font-semibold ${
                    variacaoVsSemanaAnterior >= 0
                      ? "text-emerald-400"
                      : "text-red-400"
                  }`}
                >
                  {variacaoVsSemanaAnterior > 0 ? "+" : ""}
                  {variacaoVsSemanaAnterior}%
                </span>
                <span className="text-xs text-gray-500">
                  vs semana anterior
                </span>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* ═══ PROJEÇÃO (semana atual) ═══ */}
      {isCurrentWeek && projecao && diasDecorridos < 7 && (
        <div className="bg-emerald-950 border border-emerald-800 rounded-xl p-4 mb-6">
          <p className="text-xs text-emerald-300 font-mono uppercase tracking-wider mb-3">
            Se mantiveres este ritmo...
          </p>
          <div className="flex flex-wrap gap-6 items-center">
            <div>
              <p className="text-2xl font-bold text-emerald-100">
                ~{projecao.kmProjetado.toLocaleString("pt-PT")} km
              </p>
              <p className="text-xs text-emerald-400">km ao fim da semana</p>
            </div>
            <div className="h-10 w-px bg-emerald-800 hidden md:block" />
            <div>
              <p className="text-2xl font-bold text-emerald-100">
                ~{formatEuro(projecao.lucro)}
              </p>
              <p className="text-xs text-emerald-400">lucro projetado</p>
            </div>
            {projecao.kmFaltam > 0 && (
              <>
                <div className="h-10 w-px bg-emerald-800 hidden md:block" />
                <div>
                  <p className="text-2xl font-bold text-emerald-100">
                    {projecao.kmFaltam} km/dia
                  </p>
                  <p className="text-xs text-emerald-400">
                    para atingir os {KM_BASE.toLocaleString("pt-PT")} km
                  </p>
                </div>
              </>
            )}
          </div>
        </div>
      )}

      {/* ═══ GRÁFICOS ═══ */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
        {/* Km acumulados com barra de progresso */}
        <div className="bg-gray-900 rounded-xl p-5 border border-gray-800">
          <h2 className="text-sm font-semibold text-gray-300 mb-4">
            Caminho até aos {KM_BASE.toLocaleString("pt-PT")} km
          </h2>
          <ResponsiveContainer width="100%" height={220}>
            <AreaChart
              data={dadosAcumulados}
              margin={{ top: 10, right: 10, left: -10, bottom: 0 }}
            >
              <defs>
                <linearGradient id="gradKmMot" x1="0" y1="0" x2="0" y2="1">
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
                  value: `Objetivo ${KM_BASE.toLocaleString("pt-PT")} km`,
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
                fill="url(#gradKmMot)"
                dot={false}
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>

        {/* Lucro acumulado — com break-even narrativo */}
        <div className="bg-gray-900 rounded-xl p-5 border border-gray-800">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-sm font-semibold text-gray-300">
              Quando começas a ganhar dinheiro
            </h2>
            {breakEvenDia && (
              <span className="text-xs bg-emerald-900 text-emerald-300 px-2 py-1 rounded-full">
                Break-even: {breakEvenDia}
              </span>
            )}
          </div>
          <ResponsiveContainer width="100%" height={220}>
            <AreaChart
              data={dadosAcumulados}
              margin={{ top: 10, right: 10, left: -10, bottom: 0 }}
            >
              <defs>
                <linearGradient
                  id="gradLucroMotVerde"
                  x1="0"
                  y1="0"
                  x2="0"
                  y2="1"
                >
                  <stop offset="5%" stopColor="#10b981" stopOpacity={0.2} />
                  <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
                </linearGradient>
                <linearGradient
                  id="gradLucroMotAmarelo"
                  x1="0"
                  y1="0"
                  x2="0"
                  y2="1"
                >
                  <stop offset="5%" stopColor="#f59e0b" stopOpacity={0.15} />
                  <stop offset="95%" stopColor="#f59e0b" stopOpacity={0} />
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
                tickFormatter={(v) => `${v}€`}
              />
              <Tooltip
                contentStyle={{
                  background: "#111827",
                  border: "1px solid #374151",
                  borderRadius: 8,
                  fontSize: 12,
                }}
                formatter={(v: number, name: string) => [
                  formatEuro(v),
                  name === "lucroSoRenda"
                    ? "Sem contar energia"
                    : "Lucro real",
                ]}
              />
              {/* Linha 0€ = break-even */}
              <ReferenceLine
                y={0}
                stroke="#6b7280"
                strokeDasharray="4 4"
                label={{
                  value: "0€ — break-even",
                  fill: "#6b7280",
                  fontSize: 10,
                  position: "insideTopLeft",
                }}
              />
              <Area
                type="monotone"
                dataKey="lucroSoRenda"
                stroke="#10b981"
                strokeWidth={2}
                fill="url(#gradLucroMotVerde)"
                dot={false}
                name="lucroSoRenda"
              />
              <Area
                type="monotone"
                dataKey="lucroLiquido"
                stroke="#f59e0b"
                strokeWidth={2}
                fill="url(#gradLucroMotAmarelo)"
                dot={false}
                name="lucroLiquido"
              />
              <Legend
                formatter={(value) =>
                  value === "lucroSoRenda"
                    ? "Sem contar energia"
                    : "Lucro real"
                }
                wrapperStyle={{ fontSize: 11, paddingTop: 8 }}
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* ═══ DETALHE DIÁRIO — com tooltip rico ═══ */}
      <div className="bg-gray-900 rounded-xl p-5 border border-gray-800 mb-6">
        <h2 className="text-sm font-semibold text-gray-300 mb-1">
          Os teus dias, um a um
        </h2>
        <p className="text-xs text-gray-500 mb-4">
          Azul = km rodados · Verde = receita bruta
        </p>
        {apenasDesp ? (
          <div className="flex flex-col items-center justify-center h-32 rounded-lg border border-amber-800/40 bg-amber-950/20">
            <p className="text-sm text-amber-400 font-medium">
              Semana com custos mas sem actividade
            </p>
            <p className="text-xs text-amber-600 mt-1">
              Renda paga: {formatEuro(rendaTotal)} · Ainda não rodaste
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
                tickFormatter={(v) => `${v}€`}
                width={55}
              />
              <Tooltip
                contentStyle={{
                  background: "#111827",
                  border: "1px solid #374151",
                  borderRadius: 8,
                  fontSize: 12,
                }}
                content={({ active, payload, label }) => {
                  if (!active || !payload || payload.length === 0) return null;
                  const d = dadosDiarios.find((x) => x.dia === label);
                  if (!d) return null;
                  const energiaDia = d.km * ENERGIA_POR_KM;
                  const rendaDia = d.renda;
                  const liquidoDia = d.receita - rendaDia - energiaDia;
                  const euroPorHora = d.horas > 0 ? liquidoDia / d.horas : 0;
                  const recKm = d.km > 0 ? d.receita / d.km : 0;
                  return (
                    <div className="bg-gray-900 border border-gray-700 rounded-lg p-3 shadow-xl">
                      <p className="text-sm font-bold text-white mb-2">
                        {label}
                      </p>
                      <div className="space-y-1 text-xs">
                        <p className="text-indigo-300">
                          🚗 {d.km} km ·{" "}
                          {d.horas > 0
                            ? `${d.horas.toFixed(1)}h`
                            : "sem horas"}
                        </p>
                        <p className="text-emerald-300">
                          💰 Receita: {formatEuro(d.receita)}
                        </p>
                        {d.km > 0 && (
                          <p className="text-gray-400">
                            📊 {recKm.toFixed(3)}€/km
                          </p>
                        )}
                        <div className="border-t border-gray-700 pt-1 mt-1">
                          <p className="text-gray-400">
                            Renda: {formatEuro(rendaDia)} · Energia:{" "}
                            {formatEuro(energiaDia)}
                          </p>
                          <p className="text-yellow-400 font-semibold">
                            Líquido: {formatEuro(liquidoDia)}
                          </p>
                          {d.horas > 0 && (
                            <p className="text-yellow-300">
                              €/hora: {euroPorHora.toFixed(2)}€
                            </p>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                }}
              />
              <Legend
                formatter={(value) =>
                  value === "km" ? "Km rodados" : "Receita bruta (€)"
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

      {/* ═══ RANKING DE DIAS ═══ */}
      {rankingDias.length > 1 && (
        <div className="bg-gray-900 rounded-xl p-5 border border-gray-800 mb-6">
          <h2 className="text-sm font-semibold text-gray-300 mb-1">
            Ranking dos teus dias
          </h2>
          <p className="text-xs text-gray-500 mb-4">
            Ordenado por receita/hora — descobre os teus dias mais eficientes
          </p>
          <div className="space-y-2">
            {rankingDias.map((d, i) => {
              const isFirst = i === 0;
              const isLast = i === rankingDias.length - 1;
              return (
                <div
                  key={d.dia}
                  className={`flex items-center gap-3 p-3 rounded-lg ${
                    isFirst
                      ? "bg-emerald-950/50 border border-emerald-800/50"
                      : isLast
                      ? "bg-red-950/30 border border-red-900/30"
                      : "bg-gray-800/50"
                  }`}
                >
                  <span className="text-lg font-bold text-gray-400 w-6 text-center">
                    {i + 1}
                  </span>
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-semibold text-white">
                        {d.dia}
                      </span>
                      {isFirst && (
                        <Star
                          size={14}
                          className="text-yellow-400 fill-yellow-400"
                        />
                      )}
                    </div>
                    <div className="flex gap-4 mt-1">
                      <span className="text-xs text-gray-400">
                        {d.receitaPorHora > 0
                          ? `${d.receitaPorHora.toFixed(1)}€/h`
                          : "—"}
                      </span>
                      <span className="text-xs text-gray-400">
                        {d.receitaPorKm > 0
                          ? `${d.receitaPorKm.toFixed(3)}€/km`
                          : "—"}
                      </span>
                    </div>
                  </div>
                  <span
                    className={`text-sm font-mono font-bold ${
                      d.lucroLiquido >= 0
                        ? "text-emerald-400"
                        : "text-red-400"
                    }`}
                  >
                    {formatEuro(d.lucroLiquido)}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ═══ RESUMO — linguagem simples ═══ */}
      <div className="bg-gray-900 rounded-xl p-5 border border-gray-700 border-l-[3px] border-l-indigo-500">
        <p className="text-xs font-mono text-gray-400 uppercase tracking-wider mb-3">
          📖 Resumo da semana (tudo incluído)
        </p>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-center">
          <div>
            <p className="text-2xl font-bold text-white">
              {formatEuro(receitaTotal)}
            </p>
            <p className="text-xs text-gray-500">Faturaste</p>
          </div>
          <div>
            <p className="text-2xl font-bold text-red-400">
              {formatEuro(custoComEnergia)}
            </p>
            <p className="text-xs text-gray-500">Custos totais</p>
          </div>
          <div>
            <p
              className={`text-2xl font-bold ${
                lucroLiquido >= 0 ? "text-emerald-400" : "text-red-400"
              }`}
            >
              {formatEuro(lucroLiquido)}
            </p>
            <p className="text-xs text-gray-500">Ficou no bolso</p>
          </div>
          <div>
            <p className="text-2xl font-bold text-yellow-400">
              {eurosPorDezFaturados > 0
                ? `${eurosPorDezFaturados.toFixed(1)}€`
                : "—"}
            </p>
            <p className="text-xs text-gray-500">por cada 10€</p>
          </div>
        </div>
        {kmExtra > 0 && (
          <div className="mt-3 pt-3 border-t border-gray-700">
            <p className="text-xs text-amber-400">
              ⚠️ Fizeste {kmExtra.toLocaleString("pt-PT")} km acima do limite — pagaste{" "}
              {formatEuro(sobretaxa)} de sobretaxa. Cada km extra custa 0,25€ mas rende ~
              {receitaPorKm > 0 ? receitaPorKm.toFixed(2) : "0,35"}€ — 
              {receitaPorKm > ENERGIA_POR_KM + 0.25
                ? " ainda compensa ✅"
                : " está no limite ⚠️"}
            </p>
          </div>
        )}
      </div>
    </>
  );
}
