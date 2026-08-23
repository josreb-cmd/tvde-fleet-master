// =============================================================================
// dayOff.ts — Deteção centralizada de dia de folga (convenção híbrida)
// TVDE Fleet Master V.2.8.0
//
// Lógica:
// 1. Convenção nova: campo notes contém "folga" (case-insensitive, trimmed)
// 2. Retrocompatibilidade: registo existe com TODOS os campos operacionais a zero
//    (dados antigos não tinham nota "Folga")
//
// NOTA: Um registo a zeros SEM nota é tratado como folga porque a convenção
// anterior não incluía a nota. Não confundir com dia sem registo (esse nem
// existe no array de shiftLogs).
// =============================================================================

import type { DailyShiftLog } from "../types";

export const isDayOff = (log: DailyShiftLog): boolean => {
  // Convenção nova: nota explícita
  if (log.notes?.toLowerCase().trim() === "folga") return true;

  // Retrocompatibilidade: registo com tudo a zero
  return (
    (log.kilometers ?? 0) === 0 &&
    (log.grossEarnings ?? 0) === 0 &&
    (log.hoursWorked ?? 0) === 0 &&
    (log.tripsCount ?? 0) === 0
  );
};
