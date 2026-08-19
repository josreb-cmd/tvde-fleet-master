import React, { useState, useEffect } from 'react';
import { useTVDE } from '../../contexts/TVDEContext';
import { DriverStatus } from '../../types';
import { X, Users, Trash2 } from 'lucide-react';

interface DriverModalProps {
  isOpen: boolean;
  onClose: () => void;
  driverIdToEdit?: string | null;
}

export const DriverModal: React.FC<DriverModalProps> = ({
  isOpen,
  onClose,
  driverIdToEdit
}) => {
  const { drivers, vehicles, addDriver, updateDriver, deleteDriver } = useTVDE();

  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [tvdeLicenseNumber, setTvdeLicenseNumber] = useState('');
  const [tvdeLicenseExpiry, setTvdeLicenseExpiry] = useState('2027-12-31');
  const [commissionRate, setCommissionRate] = useState('60');
  const [assignedVehicleId, setAssignedVehicleId] = useState('');
  const [status, setStatus] = useState<DriverStatus>('active');
  const [iban, setIban] = useState('');

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };
    if (isOpen) {
      window.addEventListener('keydown', handleKeyDown);
    }
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  useEffect(() => {
    if (driverIdToEdit) {
      const d = drivers.find(item => item.id === driverIdToEdit);
      if (d) {
        setName(d.name);
        setEmail(d.email);
        setPhone(d.phone);
        setTvdeLicenseNumber(d.tvdeLicenseNumber);
        setTvdeLicenseExpiry(d.tvdeLicenseExpiry);
        setCommissionRate(d.commissionRate.toString());
        setAssignedVehicleId(d.assignedVehicleId || '');
        setStatus(d.status);
        setIban(d.iban || '');
      }
    } else {
      setName('');
      setEmail('');
      setPhone('');
      setTvdeLicenseNumber('');
      setTvdeLicenseExpiry('2027-12-31');
      setCommissionRate('60');
      setAssignedVehicleId('');
      setStatus('active');
      setIban('');
    }
  }, [driverIdToEdit, drivers]);

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    const payload = {
      name: name || 'Novo Motorista',
      email: email || 'motorista@tvde.pt',
      phone: phone || '+351 900 000 000',
      tvdeLicenseNumber: tvdeLicenseNumber || 'TVDE-000000-PT',
      tvdeLicenseExpiry,
      status,
      assignedVehicleId: assignedVehicleId || undefined,
      commissionRate: parseFloat(commissionRate) || 60,
      startDate: new Date().toISOString().split('T')[0],
      iban
    };

    if (driverIdToEdit) {
      updateDriver(driverIdToEdit, payload);
    } else {
      addDriver(payload);
    }

    onClose();
  };

  const handleDelete = () => {
    if (driverIdToEdit) {
      if (window.confirm(`Tem a certeza que deseja eliminar o motorista "${name}"?`)) {
        deleteDriver(driverIdToEdit);
        onClose();
      }
    }
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
        <div className="flex items-center justify-between pb-4 border-b border-slate-200">
          <div className="flex items-center space-x-2">
            <Users className="w-5 h-5 text-blue-600" />
            <h2 className="text-base font-bold text-slate-900">
              {driverIdToEdit ? 'Editar Motorista' : 'Novo Motorista TVDE'}
            </h2>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600 transition">
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4 mt-4 text-xs">
          <div className="grid grid-cols-2 gap-3">
            <div className="col-span-2">
              <label className="block text-slate-700 font-medium mb-1">Nome Completo *</label>
              <input
                type="text"
                placeholder="Ex: João Pedro Silva"
                value={name}
                onChange={e => setName(e.target.value)}
                className="w-full bg-white border border-slate-300 rounded-md p-2.5 text-slate-900 focus:outline-none focus:border-blue-600"
                required
              />
            </div>

            <div>
              <label className="block text-slate-700 font-medium mb-1">Email *</label>
              <input
                type="email"
                placeholder="joao@tvde.pt"
                value={email}
                onChange={e => setEmail(e.target.value)}
                className="w-full bg-white border border-slate-300 rounded-md p-2.5 text-slate-900 focus:outline-none focus:border-blue-600"
                required
              />
            </div>

            <div>
              <label className="block text-slate-700 font-medium mb-1">Telefone *</label>
              <input
                type="text"
                placeholder="+351 912 345 678"
                value={phone}
                onChange={e => setPhone(e.target.value)}
                className="w-full bg-white border border-slate-300 rounded-md p-2.5 text-slate-900 focus:outline-none focus:border-blue-600"
                required
              />
            </div>

            <div>
              <label className="block text-slate-700 font-medium mb-1">Nº Licença TVDE / IMT *</label>
              <input
                type="text"
                placeholder="Ex: TVDE-883492-PT"
                value={tvdeLicenseNumber}
                onChange={e => setTvdeLicenseNumber(e.target.value)}
                className="w-full bg-white border border-slate-300 rounded-md p-2.5 text-slate-900 font-mono font-bold focus:outline-none focus:border-blue-600"
                required
              />
            </div>

            <div>
              <label className="block text-slate-700 font-medium mb-1">Validade Licença TVDE</label>
              <input
                type="date"
                value={tvdeLicenseExpiry}
                onChange={e => setTvdeLicenseExpiry(e.target.value)}
                className="w-full bg-white border border-slate-300 rounded-md p-2.5 text-slate-900 focus:outline-none focus:border-blue-600"
              />
            </div>

            <div>
              <label className="block text-slate-700 font-medium mb-1">Percentagem do Motorista (%)</label>
              <input
                type="number"
                placeholder="Ex: 60"
                value={commissionRate}
                onChange={e => setCommissionRate(e.target.value)}
                className="w-full bg-white border border-slate-300 rounded-md p-2.5 text-slate-900 focus:outline-none focus:border-blue-600"
              />
            </div>

            <div>
              <label className="block text-slate-700 font-medium mb-1">Viatura Atribuída</label>
              <select
                value={assignedVehicleId}
                onChange={e => setAssignedVehicleId(e.target.value)}
                className="w-full bg-white border border-slate-300 rounded-md p-2.5 text-slate-900 focus:outline-none focus:border-blue-600"
              >
                <option value="">Nenhuma / Sem viatura</option>
                {vehicles.map(v => (
                  <option key={v.id} value={v.id}>{v.brand} {v.model} ({v.licensePlate})</option>
                ))}
              </select>
            </div>

            <div className="col-span-2">
              <label className="block text-slate-700 font-medium mb-1">IBAN para Pagamentos</label>
              <input
                type="text"
                placeholder="PT50 0000 0000 0000 0000 0000 0"
                value={iban}
                onChange={e => setIban(e.target.value)}
                className="w-full bg-white border border-slate-300 rounded-md p-2.5 text-slate-900 font-mono focus:outline-none focus:border-blue-600"
              />
            </div>
          </div>

          <div className="flex items-center justify-between pt-3 border-t border-slate-200">
            {driverIdToEdit ? (
              <button
                type="button"
                onClick={handleDelete}
                className="px-3 py-2 rounded-md bg-red-50 hover:bg-red-100 text-red-700 border border-red-200 text-xs font-medium transition shadow-sm flex items-center space-x-1"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>Eliminar Motorista</span>
              </button>
            ) : <div />}
            <div className="flex space-x-2">
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
                Salvar Motorista
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
};
