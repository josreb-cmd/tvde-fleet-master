// src/views/CarregamentosView.tsx
import React, { useState, useMemo, useCallback } from 'react';
import {
  Zap,
  Plus,
  Trash2,
  Edit3,
  ChevronLeft,
  ChevronRight,
  CheckCircle2,
  AlertTriangle,
  Receipt,
  User,
  MapPin,
  Calendar,
  Euro,
  Tag,
  Info,
  Loader2,
  Lock
} from 'lucide-react';
import { useCharges } from '../hooks/useCharges';
import { useAuth } from '../contexts/AuthContext';
import { useTVDE } from '../contexts/TVDEContext';
import { ChargeFormData } from '../types/charges';
import { isDayOff } from '../utils/dayOff';                       // ✅ NOVO

// ── Helpers ──────────────────────────────────────────────────────

/** Retorna o weekId ISO "YYYY-Www" para uma data */
function getISOWeekId(dateStr: string): string {
  const d = new Date(dateStr + 'T12:00:00');
  const dayNum = d.getUTCDay() || 7;
  d.setUTCDate(d.getUTCDate() + 4 - dayNum);
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
  const weekNo = Math.ceil(((d.getTime() - yearStart.getTime()) / 86400000 + 1) / 7);
  return `${d.getUTCFullYear()}-W${String(weekNo).padStart(2, '0')}`;
}

/** Retorna segunda-feira e domingo da semana ISO dada uma data de referência */
function getWeekBounds(refDate: Date): { monday: Date; sunday: Date } {
  const d = new Date(refDate);
  const day = d.getDay() || 7;
  const monday = new Date(d);
  monday.setDate(d.getDate() - day + 1);
  monday.setHours(0, 0, 0, 0);
  const sunday = new Date(monday);
  sunday.setDate(monday.getDate() + 6);
  sunday.setHours(23, 59, 59, 999);
  return { monday, sunday };
}

/** Formata data para "DD/MM" */
function fmtDayMonth(dateStr: string): string {
  const [, m, d] = dateStr.split('-');
  return `${d}/${m}`;
}

/** Formata data completa para exibição */
function fmtFullDate(dateStr: string): string {
  const dias = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];
  const dt = new Date(dateStr + 'T12:00:00');
  return `${dias[dt.getDay()]}, ${dateStr.split('-')[2]}/${dateStr.split('-')[1]}`;
}

/** Hoje em YYYY-MM-DD */
function todayStr(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

/** Formata semana para exibição "Semana 33 · 11/08 – 17/08" */
function fmtWeekLabel(monday: Date, sunday: Date): string {
  const weekId = getISOWeekId(
    `${monday.getFullYear()}-${String(monday.getMonth() + 1).padStart(2, '0')}-${String(monday.getDate()).padStart(2, '0')}`
  );
  const wNum = weekId.split('-W')[1];
  const fmtD = (d: Date) => `${String(d.getDate()).padStart(2, '0')}/${String(d.getMonth() + 1).padStart(2, '0')}`;
  return `Semana ${parseInt(wNum)} · ${fmtD(monday)} – ${fmtD(sunday)}`;
}

// ── Componente principal ─────────────────────────────────────────

export const CarregamentosView: React.FC = () => {
  const { user } = useAuth();
  const { role, shiftLogs } = useTVDE();
  const {
    charges,
    loading,
    addCharge,
    updateCharge,
    deleteCharge,
    settleWeek
  } = useCharges();

  // ── Estado navegação semanal ──────────────────────────────────
  const [weekOffset, setWeekOffset] = useState(0);
  const { monday, sunday } = useMemo(() => {
    const ref = new Date();
    ref.setDate(ref.getDate() + weekOffset * 7);
    return getWeekBounds(ref);
  }, [weekOffset]);

  const currentWeekId = useMemo(
    () =>
      getISOWeekId(
        `${monday.getFullYear()}-${String(monday.getMonth() + 1).padStart(2, '0')}-${String(monday.getDate()).padStart(2, '0')}`
      ),
    [monday]
  );

  // ── Estado formulário ─────────────────────────────────────────
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formData, setFormData] = useState<ChargeFormData>({
    date: todayStr(),
    paidBy: 'jose',
    grossAmount: 0,
    discount: 0,
    location: ''
  });
  const [saving, setSaving] = useState(false);
  const [settling, setSettling] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null);

  // ── Carregamentos desta semana ────────────────────────────────
  const weekCharges = useMemo(() => {
    const monStr = `${monday.getFullYear()}-${String(monday.getMonth() + 1).padStart(2, '0')}-${String(monday.getDate()).padStart(2, '0')}`;
    const sunStr = `${sunday.getFullYear()}-${String(sunday.getMonth() + 1).padStart(2, '0')}-${String(sunday.getDate()).padStart(2, '0')}`;
    return charges
      .filter(c => c.date >= monStr && c.date <= sunStr)
     .sort((a, b) => b.date.localeCompare(a.date) || (b.createdAt?.toMillis?.() ?? 0) - (a.createdAt?.toMillis?.() ?? 0));
  }, [charges, monday, sunday]);

  // ── KPIs da semana ────────────────────────────────────────────
  const weekKpis = useMemo(() => {
    const totalBruto = weekCharges.reduce((s, c) => s + c.grossAmount, 0);
    const totalDesconto = weekCharges.reduce((s, c) => s + c.discount, 0);
    const totalLiquido = weekCharges.reduce((s, c) => s + c.netAmount, 0);
    const pagoJose = weekCharges.filter(c => c.paidBy === 'jose').reduce((s, c) => s + c.netAmount, 0);
    const descontoAlex = weekCharges.filter(c => c.paidBy === 'alexandre').reduce((s, c) => s + c.discount, 0);
    const saldo = pagoJose - descontoAlex;
    const allSettled = weekCharges.length > 0 && weekCharges.every(c => c.settled);
    const numCarregamentos = weekCharges.length;
    return { totalBruto, totalDesconto, totalLiquido, pagoJose, descontoAlex, saldo, allSettled, numCarregamentos };
  }, [weekCharges]);

  // ── Agrupamento por dia ───────────────────────────────────────
  const chargesByDay = useMemo(() => {
    const map = new Map<string, typeof weekCharges>();
    weekCharges.forEach(c => {
      const arr = map.get(c.date) || [];
      arr.push(c);
      map.set(c.date, arr);
    });
    return Array.from(map.entries()).sort((a, b) => b[0].localeCompare(a[0]));
  }, [weekCharges]);

  // ── Cross-check com shiftLogs ─────────────────────────────── // ✅ CORRIGIDO — inclui alerta no-shift
  const crossCheckAlerts = useMemo(() => {
    const monStr = `${monday.getFullYear()}-${String(monday.getMonth() + 1).padStart(2, '0')}-${String(monday.getDate()).padStart(2, '0')}`;
    const sunStr = `${sunday.getFullYear()}-${String(sunday.getMonth() + 1).padStart(2, '0')}-${String(sunday.getDate()).padStart(2, '0')}`;
    const weekLogs = shiftLogs.filter(sl => sl.date >= monStr && sl.date <= sunStr);

    const alerts: { date: string; type: 'missing' | 'mismatch' | 'no-shift'; detail: string }[] = [];

    // 1) Para cada shiftLog da semana → verificar missing / mismatch
    weekLogs.forEach(sl => {
      // Ignorar dias de folga na verificação de missing
      if (isDayOff(sl)) return;

      const dayCharges = charges.filter(c => c.date === sl.date);
      const sumNet = dayCharges.reduce((s, c) => s + c.netAmount, 0);

      if (sl.fuelExpenseAmount > 0 && dayCharges.length === 0) {
        alerts.push({
          date: sl.date,
          type: 'missing',
          detail: `Turno tem ${sl.fuelExpenseAmount.toFixed(2)}€ de energia mas sem carregamentos registados`
        });
      } else if (dayCharges.length > 0 && Math.abs(sumNet - sl.fuelExpenseAmount) > 0.01) {
        alerts.push({
          date: sl.date,
          type: 'mismatch',
          detail: `Carregamentos: ${sumNet.toFixed(2)}€ ≠ Turno: ${sl.fuelExpenseAmount.toFixed(2)}€`
        });
      }
    });

    // 2) Para cada dia COM carregamentos → verificar se existe shiftLog (no-shift)
    const datesWithCharges = new Set(weekCharges.map(c => c.date));
    datesWithCharges.forEach(date => {
      const sl = weekLogs.find(l => l.date === date);
      if (!sl || isDayOff(sl)) {
        const dayTotal = charges
          .filter(c => c.date === date)
          .reduce((s, c) => s + c.netAmount, 0);
        alerts.push({
          date,
          type: 'no-shift',
          detail: sl
            ? `Dia de folga com ${dayTotal.toFixed(2)}€ em carregamentos registados`
            : `${dayTotal.toFixed(2)}€ em carregamentos mas sem turno registado`
        });
      }
    });

    // Ordenar por data (mais recente primeiro)
    return alerts.sort((a, b) => b.date.localeCompare(a.date));
  }, [shiftLogs, charges, weekCharges, monday, sunday]);

  // ── Handlers ──────────────────────────────────────────────────
  const resetForm = useCallback(() => {
    setFormData({ date: todayStr(), paidBy: 'jose', grossAmount: 0, discount: 0, location: '' });
    setEditingId(null);
    setShowForm(false);
  }, []);

  const handleEdit = useCallback((chargeId: string) => {
    const c = charges.find(ch => ch.id === chargeId);
    if (!c) return;
    setFormData({
      date: c.date,
      paidBy: c.paidBy,
      grossAmount: c.grossAmount,
      discount: c.discount,
      location: c.location
    });
    setEditingId(c.id);
    setShowForm(true);
  }, [charges]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (formData.grossAmount <= 0) return;
    setSaving(true);
    try {
      if (editingId) {
        await updateCharge(editingId, formData);
      } else {
        await addCharge(formData);
      }
      resetForm();
    } catch (err) {
      console.error('Erro ao guardar carregamento:', err);
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    try {
      await deleteCharge(id);
      setConfirmDelete(null);
    } catch (err) {
      console.error('Erro ao apagar carregamento:', err);
    }
  };

  const handleSettle = async () => {
    if (weekKpis.allSettled || weekKpis.numCarregamentos === 0) return;
    setSettling(true);
    try {
      await settleWeek(currentWeekId);
    } catch (err) {
      console.error('Erro ao acertar semana:', err);
    } finally {
      setSettling(false);
    }
  };

  const isGestor = role === 'gestor';                              // ✅ CORRIGIDO — era 'manager'

  // ── Render ────────────────────────────────────────────────────
  return (
    <div className="space-y-6">
      {/* ── Header ───────────────────────────────────────────── */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-slate-900 flex items-center gap-2">
            <Zap className="w-6 h-6 text-amber-500" />
            Carregamentos
          </h1>
          <p className="text-sm text-slate-500 mt-0.5">
            Registo de carregamentos elétricos e acerto semanal
          </p>
        </div>
        <button
          onClick={() => {
            resetForm();
            setShowForm(true);
          }}
          className="inline-flex items-center gap-2 px-4 py-2.5 bg-amber-500 hover:bg-amber-600 text-white text-sm font-semibold rounded-lg shadow-sm transition-colors"
        >
          <Plus className="w-4 h-4" />
          Novo Carregamento
        </button>
      </div>

      {/* ── Navegação Semanal ────────────────────────────────── */}
      <div className="flex items-center justify-between bg-white rounded-xl border border-slate-200 px-4 py-3 shadow-sm">
        <button
          onClick={() => setWeekOffset(w => w - 1)}
          className="p-1.5 rounded-md hover:bg-slate-100 text-slate-600 transition"
          title="Semana anterior"
        >
          <ChevronLeft className="w-5 h-5" />
        </button>
        <div className="text-center">
          <p className="text-sm font-semibold text-slate-800">
            {fmtWeekLabel(monday, sunday)}
          </p>
          {weekOffset === 0 && (
            <span className="text-[10px] font-medium text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full">
              Semana atual
            </span>
          )}
        </div>
        <button
          onClick={() => setWeekOffset(w => w + 1)}
          disabled={weekOffset >= 0}
          className="p-1.5 rounded-md hover:bg-slate-100 text-slate-600 transition disabled:opacity-30 disabled:cursor-not-allowed"
          title="Semana seguinte"
        >
          <ChevronRight className="w-5 h-5" />
        </button>
      </div>

      {/* ── KPI Cards ────────────────────────────────────────── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <KpiCard
          label="Total Bruto"
          value={`${weekKpis.totalBruto.toFixed(2)}€`}
          icon={<Euro className="w-4 h-4" />}
          color="slate"
          sub={`${weekKpis.numCarregamentos} carregamento${weekKpis.numCarregamentos !== 1 ? 's' : ''}`}
        />
        <KpiCard
          label="Descontos"
          value={`-${weekKpis.totalDesconto.toFixed(2)}€`}
          icon={<Tag className="w-4 h-4" />}
          color="emerald"
          sub="Descontos aplicados"
        />
        <KpiCard
          label="Total Líquido"
          value={`${weekKpis.totalLiquido.toFixed(2)}€`}
          icon={<Zap className="w-4 h-4" />}
          color="amber"
          sub="Custo real energia"
        />
        <KpiCard
          label="Saldo Acerto"
          value={`${weekKpis.saldo >= 0 ? '' : '-'}${Math.abs(weekKpis.saldo).toFixed(2)}€`}
          icon={<Receipt className="w-4 h-4" />}
          color={weekKpis.saldo > 0.01 ? 'rose' : weekKpis.saldo < -0.01 ? 'blue' : 'emerald'}
          sub={
            weekKpis.saldo > 0.01
              ? 'Alexandre deve a José'
              : weekKpis.saldo < -0.01
                ? 'José deve a Alexandre'
                : 'Acertado ✓'
          }
        />
      </div>

      {/* ── Alertas cross-check ──────────────────────────────── */}
      {crossCheckAlerts.length > 0 && (                            /* ✅ CORRIGIDO — era shiftLogAlerts */
        <div className="space-y-2">
          {crossCheckAlerts.map((alert, i) => (
            <div
              key={i}
              className={`flex items-start gap-3 p-3 rounded-lg border text-sm ${
                alert.type === 'missing'
                  ? 'bg-amber-50 border-amber-200 text-amber-800'
                  : alert.type === 'mismatch'
                    ? 'bg-rose-50 border-rose-200 text-rose-800'
                    : 'bg-orange-50 border-orange-200 text-orange-800'   /* ✅ NOVO — no-shift */
              }`}
            >
              {alert.type === 'no-shift' ? (                       /* ✅ NOVO — ícone Zap para no-shift */
                <Zap className="w-4 h-4 mt-0.5 flex-shrink-0" />
              ) : (
                <AlertTriangle className="w-4 h-4 mt-0.5 flex-shrink-0" />
              )}
              <div className="flex items-center gap-2 flex-wrap">
                <span className="font-semibold">{fmtDayMonth(alert.date)}</span>
                {alert.type === 'no-shift' && (                    /* ✅ NOVO — badge "Sem turno" */
                  <span className="inline-flex items-center gap-1 text-[10px] font-semibold bg-orange-200 text-orange-800 px-1.5 py-0.5 rounded-full">
                    <Zap className="w-3 h-3" />
                    Sem turno
                  </span>
                )}
                <span className="mx-0.5">·</span>
                <span>{alert.detail}</span>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* ── Formulário ───────────────────────────────────────── */}
      {showForm && (
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="bg-gradient-to-r from-amber-500 to-amber-600 px-5 py-3">
            <h2 className="text-white font-semibold text-sm flex items-center gap-2">
              <Zap className="w-4 h-4" />
              {editingId ? 'Editar Carregamento' : 'Novo Carregamento'}
            </h2>
          </div>
          <form onSubmit={handleSubmit} className="p-5 space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {/* Data */}
              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1.5">
                  <Calendar className="w-3.5 h-3.5 inline mr-1" />
                  Data
                </label>
                <input
                  type="date"
                  value={formData.date}
                  onChange={e => setFormData(f => ({ ...f, date: e.target.value }))}
                  className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:ring-2 focus:ring-amber-500 focus:border-amber-500 outline-none"
                  required
                />
              </div>

              {/* Quem pagou */}
              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1.5">
                  <User className="w-3.5 h-3.5 inline mr-1" />
                  Quem pagou
                </label>
                <select
                  value={formData.paidBy}
                  onChange={e => setFormData(f => ({ ...f, paidBy: e.target.value as 'jose' | 'alexandre' }))}
                  className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:ring-2 focus:ring-amber-500 focus:border-amber-500 outline-none bg-white"
                >
                  <option value="jose">José</option>
                  <option value="alexandre">Alexandre</option>
                </select>
              </div>

              {/* Local */}
              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1.5">
                  <MapPin className="w-3.5 h-3.5 inline mr-1" />
                  Local
                </label>
                <input
                  type="text"
                  value={formData.location}
                  onChange={e => setFormData(f => ({ ...f, location: e.target.value }))}
                  placeholder="Ex: Lidl Almada, Tesla SC Oeiras"
                  className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:ring-2 focus:ring-amber-500 focus:border-amber-500 outline-none"
                />
              </div>

              {/* Valor bruto */}
              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1.5">
                  <Euro className="w-3.5 h-3.5 inline mr-1" />
                  Valor bruto (€)
                </label>
                <input
                  type="number"
                  step="0.01"
                  min="0.01"
                  value={formData.grossAmount || ''}
                  onChange={e => setFormData(f => ({ ...f, grossAmount: parseFloat(e.target.value) || 0 }))}
                  placeholder="0.00"
                  className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:ring-2 focus:ring-amber-500 focus:border-amber-500 outline-none"
                  required
                />
              </div>

              {/* Desconto */}
              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1.5">
                  <Tag className="w-3.5 h-3.5 inline mr-1" />
                  Desconto (€)
                </label>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  value={formData.discount || ''}
                  onChange={e => setFormData(f => ({ ...f, discount: parseFloat(e.target.value) || 0 }))}
                  placeholder="0.00"
                  className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:ring-2 focus:ring-amber-500 focus:border-amber-500 outline-none"
                />
              </div>

              {/* Net preview */}
              <div className="flex items-end">
                <div className="w-full rounded-lg bg-amber-50 border border-amber-200 px-3 py-2">
                  <p className="text-[10px] text-amber-600 font-semibold uppercase">Valor líquido</p>
                  <p className="text-lg font-bold text-amber-700">
                    {(formData.grossAmount - formData.discount).toFixed(2)}€
                  </p>
                </div>
              </div>
            </div>

            {/* Botões */}
            <div className="flex items-center gap-3 pt-2">
              <button
                type="submit"
                disabled={saving || formData.grossAmount <= 0}
                className="inline-flex items-center gap-2 px-5 py-2.5 bg-amber-500 hover:bg-amber-600 text-white text-sm font-semibold rounded-lg shadow-sm transition disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {saving ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <CheckCircle2 className="w-4 h-4" />
                )}
                {editingId ? 'Guardar Alterações' : 'Registar Carregamento'}
              </button>
              <button
                type="button"
                onClick={resetForm}
                className="px-4 py-2.5 text-sm font-medium text-slate-600 hover:text-slate-800 hover:bg-slate-100 rounded-lg transition"
              >
                Cancelar
              </button>
            </div>
          </form>
        </div>
      )}

      {/* ── Lista por dia ────────────────────────────────────── */}
      {loading ? (
        <div className="flex items-center justify-center py-16">
          <Loader2 className="w-6 h-6 animate-spin text-amber-500" />
        </div>
      ) : weekCharges.length === 0 ? (
        <div className="bg-white rounded-xl border border-slate-200 p-10 text-center">
          <Zap className="w-10 h-10 text-slate-300 mx-auto mb-3" />
          <p className="text-slate-500 text-sm font-medium">Nenhum carregamento nesta semana</p>
          <p className="text-slate-400 text-xs mt-1">Clique em "Novo Carregamento" para registar</p>
        </div>
      ) : (
        <div className="space-y-4">
          {chargesByDay.map(([date, dayCharges]) => {
            const dayTotal = dayCharges.reduce((s, c) => s + c.netAmount, 0);
            return (
              <div key={date} className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
                {/* Day header */}
                <div className="bg-slate-50 border-b border-slate-200 px-4 py-2.5 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Calendar className="w-4 h-4 text-slate-400" />
                    <span className="text-sm font-semibold text-slate-700">{fmtFullDate(date)}</span>
                    <span className="text-xs text-slate-400">
                      ({dayCharges.length} carregamento{dayCharges.length !== 1 ? 's' : ''})
                    </span>
                  </div>
                  <span className="text-sm font-bold text-amber-600">{dayTotal.toFixed(2)}€</span>
                </div>

                {/* Charges list */}
                <div className="divide-y divide-slate-100">
                  {dayCharges.map(charge => (
                    <div
                      key={charge.id}
                      className="px-4 py-3 flex items-center justify-between hover:bg-slate-50/50 transition"
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        {/* Avatar paidBy */}
                        <div
                          className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0 ${
                            charge.paidBy === 'jose'
                              ? 'bg-blue-100 text-blue-700'
                              : 'bg-emerald-100 text-emerald-700'
                          }`}
                        >
                          {charge.paidBy === 'jose' ? 'J' : 'A'}
                        </div>
                        <div className="min-w-0">
                          <div className="flex items-center gap-2">
                            <span className="text-sm font-medium text-slate-800">
                              {charge.grossAmount.toFixed(2)}€
                            </span>
                            {charge.discount > 0 && (
                              <span className="text-xs text-emerald-600 font-medium">
                                -{charge.discount.toFixed(2)}€
                              </span>
                            )}
                            <span className="text-xs font-semibold text-amber-600">
                              → {charge.netAmount.toFixed(2)}€
                            </span>
                            {charge.settled && (
                              <Lock className="w-3 h-3 text-slate-400" title="Acertado" />
                            )}
                          </div>
                          <div className="flex items-center gap-2 text-xs text-slate-400 mt-0.5">
                            <span className="capitalize">
                              {charge.paidBy === 'jose' ? 'José' : 'Alexandre'}
                            </span>
                            {charge.location && (
                              <>
                                <span>·</span>
                                <span className="truncate max-w-[160px]">{charge.location}</span>
                              </>
                            )}
                          </div>
                        </div>
                      </div>

                      {/* Actions */}
                      {!charge.settled && (
                        <div className="flex items-center gap-1 flex-shrink-0">
                          <button
                            onClick={() => handleEdit(charge.id)}
                            className="p-1.5 rounded-md hover:bg-slate-100 text-slate-400 hover:text-blue-600 transition"
                            title="Editar"
                          >
                            <Edit3 className="w-3.5 h-3.5" />
                          </button>
                          {confirmDelete === charge.id ? (
                            <div className="flex items-center gap-1">
                              <button
                                onClick={() => handleDelete(charge.id)}
                                className="px-2 py-1 text-[10px] bg-rose-500 text-white rounded font-semibold hover:bg-rose-600 transition"
                              >
                                Confirmar
                              </button>
                              <button
                                onClick={() => setConfirmDelete(null)}
                                className="px-2 py-1 text-[10px] bg-slate-200 text-slate-600 rounded font-semibold hover:bg-slate-300 transition"
                              >
                                Não
                              </button>
                            </div>
                          ) : (
                            <button
                              onClick={() => setConfirmDelete(charge.id)}
                              className="p-1.5 rounded-md hover:bg-slate-100 text-slate-400 hover:text-rose-600 transition"
                              title="Apagar"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          )}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* ── Painel de Acerto Semanal (só Gestor) ─────────────── */}
      {isGestor && weekKpis.numCarregamentos > 0 && (
        <div
          className={`rounded-xl border shadow-sm overflow-hidden ${
            weekKpis.allSettled
              ? 'bg-emerald-50 border-emerald-200'
              : 'bg-white border-slate-200'
          }`}
        >
          <div
            className={`px-5 py-3 border-b ${
              weekKpis.allSettled
                ? 'bg-emerald-100 border-emerald-200'
                : 'bg-gradient-to-r from-slate-800 to-slate-900'
            }`}
          >
            <h2
              className={`font-semibold text-sm flex items-center gap-2 ${
                weekKpis.allSettled ? 'text-emerald-800' : 'text-white'
              }`}
            >
              <Receipt className="w-4 h-4" />
              Acerto Semanal — {currentWeekId}
            </h2>
          </div>

          <div className="p-5">
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-5">
              <MiniStat label="Pago por José" value={`${weekKpis.pagoJose.toFixed(2)}€`} />
              <MiniStat label="Descontos Alex" value={`${weekKpis.descontoAlex.toFixed(2)}€`} />
              <MiniStat label="Total Líquido" value={`${weekKpis.totalLiquido.toFixed(2)}€`} />
              <MiniStat
                label="Saldo"
                value={`${weekKpis.saldo >= 0 ? '' : '-'}${Math.abs(weekKpis.saldo).toFixed(2)}€`}
                highlight={
                  weekKpis.saldo > 0.01
                    ? 'rose'
                    : weekKpis.saldo < -0.01
                      ? 'blue'
                      : 'emerald'
                }
              />
            </div>

            {/* Info box */}
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 mb-4">
              <div className="flex items-start gap-2 text-xs text-blue-700">
                <Info className="w-4 h-4 mt-0.5 flex-shrink-0" />
                <div>
                  <p className="font-semibold mb-0.5">Como funciona o acerto:</p>
                  <p>
                    Energia é 100% custo do Alexandre. José adianta pagamentos → Alexandre reembolsa.
                    Se Alexandre paga com desconto pessoal → José reembolsa o desconto.
                  </p>
                  {weekKpis.saldo > 0.01 && (
                    <p className="mt-1 font-semibold text-rose-600">
                      → Alexandre deve pagar {weekKpis.saldo.toFixed(2)}€ a José
                    </p>
                  )}
                  {weekKpis.saldo < -0.01 && (
                    <p className="mt-1 font-semibold text-blue-600">
                      → José deve pagar {Math.abs(weekKpis.saldo).toFixed(2)}€ a Alexandre
                    </p>
                  )}
                </div>
              </div>
            </div>

            {weekKpis.allSettled ? (
              <div className="flex items-center gap-2 text-emerald-700 font-semibold text-sm">
                <CheckCircle2 className="w-5 h-5" />
                Semana acertada ✓
              </div>
            ) : (
              <button
                onClick={handleSettle}
                disabled={settling}
                className="inline-flex items-center gap-2 px-5 py-2.5 bg-slate-800 hover:bg-slate-900 text-white text-sm font-semibold rounded-lg shadow-sm transition disabled:opacity-50"
              >
                {settling ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <CheckCircle2 className="w-4 h-4" />
                )}
                Marcar Semana como Acertada
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

// ── Sub-componentes ──────────────────────────────────────────────

interface KpiCardProps {
  label: string;
  value: string;
  icon: React.ReactNode;
  color: 'slate' | 'emerald' | 'amber' | 'rose' | 'blue';
  sub?: string;
}

function KpiCard({ label, value, icon, color, sub }: KpiCardProps) {
  const colorMap = {
    slate: 'bg-slate-50 border-slate-200 text-slate-700',
    emerald: 'bg-emerald-50 border-emerald-200 text-emerald-700',
    amber: 'bg-amber-50 border-amber-200 text-amber-700',
    rose: 'bg-rose-50 border-rose-200 text-rose-700',
    blue: 'bg-blue-50 border-blue-200 text-blue-700'
  };
  const iconBgMap = {
    slate: 'bg-slate-200 text-slate-600',
    emerald: 'bg-emerald-200 text-emerald-700',
    amber: 'bg-amber-200 text-amber-700',
    rose: 'bg-rose-200 text-rose-700',
    blue: 'bg-blue-200 text-blue-700'
  };

  return (
    <div className={`rounded-xl border p-3.5 ${colorMap[color]}`}>
      <div className="flex items-center gap-2 mb-2">
        <div className={`w-7 h-7 rounded-lg flex items-center justify-center ${iconBgMap[color]}`}>
          {icon}
        </div>
        <span className="text-[11px] font-semibold uppercase tracking-wide opacity-70">{label}</span>
      </div>
      <p className="text-xl font-bold">{value}</p>
      {sub && <p className="text-[10px] mt-1 opacity-60 font-medium">{sub}</p>}
    </div>
  );
}

interface MiniStatProps {
  label: string;
  value: string;
  highlight?: 'rose' | 'blue' | 'emerald';
}

function MiniStat({ label, value, highlight }: MiniStatProps) {
  const hlMap = {
    rose: 'text-rose-600',
    blue: 'text-blue-600',
    emerald: 'text-emerald-600'
  };
  return (
    <div>
      <p className="text-[10px] text-slate-500 font-semibold uppercase tracking-wide">{label}</p>
      <p className={`text-lg font-bold ${highlight ? hlMap[highlight] : 'text-slate-800'}`}>
        {value}
      </p>
    </div>
  );
}
