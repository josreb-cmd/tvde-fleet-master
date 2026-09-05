// =============================================================================
// src/components/rentabilidade/KmRentabilidadeMotorista.tsx
// Vista Motorista — V.2.8.5
// ✅ Target dinâmico (folgas) + badge Folga
// ✅ V.2.8.4 FIX: Barra verde ≤2000km, amber >2000–2500, vermelho >2500
// ✅ V.2.8.4 FIX: Break-even dual com renda semanal fixa (linhas separadas)
// ✅ V.2.8.5 FIX: Tooltip Detalhe Diário usa custoEnergiaReal (não estimativa)
// ✅ V.2.8.5 NEW: Card Desvio Energia (Real vs Estimado) com cores contextuais
// ✅ V.2.8.5 CLEANUP: Removidos statusColor e custoFixoPorDia do destructuring
// 🆕 Mensagem custo/benefício consome veredictoKmExtra do hook (sem IIFE inline)
// Linguagem simples, métricas acionáveis, gamificação leve
// =============================================================================
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
  Battery,
} from "lucide-react";
import type {
  KmRentabilidadeData,
  SparklineDataPoint,
  SparklineTendencia,
} from "./types";
import { KM_BASE, ENERGIA_POR_KM, TAXA_ADICIONAL } from "./constants";
import { SparklineChart, TrendBadge } from "./SparklineChart";

// ——— Tipos de props ———

interface SparklineSeries {
  km: SparklineDataPoint[];
  lucro: SparklineDataPoint[];
  margem: SparklineDataPoint[];
  rendimentoHora: SparklineDataPoint[];
  receitaPorKm: SparklineDataPoint[];
}

interface MotoristaProps {
  data: KmRentabilidadeData;
  sparklineSeries?: SparklineSeries | null;
  sparklineTendencia?: SparklineTendencia | null;
  hasSparklineData?: boolean;
}

// ——— Helpers ———

function formatEuro(v: number) {
  return (
    v.toLocaleString("pt-PT", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }) + "€"
  );
}

// =============================================================================
// Componente principal
// =============================================================================

export function KmRentabilidadeMotorista({
  data,
  sparklineSeries,
  sparklineTendencia,
  hasSparklineData = false,
}: MotoristaProps) {
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
    breakEvenDiaSoRenda,
    progressoSemanal,
    kmPorDiaNecessarios,
    rankingDias,
    // ❌ V.2.8.5 CLEANUP: statusColor removido (não usado no JSX)
    apenasDesp,
    isCurrentWeek,
    diasDecorridos,
    projecao,
    dadosDiarios,
    dadosAcumulados,
    rendaTotal,
    // V.2.8.1 — target dinâmico
    diasEfetivos,
    kmDiaTarget,
    // V.2.8.2 — custo marginal do hook
    custoMarginalKm,
    ganhoLiquidoPorKmExtra,
    margemPorKmExtra,
    veredictoKmExtra,
    // 🆕 V.2.8.5 — energia real
    energiaTotalReal,
    energiaEstimada,
    desvioEnergia,
  } = data;

  // Target dinâmico (com fallback para backward compatibility)
  const targetDiario = kmDiaTarget ?? Math.ceil(KM_BASE / 7);
  const diasEfetivosVal = diasEfetivos ?? 7;
  const folgas = 7 - diasEfetivosVal;

  // Metadata de parcialidade para TrendBadge
  const tIsPartial = sparklineTendencia?.isPartial ?? false;
  const tDiasAtual = sparklineTendencia?.diasAtual ?? 0;

  // ═══════════════════════════════════════════════════════════════
  // V.2.8.4 — Lógica de cor da barra de progresso
  // ═══════════════════════════════════════════════════════════════
  const progressoReal = (kmTotal / KM_BASE) * 100;

  const getBarraGradient = (): string => {
    if (progressoReal > 125) return "linear-gradient(90deg, #ef4444, #dc2626)";
    if (progressoReal > 100) return "linear-gradient(90deg, #f59e0b, #ef4444)";
    if (progressoSemanal >= 90) return "linear-gradient(90deg, #10b981, #10b981)";
    if (progressoSemanal >= 50) return "linear-gradient(90deg, #6366f1, #6366f1)";
    return "linear-gradient(90deg, #f59e0b, #fbbf24)";
  };

  // ═══════════════════════════════════════════════════════════════
  // 🆕 V.2.8.5 — Helpers para card desvio energia
  // ═══════════════════════════════════════════════════════════════
  const desvioAbs = Math.abs(desvioEnergia);
  const desvioEnergiaColor =
    desvioAbs < 5 ? "emerald" : desvioAbs < 15 ? "amber" : "red";
  const desvioEnergiaIcon =
    desvioAbs < 5 ? "✅" : desvioAbs < 15 ? "⚡" : "⚠️";
  const desvioEnergiaLabel =
    desvioAbs < 5
      ? "Modelo calibrado"
      : desvioAbs < 15
        ? "Desvio moderado"
        : "Desvio elevado — recalibrar?";

  return (
    <>
      {/* ═══ RESUMO — linguagem simples ═══ */}
      <div className="mb-6 bg-white rounded-xl p-5 border border-black/14 border-l-[3px] border-l-indigo-500">
        <p className="text-xs font-mono text-[#3a3a38] uppercase tracking-wider mb-3">
          📖 Resumo da semana (tudo incluído)
        </p>
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4 text-center">
          <div>
            <p className="text-2xl font-bold text-[#111110]">
              {formatEuro(receitaTotal)}
            </p>
            <p className="text-xs text-[#4a4a48]">Faturaste</p>
          </div>
          <div>
            <p className="text-2xl font-bold text-red-600">
              {formatEuro(custoComEnergia)}
            </p>
            <p className="text-xs text-[#4a4a48]">Custos totais</p>
          </div>
          <div>
            <p
              className={`text-2xl font-bold ${
                lucroLiquido >= 0 ? "text-emerald-600" : "text-red-600"
              }`}
            >
              {formatEuro(lucroLiquido)}
            </p>
            <p className="text-xs text-[#4a4a48]">Ficou no bolso</p>
          </div>
          <div>
            <p className="text-2xl font-bold text-amber-600">
              {eurosPorDezFaturados > 0
                ? `${eurosPorDezFaturados.toFixed(1)}€`
                : "—"}
            </p>
            <p className="text-xs text-[#4a4a48]">por cada 10€</p>
          </div>
          <div>
            <p
              className={`text-2xl font-bold ${
                rendimentoHoraLiquido >= 10
                  ? "text-emerald-600"
                  : rendimentoHoraLiquido >= 6.5
                  ? "text-amber-600"
                  : "text-red-600"
              }`}
            >
              {rendimentoHoraLiquido.toFixed(2)}€/h
            </p>
            <p className="text-xs text-[#4a4a48]">Rendimento médio</p>
          </div>
          <div>
            <p
              className={`text-2xl font-bold ${
                kmTotal <= 2000 ? "text-indigo-500" : "text-amber-600"
              }`}
            >
              {kmTotal.toLocaleString("pt-PT")} km
            </p>
            <p className="text-xs text-[#4a4a48]">Km percorridos</p>
          </div>
        </div>
        {kmExtra > 0 && (
          <div className="mt-3 pt-3 border-t border-black/14">
            <p className="text-xs text-amber-600">
              ⚠️ Fizeste {kmExtra.toLocaleString("pt-PT")} km acima do limite — pagaste{" "}
              {formatEuro(sobretaxa)} de sobretaxa. Cada km extra custa {custoMarginalKm.toFixed(3)}€ mas rende ~
              {receitaPorKm > 0 ? receitaPorKm.toFixed(2) : "0,35"}€ —{" "}
              {veredictoKmExtra === "compensa"
                ? "ainda compensa ✅"
                : veredictoKmExtra === "limite"
                  ? "está no limite ⚡"
                  : "não compensa ❌"}
            </p>
          </div>
        )}
      </div>

      {/* ═══ BARRA DE PROGRESSO SEMANAL ═══ */}
      <div className="bg-white rounded-xl p-4 border border-black/18 mb-3">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2">
            <Target size={16} className="text-indigo-600" />
            <span className="text-sm font-medium text-[#111110]">
              Progresso semanal
            </span>
            {hasSparklineData && sparklineTendencia && (
              <TrendBadge
                trend={sparklineTendencia.km}
                isPartial={tIsPartial}
                diasAtual={tDiasAtual}
              />
            )}
          </div>
          <span className="text-sm font-mono font-bold text-[#111110]">
            {kmTotal.toLocaleString("pt-PT")} / {KM_BASE.toLocaleString("pt-PT")} km
          </span>
        </div>

        <div className="w-full bg-[#f0f0ef] rounded-full h-3 overflow-hidden">
          <div
            className="h-full rounded-full transition-all duration-700 ease-out"
            style={{
              width: `${Math.min(100, progressoSemanal)}%`,
              background: getBarraGradient(),
            }}
          />
        </div>

        <div className="flex justify-between mt-2">
          <span className="text-xs text-[#4a4a48]">
            {progressoSemanal.toFixed(0)}% do objetivo
          </span>
          {kmTotal < KM_BASE && isCurrentWeek && diasDecorridos < 7 ? (
            <span className="text-xs text-indigo-600">
              Faltam {(KM_BASE - kmTotal).toLocaleString("pt-PT")} km ·{" "}
              {kmPorDiaNecessarios} km/dia
            </span>
          ) : kmTotal >= KM_BASE ? (
            <span className={`text-xs ${kmExtra > 0 ? "text-amber-600" : "text-emerald-600"}`}>
              {kmExtra > 0
                ? `⚠️ +${kmExtra.toLocaleString("pt-PT")} km extra — sobretaxa ativa (${TAXA_ADICIONAL.toFixed(2)}€/km)`
                : "✅ Objetivo atingido!"}
            </span>
          ) : null}
        </div>

        {folgas > 0 && (
          <div className="mt-2">
            <span className="text-[10px] bg-indigo-100 text-indigo-700 px-2 py-0.5 rounded-full">
              {folgas} {folgas === 1 ? "folga" : "folgas"} · Meta: {KM_BASE.toLocaleString("pt-PT")} km ÷ {diasEfetivosVal} dias = {targetDiario} km/dia
            </span>
          </div>
        )}

        {isCurrentWeek && diasDecorridos < 7 && (
          <div className="mt-3 pt-3 border-t border-black/8">
            <p className="text-xs text-[#3a3a38] italic">
              {kmTotal >= KM_BASE ? (
                veredictoKmExtra === "compensa"
                  ? `✅ Cada km extra rende ${receitaPorKm.toFixed(2)}€ e custa ${custoMarginalKm.toFixed(3)}€ (taxa ${TAXA_ADICIONAL.toFixed(2)}€ + energia ${ENERGIA_POR_KM.toFixed(3)}€). Lucras ${ganhoLiquidoPorKmExtra.toFixed(2)}€/km (margem ${margemPorKmExtra.toFixed(0)}%) — compensa continuar!`
                  : veredictoKmExtra === "limite"
                    ? `⚡ Cada km extra rende ${receitaPorKm.toFixed(2)}€ e custa ${custoMarginalKm.toFixed(3)}€. Ganho marginal de apenas ${ganhoLiquidoPorKmExtra.toFixed(2)}€/km — estás no limite, avalia se compensa.`
                    : `⚠️ Atenção: cada km extra custa ${custoMarginalKm.toFixed(3)}€ mas só rende ${receitaPorKm.toFixed(2)}€. Estás a perder ${Math.abs(ganhoLiquidoPorKmExtra).toFixed(2)}€/km — considera parar.`
              ) : kmTotal >= KM_BASE * 0.8 ? (
                `💪 Quase lá! Faltam apenas ${(KM_BASE - kmTotal).toLocaleString("pt-PT")} km.`
              ) : kmTotal >= KM_BASE * 0.5 ? (
                `🚗 Bom ritmo! Mantém ${kmPorDiaNecessarios} km/dia e chegas lá.`
              ) : kmTotal > 0 ? (
                `📈 Ainda há tempo. Precisas de ${kmPorDiaNecessarios} km/dia nos dias restantes.`
              ) : (
                "🔑 A semana acaba de começar. Bora!"
              )}
            </p>
          </div>
        )}
      </div>

      {/* ═══ KPIs LINHA 1: Lucro/dia · €/hora · Receita/km ═══ */}
      <div className="grid grid-cols-2 md:grid-cols-3 gap-3 mb-3">
        {/* 💰 Lucro líquido por dia */}
        <div
          className="bg-white rounded-xl p-4 border border-black/18 relative overflow-hidden"
          style={{
            borderLeftColor: lucroLiquidoPorDia >= 0 ? "#10b981" : "#ef4444",
            borderLeftWidth: 3,
          }}
        >
          <div className="flex items-center justify-between mb-1">
            <p className="text-xs font-mono text-[#3a3a38] uppercase tracking-wider">
              Lucro / dia
            </p>
            {hasSparklineData && sparklineSeries && (
              <SparklineChart
                data={sparklineSeries.lucro}
                color="#10b981"
                color2="#f59e0b"
                refValue={0}
                refColor="#ef4444"
                showLastValue
              />
            )}
          </div>
          <div className="flex items-center gap-2 mb-0.5">
            <p className="text-2xl font-bold text-[#111110]">
              {diasTrabalhados > 0 ? formatEuro(lucroLiquidoPorDia) : "—"}
            </p>
            {hasSparklineData && sparklineTendencia && (
              <TrendBadge
                trend={sparklineTendencia.lucroLiquido}
                isPartial={tIsPartial}
                diasAtual={tDiasAtual}
              />
            )}
          </div>
          <p className="text-xs text-[#4a4a48]">
            {diasTrabalhados > 0
              ? `${diasTrabalhados} dias trabalhados`
              : "Sem actividade"}
          </p>
          <div className="border-t border-black/14 pt-2 mt-2">
            <p className="text-xs text-[#4a4a48]">
              Total líquido: {formatEuro(lucroLiquido)}
            </p>
          </div>
        </div>

        {/* ⏱ €/hora líquido */}
        <div
          className="bg-white rounded-xl p-4 border border-black/18 relative overflow-hidden"
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
            <p className="text-xs font-mono text-[#3a3a38] uppercase tracking-wider">
              €/hora líquido
            </p>
            <div className="flex items-center gap-2">
              {hasSparklineData && sparklineSeries && (
                <SparklineChart
                  data={sparklineSeries.rendimentoHora}
                  color="#f59e0b"
                  refValue={6.5}
                  refColor="#ef4444"
                  showLastValue
                />
              )}
              <Clock size={14} className="text-[#4a4a48]" />
            </div>
          </div>
          <div className="flex items-center gap-2 mb-0.5">
            <p className="text-2xl font-bold text-[#111110]">
              {horasTotal > 0 ? `${rendimentoHoraLiquido.toFixed(2)}€` : "—"}
            </p>
            {hasSparklineData && sparklineTendencia && (
              <TrendBadge
                trend={sparklineTendencia.rendimentoHora}
                isPartial={tIsPartial}
                diasAtual={tDiasAtual}
              />
            )}
          </div>
          <p className="text-xs text-[#4a4a48]">
            {horasTotal > 0
              ? `${horasTotal.toFixed(1)}h trabalhadas`
              : "Sem horas registadas"}
          </p>
          {rendimentoHoraLiquido > 0 && rendimentoHoraLiquido < 6.5 && (
            <div className="flex items-center gap-1 mt-2 pt-2 border-t border-black/14">
              <AlertTriangle size={12} className="text-red-600" />
              <span className="text-[10px] text-red-600">
                Abaixo do salário mínimo (6,50€/h)
              </span>
            </div>
          )}
        </div>

        {/* 📊 Receita/km */}
        <div
          className="bg-white rounded-xl p-4 border border-black/18 relative overflow-hidden col-span-2 md:col-span-1"
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
            <p className="text-xs font-mono text-[#3a3a38] uppercase tracking-wider">
              Qualidade das corridas
            </p>
            <div className="flex items-center gap-2">
              {hasSparklineData && sparklineSeries && (
                <SparklineChart
                  data={sparklineSeries.receitaPorKm}
                  color="#f59e0b"
                  refValue={0.35}
                  refColor="#ef4444"
                  showLastValue
                />
              )}
              <Zap size={14} className="text-amber-600" />
            </div>
          </div>
          <p className="text-2xl font-bold text-[#111110] mb-0.5">
            {receitaPorKm > 0 ? `${receitaPorKm.toFixed(3)}€/km` : "—"}
          </p>
          <p className="text-xs text-[#4a4a48]">
            {receitaPorKm >= 0.4
              ? "Excelente — corridas eficientes"
              : receitaPorKm >= 0.35
                ? "Bom — dentro da média"
                : receitaPorKm > 0
                  ? "Abaixo da média — muitos km mortos?"
                  : "Sem dados"}
          </p>
          <div className="border-t border-black/14 pt-2 mt-2">
            <p className="text-xs text-[#4a4a48]">
              Objetivo: ≥ 0,35€/km · Receita total: {formatEuro(receitaTotal)}
            </p>
          </div>
        </div>
      </div>

      {/* ═══ KPIs LINHA 2: De cada 10€ · Melhor dia · Streak/Variação ═══ */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mb-6">
        {/* 🪙 "De cada 10€, ficas com…" */}
        <div className="bg-white rounded-xl p-4 border border-black/18 border-l-[3px] border-l-amber-500">
          <div className="flex items-center justify-between mb-3">
            <p className="text-xs font-mono text-[#3a3a38] uppercase tracking-wider">
              O que fica no bolso
            </p>
            {hasSparklineData && sparklineSeries && (
              <SparklineChart
                data={sparklineSeries.margem}
                color="#f59e0b"
                refValue={50}
                refColor="#6366f1"
                showLastValue
              />
            )}
          </div>
          <div className="text-center py-2">
            <div className="flex items-center justify-center gap-2">
              <p className="text-3xl font-bold text-amber-600">
                {eurosPorDezFaturados > 0
                  ? `${eurosPorDezFaturados.toFixed(2)}€`
                  : "—"}
              </p>
              {hasSparklineData && sparklineTendencia && (
                <TrendBadge
                  trend={sparklineTendencia.margem}
                  isPartial={tIsPartial}
                  diasAtual={tDiasAtual}
                />
              )}
            </div>
            <p className="text-sm text-[#3a3a38] mt-1">
              de cada 10€ faturados
            </p>
          </div>
          <div className="border-t border-black/14 pt-2 mt-2 space-y-0.5">
            <p className="text-xs text-[#4a4a48]">
              Renda: {formatEuro(rendaTotal)} · Sobretaxa: {formatEuro(sobretaxa)}
            </p>
            <p className="text-xs text-[#4a4a48]">
              Energia: {formatEuro(custoEnergia)} · Custo total: {formatEuro(custoComEnergia)}
            </p>
          </div>
        </div>

        {/* ⭐ Melhor dia */}
        <div className="bg-white rounded-xl p-4 border border-black/18 border-l-[3px] border-l-emerald-500">
          <p className="text-xs font-mono text-[#3a3a38] uppercase tracking-wider mb-3">
            Destaque da semana
          </p>
          {melhorDia ? (
            <>
              <div className="flex items-center gap-2 mb-3">
                <Star size={20} className="text-amber-600 fill-amber-500" />
                <div>
                  <p className="text-lg font-bold text-[#111110]">
                    {melhorDia.dia} — {formatEuro(melhorDia.valor)}
                  </p>
                  <p className="text-xs text-emerald-600">Melhor dia em receita</p>
                </div>
              </div>
              {piorDia && piorDia.dia !== melhorDia.dia && (
                <div className="border-t border-black/14 pt-2">
                  <p className="text-xs text-[#4a4a48]">
                    Dia mais fraco: {piorDia.dia} — {formatEuro(piorDia.valor)}
                  </p>
                  <p className="text-xs text-[#4a4a48] mt-0.5">
                    Diferença: {formatEuro(melhorDia.valor - piorDia.valor)}
                  </p>
                </div>
              )}
            </>
          ) : (
            <p className="text-sm text-[#4a4a48]">Sem dados ainda</p>
          )}
        </div>

        {/* 🔥 Streak + Variação semanal */}
        <div className="bg-white rounded-xl p-4 border border-black/18 border-l-[3px] border-l-indigo-500">
          <p className="text-xs font-mono text-[#3a3a38] uppercase tracking-wider mb-3">
            Ritmo & tendência
          </p>
          <div className="flex items-center gap-2 mb-3">
            <Flame
              size={18}
              className={diasAcimaTarget >= 3 ? "text-orange-400" : "text-[#4a4a48]"}
            />
            <div>
              <p className="text-sm font-semibold text-[#111110]">
                {diasAcimaTarget} {diasAcimaTarget === 1 ? "dia" : "dias"} acima
                de {targetDiario} km
              </p>
              <p className="text-xs text-[#4a4a48]">
                Meta: {KM_BASE.toLocaleString("pt-PT")} km ÷ {diasEfetivosVal} dias
                {folgas > 0 && (
                  <span className="text-indigo-600">
                    {" "}({folgas} {folgas === 1 ? "folga" : "folgas"})
                  </span>
                )}
              </p>
            </div>
          </div>
          <div className="border-t border-black/14 pt-2">
            {hasSparklineData && sparklineTendencia ? (
              <div className="flex flex-col gap-2">
                <div className="flex items-center gap-2">
                  <TrendBadge
                    trend={sparklineTendencia.km}
                    isPartial={tIsPartial}
                    diasAtual={tDiasAtual}
                  />
                  <span className="text-xs text-[#4a4a48]">km vs semana anterior</span>
                </div>
                <div className="flex items-center gap-2">
                  <TrendBadge
                    trend={sparklineTendencia.lucroSoRenda}
                    isPartial={tIsPartial}
                    diasAtual={tDiasAtual}
                  />
                  <span className="text-xs text-[#4a4a48]">lucro vs semana anterior</span>
                </div>
              </div>
            ) : variacaoVsSemanaAnterior !== null ? (
              <div className="flex items-center gap-2">
                {variacaoVsSemanaAnterior >= 0 ? (
                  <TrendingUp size={16} className="text-emerald-600" />
                ) : (
                  <TrendingDown size={16} className="text-red-600" />
                )}
                <span
                  className={`text-sm font-semibold ${
                    variacaoVsSemanaAnterior >= 0 ? "text-emerald-600" : "text-red-600"
                  }`}
                >
                  {variacaoVsSemanaAnterior > 0 ? "+" : ""}
                  {variacaoVsSemanaAnterior}%
                </span>
                <span className="text-xs text-[#4a4a48]">vs semana anterior</span>
              </div>
            ) : null}
          </div>
        </div>
      </div>

      {/* ═══ PROJEÇÃO (semana atual) ═══ */}
      {isCurrentWeek && projecao && diasDecorridos < 7 && (
        <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-4 mb-6">
          <p className="text-xs text-emerald-700 font-mono uppercase tracking-wider mb-3">
            Se mantiveres este ritmo...
          </p>
          <div className="flex flex-wrap gap-6 items-center">
            <div>
              <p className="text-2xl font-bold text-emerald-900">
                ~{projecao.kmProjetado.toLocaleString("pt-PT")} km
              </p>
              <p className="text-xs text-emerald-600">km ao fim da semana</p>
            </div>
            <div className="h-10 w-px bg-emerald-200 hidden md:block" />
            <div>
              <p className="text-2xl font-bold text-emerald-900">
                ~{formatEuro(projecao.lucro)}
              </p>
              <p className="text-xs text-emerald-600">lucro projetado</p>
            </div>
            {projecao.kmFaltam > 0 && (
              <>
                <div className="h-10 w-px bg-emerald-200 hidden md:block" />
                <div>
                  <p className="text-2xl font-bold text-emerald-900">
                    {projecao.kmFaltam} km/dia
                  </p>
                  <p className="text-xs text-emerald-600">
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
        {/* Km acumulados */}
        <div className="bg-white rounded-xl p-5 border border-black/18">
          <h2 className="text-sm font-semibold text-[#111110] mb-4">
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
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(0,0,0,0.08)" />
              <XAxis
                dataKey="dia"
                tick={{ fontSize: 11, fill: "#4a4a48" }}
                axisLine={false}
                tickLine={false}
              />
              <YAxis
                tick={{ fontSize: 11, fill: "#4a4a48" }}
                axisLine={false}
                tickLine={false}
              />
              <Tooltip
                contentStyle={{
                  background: "#ffffff",
                  border: "1px solid rgba(0,0,0,0.08)",
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

        {/* Lucro acumulado — dual break-even */}
        <div className="bg-white rounded-xl p-5 border border-black/18">
          <div className="flex items-center justify-between mb-4 flex-wrap gap-2">
            <h2 className="text-sm font-semibold text-[#111110]">
              Quando começas a ganhar dinheiro
            </h2>
            <div className="flex items-center gap-2">
              {breakEvenDiaSoRenda && (
                <span className="text-xs bg-emerald-100 text-emerald-700 px-2 py-1 rounded-full whitespace-nowrap">
                  🟢 Só Renda: {breakEvenDiaSoRenda}
                </span>
              )}
              {breakEvenDia && (
                <span className="text-xs bg-amber-100 text-amber-700 px-2 py-1 rounded-full whitespace-nowrap">
                  🟡 Líquido: {breakEvenDia}
                </span>
              )}
              {!breakEvenDiaSoRenda && !breakEvenDia && (
                <span className="text-xs bg-red-100 text-red-700 px-2 py-1 rounded-full whitespace-nowrap">
                  Ainda não atingido
                </span>
              )}
            </div>
          </div>
          <ResponsiveContainer width="100%" height={220}>
            <AreaChart
              data={dadosAcumulados}
              margin={{ top: 10, right: 10, left: -10, bottom: 0 }}
            >
              <defs>
                <linearGradient id="gradLucroMotVerde" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#10b981" stopOpacity={0.2} />
                  <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
                </linearGradient>
                <linearGradient id="gradLucroMotAmarelo" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#f59e0b" stopOpacity={0.15} />
                  <stop offset="95%" stopColor="#f59e0b" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(0,0,0,0.08)" />
              <XAxis
                dataKey="dia"
                tick={{ fontSize: 11, fill: "#4a4a48" }}
                axisLine={false}
                tickLine={false}
              />
              <YAxis
                tick={{ fontSize: 11, fill: "#4a4a48" }}
                axisLine={false}
                tickLine={false}
                tickFormatter={(v) => `${v}€`}
              />
              <Tooltip
                contentStyle={{
                  background: "#ffffff",
                  border: "1px solid rgba(0,0,0,0.08)",
                  borderRadius: 8,
                  fontSize: 12,
                }}
                formatter={(v: number, name: string) => [
                  formatEuro(v),
                  name === "lucroSoRenda" ? "Sem contar energia" : "Lucro real",
                ]}
              />
              <ReferenceLine
                y={0}
                stroke="#4a4a48"
                strokeDasharray="4 4"
                label={{
                  value: "0€ — break-even",
                  fill: "#4a4a48",
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
                  value === "lucroSoRenda" ? "Sem contar energia" : "Lucro real"
                }
                wrapperStyle={{ fontSize: 11, paddingTop: 8 }}
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* ═══ 🆕 V.2.8.5 — CARD DESVIO ENERGIA (Real vs Estimado) ═══ */}
      {kmTotal > 0 && energiaTotalReal > 0 && (
        <div
          className={`rounded-xl p-4 border mb-6 ${
            desvioEnergiaColor === "emerald"
              ? "bg-emerald-50 border-emerald-200"
              : desvioEnergiaColor === "amber"
                ? "bg-amber-50 border-amber-200"
                : "bg-red-50 border-red-200"
          }`}
        >
          <div className="flex items-center gap-2 mb-3">
            <Battery
              size={16}
              className={
                desvioEnergiaColor === "emerald"
                  ? "text-emerald-600"
                  : desvioEnergiaColor === "amber"
                    ? "text-amber-600"
                    : "text-red-600"
              }
            />
            <p className="text-xs font-mono text-[#3a3a38] uppercase tracking-wider">
              Energia — Real vs Modelo
            </p>
            <span
              className={`text-[10px] px-2 py-0.5 rounded-full font-medium ${
                desvioEnergiaColor === "emerald"
                  ? "bg-emerald-100 text-emerald-700"
                  : desvioEnergiaColor === "amber"
                    ? "bg-amber-100 text-amber-700"
                    : "bg-red-100 text-red-700"
              }`}
            >
              {desvioEnergiaIcon} {desvioEnergiaLabel}
            </span>
          </div>
          <div className="grid grid-cols-3 gap-4 text-center">
            <div>
              <p className="text-lg font-bold text-[#111110]">
                {formatEuro(energiaTotalReal)}
              </p>
              <p className="text-xs text-[#4a4a48]">Custo real</p>
              <p className="text-[10px] text-[#4a4a48]">
                (carregamentos reais)
              </p>
            </div>
            <div>
              <p className="text-lg font-bold text-[#3a3a38]">
                {formatEuro(energiaEstimada)}
              </p>
              <p className="text-xs text-[#4a4a48]">Estimativa modelo</p>
              <p className="text-[10px] text-[#4a4a48]">
                ({kmTotal.toLocaleString("pt-PT")} km × {ENERGIA_POR_KM}€)
              </p>
            </div>
            <div>
              <p
                className={`text-lg font-bold ${
                  desvioEnergiaColor === "emerald"
                    ? "text-emerald-600"
                    : desvioEnergiaColor === "amber"
                      ? "text-amber-600"
                      : "text-red-600"
                }`}
              >
                {desvioEnergia > 0 ? "+" : ""}
                {desvioEnergia.toFixed(1)}%
              </p>
              <p className="text-xs text-[#4a4a48]">Desvio</p>
              <p className="text-[10px] text-[#4a4a48]">
                {desvioEnergia > 0
                  ? "Real acima do modelo"
                  : desvioEnergia < 0
                    ? "Real abaixo do modelo"
                    : "Modelo alinhado"}
              </p>
            </div>
          </div>
          {desvioAbs >= 15 && (
            <div className="mt-3 pt-3 border-t border-red-200">
              <p className="text-xs text-red-700 italic">
                💡 Desvio superior a 15% — verifica tarifário de carregamento ou consumo da viatura. Considera ajustar a constante ENERGIA_POR_KM ({ENERGIA_POR_KM}€/km).
              </p>
            </div>
          )}
        </div>
      )}

      {/* ═══ DETALHE DIÁRIO — V.2.8.5: tooltip com energia REAL ═══ */}
      <div className="bg-white rounded-xl p-5 border border-black/18 mb-6">
        <h2 className="text-sm font-semibold text-[#111110] mb-1">
          Os teus dias, um a um
        </h2>
        <p className="text-xs text-[#4a4a48] mb-4">
          Azul = km rodados · Verde = receita bruta
        </p>
        {apenasDesp ? (
          <div className="flex flex-col items-center justify-center h-32 rounded-lg border border-amber-200 bg-amber-50">
            <p className="text-sm text-amber-600 font-medium">
              Semana com custos mas sem actividade
            </p>
            <p className="text-xs text-amber-700 mt-1">
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
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(0,0,0,0.08)" />
              <XAxis
                dataKey="dia"
                tick={{ fontSize: 11, fill: "#4a4a48" }}
                axisLine={false}
                tickLine={false}
              />
              <YAxis
                yAxisId="km"
                orientation="left"
                tick={{ fontSize: 11, fill: "#6366f1" }}
                axisLine={false}
                tickLine={false}
                tickFormatter={(v) => `${v} km`}
                width={55}
              />
              <YAxis
                yAxisId="receita"
                orientation="right"
                tick={{ fontSize: 11, fill: "#10b981" }}
                axisLine={false}
                tickLine={false}
                tickFormatter={(v) => `${v}€`}
                width={55}
              />
              <Tooltip
                contentStyle={{
                  background: "#ffffff",
                  border: "1px solid rgba(0,0,0,0.08)",
                  borderRadius: 8,
                  fontSize: 12,
                }}
                content={({ active, payload, label }) => {
                  if (!active || !payload || payload.length === 0) return null;
                  const d = dadosDiarios.find((x) => x.dia === label);
                  if (!d) return null;

                  if (d.folga) {
                    return (
                      <div className="bg-white border border-black/14 rounded-lg p-3 shadow-xl">
                        <p className="text-sm font-bold text-[#111110] mb-1">
                          {label}
                        </p>
                        <div className="flex items-center gap-2">
                          <span className="text-lg">🛌</span>
                          <span className="text-sm text-indigo-700 font-medium">
                            Dia de folga
                          </span>
                        </div>
                      </div>
                    );
                  }

                  // 🆕 V.2.8.5 FIX: Usar custoEnergiaReal em vez de estimativa
                  const energiaDia = d.custoEnergiaReal;
                  const energiaEstDia = d.km * ENERGIA_POR_KM;
                  const rendaDia = d.renda;
                  const liquidoDia = d.receita - rendaDia - energiaDia;
                  const euroPorHora = d.horas > 0 ? liquidoDia / d.horas : 0;
                  const recKm = d.km > 0 ? d.receita / d.km : 0;

                  return (
                    <div className="bg-white border border-black/14 rounded-lg p-3 shadow-xl">
                      <p className="text-sm font-bold text-[#111110] mb-2">
                        {label}
                      </p>
                      <div className="space-y-1 text-xs">
                        <p className="text-indigo-700">
                          🚗 {d.km} km ·{" "}
                          {d.horas > 0 ? `${d.horas.toFixed(1)}h` : "sem horas"}
                        </p>
                        <p className="text-emerald-700">
                          💰 Receita: {formatEuro(d.receita)}
                        </p>
                        {d.km > 0 && (
                          <p className="text-[#3a3a38]">
                            📊 {recKm.toFixed(3)}€/km
                          </p>
                        )}
                        <div className="border-t border-black/14 pt-1 mt-1">
                          <p className="text-[#3a3a38]">
                            Renda: {formatEuro(rendaDia)} · Energia:{" "}
                            {formatEuro(energiaDia)}
                          </p>
                          {/* V.2.8.5: Indicador se energia real difere da estimada */}
                          {Math.abs(energiaDia - energiaEstDia) > 0.5 && (
                            <p className="text-[10px] text-[#4a4a48]">
                              (modelo: {formatEuro(energiaEstDia)} · Δ{" "}
                              {energiaEstDia > 0
                                ? (((energiaDia - energiaEstDia) / energiaEstDia) * 100).toFixed(0)
                                : "—"}
                              %)
                            </p>
                          )}
                          <p className="text-amber-600 font-semibold">
                            Líquido: {formatEuro(liquidoDia)}
                          </p>
                          {d.horas > 0 && (
                            <p className="text-amber-700">
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
                  color: "#4a4a48",
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
                    fill={
                      d.folga
                        ? "#c7d2fe"
                        : d.km === 0
                          ? "#e5e5e3"
                          : "#6366f1"
                    }
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
                    fill={
                      d.folga
                        ? "#c7d2fe"
                        : d.receita === 0
                          ? "#e5e5e3"
                          : "#10b981"
                    }
                  />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        )}
      </div>

      {/* ═══ RANKING DE DIAS ═══ */}
      {rankingDias.length > 1 && (
        <div className="bg-white rounded-xl p-5 border border-black/18 mb-6">
          <h2 className="text-sm font-semibold text-[#111110] mb-1">
            Ranking dos teus dias
          </h2>
          <p className="text-xs text-[#4a4a48] mb-4">
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
                      ? "bg-emerald-100 border border-emerald-200"
                      : isLast
                        ? "bg-red-50 border border-red-200"
                        : "bg-black/5"
                  }`}
                >
                  <span className="text-lg font-bold text-[#3a3a38] w-6 text-center">
                    {i + 1}
                  </span>
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-semibold text-[#111110]">
                        {d.dia}
                      </span>
                      {isFirst && (
                        <Star size={14} className="text-amber-600 fill-amber-500" />
                      )}
                    </div>
                    <div className="flex gap-4 mt-1">
                      <span className="text-xs text-[#3a3a38]">
                        {d.receitaPorHora > 0
                          ? `${d.receitaPorHora.toFixed(1)}€/h`
                          : "—"}
                      </span>
                      <span className="text-xs text-[#3a3a38]">
                        {d.receitaPorKm > 0
                          ? `${d.receitaPorKm.toFixed(3)}€/km`
                          : "—"}
                      </span>
                    </div>
                  </div>
                  <span
                    className={`text-sm font-mono font-bold ${
                      d.lucroLiquido >= 0 ? "text-emerald-600" : "text-red-600"
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
    </>
  );
}
