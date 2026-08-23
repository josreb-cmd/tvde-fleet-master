// =============================================================================
// types.ts — Tipos do módulo Rentabilidade km
// TVDE Fleet Master V.2.8.0
// Alinhado com useKmRentabilidade.ts e useWeeklySparklines.ts
// V.2.7.0: SparklineTendencia expandida para normalização temporal
// V.2.8.0: DiaData.folga + KmRentabilidadeData.diasFolga (isDayOff)
// =============================================================================

import type React from 'react';

// ---------- Dados diários (calculados a partir de DailyShiftLog) ----------

export interface DiaData {
  dia: string;                // "Seg", "Ter", etc.
  km: number;
  receita: number;
  renda: number;              // rentalExpenseAmount diário
  horas: number;              // decimal — 8.75 = 8h45min
  folga: boolean;             // true se isDayOff() para todos os shifts do dia
}

export interface DiaAcumulado {
  dia: string;                // "Seg", "Ter", etc.
  km: number;                 // km acumulados
  lucroSoRenda: number;       // acumulado
  lucroLiquido: number;       // acumulado
  margem: number;             // % acumulada (Só Renda)
}

// ---------- Projeção mid-week ----------

export interface Projecao {
  kmProjetado: number;
  lucro: number;              // lucro projetado (Só Renda)
  kmFaltam: number;           // km/dia necessários para atingir KM_BASE
}

// ---------- Tabela de sensibilidade ----------

export interface SensibilidadeRow {
  km: number;
  kmExtra: number;
  sobretaxa: number;
  custoTotal: number;         // Renda + Sobretaxa
  receita: number;
  lucro: number;              // Só Renda
  margem: number;             // % Só Renda
  custoPorKm: number;
  custoComEnergia: number;
  lucroLiquido: number;
  margemLiquida: number;      // %
}

// ---------- Ranking / Melhor-Pior dia ----------

export interface DiaDestaque {
  dia: string;
  valor: number;
}

export interface RankingDia {
  dia: string;
  receitaPorKm: number;
  receitaPorHora: number;
  lucroLiquido: number;
}

// ---------- Output completo do hook useKmRentabilidade ----------

export interface KmRentabilidadeData {
  // Totais da semana
  kmTotal: number;
  kmExtra: number;
  diasTrabalhados: number;
  diasFolga: number;          // dias de folga na semana (isDayOff)
  horasTotal: number;
  receitaTotal: number;
  rendaTotal: number;         // soma real de rentalExpenseAmount
  sobretaxa: number;
  custoTotal: number;         // rendaTotal + sobretaxa
  custoEnergia: number;
  custoComEnergia: number;    // custoTotal + custoEnergia

  // Métricas dupla perspetiva — Só Renda
  lucroSoRenda: number;
  margemSoRenda: number;      // %
  rendimentoHoraSoRenda: number;

  // Métricas dupla perspetiva — Líquido
  lucroLiquido: number;
  margemLiquida: number;      // %
  rendimentoHoraLiquido: number;

  // Métricas comuns
  custoPorKm: number;
  receitaPorKm: number;

  // Métricas do MOTORISTA
  lucroLiquidoPorDia: number;
  custoFixoPorDia: number;
  eurosPorDezFaturados: number;
  melhorDia: DiaDestaque | null;
  piorDia: DiaDestaque | null;
  variacaoVsSemanaAnterior: number | null;  // % vs semana anterior
  diasAcimaTarget: number;    // dias com km >= 286
  breakEvenDia: string | null;
  rankingDias: RankingDia[];

  // Dados diários e acumulados
  dadosDiarios: DiaData[];
  dadosAcumulados: DiaAcumulado[];

  // Projeção e sensibilidade
  projecao: Projecao | null;
  tabelaSensibilidade: SensibilidadeRow[];

  // Estado e navegação
  progressoSemanal: number;   // 0-100
  kmPorDiaNecessarios: number;
  statusColor: string;
  temDados: boolean;
  apenasDesp: boolean;        // só despesas, sem km
  isCurrentWeek: boolean;
  diasDecorridos: number;
  monday: Date;
  sunday: Date;
  weekOffset: number;
  setWeekOffset: React.Dispatch<React.SetStateAction<number>>;
}

// ---------- Sparklines (tendência multi-semana) ----------

export interface WeeklySnapshot {
  weekLabel: string;          // "dd/mm" da segunda-feira
  monday: Date;               // objecto Date da segunda-feira
  kmTotal: number;
  receitaTotal: number;
  rendaTotal: number;
  horasTotal: number;
  diasTrabalhados: number;
  kmExtra: number;
  sobretaxa: number;
  custoTotal: number;
  custoEnergia: number;
  lucroSoRenda: number;
  lucroLiquido: number;
  margemSoRenda: number;
  margemLiquida: number;
  rendimentoHoraSoRenda: number;
  rendimentoHoraLiquido: number;
  receitaPorKm: number;
  custoPorKm: number;
}

export interface SparklineDataPoint {
  label: string;              // "dd/mm"
  value: number;              // linha primária (Só Renda)
  value2?: number;            // linha secundária (Líquido)
}

// ——— V.2.7.0: SparklineTendencia expandida ———

/** Valor de tendência individual com metadata */
export interface TrendValue {
  /** Variação calculada (% ou p.p.) — null se sem base de comparação */
  value: number | null;
  /** Tipo de variação: "pct" = percentual relativa, "pp" = pontos percentuais */
  type: "pct" | "pp";
  /** Sufixo de exibição: "%", "% /dia", "p.p." */
  displaySuffix: string;
  /** Está dentro da dead band? (|value| < TREND_THRESHOLD) */
  isNeutral: boolean;
}

export interface SparklineTendencia {
  km: TrendValue;
  receita: TrendValue;
  lucroSoRenda: TrendValue;
  lucroLiquido: TrendValue;
  margem: TrendValue;
  rendimentoHora: TrendValue;

  /** Dias com actividade na semana atual */
  diasAtual: number;
  /** Dias com actividade na semana anterior */
  diasAnterior: number;
  /** true se a semana atual tem menos de 7 dias decorridos */
  isPartial: boolean;
}

// Mantido para retrocompatibilidade com SparklineChart.tsx
export interface SparklineConfig {
  data: SparklineDataPoint[];
  referenceLine?: number;
  referenceLabel?: string;
  colorPrimary?: string;      // default: verde (#10b981)
  colorSecondary?: string;    // default: amarelo (#f59e0b)
  trend: {
    variation: number;
    direction: 'up' | 'down' | 'stable';
  };
}
