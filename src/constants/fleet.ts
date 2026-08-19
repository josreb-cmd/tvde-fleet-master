// ─── Constantes de negócio da frota ──────────────────────────────
// Altere aqui e o valor propaga-se por toda a app.

/** Renda semanal fixa paga à locadora (€) */
export const RENDA_SEMANAL = 350;

/** Km incluídos no contrato por semana */
export const KM_BASE = 2000;

/** Sobretaxa por cada km acima de KM_BASE (€/km) */
export const TAXA_ADICIONAL = 0.25;

/** Receita média estimada por km (€/km) */
export const RECEITA_ESTIMADA_POR_KM = 0.54;

/** Custo energético estimado por km (€/km) — Tesla Model Y ~15 kWh/100km × 0,41€/kWh */
export const ENERGIA_ESTIMADA_POR_KM = 0.06;
