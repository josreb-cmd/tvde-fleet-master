// src/hooks/useCharges.ts
// Hook completo para gestão de carregamentos com auto-sync para shiftLog

import { useState, useEffect, useMemo } from 'react';
import {
  collection,
  query,
  orderBy,
  onSnapshot,
  addDoc,
  updateDoc,
  deleteDoc,
  doc,
  writeBatch
} from 'firebase/firestore';
import { db } from '../lib/firebase';
import { Charge, ChargeFormData } from '../types/charges';
import { getISOWeekId, syncChargesToShiftLog } from '../utils/chargesSync';
import { useAuth } from '../contexts/AuthContext';

// Semanas disponíveis para o seletor
export interface WeekOption {
  weekId: string;
  label: string;       // Ex: "Sem. 33 — 11/08 a 17/08"
  startDate: string;
  endDate: string;
}

// Resumo do acerto semanal
export interface WeeklySettlement {
  weekId: string;
  totalJosePaid: number;      // Soma netAmount onde paidBy="jose"
  totalAlexandreDiscount: number; // Soma discount onde paidBy="alexandre"
  balance: number;            // totalJosePaid - totalAlexandreDiscount
  charges: Charge[];
  allSettled: boolean;
}

export function useCharges() {
  const [charges, setCharges] = useState<Charge[]>([]);
  const [loading, setLoading] = useState(true);
  const { user } = useAuth();

  // Listener em tempo real para toda a coleção charges
  useEffect(() => {
    const q = query(collection(db, 'charges'), orderBy('date', 'desc'));
    const unsub = onSnapshot(q, (snapshot) => {
      const data = snapshot.docs.map(d => ({
        id: d.id,
        ...d.data()
      })) as Charge[];
      setCharges(data);
      setLoading(false);
    }, (error) => {
      console.error('[useCharges] Erro no listener:', error);
      setLoading(false);
    });

    return () => unsub();
  }, []);

  // Adicionar novo carregamento
  const addCharge = async (formData: ChargeFormData): Promise<void> => {
    const gross = parseFloat(formData.grossAmount) || 0;
    const disc = parseFloat(formData.discount) || 0;
    const net = Math.round((gross - disc) * 100) / 100;

    const charge: Omit<Charge, 'id'> = {
      date: formData.date,
      paidBy: formData.paidBy,
      grossAmount: gross,
      discount: disc,
      netAmount: net,
      location: formData.location.trim(),
      createdBy: user?.uid || 'unknown',
      createdAt: new Date().toISOString(),
      weekId: getISOWeekId(formData.date),
      settled: false
    };

    await addDoc(collection(db, 'charges'), charge);

    // Calcular total local para este dia (charges existentes + novo)
    const existingDayCharges = charges.filter(c => c.date === formData.date);
    const localTotal = existingDayCharges.reduce((sum, c) => sum + c.netAmount, 0) + net;

    // Auto-sync com knownTotal para evitar race condition
    await syncChargesToShiftLog(formData.date, localTotal);
  };

  // Atualizar carregamento existente
  const updateCharge = async (id: string, formData: ChargeFormData): Promise<void> => {
    const gross = parseFloat(formData.grossAmount) || 0;
    const disc = parseFloat(formData.discount) || 0;
    const net = Math.round((gross - disc) * 100) / 100;

    // Guardar a data antiga antes de atualizar (pode ter mudado de dia)
    const oldCharge = charges.find(c => c.id === id);
    const oldDate = oldCharge?.date;

    await updateDoc(doc(db, 'charges', id), {
      date: formData.date,
      paidBy: formData.paidBy,
      grossAmount: gross,
      discount: disc,
      netAmount: net,
      location: formData.location.trim(),
      weekId: getISOWeekId(formData.date)
    });

    // V.2.9.2 fix — cálculo explícito sem ambiguidade de race condition:
    // outros charges do novo dia (excluindo o editado) + novo valor
    const wasOnThisDay = oldDate === formData.date;
    const otherChargesOnNewDay = charges.filter(
      c => c.date === formData.date && c.id !== id
    );
    const finalTotal = otherChargesOnNewDay.reduce((sum, c) => sum + c.netAmount, 0) + net;

    await syncChargesToShiftLog(formData.date, finalTotal);

    // Se a data mudou, re-sync o dia antigo (remover o charge de lá)
    if (oldDate && oldDate !== formData.date) {
      const oldDayTotal = charges
        .filter(c => c.date === oldDate && c.id !== id)
        .reduce((sum, c) => sum + c.netAmount, 0);

      await syncChargesToShiftLog(oldDate, oldDayTotal);
    }
  };

  // Eliminar carregamento
  const deleteCharge = async (charge: Charge): Promise<void> => {
    await deleteDoc(doc(db, 'charges', charge.id));

    // Calcular total local sem o charge eliminado
    const localTotal = charges
      .filter(c => c.date === charge.date && c.id !== charge.id)
      .reduce((sum, c) => sum + c.netAmount, 0);

    // Re-sync (pode haver outros charges no mesmo dia)
    await syncChargesToShiftLog(charge.date, localTotal);
  };

  // Liquidar semana (marcar todos os charges da semana como settled)
  const settleWeek = async (weekId: string): Promise<void> => {
    const weekCharges = charges.filter(c => c.weekId === weekId && !c.settled);
    if (weekCharges.length === 0) return;

    const batch = writeBatch(db);
    weekCharges.forEach(c => {
      batch.update(doc(db, 'charges', c.id), { settled: true });
    });
    await batch.commit();
  };

  // Charges filtrados por data
  const getChargesByDate = (date: string): Charge[] => {
    return charges.filter(c => c.date === date);
  };

  // Lista de semanas disponíveis (para seletor)
  const availableWeeks = useMemo((): WeekOption[] => {
    const weekMap = new Map<string, { dates: string[] }>();

    charges.forEach(c => {
      if (!weekMap.has(c.weekId)) {
        weekMap.set(c.weekId, { dates: [] });
      }
      weekMap.get(c.weekId)!.dates.push(c.date);
    });

    return Array.from(weekMap.entries())
      .map(([weekId, { dates }]) => {
        const sorted = [...dates].sort();
        const startDate = sorted[0];
        const endDate = sorted[sorted.length - 1];

        const weekNum = parseInt(weekId.split('-W')[1]);
        const start = new Date(startDate + 'T00:00:00');
        const end = new Date(endDate + 'T00:00:00');
        const label = `Sem. ${weekNum} — ${start.getDate().toString().padStart(2, '0')}/${(start.getMonth() + 1).toString().padStart(2, '0')} a ${end.getDate().toString().padStart(2, '0')}/${(end.getMonth() + 1).toString().padStart(2, '0')}`;

        return { weekId, label, startDate, endDate };
      })
      .sort((a, b) => b.weekId.localeCompare(a.weekId));
  }, [charges]);

  // Acerto semanal para uma semana específica
  const getWeeklySettlement = (weekId: string): WeeklySettlement => {
    const weekCharges = charges.filter(c => c.weekId === weekId);

    const totalJosePaid = weekCharges
      .filter(c => c.paidBy === 'jose')
      .reduce((sum, c) => sum + c.netAmount, 0);

    const totalAlexandreDiscount = weekCharges
      .filter(c => c.paidBy === 'alexandre')
      .reduce((sum, c) => sum + c.discount, 0);

    const balance = Math.round((totalJosePaid - totalAlexandreDiscount) * 100) / 100;

    const allSettled = weekCharges.length > 0 && weekCharges.every(c => c.settled);

    return {
      weekId,
      totalJosePaid: Math.round(totalJosePaid * 100) / 100,
      totalAlexandreDiscount: Math.round(totalAlexandreDiscount * 100) / 100,
      balance,
      charges: weekCharges,
      allSettled
    };
  };

  return {
    charges,
    loading,
    addCharge,
    updateCharge,
    deleteCharge,
    settleWeek,
    getChargesByDate,
    availableWeeks,
    getWeeklySettlement
  };
}
