// =============================================================================
// src/components/rentabilidade/useKmRentabilidade.ts
// Hook principal do módulo Rentabilidade km
// TVDE Fleet Master V.2.8.5
// 🆕 V.2.8.5 FIX #1: Break-even com renda proporcional (accRenda diária)
// 🆕 V.2.8.5 FIX #2: Custo energético REAL (fuelExpenseAmount)
//    — Toda a perspetiva "Líquido" usa custo real do Firestore
//    — ENERGIA_POR_KM mantém-se como fallback e para tabela de sensibilidade
// ✅ Análise custo marginal centralizada + veredictoKmExtra
// ✅ Ritmo ideal DINÂMICO — descontar folgas do divisor
// ✅ Break-even duplo (Só Renda + Líquido)
// ✅ Fix ranking — sobretaxa é semanal, não diária
// hoursWorked = number (decimal). Ex: 8.75 = 8h45min
// Deteção de folga: isDayOff() — convenção híbrida (nota + zeros)
// =============================================================================
import { useState, useMemo } from "react";
import { useTVDE } from "../../contexts/TVDEContext";
import { isDayOff } from "../../utils/dayOff";
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
  DiaDestaque,
  RankingDia,
  VeredictoKmExtra,
} from "./types";

// ——— Constante derivada V.2.8.2 ———

/** Limiar mínimo de ganho por km extra para ser considerado "compensa" */
const LIMIAR_COMPENSA = 0.05; // 5 cêntimos

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

/**
 * Custos usando renda REAL (soma dos rentalExpenseAmount).
 * Perspetiva contratual: rendaReal + sobretaxa.
 * Usado para KPIs finais (totais semanais).
 */
function calcularCustoReal(kmTotal: number, rendaReal: number) {
  const kmExtra = Math.max(0, kmTotal - KM_BASE);
  const sobretaxa = kmExtra * TAXA_ADICIONAL;
  const custoTotal = rendaReal + sobretaxa;
  return { kmExtra, sobretaxa, custoTotal };
}

/**
 * Custos usando RENDA_SEMANAL fixa (350€).
 * Usado na tabela de sensibilidade e projeção.
 */
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

  // ——— Limites da semana selecionada ———
  const { monday, sunday } = useMemo(
    () => getWeekBounds(weekOffset),
    [weekOffset]
  );
  const isCurrentWeek = weekOffset === 0;
  const mondayStr = useMemo(() => toDateStr(monday), [monday]);
  const sundayStr = useMemo(() => toDateStr(sunday), [sunday]);

  // ——— Limites da semana anterior (para variação %) ———
  const { monday: mondayAnterior, sunday: sundayAnterior } = useMemo(
    () => getWeekBounds(weekOffset - 1),
    [weekOffset]
  );
  const mondayAnteriorStr = useMemo(
    () => toDateStr(mondayAnterior),
    [mondayAnterior]
  );
  const sundayAnteriorStr = useMemo(
    () => toDateStr(sundayAnterior),
    [sundayAnterior]
  );

  // ——— ShiftLogs desta semana ———
  const shiftsNaSemana = useMemo(
    () =>
      shiftLogs.filter(
        (s) => s.date >= mondayStr && s.date <= sundayStr
      ),
    [shiftLogs, mondayStr, sundayStr]
  );

  // ═══════════════════════════════════════════════════════════════
  // V.2.8.5 — dadosDiarios com custoEnergiaReal (fuelExpenseAmount)
  // ═══════════════════════════════════════════════════════════════
  const dadosDiarios: DiaData[] = useMemo(() => {
    return DIAS_SEMANA.map((dia, i) => {
      const diaDate = new Date(monday);
      diaDate.setDate(monday.getDate() + i);
      const diaStr = toDateStr(diaDate);
      const shiftsNoDia = shiftsNaSemana.filter((s) => s.date === diaStr);

      const km = shiftsNoDia.reduce((acc, s) => acc + (s.kilometers || 0), 0);
      const receita = shiftsNoDia.reduce(
        (acc, s) => acc + (s.grossEarnings || 0),
        0
      );
      const renda = shiftsNoDia.reduce(
        (acc, s) => acc + (s.rentalExpenseAmount || 0),
        0
      );
      // hoursWorked é number decimal (ex: 8.75 = 8h45min)
      const horas = shiftsNoDia.reduce(
        (acc, s) =>
          acc + (typeof s.hoursWorked === "number" ? s.hoursWorked : 0),
        0
      );

      // 🆕 V.2.8.5 — Custo energético REAL do Firestore
      // fuelExpenseAmount está preenchido todos os dias (Cenário A confirmado)
      // Fallback para estimativa se algum registo tiver o campo undefined/null
      const custoEnergiaReal = shiftsNoDia.reduce((acc, s) => {
        const fuel = s.fuelExpenseAmount;
        return acc + (typeof fuel === "number" ? fuel : km * ENERGIA_POR_KM);
      }, 0);

      // Deteção de folga via isDayOff() — verifica se TODOS os shifts do dia são folga
      const folga =
        shiftsNoDia.length > 0 && shiftsNoDia.every((s) => isDayOff(s));

      return { dia, km, receita, renda, horas, folga, custoEnergiaReal };
    });
  }, [shiftsNaSemana, monday]);

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

  // ═══════════════════════════════════════════════════════════════
  // V.2.8.5 — Energia real vs estimada
  // ═══════════════════════════════════════════════════════════════
  const energiaTotalReal = useMemo(
    () => dadosDiarios.reduce((s, d) => s + d.custoEnergiaReal, 0),
    [dadosDiarios]
  );
  const energiaEstimada = kmTotal * ENERGIA_POR_KM;
  const desvioEnergia = energiaEstimada > 0
    ? ((energiaTotalReal - energiaEstimada) / energiaEstimada) * 100
    : 0;

  // ——— Dias trabalhados = dias que NÃO são folga E têm actividade ———
  const diasTrabalhados = useMemo(
    () =>
      dadosDiarios.filter((d) => !d.folga && (d.km > 0 || d.receita > 0))
        .length,
    [dadosDiarios]
  );

  // ——— Dias de folga ———
  const diasFolga = useMemo(
    () => dadosDiarios.filter((d) => d.folga).length,
    [dadosDiarios]
  );

  // ——— Custos ———
  const { kmExtra, sobretaxa, custoTotal } = useMemo(
    () => calcularCustoReal(kmTotal, rendaTotal),
    [kmTotal, rendaTotal]
  );

  // 🆕 V.2.8.5 — custoEnergia agora é REAL (não estimado)
  const custoEnergia = energiaTotalReal;
  const custoComEnergia = custoTotal + custoEnergia;

  // ——— Métricas "Só Renda" (inalteradas — não depende de energia) ———
  const lucroSoRenda = receitaTotal - custoTotal;
  const margemSoRenda =
    receitaTotal > 0 ? (lucroSoRenda / receitaTotal) * 100 : 0;
  const rendimentoHoraSoRenda =
    horasTotal > 0 ? lucroSoRenda / horasTotal : 0;

  // ——— Métricas "Líquido" (agora com energia REAL) ———
  const lucroLiquido = receitaTotal - custoTotal - custoEnergia;
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

  // ═══════════════════════════════════════════════════════════════
  // V.2.8.2 — ANÁLISE CUSTO MARGINAL KM EXTRA (centralizada)
  // ═══════════════════════════════════════════════════════════════

  /**
   * Custo marginal de cada km acima dos 2000:
   *   TAXA_ADICIONAL (0.25€) + ENERGIA_POR_KM (0.065€) = 0.315€/km
   *
   * Nota V.2.8.5: mantém ENERGIA_POR_KM aqui (constante teórica)
   * porque o custo marginal é uma projeção para FUTUROS km extras,
   * não o custo dos km já percorridos. O custo real é usado nos totais.
   */
  const custoMarginalKm = TAXA_ADICIONAL + ENERGIA_POR_KM; // 0.315€

  const ganhoLiquidoPorKmExtra = receitaPorKm - custoMarginalKm;

  const margemPorKmExtra =
    receitaPorKm > 0
      ? (ganhoLiquidoPorKmExtra / receitaPorKm) * 100
      : 0;

  const veredictoKmExtra: VeredictoKmExtra = useMemo(() => {
    if (receitaPorKm === 0) return "nao_compensa";
    if (ganhoLiquidoPorKmExtra > LIMIAR_COMPENSA) return "compensa";
    if (ganhoLiquidoPorKmExtra > 0) return "limite";
    return "nao_compensa";
  }, [receitaPorKm, ganhoLiquidoPorKmExtra]);

  // ═══════════════════════════════════════════════════════════════
  // FIM — Análise custo marginal
  // ═══════════════════════════════════════════════════════════════

  // ——— Métricas do MOTORISTA (agora com energia real) ———
  const lucroLiquidoPorDia =
    diasTrabalhados > 0 ? lucroLiquido / diasTrabalhados : 0;
  const custoFixoPorDia =
    diasTrabalhados > 0 ? custoComEnergia / diasTrabalhados : 0;
  const eurosPorDezFaturados =
    receitaTotal > 0
      ? parseFloat(((lucroLiquido / receitaTotal) * 10).toFixed(2))
      : 0;

  // Melhor e pior dia (por receita, excluindo folgas)
  const diasComActividade = useMemo(
    () => dadosDiarios.filter((d) => !d.folga && d.receita > 0),
    [dadosDiarios]
  );

  const melhorDia: DiaDestaque | null = useMemo(() => {
    if (diasComActividade.length === 0) return null;
    const best = diasComActividade.reduce((a, b) =>
      b.receita > a.receita ? b : a
    );
    return { dia: best.dia, valor: best.receita };
  }, [diasComActividade]);

  const piorDia: DiaDestaque | null = useMemo(() => {
    if (diasComActividade.length === 0) return null;
    const worst = diasComActividade.reduce((a, b) =>
      b.receita < a.receita ? b : a
    );
    return { dia: worst.dia, valor: worst.receita };
  }, [diasComActividade]);

  // ═══════════════════════════════════════════════════════════════
  // V.2.8.1 — RITMO IDEAL DINÂMICO (descontar folgas)
  // ═══════════════════════════════════════════════════════════════

  // Dias decorridos na semana
  const diasDecorridos = useMemo(() => {
    if (!isCurrentWeek) return 7;
    const hoje = new Date();
    const day = hoje.getDay();
    return day === 0 ? 7 : day;
  }, [isCurrentWeek]);

  const diasEfetivos = useMemo(() => {
    if (!isCurrentWeek) {
      return Math.max(1, 7 - diasFolga);
    }
    const diasFolgaFuturos = dadosDiarios
      .slice(diasDecorridos)
      .filter((d) => d.folga).length;
    const diasTrabalhoFuturos = Math.max(
      0,
      7 - diasDecorridos - diasFolgaFuturos
    );
    return Math.max(1, diasTrabalhados + diasTrabalhoFuturos);
  }, [isCurrentWeek, diasFolga, diasDecorridos, diasTrabalhados, dadosDiarios]);

  const kmDiaTarget = useMemo(
    () => Math.ceil(KM_BASE / diasEfetivos),
    [diasEfetivos]
  );

  // Streak: dias com km >= target dinâmico (excluindo folgas)
  const diasAcimaTarget = useMemo(
    () => dadosDiarios.filter((d) => !d.folga && d.km >= kmDiaTarget).length,
    [dadosDiarios, kmDiaTarget]
  );

  const kmPorDiaNecessarios = useMemo(() => {
    if (kmTotal >= KM_BASE) return 0;
    if (!isCurrentWeek) return 0;

    const diasFolgaFuturos = dadosDiarios
      .slice(diasDecorridos)
      .filter((d) => d.folga).length;
    const diasTrabalhoRestantes = Math.max(
      1,
      7 - diasDecorridos - diasFolgaFuturos
    );

    return Math.ceil((KM_BASE - kmTotal) / diasTrabalhoRestantes);
  }, [kmTotal, isCurrentWeek, diasDecorridos, dadosDiarios]);

  // ═══════════════════════════════════════════════════════════════
  // FIM — Ritmo ideal dinâmico
  // ═══════════════════════════════════════════════════════════════

  // ——— Ranking de dias por eficiência (€/hora, excluindo folgas) ———
  // Nota: sobretaxa é SEMANAL (acima de 2000 km no total), não diária.
  // 🆕 V.2.8.5: lucroLiquido usa custoEnergiaReal em vez de estimativa
  const rankingDias: RankingDia[] = useMemo(() => {
    return diasComActividade
      .map((d) => ({
        dia: d.dia,
        receitaPorKm: d.km > 0 ? d.receita / d.km : 0,
        receitaPorHora: d.horas > 0 ? d.receita / d.horas : 0,
        lucroLiquido: d.receita - d.renda - d.custoEnergiaReal,
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

  // ═══════════════════════════════════════════════════════════════
  // V.2.8.5 FIX #1 — Dados acumulados com RENDA PROPORCIONAL
  // ═══════════════════════════════════════════════════════════════
  // ANTES (V.2.8.4): renda fixa 350€ desde dia 1 → lucro começa a -350€.
  // AGORA (V.2.8.5): renda real acumulada (accRenda += d.renda).
  //   → Alinhado com os KPIs que usam rendaTotal.
  //   → Cada dia mostra a realidade: "quanto ganhei - quanto já paguei".
  //   → Break-even cruza 0€ quando a receita acumulada supera
  //     (renda acumulada + sobretaxa).
  //
  // V.2.8.5 FIX #2 — Energia acumulada REAL (não estimada)
  //   → Linha "Líquido" usa soma de custoEnergiaReal por dia.
  // ═══════════════════════════════════════════════════════════════
  const dadosAcumulados: DiaAcumulado[] = useMemo(() => {
    let accKm = 0;
    let accReceita = 0;
    let accRenda = 0;
    let accEnergiaReal = 0;
    return dadosDiarios.map((d) => {
      accKm += d.km;
      accReceita += d.receita;
      accRenda += d.renda;
      accEnergiaReal += d.custoEnergiaReal;
      // Sobretaxa depende dos km acumulados até este dia
      const kmExtraAcc = Math.max(0, accKm - KM_BASE);
      const sobretaxaAcc = kmExtraAcc * TAXA_ADICIONAL;
      // Perspetiva "Só Renda": receita − renda acumulada real − sobretaxa
      const lucroSoRendaAcc = accReceita - accRenda - sobretaxaAcc;
      // Perspetiva "Líquido": receita − renda − sobretaxa − energia REAL acumulada
      const lucroLiquidoAcc = accReceita - accRenda - sobretaxaAcc - accEnergiaReal;
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

  // ——— Break-even duplo: Só Renda + Líquido ———
  const breakEvenDia = useMemo(() => {
    const idx = dadosAcumulados.findIndex((d) => d.lucroLiquido >= 0);
    return idx >= 0 ? dadosAcumulados[idx].dia : null;
  }, [dadosAcumulados]);

  const breakEvenDiaSoRenda = useMemo(() => {
    const idx = dadosAcumulados.findIndex((d) => d.lucroSoRenda >= 0);
    return idx >= 0 ? dadosAcumulados[idx].dia : null;
  }, [dadosAcumulados]);

  // ——— Projeção (apenas semana atual, com dados) ———
  const projecao: Projecao | null = useMemo(() => {
    if (!isCurrentWeek || diasDecorridos === 0 || kmTotal === 0) return null;

    const diasTrabalhadosAteAgora = dadosDiarios
      .slice(0, diasDecorridos)
      .filter((d) => !d.folga && (d.km > 0 || d.receita > 0)).length;

    if (diasTrabalhadosAteAgora === 0) return null;

    const kmPorDia = kmTotal / diasTrabalhadosAteAgora;
    const receitaPorDia = receitaTotal / diasTrabalhadosAteAgora;

    const diasFolgaFuturos = dadosDiarios
      .slice(diasDecorridos)
      .filter((d) => d.folga).length;
    const diasTrabFuturos = Math.max(
      0,
      7 - diasDecorridos - diasFolgaFuturos
    );

    const kmProjetado = Math.round(kmTotal + kmPorDia * diasTrabFuturos);
    const receitaProjetada = receitaTotal + receitaPorDia * diasTrabFuturos;
    const { custoTotal: custoProj } = calcularCustoSemanal(kmProjetado);

    return {
      kmProjetado,
      lucro: receitaProjetada - custoProj,
      kmFaltam:
        diasTrabFuturos > 0
          ? Math.ceil(Math.max(0, KM_BASE - kmTotal) / diasTrabFuturos)
          : 0,
    };
  }, [
    kmTotal,
    receitaTotal,
    diasDecorridos,
    isCurrentWeek,
    dadosDiarios,
  ]);

  // ——— Tabela de sensibilidade (dupla perspetiva — estimativa) ———
  // Nota: tabela usa ENERGIA_POR_KM (constante) porque é projeção teórica
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

  // ——— Return ———
  return {
    // Totais
    kmTotal,
    kmExtra,
    diasTrabalhados,
    diasFolga,
    horasTotal,
    receitaTotal,
    rendaTotal,
    sobretaxa,
    custoTotal,
    custoEnergia,
    custoComEnergia,

    // Dupla perspetiva — Só Renda
    lucroSoRenda,
    margemSoRenda,
    rendimentoHoraSoRenda,

    // Dupla perspetiva — Líquido
    lucroLiquido,
    margemLiquida,
    rendimentoHoraLiquido,

    // Comuns
    custoPorKm,
    receitaPorKm,

    // Motorista
    lucroLiquidoPorDia,
    custoFixoPorDia,
    eurosPorDezFaturados,
    melhorDia,
    piorDia,
    variacaoVsSemanaAnterior,
    diasAcimaTarget,
    breakEvenDia,
    breakEvenDiaSoRenda,
    rankingDias,

    // V.2.8.1 — Ritmo dinâmico
    diasEfetivos,
    kmDiaTarget,

    // V.2.8.2 — Análise custo marginal km extra
    custoMarginalKm,
    ganhoLiquidoPorKmExtra,
    margemPorKmExtra,
    veredictoKmExtra,

    // 🆕 V.2.8.5 — Energia real
    energiaTotalReal,
    energiaEstimada,
    desvioEnergia,

    // Dados
    dadosDiarios,
    dadosAcumulados,
    projecao,
    tabelaSensibilidade,

    // Estado e navegação
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
