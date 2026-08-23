// =============================================================================
// SparklineChart.tsx — Componente SVG para mini-gráficos de tendência
// TVDE Fleet Master V.2.7.0
// TrendBadge: suporta normalização /dia, p.p., dead band, indicador parcial
// =============================================================================
import React, { useMemo } from "react";
import type { SparklineDataPoint, TrendValue } from "./types";

// ——— SparklineChart (sem alterações na lógica SVG) ———

interface SparklineChartProps {
  data: SparklineDataPoint[];
  /** Cor da linha principal */
  color?: string;
  /** Cor da segunda linha (dual perspective) */
  color2?: string;
  /** Valor de referência (linha tracejada horizontal) */
  refValue?: number;
  /** Cor da linha de referência */
  refColor?: string;
  /** Largura do SVG */
  width?: number;
  /** Altura do SVG */
  height?: number;
  /** Mostrar tooltip com último valor */
  showLastValue?: boolean;
  /** Sufixo do valor (€, %, km) */
  suffix?: string;
  /** Número de casas decimais */
  decimals?: number;
}

export function SparklineChart({
  data,
  color = "#10b981",
  color2,
  refValue,
  refColor = "#f59e0b",
  width = 120,
  height = 32,
  showLastValue = false,
  suffix = "",
  decimals = 0,
}: SparklineChartProps) {
  const padding = {
    top: 2,
    right: showLastValue ? 4 : 2,
    bottom: 2,
    left: 2,
  };
  const chartW = width - padding.left - padding.right;
  const chartH = height - padding.top - padding.bottom;

  const { path1, path2, refY, dots } = useMemo(() => {
    if (data.length < 2)
      return { path1: "", path2: "", refY: null, dots: [] };

    // Recolher todos os valores para calcular min/max
    const vals1 = data.map((d) => d.value);
    const vals2 = color2 ? data.map((d) => d.value2 ?? d.value) : [];
    const allVals = [...vals1, ...vals2];
    if (refValue !== undefined) allVals.push(refValue);

    let min = Math.min(...allVals);
    let max = Math.max(...allVals);

    // Evitar divisão por zero se todos os valores forem iguais
    if (max === min) {
      min = min - 1;
      max = max + 1;
    }

    const range = max - min;

    function toX(i: number): number {
      return padding.left + (i / (data.length - 1)) * chartW;
    }

    function toY(v: number): number {
      return padding.top + chartH - ((v - min) / range) * chartH;
    }

    // Linha principal
    const points1 = data.map((d, i) => `${toX(i)},${toY(d.value)}`);
    const p1 = `M${points1.join(" L")}`;

    // Segunda linha (se dual)
    let p2 = "";
    if (color2) {
      const points2 = data.map(
        (d, i) => `${toX(i)},${toY(d.value2 ?? d.value)}`
      );
      p2 = `M${points2.join(" L")}`;
    }

    // Referência
    const ry = refValue !== undefined ? toY(refValue) : null;

    // Pontos finais (dot no último valor)
    const lastIdx = data.length - 1;
    const dotsList = [
      { cx: toX(lastIdx), cy: toY(data[lastIdx].value), color },
    ];
    if (color2 && data[lastIdx].value2 !== undefined) {
      dotsList.push({
        cx: toX(lastIdx),
        cy: toY(data[lastIdx].value2!),
        color: color2,
      });
    }

    return { path1: p1, path2: p2, refY: ry, dots: dotsList };
  }, [data, color, color2, refValue, width, height, chartW, chartH, padding]);

  if (data.length < 2) {
    return (
      <div
        className="flex items-center justify-center text-gray-600"
        style={{ width, height }}
      >
        <span className="text-[9px]">sem dados</span>
      </div>
    );
  }

  const lastVal = data[data.length - 1];
  const prevVal = data[data.length - 2];
  const trend = lastVal.value - prevVal.value;
  const trendColor =
    trend > 0 ? "#10b981" : trend < 0 ? "#ef4444" : "#6b7280";

  return (
    <div className="flex items-center gap-1.5">
      <svg
        width={width}
        height={height}
        viewBox={`0 0 ${width} ${height}`}
        className="overflow-visible"
      >
        {/* Linha de referência */}
        {refY !== null && (
          <line
            x1={padding.left}
            y1={refY}
            x2={width - padding.right}
            y2={refY}
            stroke={refColor}
            strokeWidth={0.5}
            strokeDasharray="2 2"
            opacity={0.5}
          />
        )}

        {/* Segunda linha (amarelo — c/ Energia) */}
        {path2 && (
          <path
            d={path2}
            fill="none"
            stroke={color2}
            strokeWidth={1}
            opacity={0.6}
          />
        )}

        {/* Linha principal (verde — Só Renda) */}
        <path d={path1} fill="none" stroke={color} strokeWidth={1.5} />

        {/* Dots nos últimos pontos */}
        {dots.map((dot, i) => (
          <circle key={i} cx={dot.cx} cy={dot.cy} r={2} fill={dot.color} />
        ))}
      </svg>

      {/* Indicador de tendência (seta simples da sparkline) */}
      {showLastValue && (
        <span
          className="text-[10px] font-mono font-semibold"
          style={{ color: trendColor }}
        >
          {trend > 0 ? "▲" : trend < 0 ? "▼" : "—"}
        </span>
      )}
    </div>
  );
}

// =============================================================================
// TrendBadge V.2.7.0 — Badge de tendência normalizado
// Suporta: % /dia, p.p., dead band (cinza), indicador parcial ⏳
// =============================================================================

// ——— Overload 1: Legacy (valor simples — retrocompatibilidade) ———
// ——— Overload 2: TrendValue (normalizado — V.2.7.0) ———

interface TrendBadgeLegacyProps {
  value: number | null;
  suffix?: string;
  /** Não usado na versão legacy */
  trend?: undefined;
  isPartial?: undefined;
  diasAtual?: undefined;
}

interface TrendBadgeNormalizedProps {
  /** Ignorado se trend fornecido */
  value?: undefined;
  /** Ignorado se trend fornecido */
  suffix?: undefined;
  /** TrendValue com metadata completa */
  trend: TrendValue;
  /** Semana parcial? */
  isPartial?: boolean;
  /** Dias com dados na semana atual */
  diasAtual?: number;
}

type TrendBadgeProps = TrendBadgeLegacyProps | TrendBadgeNormalizedProps;

export function TrendBadge(props: TrendBadgeProps) {
  // ——— Detectar modo: Legacy vs Normalizado ———
  if ("trend" in props && props.trend !== undefined) {
    return <TrendBadgeNormalized {...props as TrendBadgeNormalizedProps} />;
  }
  return <TrendBadgeLegacy {...props as TrendBadgeLegacyProps} />;
}

// ——— Legacy (mantém comportamento original para quem usar value={number}) ———
function TrendBadgeLegacy({
  value,
  suffix = "%",
}: TrendBadgeLegacyProps) {
  if (value === null) return null;

  const isPositive = value > 0;
  const isNeutral = value === 0;
  const color = isPositive
    ? "text-emerald-400 bg-emerald-950/50"
    : isNeutral
      ? "text-gray-400 bg-gray-800/50"
      : "text-red-400 bg-red-950/50";
  const arrow = isPositive ? "▲" : isNeutral ? "—" : "▼";

  return (
    <span
      className={`inline-flex items-center gap-0.5 text-[10px] font-mono px-1.5 py-0.5 rounded ${color}`}
    >
      {arrow} {Math.abs(value).toFixed(1)}
      {suffix}
    </span>
  );
}

// ——— Normalizado V.2.7.0 ———
function TrendBadgeNormalized({
  trend,
  isPartial = false,
  diasAtual,
}: TrendBadgeNormalizedProps) {
  // Sem dados de comparação
  if (trend.value === null) return null;

  const val = trend.value;

  // Dead band — variação insignificante → cinza estável
  if (trend.isNeutral) {
    return (
      <span className="inline-flex items-center gap-0.5 text-[10px] font-mono px-1.5 py-0.5 rounded text-gray-400 bg-gray-800/50">
        — {Math.abs(val).toFixed(1)}
        {trend.displaySuffix}
      </span>
    );
  }

  const isPositive = val > 0;
  const color = isPositive
    ? "text-emerald-400 bg-emerald-950/50"
    : "text-red-400 bg-red-950/50";
  const arrow = isPositive ? "▲" : "▼";

  return (
    <span className="inline-flex items-center gap-1">
      {/* Badge principal */}
      <span
        className={`inline-flex items-center gap-0.5 text-[10px] font-mono px-1.5 py-0.5 rounded ${color}`}
      >
        {arrow} {Math.abs(val).toFixed(1)}
        {trend.displaySuffix}
      </span>

      {/* Indicador de semana parcial */}
      {isPartial && diasAtual !== undefined && (
        <span className="text-[9px] font-mono text-gray-500" title={`Dados de ${diasAtual} dia${diasAtual !== 1 ? "s" : ""} — semana incompleta`}>
          ⏳ {diasAtual}/7d
        </span>
      )}
    </span>
  );
}
