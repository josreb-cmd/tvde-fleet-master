// src/components/rentabilidade/types.ts

export interface DiaData {
  dia: string;
  km: number;
  receita: number;
  renda: number;
  horas: number;
}

export interface DiaAcumulado {
  dia: string;
  km: number;
  lucroSoRenda: number;
  lucroLiquido: number;
  margem: number;
}

export interface Projecao {
  kmProjetado: number;
  lucro: number;
  kmFaltam: number;
}

export interface DiaResumo {
  dia: string;
  valor: number;
}

export interface SensibilidadeRow {
  km: number;
  kmExtra: number;
  sobretaxa: number;
  custoTotal: number;
  receita: number;
  lucro: number;
  margem: number;
  custoPorKm: number;
  // Dupla perspetiva — c/ Energia
  custoComEnergia: number;
  lucroLiquido: number;
  margemLiquida: number;
}

export interface KmRentabilidadeData {
  // ——— Dados base ———
  kmTotal: number;
  kmExtra: number;
  diasTrabalhados: number;
  horasTotal: number;
  receitaTotal: number;
  rendaTotal: number;

  // ——— Custos ———
  sobretaxa: number;
  custoTotal: number;            // Renda + Sobretaxa
  custoEnergia: number;
  custoComEnergia: number;       // Renda + Sobretaxa + Energia

  // ——— Métricas calculadas — Só Renda ———
  lucroSoRenda: number;
  margemSoRenda: number;
  rendimentoHoraSoRenda: number;

  // ——— Métricas calculadas — Líquido ———
  lucroLiquido: number;
  margemLiquida: number;
  rendimentoHoraLiquido: number;

  // ——— Métricas comuns ———
  custoPorKm: number;
  receitaPorKm: number;

  // ——— Métricas do MOTORISTA ———
  lucroLiquidoPorDia: number;
  custoFixoPorDia: number;
  eurosPorDezFaturados: number;  // "De cada 10€, ficas com X€"
  melhorDia: DiaResumo | null;
  piorDia: DiaResumo | null;
  variacaoVsSemanaAnterior: number | null;
  diasAcimaTarget: number;      // streak: dias com km >= 286
  breakEvenDia: string | null;   // dia da semana em que lucro passa a positivo

  // ——— Rankings por dia (para o motorista) ———
  rankingDias: Array<{
    dia: string;
    receitaPorKm: number;
    receitaPorHora: number;
    lucroLiquido: number;
  }>;

  // ——— Dados de gráficos ———
  dadosDiarios: DiaData[];
  dadosAcumulados: DiaAcumulado[];
  projecao: Projecao | null;

  // ——— Tabela sensibilidade ———
  tabelaSensibilidade: SensibilidadeRow[];

  // ——— Progresso visual (motorista) ———
  progressoSemanal: number;       // 0–100%
  kmPorDiaNecessarios: number;    // km/dia restantes para atingir 2000

  // ——— Estado ———
  statusColor: string;
  temDados: boolean;
  apenasDesp: boolean;
  isCurrentWeek: boolean;
  diasDecorridos: number;

  // ——— Navegação de semana ———
  monday: Date;
  sunday: Date;
  weekOffset: number;
  setWeekOffset: React.Dispatch<React.SetStateAction<number>>;
}
