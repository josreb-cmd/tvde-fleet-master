// src/components/rentabilidade/useKmRentabilidade.ts
import { useState, useMemo } from "react";
import { useTVDE } from "../../contexts/TVDEContext";
import {
  RENDA_SEMANAL,
  KM_BASE,
  TAXA_ADICIONAL,
  ENERGIA_POR_KM,
  RECEITA_ESTIMADA_POR_KM,
  DIAS_SEMANA,
  CORES,
} from "./constants";
import type {
  DiaData,
  DiaAcumulado,
  Projecao,
  SensibilidadeRow,
  KmRentabilidadeData,
} from "./types";

// ——— Helpers ———
function getWeekBounds(offset = 0) {
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

// ——— Hook principal ———
export function useKmRentabilidade(): KmRentabilidadeData {
  const { shiftLogs } = useTVDE();
  const [weekOffset, setWeekOffset] = useState(0);

  const { monday, sunday } = useMemo(
    () => getWeekBounds(weekOffset),
    [weekOffset]
  );
  const isCurrentWeek = weekOffset === 0;
  const mondayStr = useMemo(() => toDateStr(monday), [monday]);
  const sundayStr = useMemo(() => toDateStr(sunday), [sunday]);

  // ——— Dados da semana anterior (para variação %) ———
  const { monday: mondayAnterior, sunday: sundayAnterior } = useMemo(
    () => getWeekBounds(weekOffset - 1),
    [weekOffset]
  );
  const mondayAnteriorStr = useMemo(() => toDateStr(mondayAnterior), [mondayAnterior]);
  const sundayAnteriorStr = useMemo(() => toDateStr(sundayAnterior), [sundayAnterior]);

  // ——— Agrupar shiftLogs por dia da semana (Seg→Dom) ———
  const dadosDiarios: DiaData[] = useMemo(() => {
    const shiftsNaSemana = shiftLogs.filter(
      (s) => s.date >= mondayStr && s.date <= sundayStr
    );
    return DIAS_SEMANA.map((dia, i) => {
      const diaDate = new Date(monday);
      diaDate.setDate(monday.getDate() + i);
      const diaStr = toDateStr(diaDate);
      const shiftsNoDia = shiftsNaSemana.filter((s) => s.date === diaStr);
      const km = shiftsNoDia.reduce((acc, s) => acc + s.kilometers, 0);
      const receita = shiftsNoDia.reduce((acc, s) => acc + s.grossEarnings, 0);
      const renda = shiftsNoDia.reduce(
        (acc, s) => acc + (s.rentalExpenseAmount || 0),
        0
      );
      const horas = shiftsNoDia.reduce(
        (acc, s) => acc + (s.hoursWorked || 0),
        0
      );
      return { dia, km, receita, renda, horas };
    });
  }, [shiftLogs, mondayStr, sundayStr, monday]);

  // ——— Totais ———
  const kmTotal = useMemo(
    () => dadosDiarios.reduce((s, d) => s + d.km, 0),
    [dadosDiarios]
  );
  const receitaTotal = useMemo(
    () => dadosDiarios.reduce((s, d) => s + d.receita, 0),
    [dadosDiarios]
  );
  const rendaTotal = useMemo(
    () => dadosDiarios.reduce((s, d) => s + d.renda, 0),
    [dadosDiarios]
  );
  const horasTotal = useMemo(
    () => dadosDiarios.reduce((s, d) => s + d.horas, 0),
    [dadosDiarios]
  );
  const diasTrabalhados = useMemo(
    () => dadosDiarios.filter((d) => d.km > 0 || d.receita > 0).length,
    [dadosDiarios]
  );

  // ——— Custos ———
  const { kmExtra, sobretaxa, custoTotal } = useMemo(
    () => calcularCustoReal(kmTotal, rendaTotal),
    [kmTotal, rendaTotal]
  );
  const custoEnergia = kmTotal * ENERGIA_POR_KM;
  const custoComEnergia = custoTotal + custoEnergia;

  // ——— Métricas "Só Renda" ———
  const lucroSoRenda = receitaTotal - custoTotal;
  const margemSoRenda =
    receitaTotal > 0 ? (lucroSoRenda / receitaTotal) * 100 : 0;
  const rendimentoHoraSoRenda =
    horasTotal > 0 ? lucroSoRenda / horasTotal : 0;

  // ——— Métricas "Líquido" ———
  const lucroLiquido = receitaTotal - rendaTotal - sobretaxa - custoEnergia;
  const margemLiquida =
    receitaTotal > 0 ? (lucroLiquido / receitaTotal) * 100 : 0;
  const rendimentoHoraLiquido =
    horasTotal > 0 ? lucroLiquido / horasTotal : 0;

  // ——— Métricas comuns ———
  const custoPorKm =
    kmTotal > 0
      ? custoTotal / kmTotal
      : rendaTotal > 0
      ? rendaTotal / KM_BASE
      : RENDA_SEMANAL / KM_BASE;
  const receitaPorKm = kmTotal > 0 ? receitaTotal / kmTotal : 0;

  // ——— Métricas do MOTORISTA ———
  const lucroLiquidoPorDia =
    diasTrabalhados > 0 ? lucroLiquido / diasTrabalhados : 0;
  const custoFixoPorDia = diasTrabalhados > 0 ? custoComEnergia / diasTrabalhados : 0;
  const eurosPorDezFaturados =
    receitaTotal > 0
      ? parseFloat(((lucroLiquido / receitaTotal) * 10).toFixed(2))
      : 0;

  // Melhor e pior dia (por receita)
  const diasComActividade = dadosDiarios.filter((d) => d.receita > 0);
  const melhorDia = useMemo(() => {
    if (diasComActividade.length === 0) return null;
    const best = diasComActividade.reduce((a, b) =>
      b.receita > a.receita ? b : a
    );
    return { dia: best.dia, valor: best.receita };
  }, [diasComActividade]);

  const piorDia = useMemo(() => {
    if (diasComActividade.length === 0) return null;
    const worst = diasComActividade.reduce((a, b) =>
      b.receita < a.receita ? b : a
    );
    return { dia: worst.dia, valor: worst.receita };
  }, [diasComActividade]);

  // Streak: dias com km >= 286 (ritmo para 2000/7)
  const KM_DIA_TARGET = Math.ceil(KM_BASE / 7); // 286
  const diasAcimaTarget = useMemo(
    () => dadosDiarios.filter((d) => d.km >= KM_DIA_TARGET).length,
    [dadosDiarios]
  );

  // Ranking de dias por eficiência
  const rankingDias = useMemo(() => {
    return diasComActividade
      .map((d) => ({
        dia: d.dia,
        receitaPorKm: d.km > 0 ? d.receita / d.km : 0,
        receitaPorHora: d.horas > 0 ? d.receita / d.horas : 0,
        lucroLiquido:
          d.receita -
          d.renda -
          Math.max(0, d.km > KM_BASE / 7 ? (d.km - KM_BASE / 7) * TAXA_ADICIONAL : 0) -
          d.km * ENERGIA_POR_KM,
      }))
      .sort((a, b) => b.receitaPorHora - a.receitaPorHora);
  }, [diasComActividade]);

  // Variação vs semana anterior
  const variacaoVsSemanaAnterior = useMemo(() => {
    const shiftsAnterior = shiftLogs.filter(
      (s) => s.date >= mondayAnteriorStr && s.date <= sundayAnteriorStr
    );
    if (shiftsAnterior.length === 0 || receitaTotal === 0) return null;
    const receitaAnterior = shiftsAnterior.reduce(
      (acc, s) => acc + s.grossEarnings,
      0
    );
    if (receitaAnterior === 0) return null;
    return parseFloat(
      (((receitaTotal - receitaAnterior) / receitaAnterior) * 100).toFixed(1)
    );
  }, [shiftLogs, mondayAnteriorStr, sundayAnteriorStr, receitaTotal]);

  // Progresso semanal (% dos 2000 km)
  const progressoSemanal = Math.min(100, (kmTotal / KM_BASE) * 100);

  // Dias decorridos
  const diasDecorridos = useMemo(() => {
    if (!isCurrentWeek) return 7;
    const hoje = new Date();
    const day = hoje.getDay();
    return day === 0 ? 7 : day;
  }, [isCurrentWeek]);

  // Km/dia necessários para atingir 2000
  const diasRestantes = Math.max(1, 7 - diasDecorridos);
  const kmPorDiaNecessarios =
    kmTotal < KM_BASE
      ? Math.ceil((KM_BASE - kmTotal) / diasRestantes)
      : 0;

  // ——— Dados acumulados (dual-line: Só Renda + Líquido) ———
  const dadosAcumulados: DiaAcumulado[] = useMemo(() => {
    let accKm = 0;
    let accReceita = 0;
    let accRenda = 0;
    return dadosDiarios.map((d) => {
      accKm += d.km;
      accReceita += d.receita;
      accRenda += d.renda;
      const { custoTotal: custoAcc } = calcularCustoReal(accKm, accRenda);
      const lucroSoRendaAcc = accReceita - custoAcc;
      const energiaAcc = accKm * ENERGIA_POR_KM;
      const lucroLiquidoAcc = accReceita - custoAcc - energiaAcc;
      const margemAcc =
        accReceita > 0 ? (lucroSoRendaAcc / accReceita) * 100 : 0;
      return {
        dia: d.dia,
        km: accKm,
        lucroSoRenda: parseFloat(lucroSoRendaAcc.toFixed(2)),
        lucroLiquido: parseFloat(lucroLiquidoAcc.toFixed(2)),
        margem: parseFloat(margemAcc.toFixed(1)),
      };
    });
  }, [dadosDiarios]);

  // Break-even: primeiro dia em que lucroLiquido >= 0
  const breakEvenDia = useMemo(() => {
    const idx = dadosAcumulados.findIndex((d) => d.lucroLiquido >= 0);
    return idx >= 0 ? dadosAcumulados[idx].dia : null;
  }, [dadosAcumulados]);

  // ——— Projeção (semana atual) ———
  const projecao: Projecao | null = useMemo(() => {
    if (!isCurrentWeek || diasDecorridos === 0 || kmTotal === 0) return null;
    const kmPorDia = kmTotal / diasDecorridos;
    const receitaPorDia = receitaTotal / diasDecorridos;
    const kmProjetado = Math.round(kmPorDia * 7);
    const receitaProjetada = receitaPorDia * 7;
    const { custoTotal: custoProj } = calcularCustoSemanal(kmProjetado);
    return {
      kmProjetado,
      lucro: receitaProjetada - custoProj,
      kmFaltam: Math.ceil(
        Math.max(0, KM_BASE - kmTotal) / Math.max(1, 7 - diasDecorridos)
      ),
    };
  }, [kmTotal, receitaTotal, diasDecorridos, isCurrentWeek]);

  // ——— Tabela de sensibilidade (dupla perspetiva) ———
  const tabelaSensibilidade: SensibilidadeRow[] = useMemo(() => {
    return [1500, 1800, 2000, 2200, 2500, 2800, 3000, 3500].map((km) => {
      const { kmExtra, sobretaxa, custoTotal } = calcularCustoSemanal(km);
      const receita = km * RECEITA_ESTIMADA_POR_KM;
      const lucro = receita - custoTotal;
      const margem = receita > 0 ? (lucro / receita) * 100 : 0;
      const custoPorKm = km > 0 ? custoTotal / km : RENDA_SEMANAL / KM_BASE;
      const energia = km * ENERGIA_POR_KM;
      const custoComEnergia = custoTotal + energia;
      const lucroLiquido = receita - custoComEnergia;
      const margemLiquida =
        receita > 0 ? (lucroLiquido / receita) * 100 : 0;
      return {
        km,
        kmExtra,
        sobretaxa,
        custoTotal,
        receita,
        lucro,
        margem,
        custoPorKm,
        custoComEnergia,
        lucroLiquido,
        margemLiquida,
      };
    });
  }, []);

  // ——— Status color ———
  const statusColor =
    kmTotal >= KM_BASE
      ? CORES.verde
      : kmTotal >= KM_BASE * 0.75
      ? CORES.amarelo
      : CORES.indigo;

  const temDados = kmTotal > 0 || rendaTotal > 0;
  const apenasDesp = kmTotal === 0 && rendaTotal > 0;

  return {
    kmTotal,
    kmExtra,
    diasTrabalhados,
    horasTotal,
    receitaTotal,
    rendaTotal,
    sobretaxa,
    custoTotal,
    custoEnergia,
    custoComEnergia,
    lucroSoRenda,
    margemSoRenda,
    rendimentoHoraSoRenda,
    lucroLiquido,
    margemLiquida,
    rendimentoHoraLiquido,
    custoPorKm,
    receitaPorKm,
    lucroLiquidoPorDia,
    custoFixoPorDia,
    eurosPorDezFaturados,
    melhorDia,
    piorDia,
    variacaoVsSemanaAnterior,
    diasAcimaTarget,
    breakEvenDia,
    rankingDias,
    dadosDiarios,
    dadosAcumulados,
    projecao,
    tabelaSensibilidade,
    progressoSemanal,
    kmPorDiaNecessarios,
    statusColor,
    temDados,
    apenasDesp,
    isCurrentWeek,
    diasDecorridos,
    monday,
    sunday,
    weekOffset,
    setWeekOffset,
  };
}
