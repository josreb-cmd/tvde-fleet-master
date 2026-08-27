// src/utils/chargesSync.ts
// ─── Sincronização Charges → ShiftLogs ─────────────────────────
import {
  collection,
  query,
  where,
  getDocs,
  doc,
  updateDoc
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
 * para o shiftLog.fuelExpenseAmount correspondente.
 *
 * @param date - Data no formato "YYYY-MM-DD"
 * @param knownTotal - (opcional) Total já calculado localmente,
 *   usado como fallback se a query Firestore ainda não refletir
 *   a escrita mais recente (race condition de indexação).
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

    // 3. Usar o maior entre queryTotal e knownTotal
    //    Se knownTotal foi passado e é maior, a query ainda não
    //    indexou o documento mais recente → usar knownTotal
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
    const updates = shiftSnap.docs.map((shiftDoc) =>
      updateDoc(doc(db, 'shiftLogs', shiftDoc.id), {
        fuelExpenseAmount: totalNet
      })
    );

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
 * Verifica se existem charges registados para uma data específica.
 * Mantida para retrocompatibilidade (usada noutros componentes).
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
 * Combina hasChargesForDate + buscar valor num só round-trip.
 * Usado pelo ShiftModal para decidir read-only E exibir o valor correto.
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
