// src/components/rentabilidade/constants.ts
// Constantes do modelo de negócio — fonte única de verdade

export const RENDA_SEMANAL = 350;
export const KM_BASE = 2000;
export const TAXA_ADICIONAL = 0.25;       // €/km acima dos 2.000 km
export const ENERGIA_POR_KM = 0.065;       // €/km custo energético (Tesla Model Y)
export const RECEITA_ESTIMADA_POR_KM = 0.35;

export const DIAS_SEMANA = ["Seg", "Ter", "Qua", "Qui", "Sex", "Sáb", "Dom"] as const;

export const CORES = {
  verde: "#10b981",
  amarelo: "#f59e0b",
  indigo: "#6366f1",
  vermelho: "#ef4444",
  cinzaBar: "#374151",
} as const;