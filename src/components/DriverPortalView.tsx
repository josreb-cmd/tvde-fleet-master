import React, { useState } from 'react';
import { useTVDE } from '../context/TVDEContext';
import {
  UserCheck,
  PlusCircle,
  Calendar,
  Car,
  Navigation,
  Clock,
  DollarSign,
  Fuel,
  CheckCircle2,
  FileText,
  Award
} from 'lucide-react';
import confetti from 'canvas-confetti';

interface DriverPortalViewProps {
  onOpenNewShiftModal: () => void;
}

export const DriverPortalView: React.FC<DriverPortalViewProps> = ({ onOpenNewShiftModal }) => {
  const {
    currentDriverId,
    drivers,
    vehicles,
    shiftLogs,
    addShiftLog,
    selectedMonth
  } = useTVDE();

  const driver = drivers.find(d => d.id === currentDriverId) || drivers[0];
  const assignedVehicle = vehicles.find(v => v.id === driver.assignedVehicleId) || vehicles[0];

  // Quick Inline Submit Form State
  const [date, setDate] = useState<string>(new Date().toISOString().split('T')[0]);
  const [vehicleId, setVehicleId] = useState<string>(assignedVehicle?.id || '');
  const [tripsCount, setTripsCount] = useState<string>('');
  const [kilometers, setKilometers] = useState<string>('');
  const [hoursWorked, setHoursWorked] = useState<string>('');
  const [grossEarnings, setGrossEarnings] = useState<string>('');
  const [uberEarnings, setUberEarnings] = useState<string>('');
  const [boltEarnings, setBoltEarnings] = useState<string>('');
  const [fuelExpense, setFuelExpense] = useState<string>('');
  const [notes, setNotes] = useState<string>('');
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // Driver Personal Monthly Aggregates
  const driverShifts = shiftLogs.filter(s => s.driverId === driver.id && s.date.startsWith(selectedMonth));
  const myTotalEarnings = driverShifts.reduce((acc, s) => acc + s.grossEarnings, 0);
  const myTotalTrips = driverShifts.reduce((acc, s) => acc + s.tripsCount, 0);
  const myTotalKm = driverShifts.reduce((acc, s) => acc + s.kilometers, 0);
  const myTotalHours = driverShifts.reduce((acc, s) => acc + s.hoursWorked, 0);
  const myHourlyAverage = myTotalHours > 0 ? myTotalEarnings / myTotalHours : 0;
  const myKmAverage = myTotalKm > 0 ? myTotalEarnings / myTotalKm : 0;

  const handleSubmitLog = (e: React.FormEvent) => {
    e.preventDefault();
    if (!tripsCount || !kilometers || !grossEarnings || !hoursWorked) {
      alert('Por favor preencha os campos obrigatórios: Viagens, Km, Faturação e Horas.');
      return;
    }

    const selectedVeh = vehicles.find(v => v.id === vehicleId) || assignedVehicle;

    const grossNum = parseFloat(grossEarnings) || 0;
    const uberNum = parseFloat(uberEarnings) || 0;
    const boltNum = parseFloat(boltEarnings) || (grossNum - uberNum > 0 ? grossNum - uberNum : 0);

    addShiftLog({
      driverId: driver.id,
      driverName: driver.name,
      vehicleId: selectedVeh ? selectedVeh.id : 'veh-1',
      vehiclePlate: selectedVeh ? selectedVeh.licensePlate : 'AA-00-XX',
      date,
      tripsCount: parseInt(tripsCount, 10),
      kilometers: parseFloat(kilometers),
      grossEarnings: grossNum,
      uberEarnings: uberNum,
      boltEarnings: boltNum,
      otherEarnings: 0,
      hoursWorked: parseFloat(hoursWorked),
      fuelExpenseAmount: parseFloat(fuelExpense) || 0,
      notes
    });

    // Confetti effect
    confetti({
      particleCount: 70,
      spread: 60,
      origin: { y: 0.6 }
    });

    setSuccessMessage('Turno diário registado com sucesso!');
    setTimeout(() => setSuccessMessage(null), 4000);

    // Reset Form
    setTripsCount('');
    setKilometers('');
    setHoursWorked('');
    setGrossEarnings('');
    setUberEarnings('');
    setBoltEarnings('');
    setFuelExpense('');
    setNotes('');
  };

  return (
    <div className="space-y-6">
      {/* Header Profile Info */}
      <div className="bg-white border border-slate-200 rounded-md p-6 shadow-sm flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div className="flex items-center space-x-4">
          <div className="w-12 h-12 rounded-sm bg-blue-600 text-white font-bold text-lg flex items-center justify-center shadow-sm">
            {driver.name.split(' ').map(n => n[0]).join('')}
          </div>
          <div>
            <div className="flex items-center space-x-2">
              <h1 className="text-xl font-bold text-slate-900">{driver.name}</h1>
              <span className="px-2 py-0.5 text-[10px] font-bold bg-blue-50 text-blue-700 rounded-sm border border-blue-200 uppercase tracking-wider">
                Licença: {driver.tvdeLicenseNumber}
              </span>
            </div>
            <p className="text-xs text-slate-500 mt-1">
              Viatura Atribuída: <span className="text-slate-900 font-mono font-bold">{assignedVehicle ? `${assignedVehicle.brand} ${assignedVehicle.model} (${assignedVehicle.licensePlate})` : 'Nenhuma'}</span>
            </p>
          </div>
        </div>

        <div className="bg-slate-50 border border-slate-200 rounded-md p-3 flex items-center space-x-4 text-xs">
          <div>
            <span className="text-slate-400 block text-[10px] font-bold uppercase tracking-wider">Taxa / Modelo:</span>
            <span className="text-blue-600 font-bold">{driver.commissionRate}% Motorista</span>
          </div>
          <div className="w-px h-8 bg-slate-200" />
          <div>
            <span className="text-slate-400 block text-[10px] font-bold uppercase tracking-wider">Validade Licença:</span>
            <span className="text-slate-800 font-bold">{driver.tvdeLicenseExpiry}</span>
          </div>
        </div>
      </div>

      {/* Driver Personal Summary Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-white border border-slate-200 rounded-md p-4 shadow-sm">
          <div className="flex items-center justify-between text-slate-400 text-xs">
            <span className="font-bold uppercase tracking-wider">A Minha Faturação</span>
            <DollarSign className="w-4 h-4 text-blue-600" />
          </div>
          <p className="text-xl font-bold text-slate-900 mt-2">
            {myTotalEarnings.toLocaleString('pt-PT', { style: 'currency', currency: 'EUR' })}
          </p>
          <span className="text-[10px] text-slate-500">em {selectedMonth}</span>
        </div>

        <div className="bg-white border border-slate-200 rounded-md p-4 shadow-sm">
          <div className="flex items-center justify-between text-slate-400 text-xs">
            <span className="font-bold uppercase tracking-wider">Minhas Viagens</span>
            <Navigation className="w-4 h-4 text-slate-600" />
          </div>
          <p className="text-xl font-bold text-slate-900 mt-2">{myTotalTrips}</p>
          <span className="text-[10px] text-slate-500">{myTotalKm} km percorridos</span>
        </div>

        <div className="bg-white border border-slate-200 rounded-md p-4 shadow-sm">
          <div className="flex items-center justify-between text-slate-400 text-xs">
            <span className="font-bold uppercase tracking-wider">Horas em Serviço</span>
            <Clock className="w-4 h-4 text-slate-600" />
          </div>
          <p className="text-xl font-bold text-slate-900 mt-2">{myTotalHours.toFixed(1)} h</p>
          <span className="text-[10px] text-slate-500">horas registadas</span>
        </div>

        <div className="bg-white border border-slate-200 rounded-md p-4 shadow-sm">
          <div className="flex items-center justify-between text-slate-400 text-xs">
            <span className="font-bold uppercase tracking-wider">Média por Hora</span>
            <Award className="w-4 h-4 text-blue-600" />
          </div>
          <p className="text-xl font-bold text-blue-600 mt-2">
            {myHourlyAverage.toFixed(2)} €/h
          </p>
          <span className="text-[10px] text-slate-500">{myKmAverage.toFixed(2)} €/km</span>
        </div>
      </div>

      {/* Quick Shift Entry Form Card */}
      <div className="bg-white border border-slate-200 rounded-md p-6 shadow-sm">
        <div className="flex items-center justify-between mb-4 pb-3 border-b border-slate-200">
          <div>
            <h2 className="text-base font-bold text-slate-900 flex items-center space-x-2">
              <PlusCircle className="w-5 h-5 text-blue-600" />
              <span>Registo Diário do Turno (Faturação, Km e Viagens)</span>
            </h2>
            <p className="text-xs text-slate-500">
              Preencha os dados do dia de trabalho para atualização automática no sistema do gestor
            </p>
          </div>
          {successMessage && (
            <div className="flex items-center space-x-2 px-3 py-1.5 bg-emerald-50 text-emerald-700 border border-emerald-200 rounded-md text-xs font-bold">
              <CheckCircle2 className="w-4 h-4 text-emerald-600" />
              <span>{successMessage}</span>
            </div>
          )}
        </div>

        <form onSubmit={handleSubmitLog} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
            {/* Data */}
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Data do Turno *
              </label>
              <input
                type="date"
                value={date}
                onChange={e => setDate(e.target.value)}
                className="w-full bg-slate-50 border border-slate-300 rounded-md px-3 py-2 text-xs text-slate-900 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                required
              />
            </div>

            {/* Viatura */}
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Viatura Utilizada *
              </label>
              <select
                value={vehicleId}
                onChange={e => setVehicleId(e.target.value)}
                className="w-full bg-slate-50 border border-slate-300 rounded-md px-3 py-2 text-xs text-slate-900 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                required
              >
                {vehicles.map(v => (
                  <option key={v.id} value={v.id}>
                    {v.brand} {v.model} ({v.licensePlate})
                  </option>
                ))}
              </select>
            </div>

            {/* Nº de Viagens */}
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Nº de Viagens Efetuadas *
              </label>
              <input
                type="number"
                min="1"
                placeholder="Ex: 22"
                value={tripsCount}
                onChange={e => setTripsCount(e.target.value)}
                className="w-full bg-slate-50 border border-slate-300 rounded-md px-3 py-2 text-xs text-slate-900 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                required
              />
            </div>

            {/* Nº de Km */}
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Quilómetros Percorridos (km) *
              </label>
              <input
                type="number"
                step="0.1"
                placeholder="Ex: 280.5"
                value={kilometers}
                onChange={e => setKilometers(e.target.value)}
                className="w-full bg-slate-50 border border-slate-300 rounded-md px-3 py-2 text-xs text-slate-900 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                required
              />
            </div>

            {/* Horas Trabalhadas */}
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Horas Trabalhadas *
              </label>
              <input
                type="number"
                step="0.5"
                placeholder="Ex: 9.5"
                value={hoursWorked}
                onChange={e => setHoursWorked(e.target.value)}
                className="w-full bg-slate-50 border border-slate-300 rounded-md px-3 py-2 text-xs text-slate-900 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                required
              />
            </div>

            {/* Faturação Total Bruta (€) */}
            <div>
              <label className="block text-xs font-bold text-blue-600 mb-1">
                Valor Total Ganho (€) *
              </label>
              <input
                type="number"
                step="0.01"
                placeholder="Ex: 185.50"
                value={grossEarnings}
                onChange={e => setGrossEarnings(e.target.value)}
                className="w-full bg-slate-50 border border-blue-400 rounded-md px-3 py-2 text-xs text-slate-900 font-bold focus:outline-none focus:border-blue-600 focus:ring-1 focus:ring-blue-600"
                required
              />
            </div>

            {/* Uber (€) */}
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Parcela Uber (€)
              </label>
              <input
                type="number"
                step="0.01"
                placeholder="Ex: 110.00"
                value={uberEarnings}
                onChange={e => setUberEarnings(e.target.value)}
                className="w-full bg-slate-50 border border-slate-300 rounded-md px-3 py-2 text-xs text-slate-900 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
              />
            </div>

            {/* Bolt (€) */}
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Parcela Bolt (€)
              </label>
              <input
                type="number"
                step="0.01"
                placeholder="Ex: 75.50"
                value={boltEarnings}
                onChange={e => setBoltEarnings(e.target.value)}
                className="w-full bg-slate-50 border border-slate-300 rounded-md px-3 py-2 text-xs text-slate-900 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
              />
            </div>

            {/* Custos com Combustível / Carregamento do dia */}
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Custo Carregamento/Combustível (€)
              </label>
              <input
                type="number"
                step="0.01"
                placeholder="Ex: 18.20"
                value={fuelExpense}
                onChange={e => setFuelExpense(e.target.value)}
                className="w-full bg-slate-50 border border-slate-300 rounded-md px-3 py-2 text-xs text-slate-900 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
              />
            </div>
          </div>

          {/* Notas Adicionais */}
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">
              Observações do Turno
            </label>
            <input
              type="text"
              placeholder="Ex: Trânsito intenso no centro; bom volume de viagens de aeroporto."
              value={notes}
              onChange={e => setNotes(e.target.value)}
              className="w-full bg-slate-50 border border-slate-300 rounded-md px-3 py-2 text-xs text-slate-900 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
            />
          </div>

          <div className="flex justify-end pt-2">
            <button
              type="submit"
              className="px-6 py-2.5 rounded-md bg-blue-600 hover:bg-blue-700 text-white font-medium text-xs shadow-sm transition"
            >
              Submeter Registo do Turno
            </button>
          </div>
        </form>
      </div>

      {/* Driver Personal Shift History */}
      <div className="bg-white border border-slate-200 rounded-md p-6 shadow-sm">
        <h2 className="text-base font-bold text-slate-900 mb-1">
          O Meu Histórico de Turnos ({selectedMonth})
        </h2>
        <p className="text-xs text-slate-500 mb-4">
          Resumo das suas submissões verificadas pela gestão
        </p>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 text-slate-500 font-medium border-b border-slate-200">
              <tr>
                <th className="p-3">Data</th>
                <th className="p-3">Viatura</th>
                <th className="p-3 text-center">Viagens</th>
                <th className="p-3 text-center">Km</th>
                <th className="p-3 text-center">Horas</th>
                <th className="p-3 text-right">Ganho (€)</th>
                <th className="p-3 text-right">Custo Carga (€)</th>
                <th className="p-3 text-center">Estado</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {driverShifts.length === 0 ? (
                <tr>
                  <td colSpan={8} className="p-6 text-center text-slate-500">
                    Ainda não registou turnos para o mês selecionado.
                  </td>
                </tr>
              ) : (
                driverShifts.map(log => (
                  <tr key={log.id} className="hover:bg-slate-50 transition">
                    <td className="p-3 text-slate-600 font-medium">{log.date}</td>
                    <td className="p-3 font-mono font-bold text-slate-800">{log.vehiclePlate}</td>
                    <td className="p-3 text-center text-slate-700">{log.tripsCount}</td>
                    <td className="p-3 text-center text-slate-700">{log.kilometers} km</td>
                    <td className="p-3 text-center text-slate-700">{log.hoursWorked}h</td>
                    <td className="p-3 text-right font-bold text-slate-900">
                      {log.grossEarnings.toLocaleString('pt-PT', { style: 'currency', currency: 'EUR' })}
                    </td>
                    <td className="p-3 text-right text-red-600 font-medium">
                      {log.fuelExpenseAmount ? `${log.fuelExpenseAmount.toFixed(2)} €` : '-'}
                    </td>
                    <td className="p-3 text-center">
                      <span
                        className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                          log.status === 'verified'
                            ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                            : log.status === 'paid'
                            ? 'bg-blue-50 text-blue-700 border border-blue-200'
                            : 'bg-amber-50 text-amber-700 border border-amber-200'
                        }`}
                      >
                        {log.status === 'verified' ? 'Verificado' : log.status === 'paid' ? 'Pago' : 'Pendente'}
                      </span>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
