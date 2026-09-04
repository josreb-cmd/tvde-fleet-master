// src/__tests__/rentabilidade.test.ts
// Testes unitários dos cálculos críticos do módulo Rentabilidade km
// Stack: Vitest (sem Firebase, sem React — só lógica pura)
//
// Constantes do modelo de negócio (espelho de constants.ts):
//   RENDA_SEMANAL = 350€
//   KM_BASE       = 2000 km
//   TAXA_ADICIONAL = 0.25€/km
//   ENERGIA_POR_KM = 0.065€/km

import { describe, it, expect } from 'vitest';

// ─── Constantes (espelho de src/components/rentabilidade/constants.ts) ───
const RENDA_SEMANAL = 350;
const KM_BASE = 2000;
const TAXA_ADICIONAL = 0.25;
const ENERGIA_POR_KM = 0.065;

// ─── Funções extraídas do hook (lógica pura, sem dependências) ───

function calcularCustoReal(kmTotal: number, rendaReal: number) {
  const kmExtra = Math.max(0, kmTotal - KM_BASE);
  const sobretaxa = kmExtra * TAXA_ADICIONAL;
  const custoTotal = rendaReal + sobretaxa;
  return { kmExtra, sobretaxa, custoTotal };
}

function calcularCustoSemanal(kmTotal: number) {
  const kmExtra = Math.max(0, kmTotal - KM_BASE);
  const sobretaxa = kmExtra * TAXA_ADICIONAL;
  const custoTotal = RENDA_SEMANAL + sobretaxa;
  return { kmExtra, sobretaxa, custoTotal };
}

function calcularLucros(receitaTotal: number, custoTotal: number, custoEnergia: number) {
  const lucroSoRenda = receitaTotal - custoTotal;
  const lucroLiquido = receitaTotal - custoTotal - custoEnergia;
  const margemSoRenda = receitaTotal > 0 ? (lucroSoRenda / receitaTotal) * 100 : 0;
  const margemLiquida = receitaTotal > 0 ? (lucroLiquido / receitaTotal) * 100 : 0;
  return { lucroSoRenda, lucroLiquido, margemSoRenda, margemLiquida };
}

function calcularProgressoSemanal(kmTotal: number): number {
  return Math.min(100, (kmTotal / KM_BASE) * 100);
}

type VeredictoKmExtra = 'compensa' | 'limite' | 'nao_compensa';
const LIMIAR_COMPENSA = 0.05;

function calcularVeredictoKmExtra(receitaPorKm: number): VeredictoKmExtra {
  const custoMarginal = TAXA_ADICIONAL + ENERGIA_POR_KM;
  const ganho = receitaPorKm - custoMarginal;
  if (receitaPorKm === 0) return 'nao_compensa';
  if (ganho > LIMIAR_COMPENSA) return 'compensa';
  if (ganho > 0) return 'limite';
  return 'nao_compensa';
}

// ─── Testes ───────────────────────────────────────────────────────────────

describe('calcularCustoReal', () => {
  it('sem km extra — sobretaxa = 0', () => {
    const r = calcularCustoReal(2000, 350);
    expect(r.kmExtra).toBe(0);
    expect(r.sobretaxa).toBe(0);
    expect(r.custoTotal).toBe(350);
  });

  it('280 km extra → sobretaxa = 70€', () => {
    // Semana de referência: 2280 km, renda 350€
    const r = calcularCustoReal(2280, 350);
    expect(r.kmExtra).toBe(280);
    expect(r.sobretaxa).toBeCloseTo(70, 2);
    expect(r.custoTotal).toBeCloseTo(420, 2);
  });

  it('abaixo do limite — sem sobretaxa', () => {
    const r = calcularCustoReal(1500, 350);
    expect(r.kmExtra).toBe(0);
    expect(r.sobretaxa).toBe(0);
    expect(r.custoTotal).toBe(350);
  });

  it('renda parcial (dia único) — cálculo correcto', () => {
    // Ex: só 1 dia de renda = 50€, 300 km
    const r = calcularCustoReal(300, 50);
    expect(r.kmExtra).toBe(0);
    expect(r.custoTotal).toBe(50);
  });
});

describe('calcularCustoSemanal', () => {
  it('exactamente no limite — sem sobretaxa', () => {
    const r = calcularCustoSemanal(2000);
    expect(r.sobretaxa).toBe(0);
    expect(r.custoTotal).toBe(350);
  });

  it('500 km extra → sobretaxa = 125€', () => {
    const r = calcularCustoSemanal(2500);
    expect(r.kmExtra).toBe(500);
    expect(r.sobretaxa).toBeCloseTo(125, 2);
    expect(r.custoTotal).toBeCloseTo(475, 2);
  });

  it('1000 km extra → sobretaxa = 250€', () => {
    const r = calcularCustoSemanal(3000);
    expect(r.sobretaxa).toBeCloseTo(250, 2);
    expect(r.custoTotal).toBeCloseTo(600, 2);
  });
});

describe('calcularLucros', () => {
  it('semana de referência: 1063.64€ receita, 420€ custo, 148.20€ energia', () => {
    // Auditoria: 2280km, receita 1063.64€, lucro líquido 495.44€
    const { lucroSoRenda, lucroLiquido } = calcularLucros(1063.64, 420, 148.20);
    expect(lucroSoRenda).toBeCloseTo(643.64, 1);
    expect(lucroLiquido).toBeCloseTo(495.44, 1);
  });

  it('receita zero — margens são 0 (sem divisão por zero)', () => {
    const r = calcularLucros(0, 350, 0);
    expect(r.margemSoRenda).toBe(0);
    expect(r.margemLiquida).toBe(0);
  });

  it('prejuízo — lucro negativo calculado correctamente', () => {
    const { lucroLiquido } = calcularLucros(200, 350, 50);
    expect(lucroLiquido).toBe(-200);
  });

  it('margem só renda correcta', () => {
    // receita 1000, custo 350 → lucro 650 → margem 65%
    const { margemSoRenda } = calcularLucros(1000, 350, 0);
    expect(margemSoRenda).toBeCloseTo(65, 1);
  });
});

describe('calcularProgressoSemanal', () => {
  it('0 km → 0%', () => {
    expect(calcularProgressoSemanal(0)).toBe(0);
  });

  it('1000 km → 50%', () => {
    expect(calcularProgressoSemanal(1000)).toBe(50);
  });

  it('2000 km → 100%', () => {
    expect(calcularProgressoSemanal(2000)).toBe(100);
  });

  it('acima do limite → cap a 100%', () => {
    expect(calcularProgressoSemanal(2500)).toBe(100);
  });

  it('1998 km → 99.9% (não deve arredondar para 100)', () => {
    // Bug histórico: 1998/2000 mostrava errado
    const p = calcularProgressoSemanal(1998);
    expect(p).toBeCloseTo(99.9, 1);
    expect(p).toBeLessThan(100);
  });
});

describe('calcularVeredictoKmExtra', () => {
  it('receita 0.467€/km (semana referência) → compensa', () => {
    // 0.467 - 0.315 = 0.152 > 0.05
    expect(calcularVeredictoKmExtra(0.467)).toBe('compensa');
  });

  it('receita exactamente no custo marginal → nao_compensa', () => {
    expect(calcularVeredictoKmExtra(0.315)).toBe('nao_compensa');
  });

  it('receita 0 → nao_compensa', () => {
    expect(calcularVeredictoKmExtra(0)).toBe('nao_compensa');
  });

  it('receita ligeiramente acima do custo (0.32€/km) → limite', () => {
    // 0.32 - 0.315 = 0.005 < 0.05 → limite
    expect(calcularVeredictoKmExtra(0.32)).toBe('limite');
  });
});

describe('tabela de sensibilidade — valores críticos', () => {
    it('1500 km — lucro positivo mas abaixo de 2000 km (sem energia)', () => {
    // 1500 × 0.35 = 525€ receita, custo = 350€ → lucro = 175€
    const { custoTotal } = calcularCustoSemanal(1500);
    const receita = 1500 * 0.35;
    const lucro = receita - custoTotal;
    expect(lucro).toBeCloseTo(175, 0);
    // Com energia: 1500 × 0.065 = 97.5€ → lucro líquido = 77.5€ (ainda positivo)
    const lucroLiquido = lucro - 1500 * ENERGIA_POR_KM;
    expect(lucroLiquido).toBeCloseTo(77.5, 0);
  });

  it('2000 km — próximo do break-even', () => {
    const { custoTotal } = calcularCustoSemanal(2000);
    const receita = 2000 * 0.35;
    const lucro = receita - custoTotal;
    // 700 - 350 = 350€ lucro s/energia
    expect(lucro).toBeCloseTo(350, 0);
  });

  it('2280 km (semana referência) — custo semanal = 420€', () => {
    const { custoTotal } = calcularCustoSemanal(2280);
    expect(custoTotal).toBeCloseTo(420, 2);
  });
});