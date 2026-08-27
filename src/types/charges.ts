// src/types/charges.ts
// Tipos para o módulo de Carregamentos

export interface Charge {
  id: string;
  date: string;                // "YYYY-MM-DD"
  paidBy: 'jose' | 'alexandre';
  grossAmount: number;         // Valor bruto pago (€)
  discount: number;            // Desconto pessoal (€) — geralmente só Alexandre
  netAmount: number;           // grossAmount - discount → fonte para fuelExpenseAmount
  location: string;            // Local do carregamento
  createdBy: string;           // UID do utilizador que criou
  createdAt: string;           // ISO timestamp
  weekId: string;              // ISO week "2026-W33"
  settled: boolean;            // Acerto semanal feito?
}

export interface ChargeFormData {
  date: string;
  paidBy: 'jose' | 'alexandre';
  grossAmount: string;
  discount: string;
  location: string;
}
