import React, { useState } from 'react';
import { useTVDE } from '../context/TVDEContext';
import { formatHoursToHHMM } from '../utils/formatters';
import { SendSummaryModal } from './SendSummaryModal';
import {
  TrendingUp,
  TrendingDown,
  DollarSign,
  Car,
  Clock,
  Navigation,
  AlertTriangle,
  ArrowUpRight,
  ShieldAlert,
  Fuel,
  Wrench,
  Award,
  Layers,
  Mail
} from 'lucide-react';
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  PieChart,
  Pie,
  Cell
} from 'recharts';

interface DashboardViewProps {
  onOpenNewShiftModal: () => void;
  onOpenNewExpenseModal: () => void;
  setActiveTab: (tab: string) => void;
}

export const DashboardView: React.FC<DashboardViewProps> = ({
  onOpenNewShiftModal,
  onOpenNewExpenseModal,
  setActiveTab
}) => {
  const [isSendSummaryModalOpen, setIsSendSummaryModalOpen] = useState(false);

  const {
    monthlyStats,
    historicalMonthlyData,
    driverPerformanceList,
    notifications,
    shiftLogs,
    selectedMonth
  } = useTVDE();

  const unreadNotifs = notifications.filter(n => !n.read);

  // Platform Share Data calculation for selected month
  const monthShifts = shiftLogs.filter(s => selectedMonth === 'all' || s.date.startsWith(selectedMonth));
  const uberTotal = monthShifts.reduce((acc, s) => acc + (s.uberEarnings || 0), 0);
  const boltTotal = monthShifts.reduce((acc, s) => acc + (s.boltEarnings || 0), 0);
  const otherTotal = monthShifts.reduce((acc, s) => acc + (s.otherEarnings || 0), 0);

  const rawPlatformData = [
    { name: 'Uber', value: uberTotal, color: '#10B981' }, // emerald
    { name: 'Bolt', value: boltTotal, color: '#3B82F6' }, // blue
    { name: 'Outros', value: otherTotal, color: '#F59E0B' }  // amber
  ];
  const platformData = rawPlatformData.some(p => p.value > 0)
    ? rawPlatformData.filter(p => p.value > 0)
    : rawPlatformData;

  // Expenses Breakdown Data
  const expenseBreakdown = [
    { name: 'Combustível/EV', value: monthlyStats.totalFuelCost, color: '#EF4444' },
    { name: 'Rendas Viaturas', value: monthlyStats.totalVehicleRentals, color: '#8B5CF6' },
    { name: 'Manutenção', value: monthlyStats.totalMaintenanceCost, color: '#F59E0B' },
    { name: 'Seguros', value: monthlyStats.totalInsuranceCost, color: '#06B6D4' },
    { name: 'IRS', value: monthlyStats.totalIrsCost || 0, color: '#A855F7' },
    { name: 'IVA', value: monthlyStats.totalIvaCost || 0, color: '#F43F5E' },
    { name: 'Outros / Portagens', value: monthlyStats.totalOtherCost || 0, color: '#64748B' }
  ].filter(e => e.value > 0 || (monthlyStats.totalExpenses === 0 && e.name === 'Combustível/EV'));

  return (
    <div className="space-y-6">
      {/* Top Banner / Welcome & Quick Actions */}
      <div className="bg-white border border-slate-200 rounded-md p-6 shadow-sm flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center space-x-2">
            <span className="px-2.5 py-0.5 rounded-sm text-[10px] font-bold bg-blue-50 text-blue-700 border border-blue-200 uppercase tracking-wider">
              Resumo Ativo: {monthlyStats.monthName}
            </span>
            <span className="text-xs text-slate-500">• Portugal TVDE</span>
          </div>
          <h1 className="text-2xl font-bold text-slate-900 mt-1">
            Painel Geral da Frota TVDE
          </h1>
          <p className="text-xs text-slate-600 mt-0.5 max-w-2xl">
            Acompanhe em tempo real a faturação dos motoristas, somatório diário de viagens, quilómetros percorridos e análise de rentabilidade líquida da frota.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={() => setIsSendSummaryModalOpen(true)}
            translate="no"
            className="notranslate px-4 py-2 rounded-md bg-emerald-600 hover:bg-emerald-700 text-white font-medium text-xs shadow-sm transition flex items-center space-x-1.5 whitespace-nowrap"
          >
            <Mail className="w-3.5 h-3.5 shrink-0" />
            <span className="notranslate">Enviar Resumo por E-mail</span>
          </button>
          <button
            onClick={onOpenNewShiftModal}
            className="px-4 py-2 rounded-md bg-blue-600 hover:bg-blue-700 text-white font-medium text-xs shadow-sm transition flex items-center space-x-1.5"
          >
            <span>+ Registar Faturação Diária</span>
          </button>
          <button
            onClick={onOpenNewExpenseModal}
            className="px-4 py-2 rounded-md bg-slate-100 hover:bg-slate-200 text-slate-800 border border-slate-200 font-medium text-xs transition flex items-center space-x-1.5"
          >
            <span>+ Lançar Custo / Renda</span>
          </button>
        </div>
      </div>

      {/* Send Summary Email Modal */}
      <SendSummaryModal
        isOpen={isSendSummaryModalOpen}
        onClose={() => setIsSendSummaryModalOpen(false)}
      />

      {/* Critical Alerts Bar if any */}
      {unreadNotifs.length > 0 && (
        <div className="bg-orange-50 border border-orange-200 rounded-md p-4 flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="p-2 rounded-md bg-orange-100 text-orange-700">
              <AlertTriangle className="w-5 h-5" />
            </div>
            <div>
              <p className="text-xs font-bold text-orange-900 uppercase tracking-wider">
                Atenção: Tem {unreadNotifs.length} alertas pendentes na sua frota
              </p>
              <p className="text-[11px] text-orange-800">
                {unreadNotifs[0]?.title} — {unreadNotifs[0]?.message}
              </p>
            </div>
          </div>
          <button
            onClick={() => setActiveTab('notifications')}
            className="px-3 py-1.5 rounded-md bg-orange-600 hover:bg-orange-700 text-white font-medium text-xs transition flex-shrink-0 shadow-sm"
          >
            Resolver Alertas →
          </button>
        </div>
      )}

      {/* Primary KPI Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Total Faturado */}
        <div className="bg-white border border-slate-200 rounded-md p-5 shadow-sm relative overflow-hidden group hover:border-blue-300 transition">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-400">Faturação Total (Bruto)</span>
            <div className="p-2 rounded-md bg-blue-50 text-blue-600">
              <DollarSign className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-3">
            <span className="text-2xl font-bold text-slate-900">
              {monthlyStats.totalGrossEarnings.toLocaleString('pt-PT', { style: 'currency', currency: 'EUR' })}
            </span>
          </div>
          <div className="mt-2 flex items-center justify-between text-[11px] text-slate-500">
            <span>Uber vs Bolt vs Outros</span>
            <span className="text-blue-600 font-semibold">100% acumulado</span>
          </div>
        </div>

        {/* Custos Operacionais e Rendas */}
        <div className="bg-white border border-slate-200 rounded-md p-5 shadow-sm relative overflow-hidden group hover:border-red-300 transition">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-400">Custos Totais & Rendas</span>
            <div className="p-2 rounded-md bg-red-50 text-red-600">
              <TrendingDown className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-3">
            <span className="text-2xl font-bold text-slate-900">
              {monthlyStats.totalExpenses.toLocaleString('pt-PT', { style: 'currency', currency: 'EUR' })}
            </span>
          </div>
          <div className="mt-2 flex items-center justify-between text-[11px] text-slate-500">
            <span>Combustível, Manut. & Rendas</span>
            <span className="text-red-600 font-semibold">
              {monthlyStats.totalGrossEarnings > 0
                ? `${((monthlyStats.totalExpenses / monthlyStats.totalGrossEarnings) * 100).toFixed(1)}% receita`
                : '0%'}
            </span>
          </div>
        </div>

        {/* Lucro Liquido */}
        <div className="bg-white border border-slate-200 rounded-md p-5 shadow-sm relative overflow-hidden group hover:border-blue-300 transition">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-400">Lucro Líquido da Frota</span>
            <div className="p-2 rounded-md bg-emerald-50 text-emerald-600">
              <TrendingUp className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-3">
            <span className={`text-2xl font-bold ${monthlyStats.netProfit >= 0 ? 'text-blue-600' : 'text-red-600'}`}>
              {monthlyStats.netProfit.toLocaleString('pt-PT', { style: 'currency', currency: 'EUR' })}
            </span>
          </div>
          <div className="mt-2 flex items-center justify-between text-[11px] text-slate-500">
            <span>Margem Líquida</span>
            <span className="text-blue-600 font-bold">
              {monthlyStats.netProfitMarginPct.toFixed(1)}%
            </span>
          </div>
        </div>

        {/* Total de Viagens e Km */}
        <div className="bg-white border border-slate-200 rounded-md p-5 shadow-sm relative overflow-hidden group hover:border-slate-300 transition">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-400">Métricas de Rodagem</span>
            <div className="p-2 rounded-md bg-slate-100 text-slate-700">
              <Navigation className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline justify-between">
            <div>
              <span className="text-2xl font-bold text-slate-900">{monthlyStats.totalTrips}</span>
              <span className="text-xs text-slate-500 ml-1">viagens</span>
            </div>
            <div className="text-right">
              <span className="text-lg font-bold text-slate-800">{monthlyStats.totalKm.toLocaleString('pt-PT')}</span>
              <span className="text-xs text-slate-500 ml-1">km</span>
            </div>
          </div>
          <div className="mt-2 flex items-center justify-between text-[11px] text-slate-500 border-t border-slate-100 pt-2">
            <span>Rendimento Médio:</span>
            <span className="text-slate-800 font-semibold">
              {monthlyStats.earningsPerKm.toFixed(2)} €/km • {monthlyStats.earningsPerHour.toFixed(2)} €/h
            </span>
          </div>
        </div>
      </div>

      {/* Visual Charts Section (GRÁFICOS COMPARATIVOS MENSAIS) */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main Historical Comparative Area Chart (5 Months) */}
        <div className="lg:col-span-2 bg-white border border-slate-200 rounded-md p-5 shadow-sm">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-4">
            <div>
              <h2 className="text-sm font-bold text-slate-900 flex items-center space-x-2">
                <TrendingUp className="w-4 h-4 text-blue-600" />
                <span>Evolução Mensal da Faturação vs Custos e Lucro Líquido</span>
              </h2>
              <p className="text-[11px] text-slate-500">
                Gráfico comparativo dos últimos 5 meses da empresa de TVDE
              </p>
            </div>
            <div className="flex items-center space-x-3 text-[11px]">
              <div className="flex items-center space-x-1">
                <div className="w-3 h-3 rounded-sm bg-blue-600" />
                <span className="text-slate-600">Bruto (€)</span>
              </div>
              <div className="flex items-center space-x-1">
                <div className="w-3 h-3 rounded-sm bg-red-500" />
                <span className="text-slate-600">Custos (€)</span>
              </div>
              <div className="flex items-center space-x-1">
                <div className="w-3 h-3 rounded-sm bg-emerald-500" />
                <span className="text-slate-600">Lucro (€)</span>
              </div>
            </div>
          </div>

          <div className="h-72 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={historicalMonthlyData} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
                <defs>
                  <linearGradient id="colorGross" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#2563EB" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="#2563EB" stopOpacity={0} />
                  </linearGradient>
                  <linearGradient id="colorExpenses" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#EF4444" stopOpacity={0.2} />
                    <stop offset="95%" stopColor="#EF4444" stopOpacity={0} />
                  </linearGradient>
                  <linearGradient id="colorProfit" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#10B981" stopOpacity={0.4} />
                    <stop offset="95%" stopColor="#10B981" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#E2E8F0" vertical={false} />
                <XAxis dataKey="monthName" stroke="#64748B" fontSize={11} tickLine={false} />
                <YAxis stroke="#64748B" fontSize={11} tickLine={false} unit="€" />
                <Tooltip
                  contentStyle={{ backgroundColor: '#1E293B', borderColor: '#334155', borderRadius: '6px', fontSize: '12px', color: '#FFF' }}
                  formatter={(value: any) => [`${Number(value).toLocaleString('pt-PT')} €`, '']}
                />
                <Area type="monotone" dataKey="totalGrossEarnings" name="Faturação Bruta" stroke="#2563EB" strokeWidth={2.5} fillOpacity={1} fill="url(#colorGross)" />
                <Area type="monotone" dataKey="totalExpenses" name="Custos Totais" stroke="#EF4444" strokeWidth={2} fillOpacity={1} fill="url(#colorExpenses)" />
                <Area type="monotone" dataKey="netProfit" name="Lucro Líquido" stroke="#10B981" strokeWidth={2.5} fillOpacity={1} fill="url(#colorProfit)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Platform Share Pie Chart (Uber vs Bolt) */}
        <div className="bg-white border border-slate-200 rounded-md p-5 shadow-sm flex flex-col justify-between">
          <div>
            <h2 className="text-sm font-bold text-slate-900 flex items-center space-x-2 mb-1">
              <Layers className="w-4 h-4 text-blue-600" />
              <span>Distribuição de Plataformas</span>
            </h2>
            <p className="text-[11px] text-slate-500 mb-2">
              Proporção de ganhos Uber vs Bolt ({selectedMonth})
            </p>
            <div className="h-48 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={platformData}
                    cx="50%"
                    cy="50%"
                    innerRadius={50}
                    outerRadius={75}
                    paddingAngle={4}
                    dataKey="value"
                  >
                    {platformData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip
                    contentStyle={{ backgroundColor: '#1E293B', borderColor: '#334155', borderRadius: '6px', fontSize: '12px', color: '#FFF' }}
                    formatter={(val: any) => [`${Number(val).toLocaleString('pt-PT')} €`, 'Faturação']}
                  />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </div>

          <div className="space-y-2 pt-2 border-t border-slate-100">
            {platformData.map(p => (
              <div key={p.name} className="flex items-center justify-between text-xs">
                <div className="flex items-center space-x-2">
                  <div className="w-3 h-3 rounded-sm" style={{ backgroundColor: p.color }} />
                  <span className="text-slate-700 font-medium">{p.name}</span>
                </div>
                <span className="text-slate-900 font-bold">
                  {p.value.toLocaleString('pt-PT', { style: 'currency', currency: 'EUR' })}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Driver Ranking & Expense Category Breakdown */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Top Motoristas Chart */}
        <div className="bg-white border border-slate-200 rounded-md p-5 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-sm font-bold text-slate-900 flex items-center space-x-2">
                <Award className="w-4 h-4 text-amber-500" />
                <span>Ranking de Faturação por Motorista</span>
              </h2>
              <p className="text-[11px] text-slate-500">
                Ganhos totais gerados por colaborador este mês
              </p>
            </div>
            <button
              onClick={() => setActiveTab('drivers')}
              className="text-xs text-blue-600 font-bold hover:underline"
            >
              Ver todos →
            </button>
          </div>

          <div className="h-60 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={driverPerformanceList.map(d => ({
                  nome: d.driver.name.split(' ')[0],
                  faturado: d.totalEarnings,
                  km: d.totalKm
                }))}
                margin={{ top: 10, right: 10, left: -10, bottom: 0 }}
              >
                <CartesianGrid strokeDasharray="3 3" stroke="#E2E8F0" vertical={false} />
                <XAxis dataKey="nome" stroke="#64748B" fontSize={11} tickLine={false} />
                <YAxis stroke="#64748B" fontSize={11} tickLine={false} unit="€" />
                <Tooltip
                  contentStyle={{ backgroundColor: '#1E293B', borderColor: '#334155', borderRadius: '6px', fontSize: '12px', color: '#FFF' }}
                  formatter={(val: any) => [`${Number(val).toLocaleString('pt-PT')} €`, 'Faturação Total']}
                />
                <Bar dataKey="faturado" fill="#2563EB" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Custos por Categoria (Combustível, Manutenção, Seguros, Rendas) */}
        <div className="bg-white border border-slate-200 rounded-md p-5 shadow-sm flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-4">
              <div>
                <h2 className="text-sm font-bold text-slate-900 flex items-center space-x-2">
                  <Fuel className="w-4 h-4 text-red-500" />
                  <span>Distribuição de Custos da Frota</span>
                </h2>
                <p className="text-[11px] text-slate-500">
                  Despesas com combustíveis, manutenção, seguros e rendas de viaturas
                </p>
              </div>
              <button
                onClick={() => setActiveTab('expenses')}
                className="text-xs text-blue-600 font-bold hover:underline"
              >
                Detalhes →
              </button>
            </div>

            <div className="space-y-3">
              {expenseBreakdown.map(item => {
                const totalExp = monthlyStats.totalExpenses || 1;
                const pct = ((item.value / totalExp) * 100).toFixed(1);

                return (
                  <div key={item.name} className="space-y-1">
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-slate-700 font-medium">{item.name}</span>
                      <span className="text-slate-900 font-bold">
                        {item.value.toLocaleString('pt-PT', { style: 'currency', currency: 'EUR' })} ({pct}%)
                      </span>
                    </div>
                    <div className="w-full bg-slate-100 h-2 rounded-sm overflow-hidden">
                      <div
                        className="h-full rounded-sm transition-all duration-500"
                        style={{ width: `${Math.min(100, Number(pct))}%`, backgroundColor: item.color }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          <div className="mt-6 pt-4 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
            <span>Lucro Por Quilómetro Rodado:</span>
            <span className="text-blue-600 font-bold text-sm">
              {(monthlyStats.netProfit / (monthlyStats.totalKm || 1)).toFixed(2)} €/km
            </span>
          </div>
        </div>
      </div>

      {/* Recent Daily Shift Logs Table Preview */}
      <div className="bg-white border border-slate-200 rounded-md p-5 shadow-sm">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-sm font-bold text-slate-900">Últimos Registos Diários de Faturação</h2>
            <p className="text-[11px] text-slate-500">Entradas submetidas recentemente pelos motoristas</p>
          </div>
          <button
            onClick={() => setActiveTab('shift-logs')}
            className="text-xs text-blue-600 font-bold hover:underline"
          >
            Ver Histórico Completo →
          </button>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 text-slate-500 font-medium border-b border-slate-200">
              <tr>
                <th className="p-3">Data</th>
                <th className="p-3">Motorista</th>
                <th className="p-3">Viatura</th>
                <th className="p-3 text-center">Viagens</th>
                <th className="p-3 text-center">Quilómetros</th>
                <th className="p-3 text-center">Horas</th>
                <th className="p-3 text-right">Faturado (€)</th>
                <th className="p-3 text-center">Estado</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {shiftLogs.slice(0, 5).map(log => (
                <tr key={log.id} className="hover:bg-slate-50 transition">
                  <td className="p-3 text-slate-600 font-medium">{log.date}</td>
                  <td className="p-3 font-bold text-slate-900">{log.driverName}</td>
                  <td className="p-3 text-slate-700 font-mono font-bold">{log.vehiclePlate}</td>
                  <td className="p-3 text-center text-slate-700">{log.tripsCount}</td>
                  <td className="p-3 text-center text-slate-700">{log.kilometers} km</td>
                  <td className="p-3 text-center text-slate-700 font-mono">{formatHoursToHHMM(log.hoursWorked)}</td>
                  <td className="p-3 text-right font-bold text-slate-900">
                    {log.grossEarnings.toLocaleString('pt-PT', { style: 'currency', currency: 'EUR' })}
                  </td>
                  <td className="p-3 text-center">
                    <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                      log.status === 'verified'
                        ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                        : log.status === 'paid'
                        ? 'bg-blue-50 text-blue-700 border border-blue-200'
                        : 'bg-amber-50 text-amber-700 border border-amber-200'
                    }`}>
                      {log.status === 'verified' ? 'Verificado' : log.status === 'paid' ? 'Pago' : 'Pendente'}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
