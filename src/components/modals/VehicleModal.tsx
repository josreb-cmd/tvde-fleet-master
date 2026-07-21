import React, { useState, useEffect } from 'react';
import { useTVDE } from '../../context/TVDEContext';
import { FuelType, VehicleStatus } from '../../types';
import { X, Car } from 'lucide-react';

interface VehicleModalProps {
  isOpen: boolean;
  onClose: () => void;
  vehicleIdToEdit?: string | null;
}

export const VehicleModal: React.FC<VehicleModalProps> = ({
  isOpen,
  onClose,
  vehicleIdToEdit
}) => {
  const { vehicles, drivers, addVehicle, updateVehicle } = useTVDE();

  const [licensePlate, setLicensePlate] = useState('');
  const [brand, setBrand] = useState('');
  const [model, setModel] = useState('');
  const [year, setYear] = useState('2023');
  const [fuelType, setFuelType] = useState<FuelType>('ev');
  const [currentKm, setCurrentKm] = useState('75000');
  const [nextMaintenanceKm, setNextMaintenanceKm] = useState('85000');
  const [rentalFeePerWeek, setRentalFeePerWeek] = useState('200');
  const [insuranceCompany, setInsuranceCompany] = useState('Fidelidade TVDE');
  const [insuranceExpiry, setInsuranceExpiry] = useState('2027-01-01');
  const [ipoExpiry, setIpoExpiry] = useState('2027-06-01');
  const [status, setStatus] = useState<VehicleStatus>('active');
  const [assignedDriverId, setAssignedDriverId] = useState('');

  useEffect(() => {
    if (vehicleIdToEdit) {
      const v = vehicles.find(item => item.id === vehicleIdToEdit);
      if (v) {
        setLicensePlate(v.licensePlate);
        setBrand(v.brand);
        setModel(v.model);
        setYear(v.year.toString());
        setFuelType(v.fuelType);
        setCurrentKm(v.currentKm.toString());
        setNextMaintenanceKm(v.nextMaintenanceKm.toString());
        setRentalFeePerWeek(v.rentalFeePerWeek.toString());
        setInsuranceCompany(v.insuranceCompany);
        setInsuranceExpiry(v.insuranceExpiry);
        setIpoExpiry(v.ipoExpiry);
        setStatus(v.status);
        setAssignedDriverId(v.assignedDriverId || '');
      }
    } else {
      setLicensePlate('');
      setBrand('');
      setModel('');
      setYear('2023');
      setFuelType('ev');
      setCurrentKm('75000');
      setNextMaintenanceKm('85000');
      setRentalFeePerWeek('200');
      setInsuranceCompany('Fidelidade TVDE');
      setInsuranceExpiry('2027-01-01');
      setIpoExpiry('2027-06-01');
      setStatus('active');
      setAssignedDriverId('');
    }
  }, [vehicleIdToEdit, vehicles]);

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    const assignedDriver = drivers.find(d => d.id === assignedDriverId);

    const payload = {
      licensePlate: licensePlate || 'AA-00-XX',
      brand: brand || 'Tesla',
      model: model || 'Model 3',
      year: parseInt(year, 10) || 2023,
      fuelType,
      currentKm: parseFloat(currentKm) || 0,
      lastServiceKm: (parseFloat(currentKm) || 0) - 10000,
      nextMaintenanceKm: parseFloat(nextMaintenanceKm) || 85000,
      rentalFeePerWeek: parseFloat(rentalFeePerWeek) || 0,
      insuranceCompany: insuranceCompany || 'Fidelidade TVDE',
      insuranceExpiry,
      ipoExpiry,
      status,
      assignedDriverId: assignedDriver?.id,
      assignedDriverName: assignedDriver?.name
    };

    if (vehicleIdToEdit) {
      updateVehicle(vehicleIdToEdit, payload);
    } else {
      addVehicle(payload);
    }

    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-white border border-slate-200 rounded-md w-full max-w-lg p-6 shadow-xl relative overflow-hidden">
        <div className="flex items-center justify-between pb-4 border-b border-slate-200">
          <div className="flex items-center space-x-2">
            <Car className="w-5 h-5 text-blue-600" />
            <h2 className="text-base font-bold text-slate-900">
              {vehicleIdToEdit ? 'Editar Viatura' : 'Adicionar Nova Viatura TVDE'}
            </h2>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600 transition">
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4 mt-4 text-xs">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-slate-700 font-medium mb-1">Matrícula (PT) *</label>
              <input
                type="text"
                placeholder="Ex: AA-42-TV"
                value={licensePlate}
                onChange={e => setLicensePlate(e.target.value)}
                className="w-full bg-white border border-slate-300 rounded-md p-2.5 text-slate-900 font-mono font-bold focus:outline-none focus:border-blue-600"
                required
              />
            </div>

            <div>
              <label className="block text-slate-700 font-medium mb-1">Tipo de Motor *</label>
              <select
                value={fuelType}
                onChange={e => setFuelType(e.target.value as FuelType)}
                className="w-full bg-white border border-slate-300 rounded-md p-2.5 text-slate-900 focus:outline-none focus:border-blue-600"
              >
                <option value="ev">100% Elétrico (EV)</option>
                <option value="hybrid">Híbrido</option>
                <option value="diesel">Diesel</option>
                <option value="petrol">Gasolina</option>
                <option value="lpg">GPL</option>
              </select>
            </div>

            <div>
              <label className="block text-slate-700 font-medium mb-1">Marca *</label>
              <input
                type="text"
                placeholder="Ex: Tesla / Renault"
                value={brand}
                onChange={e => setBrand(e.target.value)}
                className="w-full bg-white border border-slate-300 rounded-md p-2.5 text-slate-900 focus:outline-none focus:border-blue-600"
                required
              />
            </div>

            <div>
              <label className="block text-slate-700 font-medium mb-1">Modelo *</label>
              <input
                type="text"
                placeholder="Ex: Model 3 / Zoe"
                value={model}
                onChange={e => setModel(e.target.value)}
                className="w-full bg-white border border-slate-300 rounded-md p-2.5 text-slate-900 focus:outline-none focus:border-blue-600"
                required
              />
            </div>

            <div>
              <label className="block text-slate-700 font-medium mb-1">Quilómetros Atuais *</label>
              <input
                type="number"
                placeholder="Ex: 78500"
                value={currentKm}
                onChange={e => setCurrentKm(e.target.value)}
                className="w-full bg-white border border-slate-300 rounded-md p-2.5 text-slate-900 focus:outline-none focus:border-blue-600"
                required
              />
            </div>

            <div>
              <label className="block text-slate-700 font-medium mb-1">Km Próxima Revisão *</label>
              <input
                type="number"
                placeholder="Ex: 90000"
                value={nextMaintenanceKm}
                onChange={e => setNextMaintenanceKm(e.target.value)}
                className="w-full bg-white border border-slate-300 rounded-md p-2.5 text-slate-900 focus:outline-none focus:border-blue-600"
                required
              />
            </div>

            <div>
              <label className="block text-slate-700 font-medium mb-1">Renda Semanal (€/sem)</label>
              <input
                type="number"
                placeholder="Ex: 210"
                value={rentalFeePerWeek}
                onChange={e => setRentalFeePerWeek(e.target.value)}
                className="w-full bg-white border border-slate-300 rounded-md p-2.5 text-slate-900 focus:outline-none focus:border-blue-600"
              />
            </div>

            <div>
              <label className="block text-slate-700 font-medium mb-1">Motorista Atribuído</label>
              <select
                value={assignedDriverId}
                onChange={e => setAssignedDriverId(e.target.value)}
                className="w-full bg-white border border-slate-300 rounded-md p-2.5 text-slate-900 focus:outline-none focus:border-blue-600"
              >
                <option value="">Nenhum / Disponível</option>
                {drivers.map(d => (
                  <option key={d.id} value={d.id}>{d.name}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-slate-700 font-medium mb-1">Validade Seguro TVDE</label>
              <input
                type="date"
                value={insuranceExpiry}
                onChange={e => setInsuranceExpiry(e.target.value)}
                className="w-full bg-white border border-slate-300 rounded-md p-2.5 text-slate-900 focus:outline-none focus:border-blue-600"
              />
            </div>

            <div>
              <label className="block text-slate-700 font-medium mb-1">Validade Inspeção IPO</label>
              <input
                type="date"
                value={ipoExpiry}
                onChange={e => setIpoExpiry(e.target.value)}
                className="w-full bg-white border border-slate-300 rounded-md p-2.5 text-slate-900 focus:outline-none focus:border-blue-600"
              />
            </div>

            <div className="col-span-2">
              <label className="block text-slate-700 font-medium mb-1">Estado Operacional</label>
              <select
                value={status}
                onChange={e => setStatus(e.target.value as VehicleStatus)}
                className="w-full bg-white border border-slate-300 rounded-md p-2.5 text-slate-900 focus:outline-none focus:border-blue-600"
              >
                <option value="active">Ativo em Circulação</option>
                <option value="maintenance">Em Manutenção / Oficina</option>
                <option value="inactive">Inativo / Indisponível</option>
              </select>
            </div>
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
              Salvar Viatura
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
