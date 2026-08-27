// src/components/modals/ShiftModal.tsx
import React, { useState, useEffect, useRef } from 'react';
import { useTVDE } from '../../contexts/TVDEContext';
import { DailyShiftLog } from '../../types';
import { X, Receipt, Edit3, Zap, AlertTriangle, Lock } from 'lucide-react';
import { formatHoursToHHMM, parseHHMMToHours } from '../../utils/formatters';
import { getChargesInfoForDate } from '../../utils/chargesSync';

interface ShiftModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialData?: DailyShiftLog | null;
}

export const ShiftModal: React.FC<ShiftModalProps> = ({ isOpen, onClose, initialData }) => {
  const { drivers, vehicles, addShiftLog, updateShiftLog } = useTVDE();

  const [driverId, setDriverId] = useState<string>('');
  const [vehicleId, setVehicleId] = useState<string>('');
  const [date, setDate] = useState<string>(new Date().toISOString().split('T')[0]);
  const [tripsCount, setTripsCount] = useState<string>('');
  const [kilometers, setKilometers] = useState<string>('');
  const [hoursWorked, setHoursWorked] = useState<string>('');
  const [grossEarnings, setGrossEarnings] = useState<string>('');
  const [uberEarnings, setUberEarnings] = useState<string>('');
  const [boltEarnings, setBoltEarnings] = useState<string>('');
  const [fuelExpense, setFuelExpense] = useState<string>('');
  const [rentalExpense, setRentalExpense] = useState<string>('');
  const [notes, setNotes] = useState<string>('');

  // Estado para controlo de charges
  const [fuelReadOnly, setFuelReadOnly] = useState(false);
  const [noChargesWarning, setNoChargesWarning] = useState(false);

  // ═══ V.2.9.1 FIX: ref para guardar o totalNet confirmado das charges ═══
  // Permite ao handleSubmit aceder ao valor correto mesmo que o state
  // do input ainda não tenha sido atualizado (race condition de render)
  const chargesTotalRef = useRef<number | null>(null);
  const chargesCheckCompleteRef = useRef<boolean>(false);

  // useEffect 1 — Inicialização dos campos quando o modal abre
  useEffect(() => {
    if (isOpen) {
      if (initialData) {
        setDriverId(initialData.driverId || drivers[0]?.id || '');
        setVehicleId(initialData.vehicleId || vehicles[0]?.id || '');
        setDate(initialData.date || new Date().toISOString().split('T')[0]);
        setTripsCount(initialData.tripsCount?.toString() || '0');
        setKilometers(initialData.kilometers?.toString() || '0');
        setHoursWorked(initialData.hoursWorked ? formatHoursToHHMM(initialData.hoursWorked) : '00:00');
        setGrossEarnings(initialData.grossEarnings?.toString() || '0');
        setUberEarnings(initialData.uberEarnings?.toString() || '0');
        setBoltEarnings(initialData.boltEarnings?.toString() || '0');
        setFuelExpense(initialData.fuelExpenseAmount?.toString() || '0');
        setRentalExpense(initialData.rentalExpenseAmount?.toString() || '');
        setNotes(initialData.notes || '');
      } else {
        setDriverId(drivers[0]?.id || '');
        setVehicleId(vehicles[0]?.id || '');
        setDate(new Date().toISOString().split('T')[0]);
        setTripsCount('');
        setKilometers('');
        setHoursWorked('');
        setGrossEarnings('');
        setUberEarnings('');
        setBoltEarnings('');
        setFuelExpense('');
        setRentalExpense('');
        setNotes('');
      }
      // Reset estados de charges (serão atualizados pelo useEffect 2)
      setFuelReadOnly(false);
      setNoChargesWarning(false);
      chargesTotalRef.current = null;
      chargesCheckCompleteRef.current = false;
    }
  }, [isOpen, initialData, drivers, vehicles]);

  // useEffect 2 — Verificar charges e atualizar valor + lock
  useEffect(() => {
    if (!isOpen || !date) return;

    let cancelled = false;

    const checkCharges = async () => {
      try {
        const { hasCharges, totalNet } = await getChargesInfoForDate(date);
        if (cancelled) return;

        setFuelReadOnly(hasCharges);

        if (hasCharges) {
          setFuelExpense(totalNet.toFixed(2));
          // ═══ V.2.9.1: guardar na ref para o handleSubmit ═══
          chargesTotalRef.current = totalNet;
        } else {
          chargesTotalRef.current = null;
        }

        chargesCheckCompleteRef.current = true;

        // Aviso: turno tem custo energia manual mas sem charges no módulo
        if (initialData && !hasCharges && (initialData.fuelExpenseAmount || 0) > 0) {
          setNoChargesWarning(true);
        } else {
          setNoChargesWarning(false);
        }
      } catch {
        if (!cancelled) {
          setFuelReadOnly(false);
          setNoChargesWarning(false);
          chargesTotalRef.current = null;
          chargesCheckCompleteRef.current = true;
        }
      }
    };

    checkCharges();
    return () => { cancelled = true; };
  }, [isOpen, date, initialData]);

  // Fechar com Escape
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) onClose();
    };
    if (isOpen) window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    const selectedDriver = drivers.find(d => d.id === driverId) || drivers[0];
    const selectedVehicle = vehicles.find(v => v.id === vehicleId) || vehicles[0];

    const grossNum = parseFloat(grossEarnings) || 0;
    const uberNum = uberEarnings !== '' ? parseFloat(uberEarnings) || 0 : grossNum;
    const boltNum = parseFloat(boltEarnings) || 0;

    // ═══════════════════════════════════════════════════════════════
    // V.2.9.1 FIX: Determinar fuelExpenseAmount de forma segura
    // 
    // Prioridade:
    // 1. Se a ref tem valor (charges confirmadas) → usar esse valor
    //    (mesmo que fuelReadOnly ainda não tenha renderizado)
    // 2. Se fuelReadOnly está true → usar o campo (já atualizado)
    // 3. Fallback → valor do campo (edição manual, sem charges)
    // ═══════════════════════════════════════════════════════════════
    let finalFuelAmount: number;
    if (chargesTotalRef.current !== null) {
      // Fonte de verdade: valor confirmado da query ao Firestore
      finalFuelAmount = chargesTotalRef.current;
    } else {
      // Sem charges → valor manual introduzido pelo utilizador
      finalFuelAmount = parseFloat(fuelExpense) || 0;
    }

    const payload = {
      driverId: selectedDriver?.id || 'drv-1',
      driverName: selectedDriver?.name || 'Alexandre Rebelo',
      vehicleId: selectedVehicle?.id || 'veh-1',
      vehiclePlate: selectedVehicle?.licensePlate || 'CE-84-UO',
      date,
      tripsCount: parseInt(tripsCount, 10) || 0,
      kilometers: parseFloat(kilometers) || 0,
      grossEarnings: grossNum,
      uberEarnings: uberNum,
      boltEarnings: boltNum,
      otherEarnings: 0,
      hoursWorked: parseHHMMToHours(hoursWorked),
      fuelExpenseAmount: finalFuelAmount,
      rentalExpenseAmount: parseFloat(rentalExpense) || 0,
      notes
    };

    if (initialData) {
      updateShiftLog(initialData.id, payload);
    } else {
      addShiftLog(payload);
    }

    onClose();
  };

  return (
    <div
      onClick={onClose}
      className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center p-4"
    >
      <div
        onClick={e => e.stopPropagation()}
        className="bg-white border border-slate-200 rounded-md w-full max-w-lg p-6 shadow-xl relative overflow-hidden max-h-[90vh] overflow-y-auto"
      >
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-slate-200">
          <div className="flex items-center space-x-2">
            {initialData ? (
              <Edit3 className="w-5 h-5 text-blue-600" />
            ) : (
              <Receipt className="w-5 h-5 text-blue-600" />
            )}
            <h2 className="text-base font-bold text-slate-900">
              {initialData ? 'Editar Registo Diário de Faturação' : 'Novo Registo Diário de Turno'}
            </h2>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600 transition">
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4 mt-4 text-xs">
          {/* Campos principais */}
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
              <label className="block text-slate-700 font-medium mb-1">Horas Trabalhadas (hh:mm) *</label>
              <input
                type="text"
                placeholder="Ex: 08:30"
                value={hoursWorked}
                onChange={e => setHoursWorked(e.target.value)}
                className="w-full bg-white border border-slate-300 rounded-md p-2.5 text-slate-900 font-mono focus:outline-none focus:border-blue-600"
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

          {/* Custos: Carregamento + Renda */}
          <div className="grid grid-cols-2 gap-3">
            {/* Campo Carregamento com lógica read-only */}
            <div>
              <label className={`flex items-center space-x-1 font-medium mb-1 ${
                fuelReadOnly ? 'text-emerald-700' : 'text-slate-700'
              }`}>
                {fuelReadOnly && <Lock className="w-3 h-3" />}
                <span>Custo Carregamento (€)</span>
                {fuelReadOnly && (
                  <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[9px] bg-emerald-100 text-emerald-700 font-bold ml-1">
                    <Zap className="w-2.5 h-2.5 mr-0.5" />
                    via Carregamentos
                  </span>
                )}
              </label>
              <input
                type="number"
                step="0.01"
                placeholder="Ex: 16.50"
                value={fuelExpense}
                onChange={e => !fuelReadOnly && setFuelExpense(e.target.value)}
                readOnly={fuelReadOnly}
                tabIndex={fuelReadOnly ? -1 : undefined}
                className={`w-full border rounded-md p-2.5 text-slate-900 focus:outline-none ${
                  fuelReadOnly
                    ? 'bg-emerald-50 border-emerald-300 cursor-not-allowed opacity-80'
                    : 'bg-white border-slate-300 focus:border-blue-600'
                }`}
              />
              {fuelReadOnly && (
                <p className="text-[10px] text-emerald-600 mt-0.5 flex items-center">
                  <Zap className="w-2.5 h-2.5 mr-0.5" />
                  Valor sincronizado do módulo Carregamentos.
                </p>
              )}
            </div>

            <div>
              <label className="block text-purple-700 font-bold mb-1">Valor da Renda da Viatura (€)</label>
              <input
                type="number"
                step="0.01"
                placeholder="Ex: 50.00"
                value={rentalExpense}
                onChange={e => setRentalExpense(e.target.value)}
                className="w-full bg-white border border-purple-300 rounded-md p-2.5 text-slate-900 focus:outline-none focus:border-purple-600 font-semibold"
              />
            </div>
          </div>

          {/* Alerta: dia com custo energia manual, sem charges */}
          {noChargesWarning && (
            <div className="bg-amber-50 border border-amber-300 rounded-md p-2.5 text-[11px] text-amber-800 flex items-start space-x-2">
              <AlertTriangle className="w-4 h-4 text-amber-500 flex-shrink-0 mt-0.5" />
              <div>
                <strong>Atenção:</strong> Este turno tem custo de carregamento ({fuelExpense}€)
                mas não existem registos no módulo <strong>Carregamentos</strong> para {date}.
                Considere registar os carregamentos para controlo mais detalhado.
              </div>
            </div>
          )}

          {/* Info sync automática */}
          <div className="bg-blue-50/80 border border-blue-200 rounded-md p-2.5 text-[11px] text-blue-800 flex items-start space-x-2">
            <span className="font-bold text-blue-600 flex-shrink-0">💡</span>
            <span>
              Ao preencher o Combustível e/ou Renda da Viatura no turno, o sistema cria
              e atualiza automaticamente os registos no módulo <strong>Custos e Rendas</strong>,
              sem necessidade de introdução duplicada!
            </span>
          </div>

          {/* Observações */}
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

          {/* Botões */}
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