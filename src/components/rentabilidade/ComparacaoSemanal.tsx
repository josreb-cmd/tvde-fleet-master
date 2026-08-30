// =============================================================================
// ComparacaoSemanal.tsx — Tabela comparativa semanal V.2.9.3
// Filtros: motorista, período (data início/fim), plataforma
// Colunas: semana, faturação, custos, ficou no bolso, €/10€, viagens, horas, km
// Extras: variação % vs semana anterior, destaque melhor/pior, export CSV
// =============================================================================
import React, { useMemo, useState } from "react";
import { Download, TrendingUp, TrendingDown, Minus } from "lucide-react";
import { useTVDE } from "../../contexts/TVDEContext";
import { getISOWeekId } from "../../utils/chargesSync";
import {
  KM_BASE,
  TAXA_ADICIONAL,
  ENERGIA_POR_KM,
} from "./constants";
import { parseHHMMToHours } from "../../utils/formatters";

// ——— Tipos ———
interface SemanaRow {
  weekId: string;
  weekLabel: string;
  faturacao: number;
  custos: number;
  ficouNoBolso: number;
  porCada10: number;
  viagens: number;
  horas: number;
  km: number;
  varFaturacao: number | null;
  varFicouNoBolso: number | null;
}

// ——— Helpers ———
function formatEuro(v: number) {
  return v.toLocaleString("pt-PT", { style: "currency", currency: "EUR", minimumFractionDigits: 2 });
}

function formatHoras(h: number) {
  const hh = Math.floor(h);
  const mm = Math.round((h - hh) * 60);
  return `${hh}h${mm.toString().padStart(2, "0")}`;
}

function weekBounds(weekId: string): { start: string; end: string } {
  const [year, week] = weekId.split("-W").map(Number);
  const jan4 = new Date(year, 0, 4);
  const startOfWeek1 = new Date(jan4);
  startOfWeek1.setDate(jan4.getDate() - ((jan4.getDay() + 6) % 7));
  const monday = new Date(startOfWeek1);
  monday.setDate(startOfWeek1.getDate() + (week - 1) * 7);
  const sunday = new Date(monday);
  sunday.setDate(monday.getDate() + 6);
  const fmt = (d: Date) => d.toISOString().slice(0, 10);
  return { start: fmt(monday), end: fmt(sunday) };
}

function weekLabel(weekId: string): string {
  const { start, end } = weekBounds(weekId);
  const s = new Date(start + "T00:00:00");
  const e = new Date(end + "T00:00:00");
  const weekNum = parseInt(weekId.split("-W")[1]);
  const fmt = (d: Date) => `${d.getDate().toString().padStart(2, "0")}/${(d.getMonth() + 1).toString().padStart(2, "0")}`;
  return `Sem ${weekNum} · ${fmt(s)}–${fmt(e)}`;
}

// ——— Componente ———
export function ComparacaoSemanal() {
  const { shiftLogs, drivers } = useTVDE();

  // Filtros
  const [driverId, setDriverId] = useState<string>("todos");
  const [dataInicio, setDataInicio] = useState<string>("");
  const [dataFim, setDataFim] = useState<string>("");
  const [plataforma, setPlataforma] = useState<string>("todas");

  // Calcular semanas disponíveis
  const rows: SemanaRow[] = useMemo(() => {
    // Filtrar logs
    let logs = [...shiftLogs];
    if (driverId !== "todos") logs = logs.filter(s => s.driverId === driverId);
    if (plataforma === "uber") logs = logs.filter(s => (s.uberEarnings || 0) > 0);
    if (plataforma === "bolt") logs = logs.filter(s => (s.boltEarnings || 0) > 0);

    // Agrupar por semana
    const weekMap = new Map<string, typeof logs>();
    for (const s of logs) {
      const wId = getISOWeekId(s.date);
      if (!weekMap.has(wId)) weekMap.set(wId, []);
      weekMap.get(wId)!.push(s);
    }

    // Filtrar por período se definido
    const semanas = Array.from(weekMap.entries())
      .filter(([wId]) => {
        const { start, end } = weekBounds(wId);
        if (dataInicio && end < dataInicio) return false;
        if (dataFim && start > dataFim) return false;
        return true;
      })
      .sort(([a], [b]) => b.localeCompare(a)); // mais recente primeiro

    // Calcular métricas por semana
    const result: SemanaRow[] = semanas.map(([wId, wLogs]) => {
      const faturacao = wLogs.reduce((a, s) => a + (s.grossEarnings || 0), 0);
      const km = wLogs.reduce((a, s) => a + (s.kilometers || 0), 0);
      const horas = wLogs.reduce((a, s) => a + (typeof s.hoursWorked === "number" ? s.hoursWorked : parseHHMMToHours(s.hoursWorked as any || "0:00")), 0);
      const viagens = wLogs.reduce((a, s) => a + (s.tripsCount || 0), 0);
      const renda = wLogs.reduce((a, s) => a + (s.rentalExpenseAmount || 0), 0);
      const kmExtra = Math.max(0, km - KM_BASE);
      const sobretaxa = kmExtra * TAXA_ADICIONAL;
      const energia = km * ENERGIA_POR_KM;
      const custos = renda + sobretaxa + energia;
      const ficouNoBolso = faturacao - custos;
      const porCada10 = faturacao > 0 ? (ficouNoBolso / faturacao) * 10 : 0;

      return { weekId: wId, weekLabel: weekLabel(wId), faturacao, custos, ficouNoBolso, porCada10, viagens, horas, km, varFaturacao: null, varFicouNoBolso: null };
    });

    // Calcular variações vs semana anterior
    for (let i = 0; i < result.length - 1; i++) {
      const curr = result[i];
      const prev = result[i + 1];
      curr.varFaturacao = prev.faturacao > 0 ? ((curr.faturacao - prev.faturacao) / prev.faturacao) * 100 : null;
      curr.varFicouNoBolso = prev.ficouNoBolso !== 0 ? ((curr.ficouNoBolso - prev.ficouNoBolso) / Math.abs(prev.ficouNoBolso)) * 100 : null;
    }

    return result;
  }, [shiftLogs, driverId, plataforma, dataInicio, dataFim]);

  // Destaque melhor/pior faturação
  const maxFat = Math.max(...rows.map(r => r.faturacao));
  const minFat = rows.length > 1 ? Math.min(...rows.filter(r => r.faturacao > 0).map(r => r.faturacao)) : -1;

  // Totais
  const totais = useMemo(() => ({
    faturacao: rows.reduce((a, r) => a + r.faturacao, 0),
    custos: rows.reduce((a, r) => a + r.custos, 0),
    ficouNoBolso: rows.reduce((a, r) => a + r.ficouNoBolso, 0),
    viagens: rows.reduce((a, r) => a + r.viagens, 0),
    horas: rows.reduce((a, r) => a + r.horas, 0),
    km: rows.reduce((a, r) => a + r.km, 0),
  }), [rows]);

  // Export CSV
  const exportCSV = () => {
    const header = ["Semana", "Faturação (€)", "Custos (€)", "Ficou no Bolso (€)", "€/10€", "Viagens", "Horas", "Km"];
    const lines = rows.map(r => [
      r.weekLabel,
      r.faturacao.toFixed(2),
      r.custos.toFixed(2),
      r.ficouNoBolso.toFixed(2),
      r.porCada10.toFixed(2),
      r.viagens,
      formatHoras(r.horas),
      r.km
    ].join(";"));
    const csv = [header.join(";"), ...lines].join("\n");
    const blob = new Blob(["\uFEFF" + csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `comparacao_semanal_${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  // ——— Render ———
  return (
    <div className="space-y-6">

      {/* Cabeçalho */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h2 className="text-xl font-bold text-white">Comparação Semanal</h2>
          <p className="text-sm text-gray-400 mt-0.5">{rows.length} semana{rows.length !== 1 ? "s" : ""} · Custos incluem renda, sobretaxa e energia estimada</p>
        </div>
        <button
          onClick={exportCSV}
          className="flex items-center gap-2 px-4 py-2 bg-indigo-700 hover:bg-indigo-600 text-white text-sm font-medium rounded-lg transition-colors"
        >
          <Download className="w-4 h-4" />
          Exportar CSV
        </button>
      </div>

      {/* Filtros */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {/* Motorista */}
        <div>
          <label className="text-xs text-gray-500 mb-1 block">Motorista</label>
          <select
            value={driverId}
            onChange={e => setDriverId(e.target.value)}
            className="w-full bg-gray-900 border border-gray-700 text-gray-200 text-sm rounded-lg px-3 py-2"
          >
            <option value="todos">Todos</option>
            {drivers.map(d => (
              <option key={d.id} value={d.id}>{d.name}</option>
            ))}
          </select>
        </div>

        {/* Plataforma */}
        <div>
          <label className="text-xs text-gray-500 mb-1 block">Plataforma</label>
          <select
            value={plataforma}
            onChange={e => setPlataforma(e.target.value)}
            className="w-full bg-gray-900 border border-gray-700 text-gray-200 text-sm rounded-lg px-3 py-2"
          >
            <option value="todas">Uber + Bolt</option>
            <option value="uber">Uber</option>
            <option value="bolt">Bolt</option>
          </select>
        </div>

        {/* Data início */}
        <div>
          <label className="text-xs text-gray-500 mb-1 block">Data início</label>
          <input
            type="date"
            value={dataInicio}
            onChange={e => setDataInicio(e.target.value)}
            className="w-full bg-gray-900 border border-gray-700 text-gray-200 text-sm rounded-lg px-3 py-2"
          />
        </div>

        {/* Data fim */}
        <div>
          <label className="text-xs text-gray-500 mb-1 block">Data fim</label>
          <input
            type="date"
            value={dataFim}
            onChange={e => setDataFim(e.target.value)}
            className="w-full bg-gray-900 border border-gray-700 text-gray-200 text-sm rounded-lg px-3 py-2"
          />
        </div>
      </div>

      {/* Tabela */}
      {rows.length === 0 ? (
        <div className="text-center py-12 text-gray-500">Sem dados para os filtros seleccionados.</div>
      ) : (
        <div className="overflow-x-auto rounded-xl border border-gray-800">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-gray-900 text-left border-b border-gray-800">
                <th className="px-4 py-3 font-medium text-gray-400 whitespace-nowrap">Semana</th>
                <th className="px-4 py-3 font-medium text-gray-400 text-right whitespace-nowrap">Faturação</th>
                <th className="px-4 py-3 font-medium text-gray-400 text-right whitespace-nowrap">Custos</th>
                <th className="px-4 py-3 font-medium text-green-500 text-right whitespace-nowrap">Ficou no bolso</th>
                <th className="px-4 py-3 font-medium text-amber-400 text-right whitespace-nowrap">€/10€</th>
                <th className="px-4 py-3 font-medium text-gray-400 text-right whitespace-nowrap">Viagens</th>
                <th className="px-4 py-3 font-medium text-gray-400 text-right whitespace-nowrap">Horas</th>
                <th className="px-4 py-3 font-medium text-gray-400 text-right whitespace-nowrap">Km</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => {
                const isMelhor = r.faturacao === maxFat && maxFat > 0;
                const isPior = r.faturacao === minFat && minFat > 0 && rows.length > 1;
                return (
                  <tr
                    key={r.weekId}
                    className={`border-b border-gray-800/50 hover:bg-gray-900/50 transition-colors ${
                      isMelhor ? "bg-green-950/20" : isPior ? "bg-red-950/20" : ""
                    }`}
                  >
                    <td className="px-4 py-3 font-medium text-white whitespace-nowrap">
                      {r.weekLabel}
                      {isMelhor && <span className="ml-2 text-[10px] bg-green-800 text-green-200 px-1.5 py-0.5 rounded">melhor</span>}
                      {isPior && <span className="ml-2 text-[10px] bg-red-900 text-red-300 px-1.5 py-0.5 rounded">pior</span>}
                    </td>
                    <td className="px-4 py-3 font-mono text-gray-300 text-right">
                      <div>{formatEuro(r.faturacao)}</div>
                      {r.varFaturacao !== null && (
                        <div className={`text-[10px] flex items-center justify-end gap-0.5 mt-0.5 ${r.varFaturacao >= 0 ? "text-green-400" : "text-red-400"}`}>
                          {r.varFaturacao >= 0 ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
                          {r.varFaturacao > 0 ? "+" : ""}{r.varFaturacao.toFixed(1)}%
                        </div>
                      )}
                    </td>
                    <td className="px-4 py-3 font-mono text-red-400 text-right">{formatEuro(r.custos)}</td>
                    <td className="px-4 py-3 font-mono text-right">
                      <div className={r.ficouNoBolso >= 0 ? "text-green-400 font-semibold" : "text-red-400 font-semibold"}>
                        {formatEuro(r.ficouNoBolso)}
                      </div>
                      {r.varFicouNoBolso !== null && (
                        <div className={`text-[10px] flex items-center justify-end gap-0.5 mt-0.5 ${r.varFicouNoBolso >= 0 ? "text-green-400" : "text-red-400"}`}>
                          {r.varFicouNoBolso >= 0 ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
                          {r.varFicouNoBolso > 0 ? "+" : ""}{r.varFicouNoBolso.toFixed(1)}%
                        </div>
                      )}
                    </td>
                    <td className={`px-4 py-3 font-mono text-right font-semibold ${r.porCada10 >= 0 ? "text-amber-400" : "text-red-400"}`}>
                      {r.porCada10.toFixed(2)}€
                    </td>
                    <td className="px-4 py-3 font-mono text-gray-300 text-right">{r.viagens}</td>
                    <td className="px-4 py-3 font-mono text-gray-300 text-right">{formatHoras(r.horas)}</td>
                    <td className="px-4 py-3 font-mono text-gray-300 text-right">{r.km.toLocaleString("pt-PT")}</td>
                  </tr>
                );
              })}
            </tbody>
            {/* Totais */}
            <tfoot>
              <tr className="bg-gray-900 border-t-2 border-gray-700 font-semibold">
                <td className="px-4 py-3 text-gray-400 text-sm">TOTAL / {rows.length} sem.</td>
                <td className="px-4 py-3 font-mono text-white text-right">{formatEuro(totais.faturacao)}</td>
                <td className="px-4 py-3 font-mono text-red-400 text-right">{formatEuro(totais.custos)}</td>
                <td className={`px-4 py-3 font-mono text-right ${totais.ficouNoBolso >= 0 ? "text-green-400" : "text-red-400"}`}>
                  {formatEuro(totais.ficouNoBolso)}
                </td>
                <td className="px-4 py-3 font-mono text-amber-400 text-right">
                  {totais.faturacao > 0 ? ((totais.ficouNoBolso / totais.faturacao) * 10).toFixed(2) : "0.00"}€
                </td>
                <td className="px-4 py-3 font-mono text-gray-300 text-right">{totais.viagens}</td>
                <td className="px-4 py-3 font-mono text-gray-300 text-right">{formatHoras(totais.horas)}</td>
                <td className="px-4 py-3 font-mono text-gray-300 text-right">{totais.km.toLocaleString("pt-PT")}</td>
              </tr>
            </tfoot>
          </table>
        </div>
      )}
    </div>
  );
}
