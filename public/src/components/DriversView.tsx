import React from 'react';
import { useTVDE } from '../context/TVDEContext';
import {
  Users,
  UserCheck,
  Plus,
  Mail,
  Phone,
  Car,
  AlertTriangle,
  Award,
  CreditCard,
  Trash2
} from 'lucide-react';

interface DriversViewProps {
  onOpenNewDriverModal: () => void;
  onEditDriver: (driverId: string) => void;
}

export const DriversView: React.FC<DriversViewProps> = ({
  onOpenNewDriverModal,
  onEditDriver
}) => {
  const { drivers, vehicles, driverPerformanceList, deleteDriver } = useTVDE();

  const handleDeleteDriver = (driverId: string, driverName: string) => {
    if (window.confirm(`Tem a certeza que deseja eliminar o motorista "${driverName}"? Esta ação não pode ser desfeita.`)) {
      deleteDriver(driverId);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-white border border-slate-200 rounded-md p-6 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center space-x-2">
            <Users className="w-5 h-5 text-blue-600" />
            <h1 className="text-xl font-bold text-slate-900">Gestão de Motoristas TVDE</h1>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            Cadastro de colaboradores, validação de certificados IMT/TVDE, viaturas atribuídas e comissões.
          </p>
        </div>

        <button
          onClick={onOpenNewDriverModal}
          className="px-4 py-2 rounded-md bg-blue-600 hover:bg-blue-700 text-white font-medium text-xs shadow-sm transition flex items-center space-x-1.5"
        >
          <Plus className="w-4 h-4" />
          <span>Novo Motorista</span>
        </button>
      </div>

      {/* Driver Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {drivers.map(driver => {
          const vehicle = vehicles.find(v => v.id === driver.assignedVehicleId);
          const perf = driverPerformanceList.find(p => p.driver.id === driver.id);

          // Check license expiry
          const expDate = new Date(driver.tvdeLicenseExpiry);
          const today = new Date();
          const daysToExpiry = Math.ceil((expDate.getTime() - today.getTime()) / (1000 * 3600 * 24));
          const isLicenseExpiring = daysToExpiry <= 60;

          return (
            <div
              key={driver.id}
              className={`bg-white border rounded-md p-5 shadow-sm flex flex-col justify-between transition hover:border-blue-400 ${
                isLicenseExpiring ? 'border-amber-300 bg-amber-50/20' : 'border-slate-200'
              }`}
            >
              <div>
                {/* Header */}
                <div className="flex items-start justify-between">
                  <div className="flex items-center space-x-3">
                    <div className="w-12 h-12 rounded-sm bg-blue-600 text-white font-bold text-base flex items-center justify-center shadow-sm">
                      {driver.name.split(' ').map(n => n[0]).join('')}
                    </div>
                    <div>
                      <h2 className="text-base font-bold text-slate-900">{driver.name}</h2>
                      <span className="text-[11px] text-slate-500 block">
                        Desde {driver.startDate}
                      </span>
                    </div>
                  </div>

                  <span
                    className={`px-2.5 py-0.5 rounded text-[10px] font-bold ${
                      driver.status === 'active'
                        ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                        : 'bg-amber-50 text-amber-700 border border-amber-200'
                    }`}
                  >
                    {driver.status === 'active' ? 'Ativo' : 'Em Licença'}
                  </span>
                </div>

                {/* Contact & License Info */}
                <div className="mt-4 space-y-2 text-xs">
                  <div className="flex items-center space-x-2 text-slate-600">
                    <Mail className="w-3.5 h-3.5 text-slate-400" />
                    <span className="truncate">{driver.email}</span>
                  </div>
                  <div className="flex items-center space-x-2 text-slate-600">
                    <Phone className="w-3.5 h-3.5 text-slate-400" />
                    <span>{driver.phone}</span>
                  </div>

                  <div className="p-3 bg-slate-50 rounded-md border border-slate-200 mt-3 space-y-1">
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] text-slate-400 font-bold uppercase">Nº Licença TVDE</span>
                      <span className="font-mono text-blue-600 font-bold">{driver.tvdeLicenseNumber}</span>
                    </div>
                    <div className="flex items-center justify-between text-[11px]">
                      <span className="text-slate-500">Validade IMT:</span>
                      <span className={`font-mono ${isLicenseExpiring ? 'text-amber-700 font-bold' : 'text-slate-800'}`}>
                        {driver.tvdeLicenseExpiry} {isLicenseExpiring && '⚠️'}
                      </span>
                    </div>
                  </div>

                  {/* Assigned Vehicle */}
                  <div className="flex items-center justify-between p-2.5 bg-slate-50 rounded-md border border-slate-200">
                    <div className="flex items-center space-x-2">
                      <Car className="w-4 h-4 text-slate-500" />
                      <span className="text-slate-500">Viatura:</span>
                    </div>
                    <span className="text-slate-900 font-bold">
                      {vehicle ? `${vehicle.brand} (${vehicle.licensePlate})` : 'Sem viatura'}
                    </span>
                  </div>

                  {/* Financial Stats preview */}
                  <div className="grid grid-cols-2 gap-2 pt-2 text-xs">
                    <div>
                      <span className="text-[10px] text-slate-400 uppercase block font-bold">Faturação Mês</span>
                      <span className="text-blue-600 font-bold text-sm block">
                        {perf?.totalEarnings.toLocaleString('pt-PT', { style: 'currency', currency: 'EUR' }) || '0,00 €'}
                      </span>
                    </div>
                    <div>
                      <span className="text-[10px] text-slate-400 uppercase block font-bold">Média p/ Hora</span>
                      <span className="text-slate-800 font-bold text-sm block">
                        {perf?.earningsPerHour ? `${perf.earningsPerHour.toFixed(2)} €/h` : '0,00 €/h'}
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Actions Footer */}
              <div className="mt-5 pt-3 border-t border-slate-100 flex items-center justify-between">
                <button
                  onClick={() => handleDeleteDriver(driver.id, driver.name)}
                  className="px-2.5 py-1.5 rounded-md bg-red-50 hover:bg-red-100 text-red-700 border border-red-200 text-xs font-medium transition shadow-sm flex items-center space-x-1"
                  title="Eliminar Motorista"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  <span>Eliminar</span>
                </button>
                <button
                  onClick={() => onEditDriver(driver.id)}
                  className="px-3 py-1.5 rounded-md bg-slate-100 hover:bg-slate-200 text-slate-800 border border-slate-200 text-xs font-medium transition shadow-sm"
                >
                  Editar Motorista
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
