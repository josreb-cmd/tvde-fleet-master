// src/components/rentabilidade/KmRentabilidadeGestor.tsx
// Vista Gestor — V.2.8.7
// ✅ V.2.8.1: TrendBadge normalizado + ritmo ideal dinâmico
// ✅ V.2.8.7 FIX #1: Barras folga com cor distinta (#1e1b4b) no Detalhe Diário
// ✅ V.2.8.7 FIX #2: Tooltip custom no Detalhe Diário (renda, energia real, lucro, €/hora)
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
import { AlertCircle, CheckCircle, Info, TrendingUp } from "lucide-react";
import type {
  KmRentabilidadeData,
  SparklineDataPoint,
  SparklineTendencia,
} from "./types";
import {
  KM_BASE,
  ENERGIA_POR_KM,
  TAXA_ADICIONAL,
  RECEITA_ESTIMADA_POR_KM,
  RENDA_SEMANAL,
} from "./constants";
import { SparklineChart, TrendBadge } from "./SparklineChart";

// ——— Tipos de props ———

interface SparklineSeries {
  km: SparklineDataPoint[];
  lucro: SparklineDataPoint[];
  margem: SparklineDataPoint[];
  rendimentoHora: SparklineDataPoint[];
  receitaPorKm: SparklineDataPoint[];
}

interface GestorProps {
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

export function KmRentabilidadeGestor({
  data,
  sparklineSeries,
  sparklineTendencia,
  hasSparklineData = false,
}: GestorProps) {
  const {
    kmTotal,
    kmExtra,
    sobretaxa,
    custoTotal,
    custoEnergia,
    receitaTotal,
    rendaTotal,
    lucroSoRenda,
    lucroLiquido,
    margemSoRenda,
    margemLiquida,
    rendimentoHoraSoRenda,
    rendimentoHoraLiquido,
    custoPorKm,
    receitaPorKm,
    horasTotal,
    statusColor,
    apenasDesp,
    isCurrentWeek,
    diasDecorridos,
    projecao,
    dadosDiarios,
    dadosAcumulados,
    tabelaSensibilidade,
    // V.2.8.1
    diasEfetivos,
    kmDiaTarget,
  } = data;

  // Metadata de parcialidade (usada em todos os TrendBadge)
  const tIsPartial = sparklineTendencia?.isPartial ?? false;
  const tDiasAtual = sparklineTendencia?.diasAtual ?? 0;

  return (
    <>
      {/* —— KPIs (linha 1: 3 cards) —— */}
      <div className="grid grid-cols-2 md:grid-cols-3 gap-3 mb-3">
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
          sparkline={
            hasSparklineData && sparklineSeries ? (
              <SparklineChart
                data={sparklineSeries.km}
                color="#6366f1"
                refValue={KM_BASE}
                refColor="#f59e0b"
                showLastValue
              />
            ) : undefined
          }
          trend={
            hasSparklineData && sparklineTendencia ? (
              <TrendBadge
                trend={sparklineTendencia.km}
                isPartial={tIsPartial}
                diasAtual={tDiasAtual}
              />
            ) : undefined
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

        {/* Card Lucro — dupla linha */}
        <div
          className="bg-gray-900 rounded-xl p-4 border border-gray-800 relative overflow-hidden col-span-2 md:col-span-1"
          style={{
            borderLeftColor: lucroLiquido >= 0 ? "#10b981" : "#ef4444",
            borderLeftWidth: 3,
          }}
        >
          <div className="flex items-center justify-between mb-3">
            <p className="text-xs font-mono text-gray-400 uppercase tracking-wider">
              Lucro
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
          <div className="flex justify-between items-center mb-2">
            <div className="flex items-center gap-2">
              <span className="text-xs text-gray-500">Só Renda</span>
              {hasSparklineData && sparklineTendencia && (
                <TrendBadge
                  trend={sparklineTendencia.lucroSoRenda}
                  isPartial={tIsPartial}
                  diasAtual={tDiasAtual}
                />
              )}
            </div>
            <span className="text-xl font-bold text-green-400">
              {formatEuro(lucroSoRenda)}
            </span>
          </div>
          <div className="flex justify-between items-center mb-3">
            <div className="flex items-center gap-2">
              <span className="text-xs text-gray-500">Líquido</span>
              {hasSparklineData && sparklineTendencia && (
                <TrendBadge
                  trend={sparklineTendencia.lucroLiquido}
                  isPartial={tIsPartial}
                  diasAtual={tDiasAtual}
                />
              )}
            </div>
            <span className="text-xl font-bold text-yellow-400">
              {formatEuro(lucroLiquido)}
            </span>
          </div>
          <div className="border-t border-gray-700 pt-2 space-y-0.5">
            <p className="text-xs text-gray-500">
              Receita: {formatEuro(receitaTotal)}
            </p>
            <p className="text-xs text-gray-600">
              Renda: {formatEuro(rendaTotal)} · Sobretaxa:{" "}
              {formatEuro(sobretaxa)} · Energia: {formatEuro(custoEnergia)}
            </p>
          </div>
        </div>
      </div>

      {/* —— KPIs (linha 2: Margem + Rendimento/hora + Info) —— */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mb-6">
        {/* Card MARGEM */}
        <div
          className="bg-gray-900 rounded-xl p-4 border border-gray-800 border-l-[3px]"
          style={{
            borderLeftColor: margemSoRenda > 40 ? "#10b981" : "#f59e0b",
          }}
        >
          <div className="flex items-center justify-between mb-3">
            <p className="text-xs font-mono text-gray-400 uppercase tracking-wider">
              Margem
            </p>
            {hasSparklineData && sparklineSeries && (
              <SparklineChart
                data={sparklineSeries.margem}
                color="#10b981"
                color2="#f59e0b"
                refValue={50}
                refColor="#6366f1"
                showLastValue
              />
            )}
          </div>
          <div className="flex justify-between items-center mb-2">
            <div className="flex items-center gap-2">
              <span className="text-xs text-gray-500">Só Renda</span>
              {hasSparklineData && sparklineTendencia && (
                <TrendBadge
                  trend={sparklineTendencia.margem}
                  isPartial={tIsPartial}
                  diasAtual={tDiasAtual}
                />
              )}
            </div>
            <span className="text-xl font-bold text-green-400">
              {margemSoRenda.toFixed(1)}%
            </span>
          </div>
          <div className="flex justify-between items-center mb-3">
            <span className="text-xs text-gray-500">c/ Energia</span>
            <span className="text-xl font-bold text-yellow-400">
              {margemLiquida.toFixed(1)}%
            </span>
          </div>
          <div className="border-t border-gray-700 pt-2 flex justify-between items-center">
            <span className="text-xs text-gray-500">
              ⚡ Energia: {formatEuro(custoEnergia)}
            </span>
            <span className="text-xs text-gray-600">
              Custo/km: {custoPorKm.toFixed(3)}€
            </span>
          </div>
        </div>

        {/* Card RENDIMENTO/HORA */}
        <div
          className="bg-gray-900 rounded-xl p-4 border border-gray-800 border-l-[3px]"
          style={{
            borderLeftColor:
              rendimentoHoraSoRenda >= 10
                ? "#10b981"
                : rendimentoHoraSoRenda >= 0
                  ? "#f59e0b"
                  : "#ef4444",
          }}
        >
          <div className="flex items-center justify-between mb-3">
            <p className="text-xs font-mono text-gray-400 uppercase tracking-wider">
              Rendimento/hora
            </p>
            {hasSparklineData && sparklineSeries && (
              <SparklineChart
                data={sparklineSeries.rendimentoHora}
                color="#10b981"
                color2="#f59e0b"
                refValue={6.5}
                refColor="#ef4444"
                showLastValue
              />
            )}
          </div>
          <div className="flex justify-between items-center mb-2">
            <div className="flex items-center gap-2">
              <span className="text-xs text-gray-500">Só Renda</span>
              {hasSparklineData && sparklineTendencia && (
                <TrendBadge
                  trend={sparklineTendencia.rendimentoHora}
                  isPartial={tIsPartial}
                  diasAtual={tDiasAtual}
                />
              )}
            </div>
            <span className="text-xl font-bold text-green-400">
              {horasTotal > 0
                ? `${rendimentoHoraSoRenda.toFixed(2)}€/h`
                : "—"}
            </span>
          </div>
          <div className="flex justify-between items-center mb-3">
            <span className="text-xs text-gray-500">c/ Energia</span>
            <span className="text-xl font-bold text-yellow-400">
              {horasTotal > 0
                ? `${rendimentoHoraLiquido.toFixed(2)}€/h`
                : "—"}
            </span>
          </div>
          <div className="border-t border-gray-700 pt-2 flex justify-between items-center">
            <span className="text-xs text-gray-500">
              🕐{" "}
              {horasTotal > 0
                ? `${horasTotal.toFixed(1)}h trabalhadas`
                : "Sem horas registadas"}
            </span>
            <span className="text-xs text-gray-600">
              Rec/km: {receitaPorKm.toFixed(3)}€
            </span>
          </div>
        </div>

        {/* Card INFO — V.2.8.1 legenda inclui nota sobre ritmo dinâmico */}
        <div className="bg-gray-900 rounded-xl p-4 border border-gray-700 border-l-[3px] border-l-indigo-500">
          <p className="text-xs font-mono text-gray-400 uppercase tracking-wider mb-3 flex items-center gap-1.5">
            <Info size={14} className="text-indigo-400" />
            Como ler
          </p>
          <div className="space-y-3 text-xs">
            <div>
              <span className="text-green-400 font-semibold">Só Renda</span>
              <p className="text-gray-500 mt-0.5">
                Custo = Renda + Sobretaxa
              </p>
            </div>
            <div>
              <span className="text-yellow-400 font-semibold">
                Líquido / c/ Energia
              </span>
              <p className="text-gray-500 mt-0.5">
                Custo = Renda + Sobretaxa + Energia
              </p>
            </div>
            {/* Legenda sparklines + TrendBadge normalizado */}
            {hasSparklineData && (
              <div className="border-t border-gray-700 pt-2">
                <div className="flex items-center gap-1.5 mb-1">
                  <TrendingUp size={12} className="text-indigo-400" />
                  <span className="text-indigo-300 font-semibold">
                    Tendência (8 semanas)
                  </span>
                </div>
                <p className="text-gray-500 mt-0.5">
                  Mini-gráficos com evolução semanal.
                  Tracejado = referência (2000km, 50% margem, 6.5€/h SMN).
                </p>
                <div className="flex flex-col gap-1.5 mt-2">
                  {/* Linhas de cor */}
                  <div className="flex items-center gap-3">
                    <span className="flex items-center gap-1">
                      <span className="inline-block w-3 h-0.5 bg-emerald-500 rounded" />
                      <span className="text-gray-500">Só Renda</span>
                    </span>
                    <span className="flex items-center gap-1">
                      <span className="inline-block w-3 h-0.5 bg-amber-500 rounded" />
                      <span className="text-gray-500">c/ Energia</span>
                    </span>
                  </div>
                  {/* Badges explicados */}
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="flex items-center gap-1">
                      <span className="text-emerald-400 text-[10px] font-mono">▲ 7.5% /dia</span>
                      <span className="text-gray-600">= média diária vs semana ant.</span>
                    </span>
                  </div>
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="flex items-center gap-1">
                      <span className="text-red-400 text-[10px] font-mono">▼ 4.9 p.p.</span>
                      <span className="text-gray-600">= variação de margem</span>
                    </span>
                  </div>
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="flex items-center gap-1">
                      <span className="text-gray-400 text-[10px] font-mono">— 0.3%</span>
                      <span className="text-gray-600">= variação mínima (estável)</span>
                    </span>
                    <span className="flex items-center gap-1">
                      <span className="text-gray-500 text-[9px]">⏳ 2/7d</span>
                      <span className="text-gray-600">= semana incompleta</span>
                    </span>
                  </div>
                </div>
              </div>
            )}
            {/* V.2.8.1 — Nota sobre ritmo dinâmico */}
            <div className="border-t border-gray-700 pt-2 space-y-1 text-gray-500">
              <p>⚡ Energia: {ENERGIA_POR_KM.toFixed(3)}€/km</p>
              <p>📍 Base: {KM_BASE.toLocaleString("pt-PT")} km</p>
              <p>💰 Sobretaxa: {TAXA_ADICIONAL.toFixed(2)}€/km</p>
              <p>
                🎯 Ritmo: {kmDiaTarget} km/dia ({diasEfetivos} dias efetivos
                {data.diasFolga > 0 && (
                  <span className="text-amber-400">
                    {" "}· {data.diasFolga} folga{data.diasFolga !== 1 ? "s" : ""}
                  </span>
                )}
                )
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* —— Projeção (semana atual) —— */}
      {isCurrentWeek && projecao && diasDecorridos < 7 && (
        <div className="bg-indigo-950 border border-indigo-800 rounded-xl p-4 mb-6 flex flex-wrap gap-6 items-center">
          <div>
            <p className="text-xs text-indigo-300 font-mono uppercase tracking-wider mb-1">
              Projeção ao fim da semana
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
              assume renda máx. 350€/sem
            </p>
          </div>
          <div className="h-10 w-px bg-indigo-800 hidden md:block" />
          <div>
            <p className="text-xs text-indigo-300 font-mono uppercase tracking-wider mb-1">
              Km/dia necessários
            </p>
            <p className="text-2xl font-bold text-indigo-100">
              {projecao.kmFaltam} km
            </p>
            <p className="text-xs text-indigo-400">
              para atingir os {KM_BASE.toLocaleString("pt-PT")} km
            </p>
          </div>
        </div>
      )}

      {/* —— Gráficos —— */}
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
                  value: `${KM_BASE.toLocaleString("pt-PT")} km`,
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

        {/* Lucro acumulado — dual line */}
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
                <linearGradient id="gradLucroLiq" x1="0" y1="0" x2="0" y2="1">
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
                  name === "lucroSoRenda" ? "Só Renda" : "Líquido",
                ]}
              />
              <ReferenceLine
                y={0}
                stroke="#ef4444"
                strokeDasharray="3 3"
                strokeWidth={1}
                label={{
                  value: "break-even",
                  fill: "#ef4444",
                  fontSize: 9,
                  position: "insideTopLeft",
                }}
              />
              <Area
                type="monotone"
                dataKey="lucroSoRenda"
                stroke="#10b981"
                strokeWidth={2}
                fill="url(#gradLucro)"
                dot={false}
                name="lucroSoRenda"
              />
              <Area
                type="monotone"
                dataKey="lucroLiquido"
                stroke="#f59e0b"
                strokeWidth={1.5}
                fill="url(#gradLucroLiq)"
                dot={false}
                name="lucroLiquido"
                strokeDasharray="4 2"
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* ═══════════════════════════════════════════════════════
       * V.2.8.7 FIX #1 + #2 — Detalhe diário com folgas e tooltip custom
       * ═══════════════════════════════════════════════════════ */}
      <div className="bg-gray-900 rounded-xl p-5 border border-gray-800 mb-6">
        <h2 className="text-sm font-semibold text-gray-300 mb-1">
          Km rodados e receita por dia
        </h2>
        <p className="text-xs text-gray-500 mb-4">
          Barras azuis = km (eixo esquerdo) · barras verdes = receita bruta
          (eixo direito)
        </p>
        {apenasDesp ? (
          <div className="flex flex-col items-center justify-center h-32 rounded-lg border border-amber-800/40 bg-amber-950/20">
            <p className="text-sm text-amber-400 font-medium">
              Dias de custo sem actividade registada
            </p>
            <p className="text-xs text-amber-600 mt-1">
              Renda paga: {formatEuro(data.rendaTotal)} · Km e receita: 0
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
              {/* ═══ V.2.8.7 — Tooltip custom (alinhado com Motorista) ═══ */}
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

                  // ═══ V.2.8.7 FIX #1: tooltip de folga ═══
                  if (d.folga) {
                    return (
                      <div className="bg-gray-900 border border-gray-700 rounded-lg p-3 shadow-xl">
                        <p className="text-sm font-bold text-white mb-1">
                          {label}
                        </p>
                        <div className="flex items-center gap-2">
                          <span className="text-lg">🛌</span>
                          <span className="text-sm text-indigo-300 font-medium">
                            Dia de folga
                          </span>
                        </div>
                        {d.renda > 0 && (
                          <p className="text-xs text-gray-500 mt-1">
                            Renda: {formatEuro(d.renda)} (custo fixo)
                          </p>
                        )}
                      </div>
                    );
                  }

                  // ═══ V.2.8.7 FIX #2: tooltip completo para gestor ═══
                  const energiaDia = d.custoEnergiaReal;
                  const energiaEstDia = d.km * ENERGIA_POR_KM;
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
                          {d.horas > 0 ? `${d.horas.toFixed(1)}h` : "sem horas"}
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
                          {Math.abs(energiaDia - energiaEstDia) > 0.5 && (
                            <p className="text-[10px] text-gray-600">
                              (modelo: {formatEuro(energiaEstDia)} · Δ{" "}
                              {energiaEstDia > 0
                                ? (((energiaDia - energiaEstDia) / energiaEstDia) * 100).toFixed(0)
                                : "—"}
                              %)
                            </p>
                          )}
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
              {/* ═══ V.2.8.7 FIX #1: barras folga com cor distinta ═══ */}
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
                        ? "#1e1b4b"
                        : d.km === 0
                          ? "#374151"
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
                        ? "#1e1b4b"
                        : d.receita === 0
                          ? "#374151"
                          : "#10b981"
                    }
                  />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        )}
      </div>

      {/* —— Tabela de sensibilidade —— */}
      <div className="bg-gray-900 rounded-xl p-5 border border-gray-800">
        <h2 className="text-sm font-semibold text-gray-300 mb-1">
          Tabela de sensibilidade — custo semanal por volume de km
        </h2>
        <p className="text-xs text-gray-500 mb-4">
          Receita estimada a {RECEITA_ESTIMADA_POR_KM.toFixed(2)}€/km (média
          ilustrativa — o valor real varia por turno)
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
                <th className="pb-2 pr-4 font-medium text-gray-400">
                  Custo total
                </th>
                <th className="pb-2 pr-4 font-medium text-gray-400">
                  Rec. estimada
                </th>
                <th className="pb-2 pr-4 font-medium text-gray-400">
                  Margem est.
                </th>
              </tr>
            </thead>
            <tbody>
              {tabelaSensibilidade.map((m) => {
                const isAtual = Math.abs(m.km - kmTotal) < 150;
                return (
                  <tr
                    key={m.km}
                    className={`border-b border-gray-800/50 ${
                      isAtual ? "bg-indigo-950/50" : ""
                    }`}
                  >
                    <td className="py-2 pr-4 font-mono font-semibold text-white">
                      {m.km.toLocaleString("pt-PT")}
                      {isAtual && (
                        <span className="ml-2 text-[10px] bg-indigo-700 text-indigo-200 px-1.5 py-0.5 rounded">
                          actual
                        </span>
                      )}
                    </td>
                    <td className="py-2 pr-4 font-mono text-gray-300">
                      {m.kmExtra > 0
                        ? `+${m.kmExtra.toLocaleString("pt-PT")}`
                        : "—"}
                    </td>
                    <td className="py-2 pr-4 font-mono text-amber-400">
                      {m.sobretaxa > 0 ? formatEuro(m.sobretaxa) : "—"}
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
          Acima dos {KM_BASE.toLocaleString("pt-PT")} km cada km adicional custa mais{" "}
          {TAXA_ADICIONAL.toFixed(2)}€ — mas continua rentável enquanto a receita
          por km superar esse valor.
        </p>
      </div>
    </>
  );
}

// =============================================================================
// KpiCard — com slots de sparkline e trend
// =============================================================================
function KpiCard({
  label,
  value,
  sub,
  accent,
  icon,
  sparkline,
  trend,
}: {
  label: string;
  value: string;
  sub: string;
  accent: string;
  icon?: React.ReactNode;
  sparkline?: React.ReactNode;
  trend?: React.ReactNode;
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
        <div className="flex items-center gap-2">
          {sparkline}
          {icon}
        </div>
      </div>
      <div className="flex items-center gap-2 mb-0.5">
        <p className="text-2xl font-bold text-white">{value}</p>
        {trend}
      </div>
      <p className="text-xs text-gray-500">{sub}</p>
    </div>
  );
}
