// =============================================================================
// src/components/rentabilidade/types.ts
// Tipos do módulo Rentabilidade km
// TVDE Fleet Master V.2.8.5
// 🆕 V.2.8.5: custoEnergiaReal em DiaData, energiaTotalReal em KmRentabilidadeData
// =============================================================================

// ——— Dados diários ———

export interface DiaData {
  dia: string;                // "Seg", "Ter", etc.
  km: number;
  receita: number;
  renda: number;              // rentalExpenseAmount real do dia
  horas: number;              // decimal (ex: 8.75 = 8h45min)
  folga: boolean;             // isDayOff()
  custoEnergiaReal: number;   // 🆕 V.2.8.5 — fuelExpenseAmount real do dia
}

// ——— Dados acumulados (gráficos) ———

export interface DiaAcumulado {
  dia: string;
  km: number;
  lucroSoRenda: number;
  lucroLiquido: number;
  margem: number;             // % — perspetiva Só Renda
}

// ——— Projeção mid-week ———

export interface Projecao {
  kmProjetado: number;
  lucro: number;              // perspetiva Só Renda (com renda fixa)
  kmFaltam: number;           // km/dia necessários para atingir 2000
}

// ——— Tabela de sensibilidade ———

export interface SensibilidadeRow {
  km: number;
  kmExtra: number;
  sobretaxa: number;
  custoTotal: number;         // renda + sobretaxa
  receita: number;
  lucro: number;              // Só Renda
  margem: number;             // % Só Renda
  custoPorKm: number;
  custoComEnergia: number;    // renda + sobretaxa + energia
  lucroLiquido: number;       // receita − custoComEnergia
  margemLiquida: number;      // % Líquido
}

// ——— Dia destaque (melhor/pior) ———

export interface DiaDestaque {
  dia: string;
  valor: number;              // receita do dia
}

// ——— Ranking de dias por eficiência ———

export interface RankingDia {
  dia: string;
  receitaPorKm: number;
  receitaPorHora: number;
  lucroLiquido: number;       // receita − renda − energia REAL (sem sobretaxa diária)
}

// ——— V.2.8.2 — Veredicto km extra ———

export type VeredictoKmExtra = "compensa" | "limite" | "nao_compensa";

// ——— TrendValue — valor de tendência com metadata para display ———

export interface TrendValue {
  value: number | null;       // variação numérica (null = sem dados)
  type: "pct" | "pp";        // "pct" = percentual, "pp" = pontos percentuais
  displaySuffix: string;     // sufixo para UI (ex: "%", "% /dia", "p.p.")
  isNeutral: boolean;        // true se variação < TREND_THRESHOLD (dead band)
}

// ——— Sparkline types ———

export interface SparklineDataPoint {
  label: string;              // rótulo compacto (ex: "03/06")
  value: number;              // valor principal (perspetiva verde / Só Renda)
  value2?: number;            // valor secundário (perspetiva amarela / Líquido)
}

export type TrendDirection = "up" | "down" | "stable";

// ——— SparklineTendencia — tendências por métrica (usa TrendValue) ———

export interface SparklineTendencia {
  km: TrendValue;
  receita: TrendValue;
  lucroSoRenda: TrendValue;
  lucroLiquido: TrendValue;
  margem: TrendValue;
  rendimentoHora: TrendValue;
  receitaPorKm?: TrendValue;
  diasAtual?: number;
  diasAnterior?: number;
  isPartial?: boolean;
}

// ——— WeeklySnapshot — snapshot semanal para sparklines ———

export interface WeeklySnapshot {
  weekLabel: string;
  monday: Date;
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

// ——— Return type do hook useKmRentabilidade ———

export interface KmRentabilidadeData {
  // Totais
  kmTotal: number;
  kmExtra: number;
  diasTrabalhados: number;
  diasFolga: number;
  horasTotal: number;
  receitaTotal: number;
  rendaTotal: number;
  sobretaxa: number;
  custoTotal: number;
  custoEnergia: number;            // 🆕 V.2.8.5: custo real (soma fuelExpenseAmount)
  custoComEnergia: number;

  // Dupla perspetiva — Só Renda
  lucroSoRenda: number;
  margemSoRenda: number;
  rendimentoHoraSoRenda: number;

  // Dupla perspetiva — Líquido
  lucroLiquido: number;
  margemLiquida: number;
  rendimentoHoraLiquido: number;

  // Comuns
  custoPorKm: number;
  receitaPorKm: number;

  // Motorista
  lucroLiquidoPorDia: number;
  custoFixoPorDia: number;
  eurosPorDezFaturados: number;
  melhorDia: DiaDestaque | null;
  piorDia: DiaDestaque | null;
  variacaoVsSemanaAnterior: number | null;
  diasAcimaTarget: number;
  breakEvenDia: string | null;
  breakEvenDiaSoRenda: string | null;
  rankingDias: RankingDia[];

  // V.2.8.1 — Ritmo dinâmico
  diasEfetivos: number;
  kmDiaTarget: number;

  // V.2.8.2 — Análise custo marginal km extra
  custoMarginalKm: number;
  ganhoLiquidoPorKmExtra: number;
  margemPorKmExtra: number;
  veredictoKmExtra: VeredictoKmExtra;

  // 🆕 V.2.8.5 — Energia real
  energiaTotalReal: number;        // soma fuelExpenseAmount da semana
  energiaEstimada: number;         // km × ENERGIA_POR_KM (para comparação)
  desvioEnergia: number;           // % desvio real vs estimado

  // Dados
  dadosDiarios: DiaData[];
  dadosAcumulados: DiaAcumulado[];
  projecao: Projecao | null;
  tabelaSensibilidade: SensibilidadeRow[];

  // Estado e navegação
  progressoSemanal: number;
  kmPorDiaNecessarios: number;
  statusColor: string;
  temDados: boolean;
  apenasDesp: boolean;
  isCurrentWeek: boolean;
  diasDecorridos: number;
  monday: Date;
  sunday: Date;
  weekOffset: number;
  setWeekOffset: (offset: number | ((prev: number) => number)) => void;
}
