import React, { useState, useEffect, useMemo } from 'react';
import { Mail, Calendar, CheckCircle2, AlertCircle, X, Send, Users, Car, TrendingUp, DollarSign, Copy, ExternalLink, Check, Key, Lock } from 'lucide-react';
import { useTVDE } from '../context/TVDEContext';
import { parseHHMMToHours } from '../utils/formatters';

interface SendSummaryModalProps {
  isOpen: boolean;
  onClose: () => void;
}

// URL base da API — usa variável de ambiente em build, fallback para Cloud Run em produção estática
const API_BASE = (import.meta.env.VITE_API_URL || 'https://europe-west2-gen-lang-client-0465939536.cloudfunctions.net').replace(/\/$/, '');
const EMAIL_ENDPOINT = `${API_BASE}/enviarResumoFleetMaster`;

// Helper to get current week (Monday to Sunday) YYYY-MM-DD
function getCurrentWeekRange() {
  const now = new Date();
  const day = now.getDay();
  const diffToMonday = now.getDate() - day + (day === 0 ? -6 : 1);
  const monday = new Date(now.setDate(diffToMonday));
  const sunday = new Date(monday);
  sunday.setDate(monday.getDate() + 6);

  const formatDate = (d: Date) => d.toISOString().split('T')[0];
  return {
    startDate: formatDate(monday),
    endDate: formatDate(sunday)
  };
}

function getPreviousWeekRange() {
  const now = new Date();
  const day = now.getDay();
  const diffToMonday = now.getDate() - day + (day === 0 ? -6 : 1) - 7;
  const monday = new Date(now.setDate(diffToMonday));
  const sunday = new Date(monday);
  sunday.setDate(monday.getDate() + 6);

  const formatDate = (d: Date) => d.toISOString().split('T')[0];
  return {
    startDate: formatDate(monday),
    endDate: formatDate(sunday)
  };
}

export const SendSummaryModal: React.FC<SendSummaryModalProps> = ({ isOpen, onClose }) => {
  const { shiftLogs, expenses, drivers, vehicles } = useTVDE();

  const [dateRange, setDateRange] = useState<{ startDate: string; endDate: string }>(() => getCurrentWeekRange());
  const [isSending, setIsSending] = useState(false);
  const [copied, setCopied] = useState(false);
  const [statusMessage, setStatusMessage] = useState<{ type: 'success' | 'error' | 'info'; text: string } | null>(null);

  const [gmailUser, setGmailUser] = useState(() => localStorage.getItem('tvde_gmail_user') || 'josreb@gmail.com');
  const [gmailAppPassword, setGmailAppPassword] = useState(() => localStorage.getItem('tvde_gmail_app_pass') || '');
  const [serverSmtpConfigured, setServerSmtpConfigured] = useState(false);
  const [showCredentialsSection, setShowCredentialsSection] = useState(() => !localStorage.getItem('tvde_gmail_app_pass'));

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };
    if (isOpen) {
      window.addEventListener('keydown', handleKeyDown);
    }
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  useEffect(() => {
    if (isOpen) {
      fetch(`${API_BASE}/api/smtp-status`).catch(() => ({ json: () => ({}) }))
        .then((res) => res.json())
        .then((data) => {
          if (data.configured) {
            setServerSmtpConfigured(true);
            setShowCredentialsSection(false);
          }
          if (data.user) {
            setGmailUser(data.user);
          }
        })
        .catch(() => {});
    }
  }, [isOpen]);

  // Quick preset handlers
  const handlePresetCurrentWeek = () => {
    setDateRange(getCurrentWeekRange());
  };

  const handlePresetPreviousWeek = () => {
    setDateRange(getPreviousWeekRange());
  };

  const handlePresetCurrentMonth = () => {
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const lastDay = new Date(year, now.getMonth() + 1, 0).getDate();
    setDateRange({
      startDate: `${year}-${month}-01`,
      endDate: `${year}-${month}-${String(lastDay).padStart(2, '0')}`
    });
  };

  const handlePresetPreviousMonth = () => {
    const now = new Date();
    const prevMonthDate = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const year = prevMonthDate.getFullYear();
    const month = String(prevMonthDate.getMonth() + 1).padStart(2, '0');
    const lastDay = new Date(year, prevMonthDate.getMonth() + 1, 0).getDate();
    setDateRange({
      startDate: `${year}-${month}-01`,
      endDate: `${year}-${month}-${String(lastDay).padStart(2, '0')}`
    });
  };

  // Preview calculations for the selected date range
  const previewData = useMemo(() => {
    const { startDate, endDate } = dateRange;
    const filteredShifts = shiftLogs.filter(s => s.date >= startDate && s.date <= endDate);
    const filteredExpenses = expenses.filter(e => e.date >= startDate && e.date <= endDate);

    const isDuplicateShiftExpense = (e: { id?: string; description?: string }) => {
      if (!e) return false;
      if (e.id && (
        e.id.startsWith('exp-fuel-shift-') ||
        e.id.startsWith('exp-rnd-shift-') ||
        e.id.startsWith('exp-nrg-') ||
        e.id.startsWith('exp-rnd-daily-') ||
        e.id.startsWith('exp-rnd-monday-')
      )) {
        return true;
      }
      if (e.description && (
        e.description.includes('Custo diário de energia') ||
        e.description.includes('Renda diária de viatura') ||
        e.description.includes('Sincronizado de Faturação Diária')
      )) {
        return true;
      }
      return false;
    };

    const gross = filteredShifts.reduce((acc, s) => acc + s.grossEarnings, 0);
    const trips = filteredShifts.reduce((acc, s) => acc + (s.tripsCount || 0), 0);
    const shiftFuel = filteredShifts.reduce((acc, s) => acc + (s.fuelExpenseAmount || 0), 0);
    const shiftRental = filteredShifts.reduce((acc, s) => acc + (s.rentalExpenseAmount || 0), 0);

    const standaloneFuel = filteredExpenses
      .filter(e => e.category === 'fuel_charging' && !isDuplicateShiftExpense(e))
      .reduce((acc, e) => acc + e.amount, 0);

    const standaloneRental = filteredExpenses
      .filter(e => e.category === 'vehicle_rental' && !isDuplicateShiftExpense(e))
      .reduce((acc, e) => acc + e.amount, 0);

    const standaloneOther = filteredExpenses
      .filter(e => e.category !== 'fuel_charging' && e.category !== 'vehicle_rental' && !isDuplicateShiftExpense(e))
      .reduce((acc, e) => acc + e.amount, 0);

    const energy = shiftFuel + standaloneFuel;
    const rental = shiftRental + standaloneRental;
    const costs = energy + rental + standaloneOther;
    const profit = gross - costs;
    const receiptIssuance = gross - rental;
    const km = filteredShifts.reduce((acc, s) => acc + s.kilometers, 0);
    const hours = filteredShifts.reduce((acc, s) => acc + parseHHMMToHours(s.hoursWorked), 0);

    const distinctDays = new Set(filteredShifts.map(s => s.date)).size || (filteredShifts.length > 0 ? 1 : 0);
    const revenuePerHour = hours > 0 ? gross / hours : 0;
    const avgTripsPerDay = distinctDays > 0 ? trips / distinctDays : 0;
    const revenuePerTrip = trips > 0 ? gross / trips : 0;

    return {
      gross,
      profit,
      receiptIssuance,
      revenuePerHour,
      trips,
      avgTripsPerDay,
      revenuePerTrip,
      km,
      energy,
      rental,
      hours,
      distinctDays,
      shiftCount: filteredShifts.length
    };
  }, [dateRange, shiftLogs, expenses]);

  if (!isOpen) return null;

  const generateTextSummary = () => {
    return `RESUMO DE DESEMPENHO TVDE (${dateRange.startDate} a ${dateRange.endDate})
--------------------------------------------------
• Turnos Registados: ${previewData.shiftCount}
• Faturação Bruta: ${previewData.gross.toFixed(2)} € (${previewData.distinctDays} dias operacionais)
• Emissão de Recibo (Faturação - Renda): ${previewData.receiptIssuance.toFixed(2)} €
• Lucro Líquido: ${previewData.profit.toFixed(2)} €
• Receita por Hora: ${previewData.revenuePerHour.toFixed(2)} €/h (${Math.floor(previewData.hours)}h${Math.round((previewData.hours % 1) * 60)}m)
• Total Viagens: ${previewData.trips} (média ${previewData.avgTripsPerDay.toFixed(1)}/dia)
• Média por Viagem: ${previewData.revenuePerTrip.toFixed(2)} €
• Total Kms: ${previewData.km} kms
• Custo Energia: ${previewData.energy.toFixed(2)} €
• Custo Renda: ${previewData.rental.toFixed(2)} €
--------------------------------------------------
Destinatários: josreb@gmail.com, alexreb60@gmail.com`;
  };

  const handleOpenMailClient = () => {
    const subject = encodeURIComponent(`[TVDE Fleet Master] Resumo de Desempenho (${dateRange.startDate} a ${dateRange.endDate})`);
    const body = encodeURIComponent(generateTextSummary());
    window.open(`mailto:josreb@gmail.com,alexreb60@gmail.com?subject=${subject}&body=${body}`, '_blank');
  };

  const handleCopySummary = () => {
    navigator.clipboard.writeText(generateTextSummary());
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleSendEmail = async () => {
    setIsSending(true);
    setStatusMessage(null);

    if (gmailAppPassword) {
      localStorage.setItem('tvde_gmail_app_pass', gmailAppPassword.trim());
    }
    if (gmailUser) {
      localStorage.setItem('tvde_gmail_user', gmailUser.trim());
    }

    try {
      const response = await fetch(EMAIL_ENDPOINT, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          startDate: dateRange.startDate,
          endDate: dateRange.endDate,
          shiftLogs,
          expenses,
          drivers,
          vehicles
        })
      });

      const responseText = await response.text();
      let data: any = {};
      try {
        data = responseText ? JSON.parse(responseText) : {};
      } catch {
        throw new Error(`Servidor inacessível ou erro HTTP (${response.status} ${response.statusText}). Detalhes: ${responseText.slice(0, 150) || 'Sem resposta'}`);
      }

      if (!response.ok) {
        const errorTitle = data.error || data.message || `Erro do Servidor (${response.status})`;
        const errorDetails = data.details || '';
        throw new Error(`${errorTitle}${errorDetails ? '\n' + errorDetails : ''}`);
      }

      setStatusMessage({
        type: 'success',
        text: 'Resumo enviado com sucesso via servidor SMTP Gmail para josreb@gmail.com e alexreb60@gmail.com!'
      });

      setTimeout(() => {
        onClose();
        setStatusMessage(null);
      }, 3000);
    } catch (err: any) {
      console.error('Erro ao enviar resumo:', err);
      setShowCredentialsSection(true);
      setStatusMessage({
        type: 'error',
        text: err.message || 'Ocorreu um erro ao comunicar com o servidor.'
      });
    } finally {
      setIsSending(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div
      onClick={onClose}
      className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-slate-900/60 backdrop-blur-xs overflow-y-auto"
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="bg-white rounded-xl shadow-xl border border-slate-200 max-w-lg w-full max-h-[92vh] sm:max-h-[90vh] flex flex-col my-auto overflow-hidden animate-in fade-in zoom-in-95 duration-150"
      >
        {/* Header */}
        <div className="bg-slate-900 px-4 sm:px-6 py-3.5 sm:py-4 flex items-center justify-between text-white shrink-0">
          <div className="flex items-center space-x-2.5">
            <div className="p-2 rounded-lg bg-emerald-500/20 text-emerald-400">
              <Mail className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-sm sm:text-base font-bold text-white">Enviar Resumo de Desempenho</h2>
              <p className="text-[11px] sm:text-xs text-slate-400">Envio direto de relatório por e-mail</p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1 rounded-md text-slate-400 hover:text-white hover:bg-slate-800 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Scrollable Body Content */}
        <div className="p-4 sm:p-6 space-y-4 sm:space-y-5 overflow-y-auto flex-1 min-h-0 text-slate-800">
          {/* Status Alert if any */}
          {statusMessage && (
            <div
              className={`p-3.5 rounded-lg text-xs font-medium flex items-start space-x-2.5 ${
                statusMessage.type === 'success'
                  ? 'bg-emerald-50 border border-emerald-200 text-emerald-800'
                  : statusMessage.type === 'info'
                  ? 'bg-amber-50 border border-amber-200 text-amber-900'
                  : 'bg-rose-50 border border-rose-200 text-rose-800'
              }`}
            >
              {statusMessage.type === 'success' ? (
                <CheckCircle2 className="w-4 h-4 text-emerald-600 flex-shrink-0 mt-0.5" />
              ) : statusMessage.type === 'info' ? (
                <AlertCircle className="w-4 h-4 text-amber-600 flex-shrink-0 mt-0.5" />
              ) : (
                <AlertCircle className="w-4 h-4 text-rose-600 flex-shrink-0 mt-0.5" />
              )}
              <span className="whitespace-pre-line leading-relaxed">{statusMessage.text}</span>
            </div>
          )}

          {/* Recipients Section */}
          <div className="bg-slate-50 border border-slate-200 p-3.5 rounded-lg space-y-1.5">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-700 uppercase tracking-wider flex items-center space-x-1.5">
                <Users className="w-3.5 h-3.5 text-slate-500" />
                <span>Destinatários do Email</span>
              </span>
              <span className="text-[10px] bg-slate-200 text-slate-700 px-2 py-0.5 rounded font-semibold">Fixos</span>
            </div>
            <div className="flex flex-wrap gap-1.5">
              <span className="inline-flex items-center text-xs font-medium bg-white border border-slate-300 text-slate-800 px-2.5 py-1 rounded-md shadow-2xs">
                josreb@gmail.com
              </span>
              <span className="inline-flex items-center text-xs font-medium bg-white border border-slate-300 text-slate-800 px-2.5 py-1 rounded-md shadow-2xs">
                alexreb60@gmail.com
              </span>
            </div>
          </div>

          {/* Gmail Credentials Section */}
          <div className="bg-indigo-50/70 border border-indigo-200 p-3.5 rounded-lg space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-indigo-900 uppercase tracking-wider flex items-center space-x-1.5">
                <Key className="w-3.5 h-3.5 text-indigo-600" />
                <span>Palavra-passe de Aplicação Google</span>
              </span>
              <div className="flex items-center space-x-2">
                {gmailAppPassword && (
                  <button
                    type="button"
                    onClick={() => {
                      setGmailAppPassword('');
                      localStorage.removeItem('tvde_gmail_app_pass');
                    }}
                    className="text-[11px] font-semibold text-rose-600 hover:text-rose-800 transition underline"
                  >
                    Limpar
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => setShowCredentialsSection(!showCredentialsSection)}
                  className="text-[11px] font-semibold text-indigo-600 hover:text-indigo-800 transition"
                >
                  {showCredentialsSection ? 'Ocultar' : 'Editar / Configurar'}
                </button>
              </div>
            </div>

            {showCredentialsSection ? (
              <div className="space-y-2 pt-1">
                <p className="text-[11px] text-indigo-800 leading-relaxed">
                  Necessária <strong>apenas para envio direto e automático</strong> via servidor Gmail SMTP. Guardada no browser (pede só 1 vez):
                </p>
                <div className="relative">
                  <input
                    type="password"
                    value={gmailAppPassword}
                    onChange={(e) => setGmailAppPassword(e.target.value)}
                    placeholder="Palavra-passe de 16 letras do Google (ex: abcd efgh ijkl mnop)"
                    className="w-full pl-8 pr-3 py-1.5 text-xs font-mono bg-white border border-indigo-300 rounded-md shadow-2xs focus:ring-2 focus:ring-indigo-500 focus:outline-none text-slate-800"
                  />
                  <Lock className="w-3.5 h-3.5 text-indigo-400 absolute left-2.5 top-2" />
                </div>
                <div className="flex items-center justify-between pt-0.5">
                  <a
                    href="https://myaccount.google.com/apppasswords"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center space-x-1 text-[11px] font-semibold text-indigo-700 hover:text-indigo-900 underline hover:no-underline"
                  >
                    <span>Gerar Palavra-passe no Google</span>
                    <ExternalLink className="w-3 h-3" />
                  </a>
                </div>
                <p className="text-[10px] text-indigo-600/90 leading-tight">
                  💡 <strong>Alternativa sem palavra-passe:</strong> Clique em <em>"Abrir no E-mail"</em> ou <em>"Copiar"</em> no fundo deste modal para enviar usando o seu programa de email habitual.
                </p>
              </div>
            ) : (
              <div className="flex items-center justify-between text-xs text-indigo-950 font-medium">
                <span className="flex items-center space-x-1.5">
                  {serverSmtpConfigured ? (
                    <>
                      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                      <span className="text-emerald-800 font-semibold">Configurado no servidor (GMAIL_APP_PASSWORD)</span>
                    </>
                  ) : gmailAppPassword ? (
                    <>
                      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                      <span className="text-emerald-800 font-semibold">Palavra-passe de 16 letras guardada neste browser</span>
                    </>
                  ) : (
                    <>
                      <AlertCircle className="w-3.5 h-3.5 text-amber-600" />
                      <span className="text-amber-800">Palavra-passe não configurada (clique em Editar/Configurar)</span>
                    </>
                  )}
                </span>
              </div>
            )}
          </div>

          {/* Date Range Selection */}
          <div className="space-y-3">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1.5">
              <label className="text-xs font-bold text-slate-800 uppercase tracking-wider flex items-center space-x-1.5">
                <Calendar className="w-3.5 h-3.5 text-slate-500" />
                <span>Período do Relatório</span>
              </label>
              <div className="flex items-center space-x-1 flex-wrap gap-1">
                <button
                  type="button"
                  onClick={handlePresetCurrentWeek}
                  className="px-2 py-1 text-[11px] font-medium rounded bg-slate-100 hover:bg-slate-200 text-slate-700 transition"
                >
                  Semana Atual
                </button>
                <button
                  type="button"
                  onClick={handlePresetPreviousWeek}
                  className="px-2 py-1 text-[11px] font-medium rounded bg-slate-100 hover:bg-slate-200 text-slate-700 transition"
                >
                  Semana Anterior
                </button>
                <button
                  type="button"
                  onClick={handlePresetCurrentMonth}
                  className="px-2 py-1 text-[11px] font-medium rounded bg-slate-100 hover:bg-slate-200 text-slate-700 transition"
                >
                  Este Mês
                </button>
                <button
                  type="button"
                  onClick={handlePresetPreviousMonth}
                  className="px-2 py-1 text-[11px] font-medium rounded bg-slate-100 hover:bg-slate-200 text-slate-700 transition"
                >
                  Mês Anterior
                </button>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <span className="text-[11px] font-medium text-slate-600 block mb-1">Data Início</span>
                <input
                  type="date"
                  value={dateRange.startDate}
                  onChange={e => setDateRange(prev => ({ ...prev, startDate: e.target.value }))}
                  className="w-full text-xs p-2 rounded-md border border-slate-300 focus:outline-hidden focus:ring-2 focus:ring-blue-500 text-slate-800 font-medium bg-white"
                />
              </div>
              <div>
                <span className="text-[11px] font-medium text-slate-600 block mb-1">Data Fim</span>
                <input
                  type="date"
                  value={dateRange.endDate}
                  onChange={e => setDateRange(prev => ({ ...prev, endDate: e.target.value }))}
                  className="w-full text-xs p-2 rounded-md border border-slate-300 focus:outline-hidden focus:ring-2 focus:ring-blue-500 text-slate-800 font-medium bg-white"
                />
              </div>
            </div>
          </div>

          {/* Quick Preview Box */}
          <div className="p-3.5 rounded-xl bg-slate-100/70 border border-slate-200/80 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold text-slate-600 uppercase tracking-wider block">
                Pré-visualização (ProFlow Layout)
              </span>
              <span className="text-[10px] text-slate-500 font-medium">
                {previewData.shiftCount} {previewData.shiftCount === 1 ? 'turno' : 'turnos'} registados
              </span>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 text-left">
              {/* Card 1: Faturação */}
              <div className="bg-slate-200/60 p-2.5 rounded-lg">
                <span className="text-[9px] font-bold text-slate-500 uppercase tracking-wider block mb-0.5">FATURAÇÃO BRUTA</span>
                <span className="text-sm font-extrabold text-slate-900 block leading-none">
                  {previewData.gross.toLocaleString('pt-PT', { style: 'currency', currency: 'EUR' })}
                </span>
                <span className="text-[10px] text-slate-400 font-medium block mt-1">
                  {previewData.distinctDays} {previewData.distinctDays === 1 ? 'dia operacional' : 'dias operacionais'}
                </span>
              </div>

              {/* Card: Emissão Recibo */}
              <div className="bg-indigo-50/80 border border-indigo-200/60 p-2.5 rounded-lg">
                <span className="text-[9px] font-bold text-indigo-800 uppercase tracking-wider block mb-0.5">EMISSÃO RECIBO</span>
                <span className="text-sm font-extrabold text-indigo-900 block leading-none">
                  {previewData.receiptIssuance.toLocaleString('pt-PT', { style: 'currency', currency: 'EUR' })}
                </span>
                <span className="text-[10px] text-indigo-600 font-medium block mt-1">
                  Faturação − Renda ({previewData.rental.toLocaleString('pt-PT', { style: 'currency', currency: 'EUR' })})
                </span>
              </div>

              {/* Card 2: Lucro Líquido */}
              <div className="bg-slate-200/60 p-2.5 rounded-lg">
                <span className="text-[9px] font-bold text-slate-500 uppercase tracking-wider block mb-0.5">LUCRO LÍQUIDO</span>
                <span className="text-sm font-extrabold text-emerald-600 block leading-none">
                  {previewData.profit.toLocaleString('pt-PT', { style: 'currency', currency: 'EUR' })}
                </span>
                <span className="text-[10px] text-slate-400 font-medium block mt-1">
                  incl. custos operacionais
                </span>
              </div>

              {/* Card 3: Receita/Hora */}
              <div className="bg-slate-200/60 p-2.5 rounded-lg">
                <span className="text-[9px] font-bold text-slate-500 uppercase tracking-wider block mb-0.5">RECEITA/HORA</span>
                <span className="text-sm font-extrabold text-indigo-600 block leading-none">
                  {previewData.revenuePerHour.toLocaleString('pt-PT', { style: 'currency', currency: 'EUR' })}/h
                </span>
                <span className="text-[10px] text-slate-400 font-medium block mt-1">
                  {Math.floor(previewData.hours)}h{Math.round((previewData.hours % 1) * 60)} operacionais
                </span>
              </div>

              {/* Card 4: Total Viagens */}
              <div className="bg-slate-200/60 p-2.5 rounded-lg">
                <span className="text-[9px] font-bold text-slate-500 uppercase tracking-wider block mb-0.5">TOTAL VIAGENS</span>
                <span className="text-sm font-extrabold text-slate-900 block leading-none">
                  {previewData.trips}
                </span>
                <span className="text-[10px] text-slate-400 font-medium block mt-1">
                  média {previewData.avgTripsPerDay.toFixed(1)}/dia
                </span>
              </div>

              {/* Card 5: €/Viagem */}
              <div className="bg-slate-200/60 p-2.5 rounded-lg">
                <span className="text-[9px] font-bold text-slate-500 uppercase tracking-wider block mb-0.5">€/VIAGEM</span>
                <span className="text-sm font-extrabold text-slate-900 block leading-none">
                  {previewData.revenuePerTrip.toLocaleString('pt-PT', { style: 'currency', currency: 'EUR' })}
                </span>
                <span className="text-[10px] text-slate-400 font-medium block mt-1">
                  faturação média
                </span>
              </div>

              {/* Card 6: Total KMS */}
              <div className="bg-slate-200/60 p-2.5 rounded-lg">
                <span className="text-[9px] font-bold text-slate-500 uppercase tracking-wider block mb-0.5">TOTAL KMS</span>
                <span className="text-sm font-extrabold text-slate-900 block leading-none">
                  {previewData.km.toLocaleString('pt-PT')}
                </span>
                <span className="text-[10px] text-slate-400 font-medium block mt-1">
                  kms acumulados
                </span>
              </div>

              {/* Card 7: Energia Total */}
              <div className="bg-slate-200/60 p-2.5 rounded-lg">
                <span className="text-[9px] font-bold text-slate-500 uppercase tracking-wider block mb-0.5">ENERGIA TOTAL</span>
                <span className="text-sm font-extrabold text-slate-900 block leading-none">
                  {previewData.energy.toLocaleString('pt-PT', { style: 'currency', currency: 'EUR' })}
                </span>
                <span className="text-[10px] text-slate-400 font-medium block mt-1">
                  combustível/carga
                </span>
              </div>

              {/* Card 8: Renda Total */}
              <div className="bg-slate-200/60 p-2.5 rounded-lg">
                <span className="text-[9px] font-bold text-slate-500 uppercase tracking-wider block mb-0.5">RENDA TOTAL</span>
                <span className="text-sm font-extrabold text-slate-900 block leading-none">
                  {previewData.rental.toLocaleString('pt-PT', { style: 'currency', currency: 'EUR' })}
                </span>
                <span className="text-[10px] text-slate-400 font-medium block mt-1">
                  custo aluguer
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Footer Actions */}
        <div className="bg-slate-50 px-4 sm:px-6 py-3 sm:py-3.5 border-t border-slate-200 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2.5 sm:gap-2 shrink-0">
          <button
            type="button"
            onClick={onClose}
            disabled={isSending}
            className="px-3 py-2 text-xs font-medium text-slate-700 hover:bg-slate-200 rounded-md transition disabled:opacity-50 text-center order-2 sm:order-1"
          >
            Cancelar
          </button>

          <div className="flex flex-wrap items-center justify-end gap-2 w-full sm:w-auto order-1 sm:order-2">
            <button
              type="button"
              onClick={handleCopySummary}
              translate="no"
              className="notranslate flex-1 sm:flex-none justify-center px-3 py-2 text-xs font-semibold text-slate-700 bg-white border border-slate-300 hover:bg-slate-100 rounded-md shadow-xs transition flex items-center space-x-1.5 whitespace-nowrap"
            >
              {copied ? <Check className="w-3.5 h-3.5 text-emerald-600 shrink-0" /> : <Copy className="w-3.5 h-3.5 text-slate-500 shrink-0" />}
              <span>{copied ? 'Copiado!' : 'Copiar'}</span>
            </button>

            <button
              type="button"
              onClick={handleOpenMailClient}
              translate="no"
              className="notranslate flex-1 sm:flex-none justify-center px-3 py-2 text-xs font-semibold text-indigo-700 bg-indigo-50 border border-indigo-200 hover:bg-indigo-100 rounded-md shadow-xs transition flex items-center space-x-1.5 whitespace-nowrap"
              title="Abre a sua aplicação/cliente de email padrão (Gmail, Mail, Outlook) com o resumo preenchido"
            >
              <ExternalLink className="w-3.5 h-3.5 text-indigo-600 shrink-0" />
              <span>Abrir no E-mail</span>
            </button>

            <button
              type="button"
              onClick={handleSendEmail}
              disabled={isSending}
              translate="no"
              className="notranslate w-full sm:w-auto justify-center px-4 py-2 text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 rounded-md shadow-sm transition flex items-center space-x-1.5 disabled:opacity-50 whitespace-nowrap"
            >
              {isSending ? (
                <>
                  <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin shrink-0" />
                  <span>A enviar...</span>
                </>
              ) : (
                <>
                  <Send className="w-3.5 h-3.5 shrink-0" />
                  <span>Enviar por E-mail</span>
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
