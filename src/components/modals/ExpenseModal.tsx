import React, { useState } from 'react';
import { useTVDE } from '../../context/TVDEContext';
import { ExpenseCategory } from '../../types';
import { X, DollarSign } from 'lucide-react';

interface ExpenseModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const ExpenseModal: React.FC<ExpenseModalProps> = ({ isOpen, onClose }) => {
  const { vehicles, drivers, addExpense } = useTVDE();

  const [category, setCategory] = useState<ExpenseCategory>('fuel_charging');
  const [title, setTitle] = useState<string>('');
  const [amount, setAmount] = useState<string>('');
  const [date, setDate] = useState<string>(new Date().toISOString().split('T')[0]);
  const [vehicleId, setVehicleId] = useState<string>('');
  const [driverId, setDriverId] = useState<string>('');
  const [invoiceNumber, setInvoiceNumber] = useState<string>('');
  const [description, setDescription] = useState<string>('');

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title || !amount) {
      alert('Por favor preencha o título e o valor da despesa.');
      return;
    }

    const veh = vehicles.find(v => v.id === vehicleId);
    const drv = drivers.find(d => d.id === driverId);

    addExpense({
      category,
      title,
      amount: parseFloat(amount) || 0,
      date,
      vehicleId: veh?.id,
      vehiclePlate: veh?.licensePlate,
      driverId: drv?.id,
      driverName: drv?.name,
      invoiceNumber,
      description
    });

    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-white border border-slate-200 rounded-md w-full max-w-lg p-6 shadow-xl relative overflow-hidden">
        <div className="flex items-center justify-between pb-4 border-b border-slate-200">
          <div className="flex items-center space-x-2">
            <DollarSign className="w-5 h-5 text-red-600" />
            <h2 className="text-base font-bold text-slate-900">Lançar Nova Despesa ou Renda</h2>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600 transition">
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4 mt-4 text-xs">
          <div>
            <label className="block text-slate-700 font-medium mb-1">Categoria da Despesa *</label>
            <select
              value={category}
              onChange={e => setCategory(e.target.value as ExpenseCategory)}
              className="w-full bg-white border border-slate-300 rounded-md p-2.5 text-slate-900 focus:outline-none focus:border-blue-600 font-medium"
            >
              <option value="fuel_charging">Combustível / Carregamento Elétrico</option>
              <option value="maintenance">Manutenção / Oficina</option>
              <option value="insurance">Seguro TVDE</option>
              <option value="vehicle_rental">Renda de Viatura</option>
              <option value="tolls_wash">Portagens / Lavagens</option>
              <option value="other">Outras Despesas</option>
            </select>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="col-span-2">
              <label className="block text-slate-700 font-medium mb-1">Descrição / Título *</label>
              <input
                type="text"
                placeholder="Ex: Carregamento rápido Galp Electric / Revisão 80.000km"
                value={title}
                onChange={e => setTitle(e.target.value)}
                className="w-full bg-white border border-slate-300 rounded-md p-2.5 text-slate-900 focus:outline-none focus:border-blue-600"
                required
              />
            </div>

            <div>
              <label className="block text-red-600 font-bold mb-1">Valor (€) *</label>
              <input
                type="number"
                step="0.01"
                placeholder="Ex: 145.00"
                value={amount}
                onChange={e => setAmount(e.target.value)}
                className="w-full bg-white border border-red-500 rounded-md p-2.5 text-slate-900 font-bold text-sm focus:outline-none focus:border-red-600"
                required
              />
            </div>

            <div>
              <label className="block text-slate-700 font-medium mb-1">Data *</label>
              <input
                type="date"
                value={date}
                onChange={e => setDate(e.target.value)}
                className="w-full bg-white border border-slate-300 rounded-md p-2.5 text-slate-900 focus:outline-none focus:border-blue-600"
                required
              />
            </div>

            <div>
              <label className="block text-slate-700 font-medium mb-1">Viatura Associada</label>
              <select
                value={vehicleId}
                onChange={e => setVehicleId(e.target.value)}
                className="w-full bg-white border border-slate-300 rounded-md p-2.5 text-slate-900 focus:outline-none focus:border-blue-600"
              >
                <option value="">Nenhuma / Frota Geral</option>
                {vehicles.map(v => (
                  <option key={v.id} value={v.id}>{v.brand} {v.model} ({v.licensePlate})</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-slate-700 font-medium mb-1">Motorista Associado</label>
              <select
                value={driverId}
                onChange={e => setDriverId(e.target.value)}
                className="w-full bg-white border border-slate-300 rounded-md p-2.5 text-slate-900 focus:outline-none focus:border-blue-600"
              >
                <option value="">Nenhum / Não aplicável</option>
                {drivers.map(d => (
                  <option key={d.id} value={d.id}>{d.name}</option>
                ))}
              </select>
            </div>
          </div>

          <div>
            <label className="block text-slate-700 font-medium mb-1">Nº Fatura / Recibo</label>
            <input
              type="text"
              placeholder="Ex: FT 2026/8839"
              value={invoiceNumber}
              onChange={e => setInvoiceNumber(e.target.value)}
              className="w-full bg-white border border-slate-300 rounded-md p-2.5 text-slate-900 focus:outline-none focus:border-blue-600"
            />
          </div>

          <div>
            <label className="block text-slate-700 font-medium mb-1">Detalhes Adicionais</label>
            <input
              type="text"
              placeholder="Observações adicionais sobre o custo..."
              value={description}
              onChange={e => setDescription(e.target.value)}
              className="w-full bg-white border border-slate-300 rounded-md p-2.5 text-slate-900 focus:outline-none focus:border-blue-600"
            />
          </div>

          <div className="flex justify-end space-x-2 pt-3 border-t border-slate-200">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-md bg-slate-100 text-slate-700 font-medium hover:bg-slate-200 transition shadow-sm"
            >
              Cancelar
            </button>
            <button
              type="submit"
              className="px-5 py-2 rounded-md bg-blue-600 text-white font-medium hover:bg-blue-700 transition shadow-sm"
            >
              Gravar Custo
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
