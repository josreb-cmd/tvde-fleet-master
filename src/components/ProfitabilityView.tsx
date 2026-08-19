import React from 'react';
import { useTVDE } from '../contexts/TVDEContext';
import { formatHoursToHHMM } from '../utils/formatters';
import {
  TrendingUp,
  DollarSign,
  Car,
  Users,
  Award,
  Zap,
  Percent,
  CheckCircle2,
  PieChart as PieIcon
} from 'lucide-react';

export const ProfitabilityView: React.FC = () => {
  const {
    monthlyStats,
    vehicleProfitabilityList,
    driverPerformanceList,
    selectedMonth
  } = useTVDE();

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-white border border-slate-200 rounded-md p-6 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center space-x-2">
            <TrendingUp className="w-5 h-5 text-blue-600" />
            <h1 className="text-xl font-bold text-slate-900">Análise Clara de Rentabilidade Mensal</h1>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            Cálculo da margem operacional e lucro líquido da frota TVDE após dedução de combustíveis/carregamentos, manutenção, seguros e rendas de viaturas.
          </p>
        </div>

        <div className="bg-slate-50 border border-slate-200 rounded-md px-4 py-2 text-right">
          <span className="text-[10px] text-slate-400 font-bold uppercase block">Margem Líquida Global</span>
          <span className="text-xl font-bold text-blue-600">
            {monthlyStats.netProfitMarginPct.toFixed(1)}%
          </span>
        </div>
      </div>

      {/* Summary KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
        <div className="bg-white border border-slate-200 rounded-md p-5 shadow-sm">
          <span className="text-xs font-bold uppercase tracking-wider text-slate-400 block">Faturação Operacional</span>
          <span className="text-2xl font-bold text-slate-900 mt-1 block">
            {monthlyStats.totalGrossEarnings.toLocaleString('pt-PT', { style: 'currency', currency: 'EUR' })}
          </span>
          <span className="text-[11px] text-slate-500 mt-1 block">{monthlyStats.totalTrips} viagens concluídas</span>
        </div>

        <div className="bg-white border border-slate-200 rounded-md p-5 shadow-sm border-l-4 border-l-indigo-500">
          <span className="text-xs font-bold uppercase tracking-wider text-slate-400 block">Emissão Recibo</span>
          <span className="text-2xl font-bold text-indigo-900 mt-1 block">
            {monthlyStats.receiptIssuanceAmount.toLocaleString('pt-PT', { style: 'currency', currency: 'EUR' })}
          </span>
          <span className="text-[11px] text-indigo-600 font-medium mt-1 block">Faturação Bruta − Rendas</span>
        </div>

        <div className="bg-white border border-slate-200 rounded-md p-5 shadow-sm">
          <span className="text-xs font-bold uppercase tracking-wider text-slate-400 block">Total Custos & Rendas</span>
          <span className="text-2xl font-bold text-red-600 mt-1 block">
            {monthlyStats.totalExpenses.toLocaleString('pt-PT', { style: 'currency', currency: 'EUR' })}
          </span>
          <span className="text-[11px] text-slate-500 mt-1 block">Combustível + Oficina + Rendas</span>
        </div>

        <div className="bg-white border border-slate-200 rounded-md p-5 shadow-sm">
          <span className="text-xs font-bold uppercase tracking-wider text-slate-400 block">Lucro Líquido Final</span>
          <span className="text-2xl font-bold text-blue-600 mt-1 block">
            {monthlyStats.netProfit.toLocaleString('pt-PT', { style: 'currency', currency: 'EUR' })}
          </span>
          <span className="text-[11px] text-slate-500 mt-1 block">Diferencial acumulado</span>
        </div>

        <div className="bg-white border border-slate-200 rounded-md p-5 shadow-sm">
          <span className="text-xs font-bold uppercase tracking-wider text-slate-400 block">Rendimento p/ Hora</span>
          <span className="text-2xl font-bold text-slate-900 mt-1 block">
            {monthlyStats.earningsPerHour.toFixed(2)} €/h
          </span>
          <span className="text-[11px] text-slate-500 mt-1 block">{monthlyStats.earningsPerKm.toFixed(2)} €/km rodado</span>
        </div>
      </div>

      {/* Vehicle Rentability Detailed Table */}
      <div className="bg-white border border-slate-200 rounded-md p-6 shadow-sm">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-base font-bold text-slate-900 flex items-center space-x-2">
              <Car className="w-5 h-5 text-blue-600" />
              <span>Rentabilidade por Viatura ({selectedMonth})</span>
            </h2>
            <p className="text-xs text-slate-500">
              Desempenho individual de cada veículo da frota após descontar despesas afetas
            </p>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 text-slate-500 font-medium border-b border-slate-200">
              <tr>
                <th className="p-3.5">Matrícula / Modelo</th>
                <th className="p-3.5">Tipo Motor</th>
                <th className="p-3.5">Motorista Atribuído</th>
                <th className="p-3.5 text-center">Quilómetros</th>
                <th className="p-3.5 text-right">Faturação (€)</th>
                <th className="p-3.5 text-right">Despesas (€)</th>
                <th className="p-3.5 text-right">Lucro Líquido (€)</th>
                <th className="p-3.5 text-right">Custo / Km</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {vehicleProfitabilityList.map(item => {
                const isProfitable = item.netProfit >= 0;

                return (
                  <tr key={item.vehicle.id} className="hover:bg-slate-50 transition">
                    <td className="p-3.5 whitespace-nowrap">
                      <span className="font-mono font-bold text-slate-900 text-xs block">{item.vehicle.licensePlate}</span>
                      <span className="text-[11px] text-slate-500">{item.vehicle.brand} {item.vehicle.model}</span>
                    </td>
                    <td className="p-3.5 whitespace-nowrap">
                      <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-slate-100 text-slate-700 border border-slate-200">
                        {item.vehicle.fuelType === 'ev' ? '⚡ 100% Elétrico' : item.vehicle.fuelType}
                      </span>
                    </td>
                    <td className="p-3.5 text-slate-800 font-medium whitespace-nowrap">
                      {item.vehicle.assignedDriverName || 'Sem motorista'}
                    </td>
                    <td className="p-3.5 text-center font-mono text-slate-700">
                      {item.totalKm.toLocaleString('pt-PT')} km
                    </td>
                    <td className="p-3.5 text-right font-bold text-slate-900">
                      {item.grossEarnings.toLocaleString('pt-PT', { style: 'currency', currency: 'EUR' })}
                    </td>
                    <td className="p-3.5 text-right font-semibold text-red-600">
                      {item.totalExpenses.toLocaleString('pt-PT', { style: 'currency', currency: 'EUR' })}
                    </td>
                    <td className={`p-3.5 text-right font-bold ${isProfitable ? 'text-blue-600' : 'text-red-600'}`}>
                      {item.netProfit.toLocaleString('pt-PT', { style: 'currency', currency: 'EUR' })}
                    </td>
                    <td className="p-3.5 text-right font-mono text-slate-500">
                      {item.costPerKm.toFixed(2)} €/km
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Driver Performance Table */}
      <div className="bg-white border border-slate-200 rounded-md p-6 shadow-sm">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-base font-bold text-slate-900 flex items-center space-x-2">
              <Users className="w-5 h-5 text-blue-600" />
              <span>Eficiência e Rendimento por Motorista</span>
            </h2>
            <p className="text-xs text-slate-500">
              Análise do rendimento horário e por quilómetro efetuado por cada colaborador
            </p>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 text-slate-500 font-medium border-b border-slate-200">
              <tr>
                <th className="p-3.5">Motorista</th>
                <th className="p-3.5 text-center">Nº Viagens</th>
                <th className="p-3.5 text-center">Km Percorridos</th>
                <th className="p-3.5 text-center">Horas em Serviço</th>
                <th className="p-3.5 text-right">Faturação Total (€)</th>
                <th className="p-3.5 text-right">Ganhos / Hora (€/h)</th>
                <th className="p-3.5 text-right">Ganhos / Km (€/km)</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {driverPerformanceList.map(item => (
                <tr key={item.driver.id} className="hover:bg-slate-50 transition">
                  <td className="p-3.5 font-bold text-slate-900">{item.driver.name}</td>
                  <td className="p-3.5 text-center text-slate-700">{item.totalTrips}</td>
                  <td className="p-3.5 text-center text-slate-700">{item.totalKm} km</td>
                  <td className="p-3.5 text-center text-slate-700 font-mono">{formatHoursToHHMM(item.totalHours)}</td>
                  <td className="p-3.5 text-right font-bold text-slate-900">
                    {item.totalEarnings.toLocaleString('pt-PT', { style: 'currency', currency: 'EUR' })}
                  </td>
                  <td className="p-3.5 text-right font-bold text-blue-600">
                    {item.earningsPerHour.toFixed(2)} €/h
                  </td>
                  <td className="p-3.5 text-right font-bold text-slate-700">
                    {item.earningsPerKm.toFixed(2)} €/km
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
