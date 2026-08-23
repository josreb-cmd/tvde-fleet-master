// =============================================================================
// useWeeklySparklines.ts — Snapshots semanais para sparklines (últimas N semanas)
// TVDE Fleet Master V.2.8.0
// Normalização temporal: compara médias diárias, não totais brutos
// Margens em p.p. (pontos percentuais), não variação relativa
// Dead band: variações < TREND_THRESHOLD → neutro
// hoursWorked = number (decimal). Ex: 8.75 = 8h45min
// Deteção de folga: isDayOff() — convenção híbrida (nota + zeros)
// =============================================================================
import { useMemo } from "react";
import { useTVDE } from "../../contexts/TVDEContext";
import { isDayOff } from "../../utils/dayOff";
import {
  RENDA_SEMANAL,
  KM_BASE,
  TAXA_ADICIONAL,
  ENERGIA_POR_KM,
} from "./constants";
import type {
  WeeklySnapshot,
  SparklineDataPoint,
  SparklineTendencia,
  TrendValue,
} from "./types";

// ——— Constantes ———

/** Variações abaixo deste limiar (em valor absoluto) são consideradas neutras */
const TREND_THRESHOLD = 2;

// ——— Helpers ———

function getWeekBounds(offset: number) {
  const now = new Date();
  const day = now.getDay();
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

/** Rótulo compacto: "dd/mm" da segunda-feira */
function weekLabel(monday: Date): string {
  const d = String(monday.getDate()).padStart(2, "0");
  const m = String(monday.getMonth() + 1).padStart(2, "0");
  return `${d}/${m}`;
}

/**
 * Verifica se uma semana (pelo offset) é a semana corrente.
 * offset === 0 → semana actual.
 */
function isCurrentWeekFn(offset: number): boolean {
  return offset === 0;
}

/**
 * Variação percentual NORMALIZADA por dia.
 * Compara (totalAtual / diasAtual) vs (totalAnterior / diasAnterior).
 * Retorna TrendValue com type="pct" e sufixo "% /dia" se parcial.
 */
function pctSafeNormalized(
  totalAtual: number,
  diasAtual: number,
  totalAnterior: number,
  diasAnterior: number,
  isPartial: boolean
): TrendValue {
  // Sem dias em qualquer das semanas → sem comparação
  if (diasAtual === 0 || diasAnterior === 0) {
    return {
      value: null,
      type: "pct",
      displaySuffix: isPartial ? "% /dia" : "%",
      isNeutral: true,
    };
  }

  const mediaDiaAtual = totalAtual / diasAtual;
  const mediaDiaAnterior = totalAnterior / diasAnterior;

  // Denominador zero (semana anterior sem dados reais)
  if (mediaDiaAnterior === 0) {
    return {
      value: null,
      type: "pct",
      displaySuffix: isPartial ? "% /dia" : "%",
      isNeutral: true,
    };
  }

  const raw =
    ((mediaDiaAtual - mediaDiaAnterior) / Math.abs(mediaDiaAnterior)) * 100;
  // Clamp ±999.9%
  const clamped = Math.max(-999.9, Math.min(999.9, raw));
  const value = parseFloat(clamped.toFixed(1));

  return {
    value,
    type: "pct",
    displaySuffix: isPartial ? "% /dia" : "%",
    isNeutral: Math.abs(value) < TREND_THRESHOLD,
  };
}

/**
 * Diferença em pontos percentuais para métricas que já são % (margem, etc.).
 * Ex: 55.6% → 60.5% = +4.9 p.p.
 */
function ppDiff(
  pctAtual: number,
  diasAtual: number,
  pctAnterior: number,
  diasAnterior: number
): TrendValue {
  // Sem dados suficientes
  if (diasAtual === 0 || diasAnterior === 0) {
    return {
      value: null,
      type: "pp",
      displaySuffix: "p.p.",
      isNeutral: true,
    };
  }

  // Margem é uma taxa (já normalizada por natureza), não precisa de ÷ dias
  const diff = parseFloat((pctAtual - pctAnterior).toFixed(1));

  return {
    value: diff,
    type: "pp",
    displaySuffix: "p.p.",
    isNeutral: Math.abs(diff) < TREND_THRESHOLD,
  };
}

// ——— Hook principal ———

/**
 * Devolve snapshots semanais e séries prontas para sparklines.
 * @param numWeeks Número de semanas a incluir (default 8)
 * @param currentWeekOffset Offset da semana selecionada no UI (para isPartial)
 */
export function useWeeklySparklines(
  numWeeks = 8,
  currentWeekOffset = 0
) {
  const { shiftLogs } = useTVDE();

  // ——— Calcular snapshots para cada semana ———
  const snapshots: WeeklySnapshot[] = useMemo(() => {
    const result: WeeklySnapshot[] = [];

    for (let offset = -(numWeeks - 1); offset <= 0; offset++) {
      const { monday, sunday } = getWeekBounds(offset);
      const mondayStr = toDateStr(monday);
      const sundayStr = toDateStr(sunday);

      // Filtrar shiftLogs desta semana
      const weekShifts = shiftLogs.filter(
        (s) => s.date >= mondayStr && s.date <= sundayStr
      );

      // Agregar totais
      const kmTotal = weekShifts.reduce(
        (a, s) => a + (s.kilometers || 0),
        0
      );
      const receitaTotal = weekShifts.reduce(
        (a, s) => a + (s.grossEarnings || 0),
        0
      );
      const rendaTotal = weekShifts.reduce(
        (a, s) => a + (s.rentalExpenseAmount || 0),
        0
      );
      // hoursWorked é number decimal — guard com typeof
      const horasTotal = weekShifts.reduce(
        (a, s) =>
          a + (typeof s.hoursWorked === "number" ? s.hoursWorked : 0),
        0
      );

      // ——— Dias trabalhados usando isDayOff() ———
      // Primeiro, agrupar shifts por data
      const shiftsPorData = new Map<string, typeof weekShifts>();
      for (const s of weekShifts) {
        const existing = shiftsPorData.get(s.date) || [];
        existing.push(s);
        shiftsPorData.set(s.date, existing);
      }

      // Contar dias com actividade real (não folga)
      let diasTrabalhados = 0;
      for (const [, dayShifts] of shiftsPorData) {
        const allDayOff = dayShifts.every((s) => isDayOff(s));
        if (!allDayOff) {
          // Verificar se tem actividade real
          const temActividade = dayShifts.some(
            (s) => (s.kilometers || 0) > 0 || (s.grossEarnings || 0) > 0
          );
          if (temActividade) diasTrabalhados++;
        }
      }

      // Custos (perspetiva contratual — usa rendaTotal real)
      const kmExtra = Math.max(0, kmTotal - KM_BASE);
      const sobretaxa = kmExtra * TAXA_ADICIONAL;
      const custoTotal = rendaTotal + sobretaxa;
      const custoEnergia = kmTotal * ENERGIA_POR_KM;

      // Métricas "Só Renda"
      const lucroSoRenda = receitaTotal - custoTotal;
      const margemSoRenda =
        receitaTotal > 0 ? (lucroSoRenda / receitaTotal) * 100 : 0;
      const rendimentoHoraSoRenda =
        horasTotal > 0 ? lucroSoRenda / horasTotal : 0;

      // Métricas "Líquido"
      const lucroLiquido = receitaTotal - custoTotal - custoEnergia;
      const margemLiquida =
        receitaTotal > 0 ? (lucroLiquido / receitaTotal) * 100 : 0;
      const rendimentoHoraLiquido =
        horasTotal > 0 ? lucroLiquido / horasTotal : 0;

      // Métricas comuns
      const receitaPorKm = kmTotal > 0 ? receitaTotal / kmTotal : 0;
      const custoPorKm =
        kmTotal > 0
          ? custoTotal / kmTotal
          : rendaTotal > 0
            ? rendaTotal / KM_BASE
            : RENDA_SEMANAL / KM_BASE;

      result.push({
        weekLabel: weekLabel(monday),
        monday: new Date(monday),
        kmTotal,
        receitaTotal,
        rendaTotal,
        horasTotal,
        diasTrabalhados,
        kmExtra,
        sobretaxa,
        custoTotal,
        custoEnergia,
        lucroSoRenda,
        lucroLiquido,
        margemSoRenda,
        margemLiquida,
        rendimentoHoraSoRenda,
        rendimentoHoraLiquido,
        receitaPorKm,
        custoPorKm,
      });
    }

    return result;
  }, [shiftLogs, numWeeks]);

  // ——— Filtrar semanas com dados (excluir semanas vazias no início) ———
  const snapshotsComDados = useMemo(() => {
    const firstIdx = snapshots.findIndex(
      (s) => s.kmTotal > 0 || s.receitaTotal > 0
    );
    if (firstIdx < 0) return [];
    return snapshots.slice(firstIdx);
  }, [snapshots]);

  // ——— Séries prontas para SparklineChart ———
  const series = useMemo(() => {
    const s = snapshotsComDados;
    if (s.length === 0)
      return {
        km: [] as SparklineDataPoint[],
        lucro: [] as SparklineDataPoint[],
        margem: [] as SparklineDataPoint[],
        rendimentoHora: [] as SparklineDataPoint[],
        receitaPorKm: [] as SparklineDataPoint[],
      };

    const km: SparklineDataPoint[] = s.map((w) => ({
      label: w.weekLabel,
      value: w.kmTotal,
    }));

    const lucro: SparklineDataPoint[] = s.map((w) => ({
      label: w.weekLabel,
      value: w.lucroSoRenda,
      value2: w.lucroLiquido,
    }));

    const margem: SparklineDataPoint[] = s.map((w) => ({
      label: w.weekLabel,
      value: w.margemSoRenda,
      value2: w.margemLiquida,
    }));

    const rendimentoHora: SparklineDataPoint[] = s.map((w) => ({
      label: w.weekLabel,
      value: w.rendimentoHoraSoRenda,
      value2: w.rendimentoHoraLiquido,
    }));

    const receitaPorKm: SparklineDataPoint[] = s.map((w) => ({
      label: w.weekLabel,
      value: w.receitaPorKm,
    }));

    return { km, lucro, margem, rendimentoHora, receitaPorKm };
  }, [snapshotsComDados]);

  // ——— Tendência NORMALIZADA (último vs penúltimo) ———
  const tendencia: SparklineTendencia | null = useMemo(() => {
    const s = snapshotsComDados;
    if (s.length < 2) return null;

    const atual = s[s.length - 1];
    const anterior = s[s.length - 2];

    // Guard: se a semana anterior não tinha dados, não calcular
    if (anterior.kmTotal === 0 && anterior.receitaTotal === 0) return null;

    const diasAtual = atual.diasTrabalhados;
    const diasAnterior = anterior.diasTrabalhados;

    // A semana "atual" no array é sempre offset=0 (a corrente).
    // Verifica se é parcial (ainda não acabou).
    const isPartial = isCurrentWeekFn(0);

    return {
      km: pctSafeNormalized(
        atual.kmTotal,
        diasAtual,
        anterior.kmTotal,
        diasAnterior,
        isPartial
      ),
      receita: pctSafeNormalized(
        atual.receitaTotal,
        diasAtual,
        anterior.receitaTotal,
        diasAnterior,
        isPartial
      ),
      lucroSoRenda: pctSafeNormalized(
        atual.lucroSoRenda,
        diasAtual,
        anterior.lucroSoRenda,
        diasAnterior,
        isPartial
      ),
      lucroLiquido: pctSafeNormalized(
        atual.lucroLiquido,
        diasAtual,
        anterior.lucroLiquido,
        diasAnterior,
        isPartial
      ),
      margem: ppDiff(
        atual.margemSoRenda,
        diasAtual,
        anterior.margemSoRenda,
        diasAnterior
      ),
      rendimentoHora: pctSafeNormalized(
        atual.rendimentoHoraSoRenda,
        diasAtual,
        anterior.rendimentoHoraSoRenda,
        diasAnterior,
        isPartial
      ),
      diasAtual,
      diasAnterior,
      isPartial,
    };
  }, [snapshotsComDados]);

  return {
    snapshots: snapshotsComDados,
    series,
    tendencia,
    hasData: snapshotsComDados.length >= 2,
  };
}
