import React, { useState } from 'react';
import { useTVDE } from '../context/TVDEContext';
import { DailyShiftLog } from '../types';
import { formatHoursToHHMM, parseHHMMToHours } from '../utils/formatters';
import {
  Receipt,
  Search,
  Download,
  CheckCircle2,
  Trash2,
  Plus,
  Layers,
  Filter,
  Edit3
} from 'lucide-react';

interface ShiftLogsViewProps {
  onOpenNewShiftModal: () => void;
  onEditShiftLog?: (log: DailyShiftLog) => void;
}

export const ShiftLogsView: React.FC<ShiftLogsViewProps> = ({ onOpenNewShiftModal, onEditShiftLog }) => {
  const {
    shiftLogs,
    drivers,
    vehicles,
    updateShiftLogStatus,
    deleteShiftLog,
    selectedMonth
  } = useTVDE();

  const [filterDriver, setFilterDriver] = useState<string>('all');
  const [filterVehicle, setFilterVehicle] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');

  // Filtering
  const filteredLogs = shiftLogs.filter(log => {
    const matchesMonth = selectedMonth === 'all' || log.date.startsWith(selectedMonth);
    const matchesDriver = filterDriver === 'all' || log.driverId === filterDriver;
    const matchesVehicle = filterVehicle === 'all' || log.vehicleId === filterVehicle;
    const matchesSearch =
      log.driverName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      log.vehiclePlate.toLowerCase().includes(searchQuery.toLowerCase()) ||
      log.notes?.toLowerCase().includes(searchQuery.toLowerCase());

    return matchesMonth && matchesDriver && matchesVehicle && matchesSearch;
  });

  // Calculate Aggregates
  const totalGross = filteredLogs.reduce((acc, s) => acc + s.grossEarnings, 0);
  const totalTrips = filteredLogs.reduce((acc, s) => acc + s.tripsCount, 0);
  const totalKm = filteredLogs.reduce((acc, s) => acc + s.kilometers, 0);
  const totalHours = filteredLogs.reduce((acc, s) => acc + parseHHMMToHours(s.hoursWorked), 0);
  const totalUber = filteredLogs.reduce((acc, s) => acc + (s.uberEarnings || 0), 0);
  const totalBolt = filteredLogs.reduce((acc, s) => acc + (s.boltEarnings || 0), 0);

  // CSV Export Handler
  const handleExportCsv = () => {
    const headers = ['Data', 'Motorista', 'Viatura', 'Viagens', 'Km', 'Horas', 'Faturação Total (€)', 'Uber (€)', 'Bolt (€)', 'Estado', 'Notas'];
    const rows = filteredLogs.map(l => [
      l.date,
      `"${l.driverName}"`,
      l.vehiclePlate,
      l.tripsCount,
      l.kilometers,
      formatHoursToHHMM(l.hoursWorked),
      l.grossEarnings,
      l.uberEarnings || 0,
      l.boltEarnings || 0,
      l.status,
      `"${l.notes || ''}"`
    ]);

    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map(e => e.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `relatorio_faturacao_tvde_${selectedMonth}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="space-y-6">
      {/* Header & Actions */}
      <div className="bg-white border border-slate-200 rounded-md p-6 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center space-x-2">
            <Receipt className="w-5 h-5 text-blue-600" />
            <h1 className="text-xl font-bold text-slate-900">Registo de Faturação e Somatório Diário</h1>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            Gestão detalhada de faturas por motorista com contagem de viagens, km percorridos e valor ganho em plataformas.
          </p>
        </div>

        <div className="flex items-center space-x-3">
          <button
            onClick={handleExportCsv}
            className="px-3.5 py-2 rounded-md bg-slate-100 hover:bg-slate-200 text-slate-800 border border-slate-200 text-xs font-medium transition flex items-center space-x-2 shadow-sm"
          >
            <Download className="w-4 h-4 text-blue-600" />
            <span>Exportar CSV</span>
          </button>

          <button
            onClick={onOpenNewShiftModal}
            className="px-4 py-2 rounded-md bg-blue-600 hover:bg-blue-700 text-white font-medium text-xs shadow-sm transition flex items-center space-x-1.5"
          >
            <Plus className="w-4 h-4" />
            <span>Novo Registo Diário</span>
          </button>
        </div>
      </div>

      {/* Aggregate Totals Summary Bar */}
      <div className="bg-white border border-slate-200 rounded-md p-5 shadow-sm grid grid-cols-2 md:grid-cols-5 gap-4">
        <div>
          <span className="text-[10px] text-slate-400 uppercase tracking-wider block font-bold">Total Faturado</span>
          <span className="text-xl font-bold text-blue-600">
            {totalGross.toLocaleString('pt-PT', { style: 'currency', currency: 'EUR' })}
          </span>
        </div>
        <div>
          <span className="text-[10px] text-slate-400 uppercase tracking-wider block font-bold">Viagens Totais</span>
          <span className="text-xl font-bold text-slate-900">{totalTrips}</span>
        </div>
        <div>
          <span className="text-[10px] text-slate-400 uppercase tracking-wider block font-bold">Quilómetros</span>
          <span className="text-xl font-bold text-slate-800">{totalKm.toLocaleString('pt-PT')} km</span>
        </div>
        <div>
          <span className="text-[10px] text-slate-400 uppercase tracking-wider block font-bold">Horas no Turno</span>
          <span className="text-xl font-bold text-slate-800">{formatHoursToHHMM(totalHours)}</span>
        </div>
        <div className="col-span-2 md:col-span-1">
          <span className="text-[10px] text-slate-400 uppercase tracking-wider block font-bold">Uber vs Bolt</span>
          <span className="text-xs font-bold text-slate-800">
            {totalUber.toFixed(0)}€ (Uber) / {totalBolt.toFixed(0)}€ (Bolt)
          </span>
        </div>
      </div>

      {/* Filters Bar */}
      <div className="bg-white border border-slate-200 rounded-md p-4 shadow-sm flex flex-col md:flex-row items-center justify-between gap-4">
        <div className="flex flex-wrap items-center gap-3 w-full md:w-auto">
          {/* Search */}
          <div className="relative w-full sm:w-60">
            <Search className="w-4 h-4 absolute left-3 top-2.5 text-slate-400" />
            <input
              type="text"
              placeholder="Pesquisar motorista, matrícula..."
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              className="w-full bg-slate-50 border border-slate-300 rounded-md pl-9 pr-3 py-2 text-xs text-slate-900 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
            />
          </div>

          {/* Filter Driver */}
          <div className="flex items-center space-x-1 bg-slate-50 border border-slate-300 rounded-md px-2.5 py-1.5 text-xs text-slate-700">
            <Filter className="w-3.5 h-3.5 text-slate-500" />
            <select
              value={filterDriver}
              onChange={e => setFilterDriver(e.target.value)}
              className="bg-transparent text-slate-800 font-medium focus:outline-none cursor-pointer"
            >
              <option value="all">Todos os Motoristas</option>
              {drivers.map(d => (
                <option key={d.id} value={d.id}>{d.name}</option>
              ))}
            </select>
          </div>

          {/* Filter Vehicle */}
          <div className="flex items-center space-x-1 bg-slate-50 border border-slate-300 rounded-md px-2.5 py-1.5 text-xs text-slate-700">
            <Layers className="w-3.5 h-3.5 text-slate-500" />
            <select
              value={filterVehicle}
              onChange={e => setFilterVehicle(e.target.value)}
              className="bg-transparent text-slate-800 font-medium focus:outline-none cursor-pointer"
            >
              <option value="all">Todas as Viaturas</option>
              {vehicles.map(v => (
                <option key={v.id} value={v.id}>
                  {v.brand} {v.model} ({v.licensePlate})
                </option>
              ))}
            </select>
          </div>
        </div>

        <span className="text-xs text-slate-500 flex-shrink-0">
          A mostrar <strong className="text-slate-900">{filteredLogs.length}</strong> registos
        </span>
      </div>

      {/* Main Table */}
      <div className="bg-white border border-slate-200 rounded-md shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 text-slate-500 font-medium border-b border-slate-200">
              <tr>
                <th className="p-3.5">Data</th>
                <th className="p-3.5">Motorista</th>
                <th className="p-3.5">Viatura</th>
                <th className="p-3.5 text-center">Nº Viagens</th>
                <th className="p-3.5 text-center">Quilómetros</th>
                <th className="p-3.5 text-center">Horas</th>
                <th className="p-3.5 text-right">Ganho Total (€)</th>
                <th className="p-3.5 text-right">Repartição (Uber / Bolt)</th>
                <th className="p-3.5 text-center">Estado</th>
                <th className="p-3.5 text-right">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredLogs.length === 0 ? (
                <tr>
                  <td colSpan={10} className="p-8 text-center text-slate-500">
                    Nenhum registo diário encontrado para os filtros selecionados.
                  </td>
                </tr>
              ) : (
                filteredLogs.map(log => (
                  <tr key={log.id} className="hover:bg-slate-50 transition">
                    <td className="p-3.5 font-medium text-slate-600 whitespace-nowrap">{log.date}</td>
                    <td className="p-3.5 font-bold text-slate-900 whitespace-nowrap">{log.driverName}</td>
                    <td className="p-3.5 font-mono font-bold text-slate-800 whitespace-nowrap">{log.vehiclePlate}</td>
                    <td className="p-3.5 text-center font-semibold text-slate-700">{log.tripsCount}</td>
                    <td className="p-3.5 text-center text-slate-700">{log.kilometers} km</td>
                    <td className="p-3.5 text-center text-slate-700 font-mono">{formatHoursToHHMM(log.hoursWorked)}</td>
                    <td className="p-3.5 text-right font-bold text-slate-900">
                      {log.grossEarnings.toLocaleString('pt-PT', { style: 'currency', currency: 'EUR' })}
                    </td>
                    <td className="p-3.5 text-right text-slate-500 text-[11px]">
                      <span className="text-emerald-600 font-semibold">{log.uberEarnings || 0}€ U</span> /{' '}
                      <span className="text-blue-600 font-semibold">{log.boltEarnings || 0}€ B</span>
                    </td>
                    <td className="p-3.5 text-center">
                      <select
                        value={log.status}
                        onChange={e => updateShiftLogStatus(log.id, e.target.value as any)}
                        className={`text-[10px] font-bold px-2 py-1 rounded bg-slate-50 border cursor-pointer ${
                          log.status === 'verified'
                            ? 'text-emerald-700 border-emerald-300'
                            : log.status === 'paid'
                            ? 'text-blue-700 border-blue-300'
                            : 'text-amber-700 border-amber-300'
                        }`}
                      >
                        <option value="submitted">Pendente</option>
                        <option value="verified">Verificado</option>
                        <option value="paid">Pago</option>
                      </select>
                    </td>
                    <td className="p-3.5 text-right flex items-center justify-end space-x-1">
                      <button
                        onClick={() => onEditShiftLog?.(log)}
                        className="p-1.5 rounded text-slate-400 hover:text-blue-600 hover:bg-blue-50 transition"
                        title="Editar Registo"
                      >
                        <Edit3 className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => {
                          if (confirm('Eliminar este registo de faturação?')) {
                            deleteShiftLog(log.id);
                          }
                        }}
                        className="p-1.5 rounded text-slate-400 hover:text-red-600 hover:bg-red-50 transition"
                        title="Eliminar"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
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
