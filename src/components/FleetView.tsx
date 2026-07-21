import React from 'react';
import { useTVDE } from '../context/TVDEContext';
import {
  Car,
  Wrench,
  ShieldAlert,
  Calendar,
  AlertTriangle,
  Plus,
  Zap,
  CheckCircle2,
  DollarSign
} from 'lucide-react';

interface FleetViewProps {
  onOpenNewVehicleModal: () => void;
  onEditVehicle: (vehicleId: string) => void;
}

export const FleetView: React.FC<FleetViewProps> = ({
  onOpenNewVehicleModal,
  onEditVehicle
}) => {
  const { vehicles } = useTVDE();

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-white border border-slate-200 rounded-md p-6 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center space-x-2">
            <Car className="w-5 h-5 text-blue-600" />
            <h1 className="text-xl font-bold text-slate-900">Gestão da Frota de Viaturas TVDE</h1>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            Controlo de quilometragem, alertas de revisão preventiva, inspeções periódicas (IPO), seguros e valor da renda semanal.
          </p>
        </div>

        <button
          onClick={onOpenNewVehicleModal}
          className="px-4 py-2 rounded-md bg-blue-600 hover:bg-blue-700 text-white font-medium text-xs shadow-sm transition flex items-center space-x-1.5"
        >
          <Plus className="w-4 h-4" />
          <span>Adicionar Nova Viatura</span>
        </button>
      </div>

      {/* Fleet Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {vehicles.map(v => {
          const kmToService = v.nextMaintenanceKm - v.currentKm;
          const isMaintenanceUrgent = kmToService <= 1000;

          // Days to IPO check
          const ipoDate = new Date(v.ipoExpiry);
          const today = new Date();
          const daysToIpo = Math.ceil((ipoDate.getTime() - today.getTime()) / (1000 * 3600 * 24));
          const isIpoUrgent = daysToIpo <= 30;

          return (
            <div
              key={v.id}
              className={`bg-white border rounded-md p-5 shadow-sm flex flex-col justify-between transition hover:border-blue-400 ${
                v.status === 'maintenance'
                  ? 'border-amber-300 bg-amber-50/50'
                  : isMaintenanceUrgent || isIpoUrgent
                  ? 'border-red-300 bg-red-50/20'
                  : 'border-slate-200'
              }`}
            >
              <div>
                {/* Top Matrícula & Status */}
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center space-x-2">
                    <span className="px-2.5 py-1 bg-slate-100 border border-slate-300 rounded font-mono font-bold text-xs text-slate-900 tracking-wider shadow-inner">
                      {v.licensePlate}
                    </span>
                    {v.fuelType === 'ev' && (
                      <span className="px-2 py-0.5 bg-emerald-50 text-emerald-700 border border-emerald-200 text-[10px] font-bold rounded flex items-center space-x-1">
                        <Zap className="w-3 h-3" />
                        <span>100% Elétrico</span>
                      </span>
                    )}
                  </div>

                  <span
                    className={`px-2.5 py-0.5 rounded text-[10px] font-bold ${
                      v.status === 'active'
                        ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                        : v.status === 'maintenance'
                        ? 'bg-amber-50 text-amber-700 border border-amber-200'
                        : 'bg-slate-100 text-slate-600 border border-slate-200'
                    }`}
                  >
                    {v.status === 'active' ? 'Ativo na Estrada' : v.status === 'maintenance' ? 'Em Oficina' : 'Inativo'}
                  </span>
                </div>

                {/* Car Title */}
                <h2 className="text-lg font-bold text-slate-900">
                  {v.brand} {v.model}
                </h2>
                <p className="text-xs text-slate-500 mt-0.5">Ano: {v.year}</p>

                {/* Driver & Rental Fee */}
                <div className="mt-4 pt-3 border-t border-slate-100 grid grid-cols-2 gap-2 text-xs">
                  <div>
                    <span className="text-[10px] text-slate-400 uppercase font-bold block">Motorista</span>
                    <span className="text-slate-800 font-bold truncate block">
                      {v.assignedDriverName || 'Sem motorista'}
                    </span>
                  </div>
                  <div>
                    <span className="text-[10px] text-slate-400 uppercase font-bold block">Renda Semanal</span>
                    <span className="text-blue-600 font-bold block">
                      {v.rentalFeePerWeek ? `${v.rentalFeePerWeek.toFixed(0)} € / sem` : 'Não aplicável'}
                    </span>
                  </div>
                </div>

                {/* Kilometers Progress to Maintenance */}
                <div className="mt-4 bg-slate-50 rounded-md p-3 border border-slate-200">
                  <div className="flex items-center justify-between text-xs mb-1">
                    <span className="text-slate-600 font-medium flex items-center space-x-1">
                      <Wrench className="w-3.5 h-3.5 text-amber-600" />
                      <span>Próxima Revisão</span>
                    </span>
                    <span className={`font-bold ${isMaintenanceUrgent ? 'text-red-600' : 'text-slate-800'}`}>
                      {v.currentKm.toLocaleString('pt-PT')} / {v.nextMaintenanceKm.toLocaleString('pt-PT')} km
                    </span>
                  </div>

                  {/* Progress Bar */}
                  <div className="w-full bg-slate-200 h-2 rounded-full overflow-hidden mt-1.5">
                    <div
                      className={`h-full rounded-full transition-all ${
                        isMaintenanceUrgent ? 'bg-red-600' : 'bg-blue-600'
                      }`}
                      style={{
                        width: `${Math.min(
                          100,
                          (v.currentKm / v.nextMaintenanceKm) * 100
                        )}%`
                      }}
                    />
                  </div>

                  <p className="text-[10px] text-slate-500 mt-1.5 text-right">
                    {kmToService > 0 ? `Faltam ${kmToService} km` : 'Revisão ultrapassada!'}
                  </p>
                </div>

                {/* Document Expiry Dates */}
                <div className="mt-3 space-y-1.5 text-xs text-slate-700">
                  <div className="flex items-center justify-between">
                    <span className="text-slate-500">Inspeção IPO:</span>
                    <span className={`font-mono font-medium ${isIpoUrgent ? 'text-red-600 font-bold' : 'text-slate-800'}`}>
                      {v.ipoExpiry} {isIpoUrgent && '⚠️'}
                    </span>
                  </div>

                  <div className="flex items-center justify-between">
                    <span className="text-slate-500">Seguro TVDE ({v.insuranceCompany}):</span>
                    <span className="font-mono text-slate-800">{v.insuranceExpiry}</span>
                  </div>
                </div>
              </div>

              {/* Edit button footer */}
              <div className="mt-5 pt-3 border-t border-slate-100 flex items-center justify-end">
                <button
                  onClick={() => onEditVehicle(v.id)}
                  className="px-3 py-1.5 rounded-md bg-slate-100 hover:bg-slate-200 text-slate-800 border border-slate-200 text-xs font-medium transition shadow-sm"
                >
                  Editar Viatura
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
