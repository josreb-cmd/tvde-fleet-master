// src/utils/chargesSync.ts
// ─── Sincronização Charges → ShiftLogs ─────────────────────────
import {
  collection,
  query,
  where,
  getDocs,
  doc,
  updateDoc,
  setDoc,
  deleteDoc
} from 'firebase/firestore';
import { db } from '../lib/firebase';

/**
 * Gera o weekId ISO (ex: "2026-W33") a partir de uma data "YYYY-MM-DD".
 * Seg–Dom conforme ISO 8601.
 */
export function getISOWeekId(dateStr: string): string {
  const date = new Date(dateStr + 'T00:00:00');
  const day = date.getDay();
  const isoDay = day === 0 ? 7 : day;
  const thursday = new Date(date);
  thursday.setDate(date.getDate() + (4 - isoDay));
  const yearStart = new Date(thursday.getFullYear(), 0, 1);
  const weekNum = Math.ceil(
    ((thursday.getTime() - yearStart.getTime()) / 86400000 + 1) / 7
  );
  return `${thursday.getFullYear()}-W${String(weekNum).padStart(2, '0')}`;
}

/**
 * Sincroniza a soma de netAmount das charges de um dia
 * para o shiftLog.fuelExpenseAmount E para expenses (fuel_charging).
 *
 * @param date      - Data no formato "YYYY-MM-DD"
 * @param knownTotal - (opcional) Total já calculado localmente (evita race condition)
 */
export async function syncChargesToShiftLog(
  date: string,
  knownTotal?: number
): Promise<void> {
  try {
    // 1. Buscar todas as charges deste dia
    const chargesQuery = query(
      collection(db, 'charges'),
      where('date', '==', date)
    );
    const chargesSnap = await getDocs(chargesQuery);

    // 2. Somar netAmount da query
    let queryTotal = 0;
    chargesSnap.forEach((d) => {
      const data = d.data();
      queryTotal += data.netAmount ?? 0;
    });
    queryTotal = Math.round(queryTotal * 100) / 100;

    // 3. Usar o maior entre queryTotal e knownTotal (race condition guard)
    let totalNet = queryTotal;
    if (knownTotal !== undefined) {
      const rounded = Math.round(knownTotal * 100) / 100;
      if (rounded > queryTotal) {
        console.warn(
          `[chargesSync] Race condition detetada para ${date}: ` +
          `query=${queryTotal}€, local=${rounded}€ → usar local`
        );
        totalNet = rounded;
      }
    }

    // 4. Encontrar o shiftLog deste dia
    const shiftQuery = query(
      collection(db, 'shiftLogs'),
      where('date', '==', date)
    );
    const shiftSnap = await getDocs(shiftQuery);

    if (shiftSnap.empty) {
      console.warn('[chargesSync] Nenhum shiftLog encontrado para', date);
      return;
    }

    // 5. Atualizar cada shiftLog deste dia (normalmente só 1)
    //    E sincronizar o expense de energia correspondente
    const updates = shiftSnap.docs.map(async (shiftDoc) => {
      const shiftData = shiftDoc.data();

      // 5a. Atualizar fuelExpenseAmount no shiftLog
      await updateDoc(doc(db, 'shiftLogs', shiftDoc.id), {
        fuelExpenseAmount: totalNet
      });

      // 5b. Sincronizar expense fuel_charging (Opção A)
      await syncFuelExpenseForShift({
        shiftId: shiftDoc.id,
        date,
        totalNet,
        vehicleId:   shiftData.vehicleId   || '',
        vehiclePlate: shiftData.vehiclePlate || '',
        driverId:    shiftData.driverId    || '',
        driverName:  shiftData.driverName  || ''
      });
    });

    await Promise.all(updates);
    console.log(
      `[chargesSync] ${date}: fuelExpenseAmount → ${totalNet}€ ` +
      `(${chargesSnap.size} charges na query)`
    );
  } catch (error) {
    console.error('[chargesSync] Erro ao sincronizar', date, error);
    throw error;
  }
}

/**
 * Cria ou atualiza (upsert) o expense de energia (fuel_charging)
 * correspondente a um shiftLog, usando o total das charges como valor.
 * Se totalNet = 0, elimina o expense (evitar linha a 0€ no módulo Custos).
 */
async function syncFuelExpenseForShift(params: {
  shiftId: string;
  date: string;
  totalNet: number;
  vehicleId: string;
  vehiclePlate: string;
  driverId: string;
  driverName: string;
}): Promise<void> {
  const { shiftId, date, totalNet, vehicleId, vehiclePlate, driverId, driverName } = params;
  const expenseId = `exp-fuel-shift-${shiftId}`;
  const expenseRef = doc(db, 'expenses', expenseId);

  if (totalNet <= 0) {
    // Sem charges neste dia → remover o expense de energia
    try {
      await deleteDoc(expenseRef);
      console.log(`[chargesSync] Expense ${expenseId} eliminado (totalNet=0)`);
    } catch (_) {
      // Ignorar se já não existia
    }
    return;
  }

  // Upsert do expense com o valor correto das charges
  const fuelExpense = {
    id: expenseId,
    category: 'fuel_charging',
    title: `Combustível / Energia (${vehiclePlate})`,
    amount: totalNet,
    date,
    vehicleId,
    vehiclePlate,
    driverId,
    driverName,
    description: `Sincronizado de Faturação Diária (${driverName})`
  };

  await setDoc(expenseRef, fuelExpense);
  console.log(`[chargesSync] Expense ${expenseId} → ${totalNet}€`);
}

/**
 * Verifica se existem charges registados para uma data específica.
 */
export async function hasChargesForDate(date: string): Promise<boolean> {
  try {
    const q = query(
      collection(db, 'charges'),
      where('date', '==', date)
    );
    const snapshot = await getDocs(q);
    return !snapshot.empty;
  } catch (error) {
    console.error('[chargesSync] Erro ao verificar charges para', date, error);
    return false;
  }
}

/**
 * Verifica se existem charges para uma data E retorna o total.
 */
export async function getChargesInfoForDate(date: string): Promise<{
  hasCharges: boolean;
  totalNet: number;
}> {
  try {
    const q = query(
      collection(db, 'charges'),
      where('date', '==', date)
    );
    const snapshot = await getDocs(q);

    if (snapshot.empty) {
      return { hasCharges: false, totalNet: 0 };
    }

    let totalNet = 0;
    snapshot.forEach((d) => {
      const data = d.data();
      totalNet += data.netAmount ?? 0;
    });
    totalNet = Math.round(totalNet * 100) / 100;

    return { hasCharges: true, totalNet };
  } catch (error) {
    console.error('[chargesSync] Erro ao verificar charges para', date, error);
    return { hasCharges: false, totalNet: 0 };
  }
}