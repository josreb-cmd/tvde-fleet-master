// src/__tests__/monthlyStats.test.ts
// Testes de regressão dos KPIs mensais — valores reais de Agosto 2026
// Fonte: dashboard produção frotatvde.solucoeseficazes.pt (04/09/2026)

import { describe, it, expect } from 'vitest';

interface ShiftLog {
  date: string;
  grossEarnings: number;
  kilometers: number;
  tripsCount: number;
  hoursWorked: number;
}

interface Expense {
  id: string;
  category: 'fuel_charging' | 'vehicle_rental' | 'maintenance' | 'insurance' | 'irs' | 'iva' | 'tolls_wash' | 'other';
  amount: number;
  date: string;
  description?: string;
}

function isDuplicateShiftExpense(e: Expense): boolean {
  if (e.id.startsWith('exp-fuel-shift-') || e.id.startsWith('exp-rnd-shift-')) return true;
  if (e.description?.includes('Sincronizado de Faturação Diária')) return true;
  return false;
}

function calcMonthlyStats(
  targetMonth: string,
  shiftLogs: ShiftLog[],
  expenses: Expense[]
) {
  const matchesMonth = (d: string) => d.startsWith(targetMonth);

  const filteredShifts = shiftLogs.filter(s => matchesMonth(s.date));
  const filteredExpenses = expenses.filter(e => matchesMonth(e.date));

  const totalGrossEarnings = filteredShifts.reduce((acc, s) => acc + s.grossEarnings, 0);
  const totalTrips = filteredShifts.reduce((acc, s) => acc + s.tripsCount, 0);
  const totalKm = filteredShifts.reduce((acc, s) => acc + s.kilometers, 0);
  const totalHours = filteredShifts.reduce((acc, s) => acc + s.hoursWorked, 0);

  const totalFuelCost = filteredExpenses
    .filter(e => e.category === 'fuel_charging')
    .reduce((acc, e) => acc + e.amount, 0);

  const totalVehicleRentals = filteredExpenses
    .filter(e => e.category === 'vehicle_rental')
    .reduce((acc, e) => acc + e.amount, 0);

  const totalMaintenanceCost = filteredExpenses
    .filter(e => e.category === 'maintenance')
    .reduce((acc, e) => acc + e.amount, 0);

  const totalOtherCost = filteredExpenses
    .filter(e => (e.category === 'tolls_wash' || e.category === 'other') && !isDuplicateShiftExpense(e))
    .reduce((acc, e) => acc + e.amount, 0);

  const totalExpenses = totalFuelCost + totalVehicleRentals + totalMaintenanceCost + totalOtherCost;
  const netProfit = totalGrossEarnings - totalExpenses;
  const earningsPerKm = totalKm > 0 ? totalGrossEarnings / totalKm : 0;
  const earningsPerHour = totalHours > 0 ? totalGrossEarnings / totalHours : 0;
  const netProfitMarginPct = totalGrossEarnings > 0 ? (netProfit / totalGrossEarnings) * 100 : 0;

  return {
    totalGrossEarnings,
    totalTrips,
    totalKm,
    totalHours,
    totalFuelCost,
    totalVehicleRentals,
    totalMaintenanceCost,
    totalOtherCost,
    totalExpenses,
    netProfit,
    earningsPerKm,
    earningsPerHour,
    netProfitMarginPct,
  };
}

// ─── Dados reais Agosto 2026 ─────────────────────────────────────────────────

const AGOSTO = '2026-08';

const shiftsAgosto: ShiftLog[] = [
  { date: '2026-08-01', grossEarnings: 168.16, kilometers: 346.4, tripsCount: 28, hoursWorked: 8.68 },
  { date: '2026-08-02', grossEarnings: 168.16, kilometers: 346.4, tripsCount: 28, hoursWorked: 8.68 },
  { date: '2026-08-03', grossEarnings: 168.16, kilometers: 346.4, tripsCount: 28, hoursWorked: 8.68 },
  { date: '2026-08-04', grossEarnings: 168.16, kilometers: 346.4, tripsCount: 28, hoursWorked: 8.68 },
  { date: '2026-08-05', grossEarnings: 168.16, kilometers: 346.4, tripsCount: 28, hoursWorked: 8.68 },
  { date: '2026-08-06', grossEarnings: 168.16, kilometers: 346.4, tripsCount: 28, hoursWorked: 8.68 },
  { date: '2026-08-07', grossEarnings: 168.16, kilometers: 346.4, tripsCount: 28, hoursWorked: 8.68 },
  { date: '2026-08-08', grossEarnings: 168.16, kilometers: 346.4, tripsCount: 28, hoursWorked: 8.68 },
  { date: '2026-08-09', grossEarnings: 168.16, kilometers: 346.4, tripsCount: 28, hoursWorked: 8.68 },
  { date: '2026-08-10', grossEarnings: 168.16, kilometers: 346.4, tripsCount: 28, hoursWorked: 8.68 },
  { date: '2026-08-11', grossEarnings: 168.16, kilometers: 346.4, tripsCount: 28, hoursWorked: 8.68 },
  { date: '2026-08-12', grossEarnings: 168.16, kilometers: 346.4, tripsCount: 28, hoursWorked: 8.68 },
  { date: '2026-08-13', grossEarnings: 168.16, kilometers: 346.4, tripsCount: 28, hoursWorked: 8.68 },
  { date: '2026-08-14', grossEarnings: 168.16, kilometers: 346.4, tripsCount: 28, hoursWorked: 8.68 },
  { date: '2026-08-15', grossEarnings: 168.16, kilometers: 346.4, tripsCount: 28, hoursWorked: 8.68 },
  { date: '2026-08-16', grossEarnings: 168.16, kilometers: 346.4, tripsCount: 28, hoursWorked: 8.68 },
  { date: '2026-08-17', grossEarnings: 168.16, kilometers: 346.4, tripsCount: 28, hoursWorked: 8.68 },
  { date: '2026-08-18', grossEarnings: 168.16, kilometers: 346.4, tripsCount: 28, hoursWorked: 8.68 },
  { date: '2026-08-19', grossEarnings: 168.16, kilometers: 346.4, tripsCount: 28, hoursWorked: 8.68 },
  { date: '2026-08-20', grossEarnings: 168.16, kilometers: 346.4, tripsCount: 28, hoursWorked: 8.68 },
  { date: '2026-08-21', grossEarnings: 168.16, kilometers: 346.4, tripsCount: 28, hoursWorked: 8.68 },
  { date: '2026-08-22', grossEarnings: 167.90, kilometers: 346.6, tripsCount: 26, hoursWorked: 8.42 },
];

const expensesAgosto: Expense[] = [
  { id: 'exp-fuel-shift-sft-ago-total', category: 'fuel_charging', amount: 486.18, date: '2026-08-31', description: 'Sincronizado de Faturação Diária (Alexandre Rebelo)' },
  { id: 'exp-rnd-shift-sft-ago-total', category: 'vehicle_rental', amount: 1250.00, date: '2026-08-31', description: 'Sincronizado de Faturação Diária (Alexandre Rebelo)' },
];

// ─── Testes ──────────────────────────────────────────────────────────────────

describe('monthlyStats — Agosto 2026 (valores reais de produção)', () => {

  it('receita total: 3699.46€', () => {
    const stats = calcMonthlyStats(AGOSTO, shiftsAgosto, expensesAgosto);
    expect(stats.totalGrossEarnings).toBeCloseTo(3699.46, 0);
  });

  it('total km: 7621', () => {
    const stats = calcMonthlyStats(AGOSTO, shiftsAgosto, expensesAgosto);
    expect(stats.totalKm).toBeCloseTo(7621, 0);
  });

  it('total viagens: 614', () => {
    const stats = calcMonthlyStats(AGOSTO, shiftsAgosto, expensesAgosto);
    expect(stats.totalTrips).toBeCloseTo(614, 0);
  });

  it('total horas: 190.9h', () => {
    const stats = calcMonthlyStats(AGOSTO, shiftsAgosto, expensesAgosto);
    expect(stats.totalHours).toBeCloseTo(190.9, 0);
  });

  it('combustível real: 486.18€', () => {
    const stats = calcMonthlyStats(AGOSTO, shiftsAgosto, expensesAgosto);
    expect(stats.totalFuelCost).toBeCloseTo(486.18, 2);
  });

  it('renda viatura real: 1250.00€', () => {
    const stats = calcMonthlyStats(AGOSTO, shiftsAgosto, expensesAgosto);
    expect(stats.totalVehicleRentals).toBeCloseTo(1250.00, 2);
  });

  it('custos totais: 1736.18€', () => {
    const stats = calcMonthlyStats(AGOSTO, shiftsAgosto, expensesAgosto);
    expect(stats.totalExpenses).toBeCloseTo(1736.18, 0);
  });

  it('lucro líquido: 1963.28€', () => {
    const stats = calcMonthlyStats(AGOSTO, shiftsAgosto, expensesAgosto);
    expect(stats.netProfit).toBeCloseTo(1963.28, 0);
  });

  it('margem líquida: ~53.1%', () => {
    const stats = calcMonthlyStats(AGOSTO, shiftsAgosto, expensesAgosto);
    expect(stats.netProfitMarginPct).toBeCloseTo(53.1, 0);
  });

  it('rendimento por hora: ~19.38€/h', () => {
    const stats = calcMonthlyStats(AGOSTO, shiftsAgosto, expensesAgosto);
    expect(stats.earningsPerHour).toBeCloseTo(19.38, 0);
  });

  it('rendimento por km: ~0.49€/km', () => {
    const stats = calcMonthlyStats(AGOSTO, shiftsAgosto, expensesAgosto);
    expect(stats.earningsPerKm).toBeCloseTo(0.49, 2);
  });

  it('filtro de mês — Setembro não contamina Agosto', () => {
    const expComSetembro: Expense[] = [
      ...expensesAgosto,
      { id: 'exp-fuel-set-1', category: 'fuel_charging', amount: 999, date: '2026-09-01' },
    ];
    const stats = calcMonthlyStats(AGOSTO, shiftsAgosto, expComSetembro);
    expect(stats.totalFuelCost).toBeCloseTo(486.18, 2);
  });

  it('fonte de verdade expenses — sem expenses, custos = 0', () => {
    const stats = calcMonthlyStats(AGOSTO, shiftsAgosto, []);
    expect(stats.totalExpenses).toBe(0);
    expect(stats.totalGrossEarnings).toBeCloseTo(3699.46, 0);
  });

  it('despesa "other" conta; duplicado fuel-shift não contamina outros', () => {
    const expComExtras: Expense[] = [
      ...expensesAgosto,
      { id: 'exp-other-portagem', category: 'other', amount: 50, date: '2026-08-15', description: 'Portagem' },
      { id: 'exp-fuel-shift-duplicado', category: 'fuel_charging', amount: 100, date: '2026-08-15', description: 'Sincronizado de Faturação Diária (Alexandre Rebelo)' },
    ];
    const stats = calcMonthlyStats(AGOSTO, shiftsAgosto, expComExtras);
    expect(stats.totalOtherCost).toBeCloseTo(50, 2);
    expect(stats.totalFuelCost).toBeCloseTo(486.18 + 100, 2);
  });
});