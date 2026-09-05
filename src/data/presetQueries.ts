export interface SavedQueryPreset {
  id: string;
  name: string;
  description: string;
  dataSource: 'shifts' | 'expenses' | 'consolidated';
  dateFilter: 'all' | 'this_week' | 'last_week' | 'last_7_days' | 'this_month' | 'last_month' | 'last_30_days' | 'this_year' | 'custom';
  startDate: string;
  endDate: string;
  driverId: string;
  vehicleId: string;
  platform: 'all' | 'uber' | 'bolt';
  minAmount: number;
  groupBy: 'none' | 'driver' | 'vehicle' | 'month' | 'dayOfWeek';
  aggregation: 'sum' | 'avg' | 'max' | 'min';
  visibleColumns: string[];
}

export const DEFAULT_PRESETS: SavedQueryPreset[] = [
  {
    id: 'preset-efficiency',
    name: 'Eficiência por Hora (€/h e hh:mm)',
    description: 'Análise de horas trabalhadas em formato hh:mm e rendimento médio €/hora por motorista.',
    dataSource: 'shifts',
    dateFilter: 'all',
    startDate: '',
    endDate: '',
    driverId: 'all',
    vehicleId: 'all',
    platform: 'all',
    minAmount: 0,
    groupBy: 'driver',
    aggregation: 'sum',
    visibleColumns: ['driverName', 'hoursWorked', 'grossEarnings', 'tripsCount', 'earningsPerHour', 'earningsPerKm']
  },
  {
    id: 'preset-vehicles',
    name: 'Rentabilidade por Viatura',
    description: 'Faturação, combustível e lucro estimado agrupado por matrícula de viatura.',
    dataSource: 'consolidated',
    dateFilter: 'all',
    startDate: '',
    endDate: '',
    driverId: 'all',
    vehicleId: 'all',
    platform: 'all',
    minAmount: 0,
    groupBy: 'vehicle',
    aggregation: 'sum',
    visibleColumns: ['vehiclePlate', 'grossEarnings', 'fuelExpenseAmount', 'rentalExpenseAmount', 'netProfit', 'kilometers']
  },
  {
    id: 'preset-platforms',
    name: 'Comparativo Uber vs Bolt',
    description: 'Divisão de receitas entre plataformas de TVDE e total faturado.',
    dataSource: 'shifts',
    dateFilter: 'all',
    startDate: '',
    endDate: '',
    driverId: 'all',
    vehicleId: 'all',
    platform: 'all',
    minAmount: 0,
    groupBy: 'none',
    aggregation: 'sum',
    visibleColumns: ['date', 'driverName', 'vehiclePlate', 'uberEarnings', 'boltEarnings', 'grossEarnings']
  },
  {
    id: 'preset-monthly',
    name: 'Resumo Consolidado Mensal',
    description: 'Evolução mensal da faturação, horas em serviço e custos totais.',
    dataSource: 'consolidated',
    dateFilter: 'all',
    startDate: '',
    endDate: '',
    driverId: 'all',
    vehicleId: 'all',
    platform: 'all',
    minAmount: 0,
    groupBy: 'month',
    aggregation: 'sum',
    visibleColumns: ['date', 'grossEarnings', 'hoursWorked', 'fuelExpenseAmount', 'rentalExpenseAmount', 'netProfit', 'tripsCount']
  }
];
