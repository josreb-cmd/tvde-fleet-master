// =============================================================================
// useWeeklySparklines.ts — Snapshots semanais para sparklines (últimas N semanas)
// TVDE Fleet Master V.2.6.1
// hoursWorked = number (decimal). Ex: 8.75 = 8h45min
// Guards: zero-data weeks, variações > 999% limitadas
// =============================================================================
import { useMemo } from "react";
import { useTVDE } from "../../contexts/TVDEContext";
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
} from "./types";

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
 * Calcula variação percentual com guards:
 * - Retorna null se antigo === 0 (evita divisão por zero)
 * - Limita a ±999.9% (evita anomalias visuais no TrendBadge)
 */
function pctSafe(novo: number, antigo: number): number | null {
  if (antigo === 0) return novo === 0 ? null : null; // sem base de comparação
  const raw = ((novo - antigo) / Math.abs(antigo)) * 100;
  // Clamp a ±999.9%
  const clamped = Math.max(-999.9, Math.min(999.9, raw));
  return parseFloat(clamped.toFixed(1));
}

// ——— Hook principal ———

/**
 * Devolve snapshots semanais e séries prontas para sparklines.
 * @param numWeeks Número de semanas a incluir (default 8)
 * @param _currentWeekOffset Reservado para uso futuro (highlight da semana selecionada)
 */
export function useWeeklySparklines(
  numWeeks = 8,
  _currentWeekOffset = 0
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

      // Dias com actividade
      const diasComDados = new Set(
        weekShifts
          .filter((s) => (s.kilometers || 0) > 0 || (s.grossEarnings || 0) > 0)
          .map((s) => s.date)
      );
      const diasTrabalhados = diasComDados.size;

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

  // ——— Tendência (último vs penúltimo) com guards ———
  const tendencia: SparklineTendencia | null = useMemo(() => {
    const s = snapshotsComDados;
    if (s.length < 2) return null;

    const atual = s[s.length - 1];
    const anterior = s[s.length - 2];

    // Guard: se a semana anterior não tinha dados, não calcular tendência
    if (anterior.kmTotal === 0 && anterior.receitaTotal === 0) return null;

    return {
      km: pctSafe(atual.kmTotal, anterior.kmTotal),
      receita: pctSafe(atual.receitaTotal, anterior.receitaTotal),
      lucroSoRenda: pctSafe(atual.lucroSoRenda, anterior.lucroSoRenda),
      lucroLiquido: pctSafe(atual.lucroLiquido, anterior.lucroLiquido),
      margem: pctSafe(atual.margemSoRenda, anterior.margemSoRenda),
      rendimentoHora: pctSafe(
        atual.rendimentoHoraSoRenda,
        anterior.rendimentoHoraSoRenda
      ),
    };
  }, [snapshotsComDados]);

  return {
    snapshots: snapshotsComDados,
    series,
    tendencia,
    hasData: snapshotsComDados.length >= 2,
  };
}
