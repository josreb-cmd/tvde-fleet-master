import React, { useState } from 'react';
import { useTVDE } from '../../context/TVDEContext';
import { X, Receipt, CheckCircle2 } from 'lucide-react';

interface ShiftModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const ShiftModal: React.FC<ShiftModalProps> = ({ isOpen, onClose }) => {
  const { drivers, vehicles, addShiftLog } = useTVDE();

  const [driverId, setDriverId] = useState<string>(drivers[0]?.id || '');
  const [vehicleId, setVehicleId] = useState<string>(vehicles[0]?.id || '');
  const [date, setDate] = useState<string>(new Date().toISOString().split('T')[0]);
  const [tripsCount, setTripsCount] = useState<string>('');
  const [kilometers, setKilometers] = useState<string>('');
  const [hoursWorked, setHoursWorked] = useState<string>('');
  const [grossEarnings, setGrossEarnings] = useState<string>('');
  const [uberEarnings, setUberEarnings] = useState<string>('');
  const [boltEarnings, setBoltEarnings] = useState<string>('');
  const [fuelExpense, setFuelExpense] = useState<string>('');
  const [notes, setNotes] = useState<string>('');

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    const selectedDriver = drivers.find(d => d.id === driverId) || drivers[0];
    const selectedVehicle = vehicles.find(v => v.id === vehicleId) || vehicles[0];

    const grossNum = parseFloat(grossEarnings) || 0;
    const uberNum = parseFloat(uberEarnings) || 0;
    const boltNum = parseFloat(boltEarnings) || (grossNum - uberNum > 0 ? grossNum - uberNum : 0);

    addShiftLog({
      driverId: selectedDriver.id,
      driverName: selectedDriver.name,
      vehicleId: selectedVehicle.id,
      vehiclePlate: selectedVehicle.licensePlate,
      date,
      tripsCount: parseInt(tripsCount, 10) || 1,
      kilometers: parseFloat(kilometers) || 0,
      grossEarnings: grossNum,
      uberEarnings: uberNum,
      boltEarnings: boltNum,
      otherEarnings: 0,
      hoursWorked: parseFloat(hoursWorked) || 8,
      fuelExpenseAmount: parseFloat(fuelExpense) || 0,
      notes
    });

    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-white border border-slate-200 rounded-md w-full max-w-lg p-6 shadow-xl relative overflow-hidden">
        <div className="flex items-center justify-between pb-4 border-b border-slate-200">
          <div className="flex items-center space-x-2">
            <Receipt className="w-5 h-5 text-blue-600" />
            <h2 className="text-base font-bold text-slate-900">Novo Registo Diário de Turno</h2>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600 transition">
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4 mt-4 text-xs">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-slate-700 font-medium mb-1">Motorista *</label>
              <select
                value={driverId}
                onChange={e => setDriverId(e.target.value)}
                className="w-full bg-white border border-slate-300 rounded-md p-2.5 text-slate-900 focus:outline-none focus:border-blue-600"
                required
              >
                {drivers.map(d => (
                  <option key={d.id} value={d.id}>{d.name}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-slate-700 font-medium mb-1">Viatura *</label>
              <select
                value={vehicleId}
                onChange={e => setVehicleId(e.target.value)}
                className="w-full bg-white border border-slate-300 rounded-md p-2.5 text-slate-900 focus:outline-none focus:border-blue-600"
                required
              >
                {vehicles.map(v => (
                  <option key={v.id} value={v.id}>{v.brand} {v.model} ({v.licensePlate})</option>
                ))}
              </select>
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
              <label className="block text-slate-700 font-medium mb-1">Nº Viagens *</label>
              <input
                type="number"
                placeholder="Ex: 20"
                value={tripsCount}
                onChange={e => setTripsCount(e.target.value)}
                className="w-full bg-white border border-slate-300 rounded-md p-2.5 text-slate-900 focus:outline-none focus:border-blue-600"
                required
              />
            </div>

            <div>
              <label className="block text-slate-700 font-medium mb-1">Quilómetros (km) *</label>
              <input
                type="number"
                step="0.1"
                placeholder="Ex: 250"
                value={kilometers}
                onChange={e => setKilometers(e.target.value)}
                className="w-full bg-white border border-slate-300 rounded-md p-2.5 text-slate-900 focus:outline-none focus:border-blue-600"
                required
              />
            </div>

            <div>
              <label className="block text-slate-700 font-medium mb-1">Horas Trabalhadas *</label>
              <input
                type="number"
                step="0.5"
                placeholder="Ex: 9.0"
                value={hoursWorked}
                onChange={e => setHoursWorked(e.target.value)}
                className="w-full bg-white border border-slate-300 rounded-md p-2.5 text-slate-900 focus:outline-none focus:border-blue-600"
                required
              />
            </div>

            <div className="col-span-2">
              <label className="block text-blue-600 font-bold mb-1">Valor Total Ganho (€) *</label>
              <input
                type="number"
                step="0.01"
                placeholder="Ex: 175.50"
                value={grossEarnings}
                onChange={e => setGrossEarnings(e.target.value)}
                className="w-full bg-white border border-blue-500 rounded-md p-2.5 text-slate-900 font-bold text-sm focus:outline-none focus:border-blue-600"
                required
              />
            </div>

            <div>
              <label className="block text-slate-700 font-medium mb-1">Valor Uber (€)</label>
              <input
                type="number"
                step="0.01"
                placeholder="Ex: 105.00"
                value={uberEarnings}
                onChange={e => setUberEarnings(e.target.value)}
                className="w-full bg-white border border-slate-300 rounded-md p-2.5 text-slate-900 focus:outline-none focus:border-blue-600"
              />
            </div>

            <div>
              <label className="block text-slate-700 font-medium mb-1">Valor Bolt (€)</label>
              <input
                type="number"
                step="0.01"
                placeholder="Ex: 70.50"
                value={boltEarnings}
                onChange={e => setBoltEarnings(e.target.value)}
                className="w-full bg-white border border-slate-300 rounded-md p-2.5 text-slate-900 focus:outline-none focus:border-blue-600"
              />
            </div>
          </div>

          <div>
            <label className="block text-slate-700 font-medium mb-1">Custo Carregamento / Combustível do Dia (€)</label>
            <input
              type="number"
              step="0.01"
              placeholder="Ex: 16.50"
              value={fuelExpense}
              onChange={e => setFuelExpense(e.target.value)}
              className="w-full bg-white border border-slate-300 rounded-md p-2.5 text-slate-900 focus:outline-none focus:border-blue-600"
            />
          </div>

          <div>
            <label className="block text-slate-700 font-medium mb-1">Observações</label>
            <input
              type="text"
              placeholder="Notas do turno..."
              value={notes}
              onChange={e => setNotes(e.target.value)}
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
              Gravar Registo
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
