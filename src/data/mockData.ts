import { Driver, Vehicle, DailyShiftLog, Expense, AppNotification } from '../types';

export const INITIAL_DRIVERS: Driver[] = [
  {
    id: 'drv-1',
    name: 'João Silva',
    email: 'joao.silva@tvdefrota.pt',
    phone: '+351 912 345 678',
    tvdeLicenseNumber: 'TVDE-883492-PT',
    tvdeLicenseExpiry: '2027-11-15',
    status: 'active',
    assignedVehicleId: 'veh-1',
    commissionRate: 60, // 60% motorista / 40% parceiro
    startDate: '2024-03-01',
    iban: 'PT50 0033 0000 1234 5678 9015 4'
  },
  {
    id: 'drv-2',
    name: 'Maria Santos',
    email: 'maria.santos@tvdefrota.pt',
    phone: '+351 961 888 234',
    tvdeLicenseNumber: 'TVDE-991204-PT',
    tvdeLicenseExpiry: '2026-08-30', // prestes a caducar
    status: 'active',
    assignedVehicleId: 'veh-2',
    commissionRate: 65,
    startDate: '2023-09-15',
    iban: 'PT50 0018 0000 9876 5432 1012 3'
  },
  {
    id: 'drv-3',
    name: 'Carlos Ferreira',
    email: 'carlos.ferreira@tvdefrota.pt',
    phone: '+351 934 112 990',
    tvdeLicenseNumber: 'TVDE-552109-PT',
    tvdeLicenseExpiry: '2028-04-10',
    status: 'active',
    assignedVehicleId: 'veh-3',
    commissionRate: 60,
    startDate: '2024-01-10',
    iban: 'PT50 0035 0000 5544 3322 1100 9'
  },
  {
    id: 'drv-4',
    name: 'Ana Rodrigues',
    email: 'ana.rodrigues@tvdefrota.pt',
    phone: '+351 925 771 002',
    tvdeLicenseNumber: 'TVDE-771239-PT',
    tvdeLicenseExpiry: '2027-01-20',
    status: 'active',
    assignedVehicleId: 'veh-4',
    commissionRate: 70, // Contrato de renda de viatura
    startDate: '2024-05-01',
    iban: 'PT50 0007 0000 8822 1133 4455 6'
  },
  {
    id: 'drv-5',
    name: 'Pedro Costa',
    email: 'pedro.costa@tvdefrota.pt',
    phone: '+351 919 001 445',
    tvdeLicenseNumber: 'TVDE-339012-PT',
    tvdeLicenseExpiry: '2026-12-05',
    status: 'on_leave',
    assignedVehicleId: undefined,
    commissionRate: 60,
    startDate: '2023-11-01',
    iban: 'PT50 0038 0000 1199 2288 3377 1'
  }
];

export const INITIAL_VEHICLES: Vehicle[] = [
  {
    id: 'veh-1',
    licensePlate: 'AA-42-TV',
    brand: 'Tesla',
    model: 'Model 3 Standard',
    year: 2023,
    fuelType: 'ev',
    currentKm: 78500,
    lastServiceKm: 70000,
    nextMaintenanceKm: 80000, // Falta 1500 km para manutenção
    rentalFeePerWeek: 210, // 210€/semana
    insuranceCompany: 'Fidelidade TVDE Pro',
    insuranceExpiry: '2026-10-15',
    ipoExpiry: '2027-03-20',
    status: 'active',
    assignedDriverId: 'drv-1',
    assignedDriverName: 'João Silva'
  },
  {
    id: 'veh-2',
    licensePlate: '99-ZZ-11',
    brand: 'Renault',
    model: 'Zoe R135 EV',
    year: 2022,
    fuelType: 'ev',
    currentKm: 114800,
    lastServiceKm: 100000,
    nextMaintenanceKm: 115000, // Falta 200 km - ALERTA!
    rentalFeePerWeek: 175,
    insuranceCompany: 'Tranquilidade Frota',
    insuranceExpiry: '2026-08-05', // ALERTA! Vence em breve
    ipoExpiry: '2026-09-12', // ALERTA! IPO em breve
    status: 'active',
    assignedDriverId: 'drv-2',
    assignedDriverName: 'Maria Santos'
  },
  {
    id: 'veh-3',
    licensePlate: 'AB-88-CD',
    brand: 'Peugeot',
    model: 'e-208 GT',
    year: 2023,
    fuelType: 'ev',
    currentKm: 62100,
    lastServiceKm: 50000,
    nextMaintenanceKm: 65000,
    rentalFeePerWeek: 185,
    insuranceCompany: 'Generali TVDE',
    insuranceExpiry: '2027-01-30',
    ipoExpiry: '2027-05-15',
    status: 'active',
    assignedDriverId: 'drv-3',
    assignedDriverName: 'Carlos Ferreira'
  },
  {
    id: 'veh-4',
    licensePlate: '44-YY-55',
    brand: 'Nissan',
    model: 'Leaf 62kWh',
    year: 2022,
    fuelType: 'ev',
    currentKm: 132400,
    lastServiceKm: 120000,
    nextMaintenanceKm: 135000,
    rentalFeePerWeek: 180,
    insuranceCompany: 'Fidelidade TVDE Pro',
    insuranceExpiry: '2026-11-20',
    ipoExpiry: '2026-08-18', // ALERTA! IPO em menos de um mês
    status: 'active',
    assignedDriverId: 'drv-4',
    assignedDriverName: 'Ana Rodrigues'
  },
  {
    id: 'veh-5',
    licensePlate: '33-XX-88',
    brand: 'Toyota',
    model: 'Corolla Touring Hybrid',
    year: 2021,
    fuelType: 'hybrid',
    currentKm: 189000,
    lastServiceKm: 180000,
    nextMaintenanceKm: 190000,
    rentalFeePerWeek: 190,
    insuranceCompany: 'Allianz Seguros',
    insuranceExpiry: '2026-12-01',
    ipoExpiry: '2026-10-10',
    status: 'maintenance',
    assignedDriverId: undefined,
    assignedDriverName: undefined
  }
];

// Generates historical shift logs for realistic charts & data analytics
export const INITIAL_SHIFT_LOGS: DailyShiftLog[] = [
  // Recent shifts (July 2026)
  {
    id: 'sft-101',
    driverId: 'drv-1',
    driverName: 'João Silva',
    vehicleId: 'veh-1',
    vehiclePlate: 'AA-42-TV',
    date: '2026-07-21',
    tripsCount: 22,
    kilometers: 285,
    grossEarnings: 184.50,
    uberEarnings: 115.00,
    boltEarnings: 69.50,
    otherEarnings: 0,
    hoursWorked: 9.5,
    fuelExpenseAmount: 18.20,
    fuelLitersOrKwh: 45, // kWh
    status: 'verified',
    notes: 'Turno da manhã e pico de fim de tarde. Excelente afluência em Lisboa.'
  },
  {
    id: 'sft-102',
    driverId: 'drv-2',
    driverName: 'Maria Santos',
    vehicleId: 'veh-2',
    vehiclePlate: '99-ZZ-11',
    date: '2026-07-21',
    tripsCount: 18,
    kilometers: 210,
    grossEarnings: 142.00,
    uberEarnings: 90.00,
    boltEarnings: 52.00,
    otherEarnings: 0,
    hoursWorked: 8.0,
    fuelExpenseAmount: 14.50,
    fuelLitersOrKwh: 36,
    status: 'submitted',
    notes: 'Trânsito intenso na Ponte 25 de Abril.'
  },
  {
    id: 'sft-103',
    driverId: 'drv-3',
    driverName: 'Carlos Ferreira',
    vehicleId: 'veh-3',
    vehiclePlate: 'AB-88-CD',
    date: '2026-07-21',
    tripsCount: 25,
    kilometers: 310,
    grossEarnings: 215.80,
    uberEarnings: 140.80,
    boltEarnings: 75.00,
    otherEarnings: 0,
    hoursWorked: 10.0,
    fuelExpenseAmount: 22.00,
    fuelLitersOrKwh: 52,
    status: 'verified',
    notes: 'Serviço de aeroporto de manhã cedo.'
  },
  {
    id: 'sft-104',
    driverId: 'drv-4',
    driverName: 'Ana Rodrigues',
    vehicleId: 'veh-4',
    vehiclePlate: '44-YY-55',
    date: '2026-07-21',
    tripsCount: 19,
    kilometers: 240,
    grossEarnings: 158.00,
    uberEarnings: 95.00,
    boltEarnings: 63.00,
    otherEarnings: 0,
    hoursWorked: 8.5,
    fuelExpenseAmount: 16.80,
    fuelLitersOrKwh: 40,
    status: 'verified'
  },
  {
    id: 'sft-105',
    driverId: 'drv-1',
    driverName: 'João Silva',
    vehicleId: 'veh-1',
    vehiclePlate: 'AA-42-TV',
    date: '2026-07-20',
    tripsCount: 24,
    kilometers: 298,
    grossEarnings: 198.00,
    uberEarnings: 128.00,
    boltEarnings: 70.00,
    otherEarnings: 0,
    hoursWorked: 9.8,
    fuelExpenseAmount: 19.50,
    fuelLitersOrKwh: 48,
    status: 'paid'
  },
  {
    id: 'sft-106',
    driverId: 'drv-2',
    driverName: 'Maria Santos',
    vehicleId: 'veh-2',
    vehiclePlate: '99-ZZ-11',
    date: '2026-07-20',
    tripsCount: 20,
    kilometers: 225,
    grossEarnings: 155.00,
    uberEarnings: 98.00,
    boltEarnings: 57.00,
    otherEarnings: 0,
    hoursWorked: 8.2,
    fuelExpenseAmount: 15.00,
    status: 'paid'
  },
  {
    id: 'sft-107',
    driverId: 'drv-3',
    driverName: 'Carlos Ferreira',
    vehicleId: 'veh-3',
    vehiclePlate: 'AB-88-CD',
    date: '2026-07-20',
    tripsCount: 21,
    kilometers: 260,
    grossEarnings: 172.50,
    uberEarnings: 102.50,
    boltEarnings: 70.00,
    otherEarnings: 0,
    hoursWorked: 9.0,
    fuelExpenseAmount: 17.00,
    status: 'paid'
  },
  {
    id: 'sft-108',
    driverId: 'drv-4',
    driverName: 'Ana Rodrigues',
    vehicleId: 'veh-4',
    vehiclePlate: '44-YY-55',
    date: '2026-07-20',
    tripsCount: 17,
    kilometers: 215,
    grossEarnings: 139.00,
    uberEarnings: 84.00,
    boltEarnings: 55.00,
    otherEarnings: 0,
    hoursWorked: 7.8,
    fuelExpenseAmount: 14.20,
    status: 'paid'
  },
  // Previous shifts in June 2026
  {
    id: 'sft-080',
    driverId: 'drv-1',
    driverName: 'João Silva',
    vehicleId: 'veh-1',
    vehiclePlate: 'AA-42-TV',
    date: '2026-06-28',
    tripsCount: 26,
    kilometers: 320,
    grossEarnings: 230.00,
    uberEarnings: 150.00,
    boltEarnings: 80.00,
    otherEarnings: 0,
    hoursWorked: 10.2,
    fuelExpenseAmount: 21.00,
    status: 'paid'
  },
  {
    id: 'sft-081',
    driverId: 'drv-3',
    driverName: 'Carlos Ferreira',
    vehicleId: 'veh-3',
    vehiclePlate: 'AB-88-CD',
    date: '2026-06-28',
    tripsCount: 28,
    kilometers: 345,
    grossEarnings: 245.00,
    uberEarnings: 160.00,
    boltEarnings: 85.00,
    otherEarnings: 0,
    hoursWorked: 10.5,
    fuelExpenseAmount: 23.50,
    status: 'paid'
  }
];

export const INITIAL_EXPENSES: Expense[] = [
  {
    id: 'exp-1',
    category: 'fuel_charging',
    title: 'Carregamento EV Semanal - Rede Miio / Galp Electric',
    amount: 142.50,
    date: '2026-07-18',
    vehicleId: 'veh-1',
    vehiclePlate: 'AA-42-TV',
    driverId: 'drv-1',
    driverName: 'João Silva',
    invoiceNumber: 'FT 2026/9981',
    description: 'Postos Rápidos PCR Lisboa / Cascais'
  },
  {
    id: 'exp-2',
    category: 'maintenance',
    title: 'Revisão Geral de Calços e Pneus Frontais',
    amount: 285.00,
    date: '2026-07-15',
    vehicleId: 'veh-5',
    vehiclePlate: '33-XX-88',
    invoiceNumber: 'FT 2026/4412',
    description: 'Troca de pastilhas de travão e calibração de direção em oficina parceira.'
  },
  {
    id: 'exp-3',
    category: 'insurance',
    title: 'Prémio Trimestral Seguro Responsabilidade Civil TVDE',
    amount: 420.00,
    date: '2026-07-01',
    vehicleId: 'veh-1',
    vehiclePlate: 'AA-42-TV',
    invoiceNumber: 'SEG-883921',
    description: 'Seguro Fidelidade para transporte de passageiros TVDE com cobertura contra terceiros e ocupantes.'
  },
  {
    id: 'exp-4',
    category: 'insurance',
    title: 'Seguro Anual TVDE Renault Zoe',
    amount: 390.00,
    date: '2026-07-01',
    vehicleId: 'veh-2',
    vehiclePlate: '99-ZZ-11',
    invoiceNumber: 'SEG-100293',
    description: 'Aviso de pagamento pendente para renovação de apólice.'
  },
  {
    id: 'exp-5',
    category: 'vehicle_rental',
    title: 'Renda Semanal Viatura Tesla Model 3',
    amount: 210.00,
    date: '2026-07-20',
    vehicleId: 'veh-1',
    vehiclePlate: 'AA-42-TV',
    driverId: 'drv-1',
    driverName: 'João Silva',
    description: 'Liquidação da renda semanal de contrato de exploração.'
  },
  {
    id: 'exp-6',
    category: 'vehicle_rental',
    title: 'Renda Semanal Viatura Renault Zoe',
    amount: 175.00,
    date: '2026-07-20',
    vehicleId: 'veh-2',
    vehiclePlate: '99-ZZ-11',
    driverId: 'drv-2',
    driverName: 'Maria Santos',
    description: 'Pagamento de renda semanal em falta.'
  },
  {
    id: 'exp-7',
    category: 'tolls_wash',
    title: 'Via Verde & Lavagem Profissional de Frota',
    amount: 68.40,
    date: '2026-07-12',
    vehicleId: 'veh-3',
    vehiclePlate: 'AB-88-CD',
    description: 'Portagens autoestradas A1/A2 e lavagem completa de viatura.'
  }
];

export const INITIAL_NOTIFICATIONS: AppNotification[] = [
  {
    id: 'notif-1',
    type: 'maintenance',
    title: 'Alerta de Manutenção Imminente (Renault Zoe)',
    message: 'A viatura 99-ZZ-11 encontra-se a apenas 200 km da revisão preventiva dos 115.000 km.',
    date: '2026-07-21T09:30:00Z',
    priority: 'high',
    read: false,
    relatedVehicleId: 'veh-2',
    actionRequired: 'Agendar revisão em oficina'
  },
  {
    id: 'notif-2',
    type: 'payment_pending',
    title: 'Pagamento de Renda Semanal Pendente',
    message: 'A renda semanal da viatura 99-ZZ-11 da motorista Maria Santos (175,00 €) venceu em 20/07/2026.',
    date: '2026-07-21T08:00:00Z',
    priority: 'high',
    read: false,
    relatedVehicleId: 'veh-2',
    relatedDriverId: 'drv-2',
    actionRequired: 'Confirmar cobrança'
  },
  {
    id: 'notif-3',
    type: 'document_expiry',
    title: 'Licença TVDE a Caducar',
    message: 'A licença TVDE de Maria Santos (TVDE-991204-PT) caduca a 30/08/2026. Necessário renovar certificado IMT.',
    date: '2026-07-20T14:15:00Z',
    priority: 'medium',
    read: false,
    relatedDriverId: 'drv-2',
    actionRequired: 'Pedir renovação no portal IMT'
  },
  {
    id: 'notif-4',
    type: 'document_expiry',
    title: 'Inspeção IPO Próxima (Nissan Leaf)',
    message: 'A inspeção periódica obrigatória da viatura 44-YY-55 vence a 18/08/2026.',
    date: '2026-07-19T11:00:00Z',
    priority: 'medium',
    read: true,
    relatedVehicleId: 'veh-4',
    actionRequired: 'Marcar centro de inspeções'
  },
  {
    id: 'notif-5',
    type: 'performance_alert',
    title: 'Média de Faturação Elevada',
    message: 'Carlos Ferreira atingiu uma média de 21,58 €/hora no turno de hoje com 25 viagens efetuadas!',
    date: '2026-07-21T18:45:00Z',
    priority: 'low',
    read: false,
    relatedDriverId: 'drv-3'
  }
];
