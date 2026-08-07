export type FuelType = 'ev' | 'diesel' | 'petrol' | 'hybrid' | 'lpg';

export type VehicleStatus = 'active' | 'maintenance' | 'inactive';

export type DriverStatus = 'active' | 'on_leave' | 'inactive';

export type ExpenseCategory = 'fuel_charging' | 'maintenance' | 'insurance' | 'vehicle_rental' | 'tolls_wash' | 'irs' | 'iva' | 'other';

export type PlatformType = 'uber' | 'bolt' | 'other';

export type NotificationType = 'maintenance' | 'payment_pending' | 'document_expiry' | 'performance_alert';

export type NotificationPriority = 'low' | 'medium' | 'high';

export interface Driver {
  id: string;
  name: string;
  email: string;
  phone: string;
  tvdeLicenseNumber: string; // nº licença motorista TVDE
  tvdeLicenseExpiry: string; // data expiração licença
  status: DriverStatus;
  assignedVehicleId?: string;
  commissionRate: number; // e.g., 60% para motorista, 40% para frota ou taxa fixa
  photoUrl?: string;
  startDate: string;
  iban?: string;
}

export interface Vehicle {
  id: string;
  licensePlate: string; // Matrícula PT ex: AA-00-XX
  brand: string;
  model: string;
  year: number;
  fuelType: FuelType;
  currentKm: number;
  lastServiceKm: number;
  nextMaintenanceKm: number;
  rentalFeePerWeek: number; // Renda semanal cobrada ao motorista (€)
  insuranceCompany: string;
  insuranceExpiry: string; // Data fim do seguro
  ipoExpiry: string; // Data IPO (Inspeção Periódica Obrigatória)
  status: VehicleStatus;
  assignedDriverId?: string;
  assignedDriverName?: string;
}

export interface DailyShiftLog {
  id: string;
  driverId: string;
  driverName: string;
  vehicleId: string;
  vehiclePlate: string;
  date: string; // YYYY-MM-DD
  tripsCount: number; // nº viagens
  kilometers: number; // nº km percorridos
  grossEarnings: number; // valor total ganho (€)
  uberEarnings: number; // ganho na Uber (€)
  boltEarnings: number; // ganho na Bolt (€)
  otherEarnings: number; // ganho noutras plataformas (€)
  hoursWorked: number; // horas trabalhadas
  fuelExpenseAmount: number; // custo combustível / carregamento no dia (€)
  rentalExpenseAmount?: number; // custo/renda de viatura no dia (€)
  fuelLitersOrKwh?: number; // litros de combustível ou kWh
  status: 'submitted' | 'verified' | 'paid';
  notes?: string;
}

export interface Expense {
  id: string;
  category: ExpenseCategory;
  title: string;
  amount: number;
  date: string; // YYYY-MM-DD
  vehicleId?: string;
  vehiclePlate?: string;
  driverId?: string;
  driverName?: string;
  invoiceNumber?: string;
  description?: string;
  isRecurring?: boolean;
}

export interface AppNotification {
  id: string;
  type: NotificationType;
  title: string;
  message: string;
  date: string;
  priority: NotificationPriority;
  read: boolean;
  relatedVehicleId?: string;
  relatedDriverId?: string;
  actionRequired?: string;
}

export interface MonthlyStats {
  monthKey: string; // YYYY-MM
  monthName: string; // ex: "Julho 2026"
  totalGrossEarnings: number;
  totalExpenses: number;
  netProfit: number;
  totalTrips: number;
  totalKm: number;
  totalHours: number;
  totalFuelCost: number;
  totalMaintenanceCost: number;
  totalInsuranceCost: number;
  totalVehicleRentals: number;
  totalIrsCost: number;
  totalIvaCost: number;
  totalOtherCost: number;
  earningsPerKm: number;
  earningsPerHour: number;
  netProfitMarginPct: number;
  receiptIssuanceAmount: number; // Emissão Recibo = Faturação Total - Rendas
}
