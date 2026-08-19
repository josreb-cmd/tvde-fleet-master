import React, { useState } from 'react';
import { useTVDE } from '../contexts/TVDEContext';
import { ExpenseCategory, Expense } from '../types';
import {
  DollarSign,
  Fuel,
  Wrench,
  Shield,
  Car,
  Search,
  Plus,
  Trash2,
  Calendar,
  FileText,
  Edit3,
  Landmark,
  Receipt,
  Download
} from 'lucide-react';

interface ExpensesViewProps {
  onOpenNewExpenseModal: () => void;
  onEditExpense?: (expense: Expense) => void;
}

export const ExpensesView: React.FC<ExpensesViewProps> = ({ onOpenNewExpenseModal, onEditExpense }) => {
  const { expenses, deleteExpense, selectedMonth } = useTVDE();

  const [activeCategory, setActiveCategory] = useState<ExpenseCategory | 'all'>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');

  const categoryLabels: Record<ExpenseCategory, { label: string; icon: any; color: string }> = {
    fuel_charging: { label: 'Combustível / EV', icon: Fuel, color: 'text-red-700 bg-red-50 border border-red-200' },
    maintenance: { label: 'Manutenção', icon: Wrench, color: 'text-amber-700 bg-amber-50 border border-amber-200' },
    insurance: { label: 'Seguros', icon: Shield, color: 'text-cyan-700 bg-cyan-50 border border-cyan-200' },
    vehicle_rental: { label: 'Rendas de Viaturas', icon: Car, color: 'text-indigo-700 bg-indigo-50 border border-indigo-200' },
    tolls_wash: { label: 'Portagens / Lavagens', icon: FileText, color: 'text-teal-700 bg-teal-50 border border-teal-200' },
    irs: { label: 'IRS', icon: Landmark, color: 'text-purple-700 bg-purple-50 border border-purple-200' },
    iva: { label: 'IVA', icon: Receipt, color: 'text-rose-700 bg-rose-50 border border-rose-200' },
    other: { label: 'Outras Despesas', icon: DollarSign, color: 'text-slate-700 bg-slate-100 border border-slate-200' }
  };

  // Filter Expenses by Month and Category
  const monthExpenses = expenses.filter(e => selectedMonth === 'all' || e.date.startsWith(selectedMonth));
  const filteredExpenses = monthExpenses.filter(e => {
    const matchesCategory = activeCategory === 'all' || e.category === activeCategory;
    const matchesSearch =
      e.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (e.vehiclePlate && e.vehiclePlate.toLowerCase().includes(searchQuery.toLowerCase())) ||
      (e.driverName && e.driverName.toLowerCase().includes(searchQuery.toLowerCase())) ||
      (e.invoiceNumber && e.invoiceNumber.toLowerCase().includes(searchQuery.toLowerCase()));

    return matchesCategory && matchesSearch;
  });

  // Calculate Subtotals for cards
  const totalFuel = monthExpenses.filter(e => e.category === 'fuel_charging').reduce((a, e) => a + e.amount, 0);
  const totalMaint = monthExpenses.filter(e => e.category === 'maintenance').reduce((a, e) => a + e.amount, 0);
  const totalInsur = monthExpenses.filter(e => e.category === 'insurance').reduce((a, e) => a + e.amount, 0);
  const totalRent = monthExpenses.filter(e => e.category === 'vehicle_rental').reduce((a, e) => a + e.amount, 0);
  const totalIrs = monthExpenses.filter(e => e.category === 'irs').reduce((a, e) => a + e.amount, 0);
  const totalIva = monthExpenses.filter(e => e.category === 'iva').reduce((a, e) => a + e.amount, 0);
  const totalAll = monthExpenses.reduce((a, e) => a + e.amount, 0);

  const handleExportCsv = () => {
    const headers = ['Data', 'Categoria', 'Titulo', 'Viatura', 'Motorista', 'Valor (EUR)', 'Nr Fatura'];
    const rows = filteredExpenses.map(e => [
      e.date,
      categoryLabels[e.category]?.label || e.category,
      `"${e.title.replace(/"/g, '""')}"`,
      e.vehiclePlate || '-',
      e.driverName || '-',
      e.amount.toFixed(2).replace('.', ','),
      e.invoiceNumber ? `"${e.invoiceNumber.replace(/"/g, '""')}"` : '-'
    ]);

    const csvContent = 'data:text/csv;charset=utf-8,\uFEFF' + [headers.join(';'), ...rows.map(r => r.join(';'))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `despesas_tvde_${selectedMonth}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-white border border-slate-200 rounded-md p-6 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center space-x-2">
            <DollarSign className="w-5 h-5 text-blue-600" />
            <h1 className="text-xl font-bold text-slate-900">Registo de Custos e Rendas de Viaturas</h1>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            Controlo rigoroso de despesas operacionais da frota TVDE: combustíveis/carregamentos, manutenção de veículos, seguros, impostos (IRS e IVA) e rendas.
          </p>
        </div>

        <div className="flex items-center space-x-2">
          <button
            onClick={handleExportCsv}
            className="px-3 py-2 rounded-md bg-white border border-slate-300 hover:bg-slate-50 text-slate-700 font-medium text-xs shadow-sm transition flex items-center space-x-1.5"
            title="Exportar lista de despesas em formato CSV"
          >
            <Download className="w-4 h-4 text-slate-500" />
            <span>Exportar CSV</span>
          </button>
          <button
            onClick={onOpenNewExpenseModal}
            className="px-4 py-2 rounded-md bg-blue-600 hover:bg-blue-700 text-white font-medium text-xs shadow-sm transition flex items-center space-x-1.5 whitespace-nowrap"
          >
            <Plus className="w-4 h-4" />
            <span>Registar Nova Despesa / Renda</span>
          </button>
        </div>
      </div>

      {/* Category Totals Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-3">
        <div
          onClick={() => setActiveCategory('all')}
          className={`p-3.5 rounded-md border cursor-pointer transition ${
            activeCategory === 'all'
              ? 'bg-blue-50 border-blue-500 text-blue-900'
              : 'bg-white border-slate-200 text-slate-500 hover:border-slate-300'
          }`}
        >
          <span className="text-[10px] font-bold uppercase tracking-wider block">Total Geral</span>
          <span className="text-base font-bold text-slate-900 mt-1 block">
            {totalAll.toLocaleString('pt-PT', { style: 'currency', currency: 'EUR' })}
          </span>
        </div>

        <div
          onClick={() => setActiveCategory('fuel_charging')}
          className={`p-3.5 rounded-md border cursor-pointer transition ${
            activeCategory === 'fuel_charging'
              ? 'bg-blue-50 border-blue-500 text-blue-900'
              : 'bg-white border-slate-200 text-slate-500 hover:border-slate-300'
          }`}
        >
          <div className="flex items-center space-x-1.5">
            <Fuel className="w-3.5 h-3.5 text-red-600" />
            <span className="text-[10px] font-bold uppercase tracking-wider">Combustível/EV</span>
          </div>
          <span className="text-base font-bold text-slate-900 mt-1 block">
            {totalFuel.toLocaleString('pt-PT', { style: 'currency', currency: 'EUR' })}
          </span>
        </div>

        <div
          onClick={() => setActiveCategory('maintenance')}
          className={`p-3.5 rounded-md border cursor-pointer transition ${
            activeCategory === 'maintenance'
              ? 'bg-blue-50 border-blue-500 text-blue-900'
              : 'bg-white border-slate-200 text-slate-500 hover:border-slate-300'
          }`}
        >
          <div className="flex items-center space-x-1.5">
            <Wrench className="w-3.5 h-3.5 text-amber-600" />
            <span className="text-[10px] font-bold uppercase tracking-wider">Manutenção</span>
          </div>
          <span className="text-base font-bold text-slate-900 mt-1 block">
            {totalMaint.toLocaleString('pt-PT', { style: 'currency', currency: 'EUR' })}
          </span>
        </div>

        <div
          onClick={() => setActiveCategory('insurance')}
          className={`p-3.5 rounded-md border cursor-pointer transition ${
            activeCategory === 'insurance'
              ? 'bg-blue-50 border-blue-500 text-blue-900'
              : 'bg-white border-slate-200 text-slate-500 hover:border-slate-300'
          }`}
        >
          <div className="flex items-center space-x-1.5">
            <Shield className="w-3.5 h-3.5 text-cyan-600" />
            <span className="text-[10px] font-bold uppercase tracking-wider">Seguros</span>
          </div>
          <span className="text-base font-bold text-slate-900 mt-1 block">
            {totalInsur.toLocaleString('pt-PT', { style: 'currency', currency: 'EUR' })}
          </span>
        </div>

        <div
          onClick={() => setActiveCategory('vehicle_rental')}
          className={`p-3.5 rounded-md border cursor-pointer transition ${
            activeCategory === 'vehicle_rental'
              ? 'bg-blue-50 border-blue-500 text-blue-900'
              : 'bg-white border-slate-200 text-slate-500 hover:border-slate-300'
          }`}
        >
          <div className="flex items-center space-x-1.5">
            <Car className="w-3.5 h-3.5 text-indigo-600" />
            <span className="text-[10px] font-bold uppercase tracking-wider">Rendas Viaturas</span>
          </div>
          <span className="text-base font-bold text-slate-900 mt-1 block">
            {totalRent.toLocaleString('pt-PT', { style: 'currency', currency: 'EUR' })}
          </span>
        </div>

        <div
          onClick={() => setActiveCategory('irs')}
          className={`p-3.5 rounded-md border cursor-pointer transition ${
            activeCategory === 'irs'
              ? 'bg-blue-50 border-blue-500 text-blue-900'
              : 'bg-white border-slate-200 text-slate-500 hover:border-slate-300'
          }`}
        >
          <div className="flex items-center space-x-1.5">
            <Landmark className="w-3.5 h-3.5 text-purple-600" />
            <span className="text-[10px] font-bold uppercase tracking-wider">IRS</span>
          </div>
          <span className="text-base font-bold text-slate-900 mt-1 block">
            {totalIrs.toLocaleString('pt-PT', { style: 'currency', currency: 'EUR' })}
          </span>
        </div>

        <div
          onClick={() => setActiveCategory('iva')}
          className={`p-3.5 rounded-md border cursor-pointer transition ${
            activeCategory === 'iva'
              ? 'bg-blue-50 border-blue-500 text-blue-900'
              : 'bg-white border-slate-200 text-slate-500 hover:border-slate-300'
          }`}
        >
          <div className="flex items-center space-x-1.5">
            <Receipt className="w-3.5 h-3.5 text-rose-600" />
            <span className="text-[10px] font-bold uppercase tracking-wider">IVA</span>
          </div>
          <span className="text-base font-bold text-slate-900 mt-1 block">
            {totalIva.toLocaleString('pt-PT', { style: 'currency', currency: 'EUR' })}
          </span>
        </div>
      </div>

      {/* Search Bar */}
      <div className="bg-white border border-slate-200 rounded-md p-4 shadow-sm flex items-center justify-between">
        <div className="relative w-full max-w-md">
          <Search className="w-4 h-4 absolute left-3 top-2.5 text-slate-400" />
          <input
            type="text"
            placeholder="Pesquisar por título, fatura ou matrícula..."
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            className="w-full bg-slate-50 border border-slate-300 rounded-md pl-9 pr-3 py-2 text-xs text-slate-900 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
          />
        </div>

        <span className="text-xs text-slate-500">
          Encontradas <strong className="text-slate-900">{filteredExpenses.length}</strong> despesas
        </span>
      </div>

      {/* Expenses Table */}
      <div className="bg-white border border-slate-200 rounded-md shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 text-slate-500 font-medium border-b border-slate-200">
              <tr>
                <th className="p-3.5">Categoria</th>
                <th className="p-3.5">Título / Descrição</th>
                <th className="p-3.5">Data</th>
                <th className="p-3.5">Viatura</th>
                <th className="p-3.5">Motorista</th>
                <th className="p-3.5">Nº Fatura</th>
                <th className="p-3.5 text-right">Valor (€)</th>
                <th className="p-3.5 text-right">Ação</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredExpenses.length === 0 ? (
                <tr>
                  <td colSpan={8} className="p-8 text-center text-slate-500">
                    Nenhuma despesa registada para esta categoria no mês de {selectedMonth}.
                  </td>
                </tr>
              ) : (
                filteredExpenses.map(exp => {
                  const catInfo = categoryLabels[exp.category] || categoryLabels.other;
                  const Icon = catInfo.icon;

                  return (
                    <tr key={exp.id} className="hover:bg-slate-50 transition">
                      <td className="p-3.5 whitespace-nowrap">
                        <span className={`inline-flex items-center space-x-1.5 px-2.5 py-1 rounded text-[11px] font-bold ${catInfo.color}`}>
                          <Icon className="w-3.5 h-3.5" />
                          <span>{catInfo.label}</span>
                        </span>
                      </td>
                      <td className="p-3.5">
                        <p className="font-bold text-slate-900">{exp.title}</p>
                        {exp.description && <p className="text-[11px] text-slate-500 mt-0.5">{exp.description}</p>}
                      </td>
                      <td className="p-3.5 text-slate-600 whitespace-nowrap">{exp.date}</td>
                      <td className="p-3.5 font-mono font-bold text-slate-800 whitespace-nowrap">
                        {exp.vehiclePlate || '-'}
                      </td>
                      <td className="p-3.5 text-slate-700 whitespace-nowrap">
                        {exp.driverName || '-'}
                      </td>
                      <td className="p-3.5 font-mono text-slate-500 text-[11px]">
                        {exp.invoiceNumber || '-'}
                      </td>
                      <td className="p-3.5 text-right font-bold text-red-600 text-sm whitespace-nowrap">
                        {exp.amount.toLocaleString('pt-PT', { style: 'currency', currency: 'EUR' })}
                      </td>
                      <td className="p-3.5 text-right flex items-center justify-end space-x-1">
                        <button
                          onClick={() => onEditExpense?.(exp)}
                          className="p-1.5 rounded text-slate-400 hover:text-blue-600 hover:bg-blue-50 transition"
                          title="Editar Despesa / Renda"
                        >
                          <Edit3 className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => {
                            if (confirm('Eliminar esta despesa do registo?')) {
                              deleteExpense(exp.id);
                            }
                          }}
                          className="p-1.5 rounded text-slate-400 hover:text-red-600 hover:bg-red-50 transition"
                          title="Eliminar"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
