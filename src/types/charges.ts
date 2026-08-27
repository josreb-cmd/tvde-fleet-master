// src/types/charges.ts

export interface Charge {
  id: string;
  date: string;           // "YYYY-MM-DD"
  paidBy: 'jose' | 'alexandre';
  grossAmount: number;    // valor bruto do carregamento
  discount: number;       // desconto obtido (ex: cartão energia)
  netAmount: number;      // grossAmount - discount (calculado)
  location: string;       // local do carregamento
  createdBy: string;      // quem registou
  createdAt: string;      // ISO timestamp
  weekId: string;         // ex: "2026-W35" (ISO week Seg–Dom)
  settled: boolean;       // true = acerto semanal feito
}

export interface ChargeFormData {
  date: string;
  paidBy: 'jose' | 'alexandre';
  grossAmount: number;    // corrigido: era string
  discount: number;       // corrigido: era string
  location: string;
}
