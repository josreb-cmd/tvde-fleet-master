SX
import React, { useState, useMemo, useEffect } from 'react';
import { useTVDE } from '../contexts/TVDEContext';
import { DailyShiftLog, Expense } from '../types';
import { formatHoursToHHMM, parseHHMMToHours } from '../utils/formatters';
import { SavedQueryPreset, DEFAULT_PRESETS } from '../data/presetQueries';
import {
  Search,
  Filter,
  Sliders,
  Save,
  Download,
  FileText,
  Printer,
  Plus,
  Trash2,
  BarChart2,
  Calendar,
  User,
  Car,
  Clock,
  DollarSign,
  CheckSquare,
  Sparkles,
  Bookmark,
  TrendingUp,
  RefreshCw,
  Layers,
  HelpCircle,
  CheckCircle2,
  Table,
  PieChart,
  X,
  ExternalLink
} from 'lucide-react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  AreaChart,
  Area
} from 'recharts';
 
export const CustomQueryView: React.FC = () => {
  const { shiftLogs, expenses, drivers, vehicles, selectedPresetId, setSelectedPresetId } = useTVDE();
 
  // Saved queries state
  const [savedQueries, setSavedQueries] = useState<SavedQueryPreset[]>(() => {
    try {
      const saved = localStorage.getItem('tvde_custom_queries');
      if (saved) {
        const parsed = JSON.parse(saved);
        return [...DEFAULT_PRESETS, ...parsed];
      }
    } catch (e) {
      console.error(e);
    }
    return DEFAULT_PRESETS;
  });
 
  // Query configuration states
  const [queryName, setQueryName] = useState<string>('');
  const [dataSource, setDataSource] = useState<'shifts' | 'expenses' | 'consolidated'>('shifts');
  const [dateFilter, setDateFilter] = useState<'all' | 'this_week' | 'last_week' | 'last_7_days' | 'this_month' | 'last_month' | 'last_30_days' | 'this_year' | 'custom'>('all');
  const [startDate, setStartDate] = useState<string>('');
  const [endDate, setEndDate] = useState<string>('');
  const [driverId, setDriverId] = useState<string>('all');
  const [vehicleId, setVehicleId] = useState<string>('all');
  const [platform, setPlatform] = useState<'all' | 'uber' | 'bolt'>('all');
  const [minAmount, setMinAmount] = useState<number>(0);
  const [groupBy, setGroupBy] = useState<'none' | 'driver' | 'vehicle' | 'month' | 'dayOfWeek'>('none');
  const [aggregation, setAggregation] = useState<'sum' | 'avg' | 'max' | 'min'>('sum');
  
  // Table search & sort
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [sortField, setSortField] = useState<string>('date');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('desc');
  const [showSaveModal, setShowSaveModal] = useState<boolean>(false);
  const [showPrintModal, setShowPrintModal] = useState<boolean>(false);
  const [activeTabVisual, setActiveTabVisual] = useState<'table' | 'chart'>('table');
 
  // Available column choices
  const ALL_SHIFT_COLUMNS = [
    { id: 'date', label: 'Data' },
    { id: 'driverName', label: 'Motorista' },
    { id: 'vehiclePlate', label: 'Viatura' },
    { id: 'grossEarnings', label: 'Faturação Bruta (€)' },
    { id: 'uberEarnings', label: 'Uber (€)' },
    { id: 'boltEarnings', label: 'Bolt (€)' },
    { id: 'hoursWorked', label: 'Horas Trabalhadas (hh:mm)' },
    { id: 'kilometers', label: 'Quilómetros (km)' },
    { id: 'tripsCount', label: 'Viagens' },
    { id: 'earningsPerHour', label: 'Rendimento (€/h)' },
    { id: 'earningsPerKm', label: 'Rendimento (€/km)' },
    { id: 'fuelExpenseAmount', label: 'Combustível/Carga (€)' },
    { id: 'rentalExpenseAmount', label: 'Renda Viatura (€)' },
    { id: 'netProfit', label: 'Lucro Líquido Est. (€)' }
  ];
 
  const [visibleColumns, setVisibleColumns] = useState<string[]>([
    'date',
    'driverName',
    'vehiclePlate',
    'grossEarnings',
    'uberEarnings',
    'boltEarnings',
    'hoursWorked',
    'kilometers',
    'tripsCount',
    'earningsPerHour',
    'fuelExpenseAmount',
    'rentalExpenseAmount',
    'netProfit'
  ]);
 
  // Load a preset or saved query
  const handleSelectPreset = (preset: SavedQueryPreset) => {
    setDataSource(preset.dataSource);
    setDateFilter(preset.dateFilter);
    setStartDate(preset.startDate);
    setEndDate(preset.endDate);
    setDriverId(preset.driverId);
    setVehicleId(preset.vehicleId);
    setPlatform(preset.platform);
    setMinAmount(preset.minAmount);
    setGroupBy(preset.groupBy);
    setAggregation(preset.aggregation);
    setVisibleColumns(preset.visibleColumns);
    setQueryName(preset.name);
  };
 
  // Load preset if selected from external view (e.g. Dashboard on mobile)
  useEffect(() => {
    if (selectedPresetId) {
      const targetPreset = savedQueries.find(q => q.id === selectedPresetId);
      if (targetPreset) {
        handleSelectPreset(targetPreset);
      }
      setSelectedPresetId(null);
    }
  }, [selectedPresetId, savedQueries]);
 
  // Save current query configuration
  const handleSaveQuery = () => {
    if (!queryName.trim()) return;
    const newPreset: SavedQueryPreset = {
      id: `user-query-${Date.now()}`,
      name: queryName.trim(),
      description: `Consulta personalizada guardada em ${new Date().toLocaleDateString('pt-PT')}`,
      dataSource,
      dateFilter,
      startDate,
      endDate,
      driverId,
      vehicleId,
      platform,
      minAmount,
      groupBy,
      aggregation,
      visibleColumns
    };
 
    const userCustomQueries = savedQueries.filter(q => q.id.startsWith('user-query-'));
    const updatedUserQueries = [newPreset, ...userCustomQueries];
    
    try {
      localStorage.setItem('tvde_custom_queries', JSON.stringify(updatedUserQueries));
    } catch (e) {
      console.error(e);
    }
 
    setSavedQueries([...DEFAULT_PRESETS, ...updatedUserQueries]);
    setShowSaveModal(false);
  };
 
  const handleDeleteSavedQuery = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!confirm('Deseja eliminar esta consulta guardada?')) return;
    const userCustomQueries = savedQueries.filter(q => q.id.startsWith('user-query-') && q.id !== id);
    try {
      localStorage.setItem('tvde_custom_queries', JSON.stringify(userCustomQueries));
    } catch (err) {
      console.error(err);
    }
    setSavedQueries(savedQueries.filter(q => q.id !== id));
  };
 
  // Date Filtering Logic
  const filterByDateRange = (dateStr: string) => {
    if (!dateStr) return true;
    const recordDate = new Date(dateStr);
    const now = new Date();
    const formatDate = (d: Date) => d.toISOString().split('T')[0];
 
    // ✅ CORRIGIDO: now nunca é mutado — cada cálculo usa new Date(now)
    if (dateFilter === 'this_week') {
      const day = now.getDay();
      const monday = new Date(now);
      monday.setDate(monday.getDate() - day + (day === 0 ? -6 : 1));
      monday.setHours(0, 0, 0, 0);
      const sunday = new Date(monday);
      sunday.setDate(monday.getDate() + 6);
      sunday.setHours(23, 59, 59, 999);
      return dateStr >= formatDate(monday) && dateStr <= formatDate(sunday);
    }
    if (dateFilter === 'last_week') {
      const day = now.getDay();
      const monday = new Date(now);
      monday.setDate(monday.getDate() - day + (day === 0 ? -6 : 1) - 7);
      monday.setHours(0, 0, 0, 0);
      const sunday = new Date(monday);
      sunday.setDate(monday.getDate() + 6);
      sunday.setHours(23, 59, 59, 999);
      return dateStr >= formatDate(monday) && dateStr <= formatDate(sunday);
    }
    if (dateFilter === 'last_7_days') {
      const sevenDaysAgo = new Date();
      sevenDaysAgo.setDate(now.getDate() - 7);
      return dateStr >= formatDate(sevenDaysAgo) && dateStr <= formatDate(now);
    }
    if (dateFilter === 'this_month') {
      const currentYearMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
      return dateStr.startsWith(currentYearMonth);
    }
    if (dateFilter === 'last_month') {
      const prevMonthDate = new Date(now.getFullYear(), now.getMonth() - 1, 1);
      const prevYearMonth = `${prevMonthDate.getFullYear()}-${String(prevMonthDate.getMonth() + 1).padStart(2, '0')}`;
      return dateStr.startsWith(prevYearMonth);
    }
    if (dateFilter === 'last_30_days') {
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(now.getDate() - 30);
      return recordDate >= thirtyDaysAgo && recordDate <= now;
    }
    if (dateFilter === 'this_year') {
      return dateStr.startsWith(`${now.getFullYear()}`);
    }
    if (dateFilter === 'custom') {
      if (startDate && dateStr < startDate) return false;
      if (endDate && dateStr > endDate) return false;
      return true;
    }
    return true; // 'all'
  };
 
  // Filtered raw dataset
  const filteredShifts = useMemo(() => {
    return shiftLogs.filter(s => {
      if (!filterByDateRange(s.date)) return false;
      if (driverId !== 'all' && s.driverId !== driverId) return false;
      if (vehicleId !== 'all' && s.vehicleId !== vehicleId) return false;
      if (platform === 'uber' && (!s.uberEarnings || s.uberEarnings <= 0)) return false;
      if (platform === 'bolt' && (!s.boltEarnings || s.boltEarnings <= 0)) return false;
      if (minAmount > 0 && s.grossEarnings < minAmount) return false;
      return true;
    });
  }, [shiftLogs, dateFilter, startDate, endDate, driverId, vehicleId, platform, minAmount]);
 
  const filteredExpensesList = useMemo(() => {
    return expenses.filter(e => {
      if (!filterByDateRange(e.date)) return false;
      if (driverId !== 'all' && e.driverId !== driverId) return false;
      if (vehicleId !== 'all' && e.vehicleId !== vehicleId) return false;
      if (minAmount > 0 && e.amount < minAmount) return false;
      return true;
    });
  }, [expenses, dateFilter, startDate, endDate, driverId, vehicleId, minAmount]);
 
  // Aggregated or Detailed Query Results
  const queryResults = useMemo(() => {
    if (groupBy === 'none') {
      // Detailed shift logs rows
      return filteredShifts.map(s => {
        const hoursNum = parseHHMMToHours(s.hoursWorked);
        const fuel = s.fuelExpenseAmount || 0;
        const rental = s.rentalExpenseAmount || 0;
        const netEst = s.grossEarnings - fuel - rental;
        const ePerHour = hoursNum > 0 ? s.grossEarnings / hoursNum : 0;
        const ePerKm = s.kilometers > 0 ? s.grossEarnings / s.kilometers : 0;
 
        return {
          id: s.id,
          date: s.date,
          rawDateSortKey: s.date,
          driverName: s.driverName,
          vehiclePlate: s.vehiclePlate,
          grossEarnings: s.grossEarnings,
          uberEarnings: s.uberEarnings || 0,
          boltEarnings: s.boltEarnings || 0,
          hoursWorked: hoursNum,
          hoursWorkedHHMM: formatHoursToHHMM(s.hoursWorked),
          kilometers: s.kilometers,
          tripsCount: s.tripsCount,
          earningsPerHour: ePerHour,
          earningsPerKm: ePerKm,
          fuelExpenseAmount: fuel,
          rentalExpenseAmount: rental,
          netProfit: netEst
        };
      });
    }
 
    // Grouping Logic
    const groups: Record<string, {
      key: string;
      label: string;
      grossEarningsList: number[];
      uberList: number[];
      boltList: number[];
      hoursList: number[];
      kmList: number[];
      tripsList: number[];
      fuelList: number[];
      rentalList: number[];
      expensesTotalList: number[];
    }> = {};
 
    filteredShifts.forEach(s => {
      let groupKey = 'Outro';
      let groupLabel = 'Outro';
 
      if (groupBy === 'driver') {
        groupKey = s.driverId;
        groupLabel = s.driverName;
      } else if (groupBy === 'vehicle') {
        groupKey = s.vehicleId || s.vehiclePlate;
        groupLabel = s.vehiclePlate;
      } else if (groupBy === 'month') {
        groupKey = s.date.substring(0, 7); // YYYY-MM
        const [y, m] = groupKey.split('-');
        const monthNames = ['Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho', 'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'];
        groupLabel = `${monthNames[parseInt(m, 10) - 1]} ${y}`;
      } else if (groupBy === 'dayOfWeek') {
        const d = new Date(s.date);
        const dayIndex = d.getDay();
        const days = ['Domingo', 'Segunda-feira', 'Terça-feira', 'Quarta-feira', 'Quinta-feira', 'Sexta-feira', 'Sábado'];
        groupKey = `day-${dayIndex}`;
        groupLabel = days[dayIndex];
      }
 
      if (!groups[groupKey]) {
        groups[groupKey] = {
          key: groupKey,
          label: groupLabel,
          grossEarningsList: [],
          uberList: [],
          boltList: [],
          hoursList: [],
          kmList: [],
          tripsList: [],
          fuelList: [],
          rentalList: [],
          expensesTotalList: []
        };
      }
 
      const hNum = parseHHMMToHours(s.hoursWorked);
      groups[groupKey].grossEarningsList.push(s.grossEarnings);
      groups[groupKey].uberList.push(s.uberEarnings || 0);
      groups[groupKey].boltList.push(s.boltEarnings || 0);
      groups[groupKey].hoursList.push(hNum);
      groups[groupKey].kmList.push(s.kilometers);
      groups[groupKey].tripsList.push(s.tripsCount);
      groups[groupKey].fuelList.push(s.fuelExpenseAmount || 0);
      groups[groupKey].rentalList.push(s.rentalExpenseAmount || 0);
    });
 
    // Also include extra standalone expenses in group total if consolidated
    if (dataSource === 'consolidated') {
      filteredExpensesList.forEach(e => {
        // Avoid double counting daily rental or fuel charging if already tracked via shift logs
        if (
          e.category === 'vehicle_rental' ||
          e.category === 'fuel_charging' ||
          e.id.startsWith('exp-nrg-') ||
          e.id.startsWith('exp-fuel-shift-') ||
          e.id.startsWith('exp-rnd-')
        ) {
          return;
        }
 
        let groupKey = '';
        if (groupBy === 'driver' && e.driverId) groupKey = e.driverId;
        if (groupBy === 'vehicle' && (e.vehicleId || e.vehiclePlate)) groupKey = e.vehicleId || e.vehiclePlate || '';
        if (groupBy === 'month') groupKey = e.date.substring(0, 7);
 
        if (groupKey && groups[groupKey]) {
          groups[groupKey].expensesTotalList.push(e.amount);
        }
      });
    }
 
    // Helper aggregation function
    const aggregate = (arr: number[]) => {
      if (arr.length === 0) return 0;
      if (aggregation === 'sum') return arr.reduce((a, b) => a + b, 0);
      if (aggregation === 'avg') return arr.reduce((a, b) => a + b, 0) / arr.length;
      if (aggregation === 'max') return Math.max(...arr);
      if (aggregation === 'min') return Math.min(...arr);
      return 0;
    };
 
    return Object.values(groups).map(g => {
      const gross = aggregate(g.grossEarningsList);
      const uber = aggregate(g.uberList);
      const bolt = aggregate(g.boltList);
      const hours = aggregate(g.hoursList);
      const km = aggregate(g.kmList);
      const trips = aggregate(g.tripsList);
      const fuel = aggregate(g.fuelList);
      const rental = aggregate(g.rentalList);
      const extraExp = aggregate(g.expensesTotalList);
      const totalExp = fuel + rental + extraExp;
      const net = gross - totalExp;
 
      const ePerHour = hours > 0 ? gross / hours : 0;
      const ePerKm = km > 0 ? gross / km : 0;
 
      return {
        id: g.key,
        date: g.label,
        rawDateSortKey: g.key,
        driverName: groupBy === 'driver' ? g.label : 'Vários',
        vehiclePlate: groupBy === 'vehicle' ? g.label : 'Várias',
        grossEarnings: gross,
        uberEarnings: uber,
        boltEarnings: bolt,
        hoursWorked: hours,
        hoursWorkedHHMM: formatHoursToHHMM(hours),
        kilometers: km,
        tripsCount: trips,
        earningsPerHour: ePerHour,
        earningsPerKm: ePerKm,
        fuelExpenseAmount: fuel,
        rentalExpenseAmount: rental,
        netProfit: net
      };
    });
  }, [filteredShifts, filteredExpensesList, groupBy, aggregation, dataSource]);
 
  // Search & Sorting of Query Results
  const processedResults = useMemo(() => {
    let list = [...queryResults];
 
    if (searchTerm.trim()) {
      const term = searchTerm.toLowerCase();
      list = list.filter(r =>
        (r.driverName && r.driverName.toLowerCase().includes(term)) ||
        (r.vehiclePlate && r.vehiclePlate.toLowerCase().includes(term)) ||
        (r.date && r.date.toLowerCase().includes(term))
      );
    }
 
    list.sort((a, b) => {
      let valA: any;
      let valB: any;
 
      if (sortField === 'date') {
        valA = (a as any).rawDateSortKey || a.date;
        valB = (b as any).rawDateSortKey || b.date;
      } else {
        valA = a[sortField as keyof typeof a];
        valB = b[sortField as keyof typeof b];
      }
 
      if (valA === undefined) valA = 0;
      if (valB === undefined) valB = 0;
 
      if (typeof valA === 'string') {
        return sortDirection === 'asc' ? valA.localeCompare(valB) : valB.localeCompare(valA);
      }
      return sortDirection === 'asc' ? valA - valB : valB - valA;
    });
 
    return list;
  }, [queryResults, searchTerm, sortField, sortDirection]);
 
  // Overall KPI Summary of active query
  const totalGrossQuery = useMemo(() => processedResults.reduce((acc, r) => acc + r.grossEarnings, 0), [processedResults]);
  const totalHoursQuery = useMemo(() => processedResults.reduce((acc, r) => acc + r.hoursWorked, 0), [processedResults]);
  const totalTripsQuery = useMemo(() => processedResults.reduce((acc, r) => acc + r.tripsCount, 0), [processedResults]);
  const totalKmQuery = useMemo(() => processedResults.reduce((acc, r) => acc + r.kilometers, 0), [processedResults]);
  const totalFuelQuery = useMemo(() => processedResults.reduce((acc, r) => acc + r.fuelExpenseAmount, 0), [processedResults]);
  const totalRentalQuery = useMemo(() => processedResults.reduce((acc, r) => acc + r.rentalExpenseAmount, 0), [processedResults]);
  const totalNetQuery = useMemo(() => processedResults.reduce((acc, r) => acc + r.netProfit, 0), [processedResults]);
  const avgPerHourQuery = totalHoursQuery > 0 ? totalGrossQuery / totalHoursQuery : 0;
 
  // ─────────────────────────────────────────────────────────────────
  // uniqueShiftDaysCount — CORRIGIDO (V.2.9.x)
  // Conta apenas dias com faturação > 0 para a média de horas/dia.
  // Dias de folga (grossEarnings = 0) não entram no denominador.
  // ─────────────────────────────────────────────────────────────────
  const uniqueShiftDaysCount = useMemo(() => {
    return new Set(
      filteredShifts.filter(s => s.grossEarnings > 0).map(s => s.date)
    ).size;
  }, [filteredShifts]);
 
  const periodCalendarDaysCount = useMemo(() => {
    const now = new Date();
    if (dateFilter === 'this_month') {
      return now.getDate();
    }
    if (dateFilter === 'last_month') {
      const prevMonthDate = new Date(now.getFullYear(), now.getMonth(), 0);
      return prevMonthDate.getDate();
    }
    if (dateFilter === 'last_30_days') {
      return 30;
    }
    if (dateFilter === 'this_year') {
      const startOfYear = new Date(now.getFullYear(), 0, 1);
      const diffTime = Math.abs(now.getTime() - startOfYear.getTime());
      return Math.max(1, Math.ceil(diffTime / (1000 * 60 * 60 * 24)));
    }
    if (dateFilter === 'custom' && startDate && endDate) {
      const start = new Date(startDate);
      const end = new Date(endDate);
      const diffTime = Math.max(0, end.getTime() - start.getTime());
      return Math.max(1, Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1);
    }
    if (filteredShifts.length > 0) {
      const dates = filteredShifts.map(s => s.date).sort();
      const minD = new Date(dates[0]);
      const maxD = new Date(dates[dates.length - 1]);
      const diffTime = Math.abs(maxD.getTime() - minD.getTime());
      return Math.max(1, Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1);
    }
    return uniqueShiftDaysCount || 1;
  }, [dateFilter, startDate, endDate, filteredShifts, uniqueShiftDaysCount]);
 
  const avgHoursPerActiveDay = uniqueShiftDaysCount > 0 ? totalHoursQuery / uniqueShiftDaysCount : 0;
  const avgHoursPerCalendarDay = periodCalendarDaysCount > 0 ? totalHoursQuery / periodCalendarDaysCount : 0;
 
  // Toggle Column Helper
  const toggleColumn = (colId: string) => {
    if (visibleColumns.includes(colId)) {
      if (visibleColumns.length > 2) {
        setVisibleColumns(visibleColumns.filter(c => c !== colId));
      }
    } else {
      setVisibleColumns([...visibleColumns, colId]);
    }
  };
 
  // Export to CSV
  const handleExportCSV = () => {
    if (processedResults.length === 0) return;
    const activeCols = ALL_SHIFT_COLUMNS.filter(c => visibleColumns.includes(c.id));
    const headers = activeCols.map(c => c.label).join(';');
 
    const rows = processedResults.map(r => {
      return activeCols.map(c => {
        let val = r[c.id as keyof typeof r];
        if (c.id === 'hoursWorked') val = r.hoursWorkedHHMM;
        if (typeof val === 'number') {
          val = val.toFixed(2).replace('.', ',');
        }
        return `"${val ?? ''}"`;
      }).join(';');
    });
 
    const csvContent = 'data:text/csv;charset=utf-8,\uFEFF' + [headers, ...rows].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `consulta_tvde_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };
 
  // Export JSON
  const handleExportJSON = () => {
    const dataStr = 'data:text/json;charset=utf-8,' + encodeURIComponent(JSON.stringify(processedResults, null, 2));
    const downloadAnchor = document.createElement('a');
    downloadAnchor.setAttribute('href', dataStr);
    downloadAnchor.setAttribute('download', `consulta_tvde_${new Date().toISOString().split('T')[0]}.json`);
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();
  };
 
  // Generate Clean Printable HTML Document
  const generatePrintableHtml = () => {
    const printDate = new Date().toLocaleDateString('pt-PT', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' });
    const columnsToPrint = ALL_SHIFT_COLUMNS.filter(c => visibleColumns.includes(c.id));
    
    const dateLabels: Record<string, string> = {
      all: 'Todo o Histórico',
      this_week: 'Esta Semana (Seg-Dom)',
      last_week: 'Semana Anterior (Seg-Dom)',
      last_7_days: 'Últimos 7 Dias',
      this_month: 'Este Mês',
      last_month: 'Mês Passado',
      last_30_days: 'Últimos 30 Dias',
      this_year: 'Este Ano',
      custom: 'Personalizado'
    };
 
    const filterLabels: string[] = [];
    if (dateFilter !== 'all') filterLabels.push(`Período: ${dateLabels[dateFilter] || dateFilter}`);
    if (driverId !== 'all') {
      const d = drivers.find(drv => drv.id === driverId);
      if (d) filterLabels.push(`Motorista: ${d.name}`);
    }
    if (vehicleId !== 'all') {
      const v = vehicles.find(vh => vh.id === vehicleId);
      if (v) filterLabels.push(`Viatura: ${v.plate}`);
    }
    if (platform !== 'all') filterLabels.push(`Plataforma: ${platform.toUpperCase()}`);
 
    return `
      <!DOCTYPE html>
      <html lang="pt">
        <head>
          <meta charset="utf-8">
          <title>Relatório TVDE - Consulta de Frota (${new Date().toISOString().split('T')[0]})</title>
          <style>
            @media print {
              @page { size: A4 landscape; margin: 10mm; }
              body { -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important; }
            }
            * { box-sizing: border-box; }
            body { font-family: system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; font-size: 11px; color: #0f172a; margin: 0; padding: 20px; background: #ffffff; }
            .header { display: flex; justify-content: space-between; align-items: flex-start; border-bottom: 2px solid #2563eb; padding-bottom: 12px; margin-bottom: 16px; }
            .title-box h1 { font-size: 20px; font-weight: 800; color: #1e293b; margin: 0 0 4px 0; }
            .title-box p { font-size: 11px; color: #64748b; margin: 0; }
            .meta-box { text-align: right; font-size: 10px; color: #475569; }
            .filters-bar { background-color: #f8fafc; border: 1px solid #e2e8f0; border-radius: 6px; padding: 8px 12px; margin-bottom: 16px; font-size: 10px; color: #334155; }
            .kpi-grid { display: grid; grid-template-columns: repeat(8, 1fr); gap: 8px; margin-bottom: 20px; }
            .kpi-card { border: 1px solid #cbd5e1; border-radius: 6px; padding: 8px; background: #f8fafc; }
            .kpi-title { font-size: 8px; font-weight: 700; text-transform: uppercase; color: #64748b; line-height: 1.2; margin-bottom: 4px; }
            .kpi-value { font-size: 12px; font-weight: 800; color: #0f172a; }
            .kpi-sub { font-size: 8px; color: #64748b; margin-top: 2px; }
            table { width: 100%; border-collapse: collapse; font-size: 10px; margin-top: 8px; }
            th { background-color: #f1f5f9; color: #1e293b; font-weight: 700; text-transform: uppercase; font-size: 8px; padding: 6px 8px; text-align: left; border: 1px solid #cbd5e1; }
            td { padding: 5px 8px; border: 1px solid #e2e8f0; color: #0f172a; white-space: nowrap; }
            tr:nth-child(even) { background-color: #f8fafc; }
            .text-right { text-align: right; }
            .text-center { text-align: center; }
            .font-mono { font-family: monospace; font-weight: 600; }
            .footer { margin-top: 24px; padding-top: 12px; border-top: 1px solid #cbd5e1; font-size: 9px; color: #64748b; display: flex; justify-content: space-between; }
          </style>
        </head>
        <body>
          <div class="header">
            <div class="title-box">
              <h1>Relatório de Frota TVDE</h1>
              <p>Consulta Personalizada de Actividade e Rentabilidade</p>
            </div>
            <div class="meta-box">
              <div><strong>Emitido em:</strong> ${printDate}</div>
              <div><strong>Registos:</strong> ${processedResults.length} linhas</div>
              <div><strong>Sistema:</strong> TVDE FleetMaster</div>
            </div>
          </div>
 
          ${filterLabels.length > 0 ? `<div class="filters-bar"><strong>Filtros Activos:</strong> ${filterLabels.join(' | ')}</div>` : ''}
 
          <div class="kpi-grid">
            <div class="kpi-card">
              <div class="kpi-title">Faturação<br>Total</div>
              <div class="kpi-value">${totalGrossQuery.toLocaleString('pt-PT', { style: 'currency', currency: 'EUR' })}</div>
            </div>
            <div class="kpi-card">
              <div class="kpi-title">Horas em<br>Serviço</div>
              <div class="kpi-value font-mono">${formatHoursToHHMM(totalHoursQuery)}</div>
              <div class="kpi-sub">(${totalHoursQuery.toFixed(1)}h dec.)</div>
            </div>
            <div class="kpi-card" style="background:#eff6ff; border-color:#93c5fd;">
              <div class="kpi-title" style="color:#1d4ed8;">Média Horas<br>/ Dia</div>
              <div class="kpi-value font-mono" style="color:#1e40af;">${formatHoursToHHMM(avgHoursPerActiveDay)}</div>
              <div class="kpi-sub" style="color:#2563eb;">${avgHoursPerActiveDay.toFixed(1)}h/dia (${uniqueShiftDaysCount}d c/ fat.)</div>
            </div>
            <div class="kpi-card">
              <div class="kpi-title">Rendimento<br>Médio</div>
              <div class="kpi-value" style="color:#2563eb;">${avgPerHourQuery.toLocaleString('pt-PT', { style: 'currency', currency: 'EUR' })}/h</div>
            </div>
            <div class="kpi-card">
              <div class="kpi-title">N.º de<br>Viagens</div>
              <div class="kpi-value">${totalTripsQuery}</div>
              <div class="kpi-sub">${totalKmQuery} km</div>
            </div>
            <div class="kpi-card">
              <div class="kpi-title">Combustível<br>/ Carga</div>
              <div class="kpi-value" style="color:#e11d48;">${totalFuelQuery.toLocaleString('pt-PT', { style: 'currency', currency: 'EUR' })}</div>
            </div>
            <div class="kpi-card">
              <div class="kpi-title">Renda<br>Viatura</div>
              <div class="kpi-value" style="color:#b45309;">${totalRentalQuery.toLocaleString('pt-PT', { style: 'currency', currency: 'EUR' })}</div>
            </div>
            <div class="kpi-card">
              <div class="kpi-title">Lucro Líquido<br>Est.</div>
              <div class="kpi-value" style="color:#059669;">${totalNetQuery.toLocaleString('pt-PT', { style: 'currency', currency: 'EUR' })}</div>
            </div>
          </div>
 
          <table>
            <thead>
              <tr>
                ${columnsToPrint.map(col => `<th>${col.label}</th>`).join('')}
              </tr>
            </thead>
            <tbody>
              ${processedResults.map(item => `
                <tr>
                  ${columnsToPrint.map(col => {
                    let val = '';
                    if (col.id === 'date') val = item.date;
                    else if (col.id === 'driverName') val = item.driverName || '-';
                    else if (col.id === 'vehiclePlate') val = item.vehiclePlate || '-';
                    else if (col.id === 'grossEarnings') val = item.grossEarnings.toLocaleString('pt-PT', { style: 'currency', currency: 'EUR' });
                    else if (col.id === 'uberEarnings') val = item.uberEarnings.toLocaleString('pt-PT', { style: 'currency', currency: 'EUR' });
                    else if (col.id === 'boltEarnings') val = item.boltEarnings.toLocaleString('pt-PT', { style: 'currency', currency: 'EUR' });
                    else if (col.id === 'hoursWorked') val = `<span class="font-mono">${item.hoursWorkedHHMM}</span>`;
                    else if (col.id === 'kilometers') val = `${item.kilometers} km`;
                    else if (col.id === 'tripsCount') val = `${item.tripsCount}`;
                    else if (col.id === 'earningsPerHour') val = `${item.earningsPerHour.toLocaleString('pt-PT', { style: 'currency', currency: 'EUR' })}/h`;
                    else if (col.id === 'earningsPerKm') val = `${item.earningsPerKm.toLocaleString('pt-PT', { style: 'currency', currency: 'EUR' })}/km`;
                    else if (col.id === 'fuelExpenseAmount') val = item.fuelExpenseAmount.toLocaleString('pt-PT', { style: 'currency', currency: 'EUR' });
                    else if (col.id === 'rentalExpenseAmount') val = item.rentalExpenseAmount.toLocaleString('pt-PT', { style: 'currency', currency: 'EUR' });
                    else if (col.id === 'netProfit') val = `<strong style="color:${item.netProfit >= 0 ? '#059669' : '#e11d48'}">${item.netProfit.toLocaleString('pt-PT', { style: 'currency', currency: 'EUR' })}</strong>`;
                    return `<td>${val}</td>`;
                  }).join('')}
                </tr>
              `).join('')}
            </tbody>
          </table>
 
          <div class="footer">
            <span>TVDE FleetMaster - Gestão Profissional de Frotas</span>
            <span>Documento impresso em ${printDate}</span>
          </div>
        </body>
      </html>
    `;
  };
 
  // Direct print via hidden iframe
  const handlePrintInIframe = () => {
    try {
      const html = generatePrintableHtml();
      const iframe = document.createElement('iframe');
      iframe.style.position = 'fixed';
      iframe.style.right = '0';
      iframe.style.bottom = '0';
      iframe.style.width = '0px';
      iframe.style.height = '0px';
      iframe.style.border = 'none';
      document.body.appendChild(iframe);
 
      const doc = iframe.contentWindow?.document || iframe.contentDocument;
      if (doc) {
        doc.open();
        doc.write(html);
        doc.close();
 
        setTimeout(() => {
          try {
            iframe.contentWindow?.focus();
            iframe.contentWindow?.print();
          } catch (err) {
            console.error('Print iframe error:', err);
            window.print();
          } finally {
            setTimeout(() => {
              if (document.body.contains(iframe)) {
                document.body.removeChild(iframe);
              }
            }, 1000);
          }
        }, 300);
      } else {
        window.print();
      }
    } catch (e) {
      window.print();
    }
  };
 
  // Open in New Window (Bypasses iframe sandbox print restrictions completely)
  const handleOpenInNewTab = () => {
    const html = generatePrintableHtml();
    const blob = new Blob([html], { type: 'text/html;charset=utf-8' });
    const blobUrl = URL.createObjectURL(blob);
    const win = window.open(blobUrl, '_blank');
    if (win) {
      win.focus();
      setTimeout(() => {
        try {
          win.print();
        } catch (e) {
          console.error(e);
        }
      }, 500);
    } else {
      alert('O seu navegador bloqueou a nova janela. Por favor permita popups para este site.');
    }
  };
 
  // Download Printable HTML file
  const handleDownloadPrintableHtml = () => {
    const html = generatePrintableHtml();
    const blob = new Blob([html], { type: 'text/html;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `relatorio_tvde_${new Date().toISOString().split('T')[0]}.html`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };
 
  // Print Report
  const handlePrint = () => {
    setShowPrintModal(true);
  };
 
  return (
    <div className="space-y-6 pb-12">
      {/* Header Title Section */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white p-5 rounded-lg border border-slate-200 shadow-sm">
        <div>
          <div className="flex items-center space-x-2">
            <span className="p-2 bg-blue-50 text-blue-600 rounded-md border border-blue-100">
              <Sliders className="w-5 h-5" />
            </span>
            <h1 className="text-xl font-bold text-slate-900">Consulta Personalizada de Frota</h1>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            Crie, filtre e exporte relatórios sob medida com cálculo preciso de horas (<span className="font-mono text-slate-700 font-bold">hh:mm</span>) e rentabilidade sem alterar as vistas originais.
          </p>
        </div>
 
        {/* Action Buttons */}
        <div className="flex flex-wrap items-center gap-2 print:hidden">
          <button
            onClick={() => setShowSaveModal(true)}
            className="flex items-center space-x-1.5 px-3 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-md text-xs font-semibold shadow-sm transition"
          >
            <Bookmark className="w-4 h-4" />
            <span>Guardar Esta Consulta</span>
          </button>
 
          <button
            onClick={handleExportCSV}
            className="flex items-center space-x-1.5 px-3 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-300 rounded-md text-xs font-medium transition"
            title="Exportar CSV com formatação PT"
          >
            <Download className="w-4 h-4" />
            <span>Exportar CSV</span>
          </button>
 
          <button
            onClick={handlePrint}
            className="flex items-center space-x-1.5 px-3 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-300 rounded-md text-xs font-medium transition"
            title="Imprimir relatório"
          >
            <Printer className="w-4 h-4" />
            <span className="hidden sm:inline">Imprimir</span>
          </button>
        </div>
      </div>
 
      {/* Preset Queries Quick Cards */}
      <div className="bg-white p-4 rounded-lg border border-slate-200 shadow-sm print:hidden">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center space-x-2">
            <Bookmark className="w-4 h-4 text-blue-600" />
            <span className="text-xs font-bold uppercase tracking-wider text-slate-800">
              Consultas Rápidas e Modelos Guardados
            </span>
          </div>
          <span className="text-[11px] text-slate-500 font-medium">
            {savedQueries.length} modelos disponíveis
          </span>
        </div>
 
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          {savedQueries.map(preset => {
            const isUserSaved = preset.id.startsWith('user-query-');
            return (
              <div
                key={preset.id}
                onClick={() => handleSelectPreset(preset)}
                className="group relative p-3 bg-slate-50 hover:bg-blue-50/60 border border-slate-200 hover:border-blue-300 rounded-md cursor-pointer transition flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-slate-900 group-hover:text-blue-700 line-clamp-1">
                      {preset.name}
                    </span>
                    {isUserSaved && (
                      <button
                        onClick={(e) => handleDeleteSavedQuery(preset.id, e)}
                        className="p-1 text-slate-400 hover:text-red-600 transition"
                        title="Eliminar consulta guardada"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                  <p className="text-[11px] text-slate-500 mt-1 line-clamp-2 leading-relaxed">
                    {preset.description}
                  </p>
                </div>
 
                <div className="mt-2 pt-2 border-t border-slate-200/60 flex items-center justify-between text-[10px] text-slate-400">
                  <span className="capitalize font-mono bg-white px-1.5 py-0.5 rounded border border-slate-200">
                    {preset.groupBy === 'none' ? 'Detalhe' : `Agrupado: ${preset.groupBy}`}
                  </span>
                  <span className="font-semibold text-blue-600 group-hover:underline">Carregar →</span>
                </div>
              </div>
            );
          })}
        </div>
      </div>
 
      {/* Main Builder Parameters Form */}
      <div className="bg-white p-5 rounded-lg border border-slate-200 shadow-sm space-y-4 print:hidden">
        <div className="flex items-center justify-between border-b border-slate-100 pb-3">
          <div className="flex items-center space-x-2">
            <Filter className="w-4 h-4 text-blue-600" />
            <h2 className="text-sm font-bold text-slate-900 uppercase tracking-wider">
              Parâmetros e Filtros da Consulta
            </h2>
          </div>
          <button
            onClick={() => {
              setDataSource('shifts');
              setDateFilter('all');
              setDriverId('all');
              setVehicleId('all');
              setPlatform('all');
              setMinAmount(0);
              setGroupBy('none');
              setAggregation('sum');
              setSearchTerm('');
            }}
            className="text-xs text-slate-500 hover:text-blue-600 flex items-center space-x-1 transition font-medium"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            <span>Limpar Filtros</span>
          </button>
        </div>
 
        {/* Builder Grid Controls */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* Origem dos Dados */}
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">
              Origem dos Dados
            </label>
            <select
              value={dataSource}
              onChange={e => setDataSource(e.target.value as any)}
              className="w-full bg-slate-50 border border-slate-300 rounded-md px-3 py-2 text-xs font-medium text-slate-900 focus:outline-none focus:border-blue-600"
            >
              <option value="shifts">Faturação & Turnos Diários</option>
              <option value="expenses">Custos & Despesas de Frota</option>
              <option value="consolidated">Consolidado (Faturação + Custos)</option>
            </select>
          </div>
 
          {/* Período / Data */}
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">
              Período Temporal
            </label>
            <select
              value={dateFilter}
              onChange={e => setDateFilter(e.target.value as any)}
              className="w-full bg-slate-50 border border-slate-300 rounded-md px-3 py-2 text-xs font-medium text-slate-900 focus:outline-none focus:border-blue-600"
            >
              <option value="all">Todo o Histórico</option>
              <option value="this_week">Esta Semana (Segunda a Domingo)</option>
              <option value="last_week">Semana Anterior (Segunda a Domingo)</option>
              <option value="last_7_days">Últimos 7 Dias</option>
              <option value="this_month">Este Mês</option>
              <option value="last_month">Mês Anterior</option>
              <option value="last_30_days">Últimos 30 Dias</option>
              <option value="this_year">Este Ano ({new Date().getFullYear()})</option>
              <option value="custom">Intervalo Personalizado (Datas Livres)</option>
            </select>
          </div>
 
          {/* Motorista */}
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">
              Motorista
            </label>
            <select
              value={driverId}
              onChange={e => setDriverId(e.target.value)}
              className="w-full bg-slate-50 border border-slate-300 rounded-md px-3 py-2 text-xs font-medium text-slate-900 focus:outline-none focus:border-blue-600"
            >
              <option value="all">Todos os Motoristas</option>
              {drivers.map(d => (
                <option key={d.id} value={d.id}>{d.name}</option>
              ))}
            </select>
          </div>
 
          {/* Viatura / Matrícula */}
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">
              Viatura (Matrícula)
            </label>
            <select
              value={vehicleId}
              onChange={e => setVehicleId(e.target.value)}
              className="w-full bg-slate-50 border border-slate-300 rounded-md px-3 py-2 text-xs font-medium text-slate-900 focus:outline-none focus:border-blue-600"
            >
              <option value="all">Todas as Viaturas</option>
              {vehicles.map(v => (
                <option key={v.id} value={v.id}>{v.licensePlate} ({v.brand} {v.model})</option>
              ))}
            </select>
          </div>
 
          {/* Plataforma */}
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">
              Plataforma Domínio
            </label>
            <select
              value={platform}
              onChange={e => setPlatform(e.target.value as any)}
              className="w-full bg-slate-50 border border-slate-300 rounded-md px-3 py-2 text-xs font-medium text-slate-900 focus:outline-none focus:border-blue-600"
            >
              <option value="all">Todas (Uber + Bolt)</option>
              <option value="uber">Apenas Com Ganho Uber</option>
              <option value="bolt">Apenas Com Ganho Bolt</option>
            </select>
          </div>
 
          {/* Agrupar por */}
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">
              Agrupar Resultados Por
            </label>
            <select
              value={groupBy}
              onChange={e => setGroupBy(e.target.value as any)}
              className="w-full bg-slate-50 border border-slate-300 rounded-md px-3 py-2 text-xs font-semibold text-blue-700 bg-blue-50/50 border-blue-200 focus:outline-none focus:border-blue-600"
            >
              <option value="none">Nenhum (Lista de Registos Detalhada)</option>
              <option value="driver">Agrupar por Motorista</option>
              <option value="vehicle">Agrupar por Viatura (Matrícula)</option>
              <option value="month">Agrupar por Mês (YYYY-MM)</option>
              <option value="dayOfWeek">Agrupar por Dia da Semana</option>
            </select>
          </div>
 
          {/* Função de Agregação */}
          {groupBy !== 'none' && (
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Função de Agregação
              </label>
              <select
                value={aggregation}
                onChange={e => setAggregation(e.target.value as any)}
                className="w-full bg-slate-50 border border-slate-300 rounded-md px-3 py-2 text-xs font-medium text-slate-900 focus:outline-none focus:border-blue-600"
              >
                <option value="sum">Soma Total (Sum)</option>
                <option value="avg">Média por Registo (Average)</option>
                <option value="max">Valor Máximo (Max)</option>
                <option value="min">Valor Mínimo (Min)</option>
              </select>
            </div>
          )}
 
          {/* Valor Mínimo */}
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">
              Faturação Mínima (€)
            </label>
            <input
              type="number"
              placeholder="Ex: 100"
              value={minAmount || ''}
              onChange={e => setMinAmount(parseFloat(e.target.value) || 0)}
              className="w-full bg-slate-50 border border-slate-300 rounded-md px-3 py-2 text-xs font-medium text-slate-900 focus:outline-none focus:border-blue-600"
            />
          </div>
        </div>
 
        {/* Custom Date Range Picker when selected */}
        {dateFilter === 'custom' && (
          <div className="flex flex-wrap items-center gap-3 bg-blue-50/60 p-3 rounded-md border border-blue-200">
            <span className="text-xs font-bold text-blue-800 flex items-center space-x-1">
              <Calendar className="w-3.5 h-3.5" />
              <span>Intervalo Personalizado:</span>
            </span>
            <div className="flex items-center space-x-2">
              <label className="text-xs text-slate-600">De:</label>
              <input
                type="date"
                value={startDate}
                onChange={e => setStartDate(e.target.value)}
                className="bg-white border border-slate-300 rounded px-2 py-1 text-xs text-slate-900"
              />
            </div>
            <div className="flex items-center space-x-2">
              <label className="text-xs text-slate-600">Até:</label>
              <input
                type="date"
                value={endDate}
                onChange={e => setEndDate(e.target.value)}
                className="bg-white border border-slate-300 rounded px-2 py-1 text-xs text-slate-900"
              />
            </div>
          </div>
        )}
 
        {/* Column Selection Toggles */}
        <div className="pt-2">
          <label className="block text-xs font-bold text-slate-700 mb-2">
            Colunas Visíveis no Relatório ({visibleColumns.length} Selecionadas)
          </label>
          <div className="flex flex-wrap gap-1.5">
            {ALL_SHIFT_COLUMNS.map(col => {
              const isSelected = visibleColumns.includes(col.id);
              return (
                <button
                  key={col.id}
                  type="button"
                  onClick={() => toggleColumn(col.id)}
                  className={`px-2.5 py-1 rounded text-xs font-medium transition border flex items-center space-x-1 ${
                    isSelected
                      ? 'bg-blue-50 text-blue-700 border-blue-300 font-semibold'
                      : 'bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100'
                  }`}
                >
                  <CheckSquare className={`w-3 h-3 ${isSelected ? 'text-blue-600' : 'text-slate-400 opacity-50'}`} />
                  <span>{col.label}</span>
                </button>
              );
            })}
          </div>
        </div>
      </div>
 
      {/* KPI Cards Summary for Active Query */}
      <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-4 xl:grid-cols-8 gap-3">
        <div className="bg-white p-3 sm:p-3.5 rounded-lg border border-slate-200 shadow-sm flex flex-col justify-between min-h-[110px]">
          <span className="text-[10px] xl:text-[11px] text-slate-500 font-bold uppercase tracking-wider block leading-tight min-h-[2rem]">
            Faturação<br />Total
          </span>
          <p className="text-base sm:text-lg font-bold text-slate-900 my-1">
            {totalGrossQuery.toLocaleString('pt-PT', { style: 'currency', currency: 'EUR' })}
          </p>
          <span className="text-[10px] text-emerald-600 font-semibold truncate">da consulta ativa</span>
        </div>
 
        <div className="bg-white p-3 sm:p-3.5 rounded-lg border border-slate-200 shadow-sm flex flex-col justify-between min-h-[110px]">
          <span className="text-[10px] xl:text-[11px] text-slate-500 font-bold uppercase tracking-wider block leading-tight min-h-[2rem]">
            Horas em<br />Serviço
          </span>
          <p className="text-base sm:text-lg font-bold text-slate-900 my-1 font-mono">
            {formatHoursToHHMM(totalHoursQuery)}
          </p>
          <span className="text-[10px] text-slate-500 font-mono truncate">({totalHoursQuery.toFixed(1)} h dec.)</span>
        </div>
 
        {/* KPI Card: Média de Horas por Dia com Faturação */}
        <div className="bg-blue-50/40 p-3 sm:p-3.5 rounded-lg border border-blue-200 shadow-sm flex flex-col justify-between min-h-[110px]">
          <span className="text-[10px] xl:text-[11px] text-blue-700 font-bold uppercase tracking-wider block leading-tight min-h-[2rem]">
            Média Horas<br />/ Dia
          </span>
          <div>
            <p className="text-base sm:text-lg font-bold text-blue-900 my-1 font-mono">
              {formatHoursToHHMM(avgHoursPerActiveDay)} <span className="text-xs font-semibold text-blue-700 font-sans">/dia</span>
            </p>
          </div>
          <span className="text-[10px] text-blue-600 font-medium truncate" title={`${uniqueShiftDaysCount} dias com faturação no período`}>
            {avgHoursPerActiveDay > 0 ? `${avgHoursPerActiveDay.toFixed(1)}h em ${uniqueShiftDaysCount}d c/ fat.` : '0h em 0d'}
          </span>
        </div>
 
        <div className="bg-white p-3 sm:p-3.5 rounded-lg border border-slate-200 shadow-sm flex flex-col justify-between min-h-[110px]">
          <span className="text-[10px] xl:text-[11px] text-slate-500 font-bold uppercase tracking-wider block leading-tight min-h-[2rem]">
            Rendimento<br />Médio
          </span>
          <p className="text-base sm:text-lg font-bold text-blue-600 my-1">
            {avgPerHourQuery.toLocaleString('pt-PT', { style: 'currency', currency: 'EUR' })}/h
          </p>
          <span className="text-[10px] text-slate-500 truncate">eficiência global</span>
        </div>
 
        <div className="bg-white p-3 sm:p-3.5 rounded-lg border border-slate-200 shadow-sm flex flex-col justify-between min-h-[110px]">
          <span className="text-[10px] xl:text-[11px] text-slate-500 font-bold uppercase tracking-wider block leading-tight min-h-[2rem]">
            N.º de<br />Viagens
          </span>
          <p className="text-base sm:text-lg font-bold text-slate-900 my-1">{totalTripsQuery}</p>
          <span className="text-[10px] text-slate-500 truncate">{totalKmQuery} km total</span>
        </div>
 
        <div className="bg-white p-3 sm:p-3.5 rounded-lg border border-slate-200 shadow-sm flex flex-col justify-between min-h-[110px]">
          <span className="text-[10px] xl:text-[11px] text-slate-500 font-bold uppercase tracking-wider block leading-tight min-h-[2rem]">
            Combustível<br />/ Carga
          </span>
          <p className="text-base sm:text-lg font-bold text-rose-600 my-1">
            {totalFuelQuery.toLocaleString('pt-PT', { style: 'currency', currency: 'EUR' })}
          </p>
          <span className="text-[10px] text-slate-500 truncate">custo acumulado</span>
        </div>
 
        <div className="bg-white p-3 sm:p-3.5 rounded-lg border border-slate-200 shadow-sm flex flex-col justify-between min-h-[110px]">
          <span className="text-[10px] xl:text-[11px] text-slate-500 font-bold uppercase tracking-wider block leading-tight min-h-[2rem]">
            Renda<br />Viatura
          </span>
          <p className="text-base sm:text-lg font-bold text-amber-700 my-1">
            {totalRentalQuery.toLocaleString('pt-PT', { style: 'currency', currency: 'EUR' })}
          </p>
          <span className="text-[10px] text-slate-500 truncate">custo com rendas</span>
        </div>
 
        <div className="bg-white p-3 sm:p-3.5 rounded-lg border border-slate-200 shadow-sm flex flex-col justify-between min-h-[110px]">
          <span className="text-[10px] xl:text-[11px] text-slate-500 font-bold uppercase tracking-wider block leading-tight min-h-[2rem]">
            Lucro Líquido<br />Est.
          </span>
          <p className="text-base sm:text-lg font-bold text-emerald-600 my-1">
            {totalNetQuery.toLocaleString('pt-PT', { style: 'currency', currency: 'EUR' })}
          </p>
          <span className="text-[10px] text-emerald-600 font-semibold truncate">
            {totalGrossQuery > 0 ? `${((totalNetQuery / totalGrossQuery) * 100).toFixed(1)}% margem` : '0%'}
          </span>
        </div>
      </div>
 
      {/* Results View Switcher (Table vs Chart) */}
      <div className="bg-white rounded-lg border border-slate-200 shadow-sm overflow-hidden">
        <div className="p-4 bg-slate-50 border-b border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center space-x-2">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-800">
              Resultados da Consulta ({processedResults.length} Registos)
            </span>
          </div>
 
          <div className="flex items-center space-x-3">
            {/* Search Box */}
            <div className="relative">
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-2.5" />
              <input
                type="text"
                placeholder="Pesquisar nos resultados..."
                value={searchTerm}
                onChange={e => setSearchTerm(e.target.value)}
                className="pl-8 pr-3 py-1.5 bg-white border border-slate-300 rounded-md text-xs text-slate-900 focus:outline-none focus:border-blue-600 w-48 sm:w-64"
              />
            </div>
 
            {/* View Switcher Tabs */}
            <div className="flex items-center bg-slate-200/80 p-0.5 rounded-md text-xs font-medium">
              <button
                onClick={() => setActiveTabVisual('table')}
                className={`px-3 py-1 rounded-sm flex items-center space-x-1 transition ${
                  activeTabVisual === 'table' ? 'bg-white text-slate-900 shadow-sm font-bold' : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <Table className="w-3.5 h-3.5" />
                <span>Tabela</span>
              </button>
              <button
                onClick={() => setActiveTabVisual('chart')}
                className={`px-3 py-1 rounded-sm flex items-center space-x-1 transition ${
                  activeTabVisual === 'chart' ? 'bg-white text-slate-900 shadow-sm font-bold' : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <BarChart2 className="w-3.5 h-3.5" />
                <span>Gráfico</span>
              </button>
            </div>
          </div>
        </div>
 
        {/* CHART VIEW */}
        {activeTabVisual === 'chart' && (
          <div className="p-5">
            <h3 className="text-xs font-bold text-slate-700 uppercase tracking-wider mb-4">
              Visualização Gráfica do Desempenho
            </h3>
            {processedResults.length === 0 ? (
              <div className="p-8 text-center text-slate-500 text-xs">
                Sem dados suficientes para gerar gráfico. Ajuste os filtros.
              </div>
            ) : (
              <div className="h-80 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={processedResults.slice(0, 15)} margin={{ top: 10, right: 20, left: 0, bottom: 20 }}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                    <XAxis dataKey="date" tick={{ fontSize: 11, fill: '#64748b' }} />
                    <YAxis tick={{ fontSize: 11, fill: '#64748b' }} unit="€" />
                    <Tooltip
                      formatter={(val: any) => [`${Number(val).toFixed(2)} €`, '']}
                      contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155', color: '#fff', borderRadius: '6px', fontSize: '12px' }}
                    />
                    <Legend wrapperStyle={{ fontSize: '12px', paddingTop: '10px' }} />
                    <Bar dataKey="grossEarnings" name="Faturação Bruta (€)" fill="#2563eb" radius={[4, 4, 0, 0]} />
                    <Bar dataKey="fuelExpenseAmount" name="Combustível (€)" fill="#f43f5e" radius={[4, 4, 0, 0]} />
                    <Bar dataKey="netProfit" name="Lucro Líquido Est. (€)" fill="#10b981" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            )}
          </div>
        )}
 
        {/* TABLE VIEW */}
        {activeTabVisual === 'table' && (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-slate-700">
              <thead className="bg-slate-100 text-slate-700 uppercase font-bold border-b border-slate-200">
                <tr>
                  {ALL_SHIFT_COLUMNS.filter(c => visibleColumns.includes(c.id)).map(col => (
                    <th
                      key={col.id}
                      onClick={() => {
                        if (sortField === col.id) {
                          setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
                        } else {
                          setSortField(col.id);
                          setSortDirection('desc');
                        }
                      }}
                      className="p-3 cursor-pointer hover:bg-slate-200 transition select-none whitespace-nowrap"
                    >
                      <div className="flex items-center space-x-1">
                        <span>{col.label}</span>
                        {sortField === col.id && (
                          <span className="text-blue-600 font-bold">{sortDirection === 'asc' ? '↑' : '↓'}</span>
                        )}
                      </div>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                {processedResults.length === 0 ? (
                  <tr>
                    <td colSpan={visibleColumns.length} className="p-8 text-center text-slate-500">
                      Nenhum resultado encontrado com os parâmetros selecionados.
                    </td>
                  </tr>
                ) : (
                  processedResults.map((item, idx) => (
                    <tr key={item.id || idx} className="hover:bg-slate-50/80 transition">
                      {visibleColumns.includes('date') && (
                        <td className="p-3 font-semibold text-slate-900 whitespace-nowrap">{item.date}</td>
                      )}
                      {visibleColumns.includes('driverName') && (
                        <td className="p-3 font-medium text-slate-800 whitespace-nowrap">{item.driverName}</td>
                      )}
                      {visibleColumns.includes('vehiclePlate') && (
                        <td className="p-3 font-mono font-bold text-slate-800 whitespace-nowrap">{item.vehiclePlate}</td>
                      )}
                      {visibleColumns.includes('grossEarnings') && (
                        <td className="p-3 font-bold text-slate-900 whitespace-nowrap">
                          {item.grossEarnings.toLocaleString('pt-PT', { style: 'currency', currency: 'EUR' })}
                        </td>
                      )}
                      {visibleColumns.includes('uberEarnings') && (
                        <td className="p-3 text-slate-700 whitespace-nowrap">
                          {item.uberEarnings.toLocaleString('pt-PT', { style: 'currency', currency: 'EUR' })}
                        </td>
                      )}
                      {visibleColumns.includes('boltEarnings') && (
                        <td className="p-3 text-slate-700 whitespace-nowrap">
                          {item.boltEarnings.toLocaleString('pt-PT', { style: 'currency', currency: 'EUR' })}
                        </td>
                      )}
                      {visibleColumns.includes('hoursWorked') && (
                        <td className="p-3 font-mono text-slate-800 font-bold whitespace-nowrap">
                          {item.hoursWorkedHHMM}
                        </td>
                      )}
                      {visibleColumns.includes('kilometers') && (
                        <td className="p-3 text-slate-700 whitespace-nowrap">{item.kilometers} km</td>
                      )}
                      {visibleColumns.includes('tripsCount') && (
                        <td className="p-3 text-slate-700 whitespace-nowrap">{item.tripsCount}</td>
                      )}
                      {visibleColumns.includes('earningsPerHour') && (
                        <td className="p-3 font-semibold text-blue-700 whitespace-nowrap">
                          {item.earningsPerHour.toLocaleString('pt-PT', { style: 'currency', currency: 'EUR' })}/h
                        </td>
                      )}
                      {visibleColumns.includes('earningsPerKm') && (
                        <td className="p-3 text-slate-700 whitespace-nowrap">
                          {item.earningsPerKm.toLocaleString('pt-PT', { style: 'currency', currency: 'EUR' })}/km
                        </td>
                      )}
                      {visibleColumns.includes('fuelExpenseAmount') && (
                        <td className="p-3 text-rose-600 font-medium whitespace-nowrap">
                          {item.fuelExpenseAmount.toLocaleString('pt-PT', { style: 'currency', currency: 'EUR' })}
                        </td>
                      )}
                      {visibleColumns.includes('rentalExpenseAmount') && (
                        <td className="p-3 text-amber-700 font-medium whitespace-nowrap">
                          {item.rentalExpenseAmount.toLocaleString('pt-PT', { style: 'currency', currency: 'EUR' })}
                        </td>
                      )}
                      {visibleColumns.includes('netProfit') && (
                        <td className="p-3 font-bold text-emerald-600 whitespace-nowrap">
                          {item.netProfit.toLocaleString('pt-PT', { style: 'currency', currency: 'EUR' })}
                        </td>
                      )}
                    </tr>
                  ))
                )}
              </tbody>
 
              {/* Table Footer Summary Row */}
              {processedResults.length > 0 && (
                <tfoot className="bg-slate-100 font-bold text-slate-900 border-t-2 border-slate-300">
                  <tr>
                    {visibleColumns.includes('date') && <td className="p-3 uppercase text-[11px]">Total Consulta</td>}
                    {visibleColumns.includes('driverName') && <td className="p-3 text-slate-500">-</td>}
                    {visibleColumns.includes('vehiclePlate') && <td className="p-3 text-slate-500">-</td>}
                    {visibleColumns.includes('grossEarnings') && (
                      <td className="p-3 text-slate-900">
                        {totalGrossQuery.toLocaleString('pt-PT', { style: 'currency', currency: 'EUR' })}
                      </td>
                    )}
                    {visibleColumns.includes('uberEarnings') && (
                      <td className="p-3">
                        {processedResults.reduce((a, b) => a + b.uberEarnings, 0).toLocaleString('pt-PT', { style: 'currency', currency: 'EUR' })}
                      </td>
                    )}
                    {visibleColumns.includes('boltEarnings') && (
                      <td className="p-3">
                        {processedResults.reduce((a, b) => a + b.boltEarnings, 0).toLocaleString('pt-PT', { style: 'currency', currency: 'EUR' })}
                      </td>
                    )}
                    {visibleColumns.includes('hoursWorked') && (
                      <td className="p-3 font-mono text-slate-900">
                        {formatHoursToHHMM(totalHoursQuery)}
                      </td>
                    )}
                    {visibleColumns.includes('kilometers') && <td className="p-3">{totalKmQuery} km</td>}
                    {visibleColumns.includes('tripsCount') && <td className="p-3">{totalTripsQuery}</td>}
                    {visibleColumns.includes('earningsPerHour') && (
                      <td className="p-3 text-blue-700">
                        {avgPerHourQuery.toLocaleString('pt-PT', { style: 'currency', currency: 'EUR' })}/h
                      </td>
                    )}
                    {visibleColumns.includes('earningsPerKm') && <td className="p-3 text-slate-500">-</td>}
                    {visibleColumns.includes('fuelExpenseAmount') && (
                      <td className="p-3 text-rose-600">
                        {totalFuelQuery.toLocaleString('pt-PT', { style: 'currency', currency: 'EUR' })}
                      </td>
                    )}
                    {visibleColumns.includes('rentalExpenseAmount') && (
                      <td className="p-3 text-amber-700">
                        {totalRentalQuery.toLocaleString('pt-PT', { style: 'currency', currency: 'EUR' })}
                      </td>
                    )}
                    {visibleColumns.includes('netProfit') && (
                      <td className="p-3 text-emerald-600">
                        {totalNetQuery.toLocaleString('pt-PT', { style: 'currency', currency: 'EUR' })}
                      </td>
                    )}
                  </tr>
                </tfoot>
              )}
            </table>
          </div>
        )}
      </div>
 
      {/* Save Query Modal */}
      {showSaveModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full p-6 space-y-4 border border-slate-200">
            <div className="flex items-center space-x-2 border-b border-slate-100 pb-3">
              <Bookmark className="w-5 h-5 text-blue-600" />
              <h3 className="text-base font-bold text-slate-900">Guardar Consulta Personalizada</h3>
            </div>
 
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Nome do Modelo de Consulta *
              </label>
              <input
                type="text"
                placeholder="Ex: Rendimento Médio €/h por Motorista em Agosto"
                value={queryName}
                onChange={e => setQueryName(e.target.value)}
                className="w-full bg-slate-50 border border-slate-300 rounded-md px-3 py-2 text-xs text-slate-900 focus:outline-none focus:border-blue-600"
                autoFocus
              />
            </div>
 
            <p className="text-xs text-slate-500 leading-relaxed">
              Ao guardar, este conjunto de parâmetros (origem de dados, agrupamento, intervalo de datas e colunas visíveis) ficará disponível na sua lista de modelos de consulta.
            </p>
 
            <div className="flex items-center justify-end space-x-2 pt-2 border-t border-slate-100">
              <button
                onClick={() => setShowSaveModal(false)}
                className="px-3.5 py-2 text-xs font-medium text-slate-600 hover:text-slate-800"
              >
                Cancelar
              </button>
              <button
                onClick={handleSaveQuery}
                disabled={!queryName.trim()}
                className="px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white text-xs font-bold rounded-md shadow-sm transition"
              >
                Guardar Consulta
              </button>
            </div>
          </div>
        </div>
      )}
 
      {/* Print Preview & Action Modal */}
      {showPrintModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/70 backdrop-blur-sm p-3 sm:p-6 overflow-y-auto">
          <div className="bg-white rounded-xl shadow-2xl max-w-4xl w-full flex flex-col max-h-[92vh] border border-slate-200 overflow-hidden">
            {/* Modal Header */}
            <div className="p-4 bg-slate-900 text-white flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <Printer className="w-5 h-5 text-blue-400" />
                <h3 className="text-sm font-bold tracking-wide">Impressão de Relatório TVDE</h3>
              </div>
              <button
                onClick={() => setShowPrintModal(false)}
                className="text-slate-400 hover:text-white p-1 rounded-md transition"
                title="Fechar"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
 
            {/* Modal Actions Bar */}
            <div className="p-3 bg-slate-100 border-b border-slate-200 flex flex-wrap items-center justify-between gap-2 text-xs">
              <div className="text-slate-600 font-medium">
                Escolha o método de impressão preferido para o seu relatório:
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <button
                  onClick={handlePrintInIframe}
                  className="px-3.5 py-2 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-md shadow-sm transition flex items-center space-x-1.5"
                  title="Diálogo de impressão padrão do navegador"
                >
                  <Printer className="w-4 h-4" />
                  <span>Imprimir Agora</span>
                </button>
 
                <button
                  onClick={handleOpenInNewTab}
                  className="px-3.5 py-2 bg-white hover:bg-slate-50 text-slate-700 border border-slate-300 font-bold rounded-md shadow-sm transition flex items-center space-x-1.5"
                  title="Abre numa nova aba livre de restrições para imprimir ou guardar em PDF"
                >
                  <ExternalLink className="w-4 h-4 text-blue-600" />
                  <span>Abrir em Nova Aba / PDF</span>
                </button>
 
                <button
                  onClick={handleDownloadPrintableHtml}
                  className="px-3 py-2 bg-white hover:bg-slate-50 text-slate-700 border border-slate-300 font-medium rounded-md shadow-sm transition flex items-center space-x-1.5"
                  title="Descarregar ficheiro de relatório pronto a imprimir"
                >
                  <Download className="w-4 h-4 text-slate-500" />
                  <span>Guardar HTML</span>
                </button>
              </div>
            </div>
 
            {/* Document Preview Sheet */}
            <div className="p-4 sm:p-6 overflow-y-auto bg-slate-200/60 flex justify-center flex-1">
              <div className="bg-white shadow-md border border-slate-300 rounded-sm p-6 sm:p-8 max-w-3xl w-full text-slate-900 text-xs space-y-5">
                {/* Preview Header */}
                <div className="flex items-start justify-between border-b-2 border-blue-600 pb-3">
                  <div>
                    <h2 className="text-lg font-bold text-slate-900">Relatório de Frota TVDE</h2>
                    <p className="text-xs text-slate-500">Consulta Personalizada de Actividade e Rentabilidade</p>
                  </div>
                  <div className="text-right text-[10px] text-slate-500">
                    <div><strong>Emitido em:</strong> {new Date().toLocaleDateString('pt-PT')}</div>
                    <div><strong>Registos:</strong> {processedResults.length} linhas</div>
                    <div>TVDE FleetMaster</div>
                  </div>
                </div>
 
                {/* KPI Preview Grid */}
                <div className="grid grid-cols-4 sm:grid-cols-8 gap-2 text-[10px]">
                  <div className="border border-slate-200 p-2 rounded bg-slate-50">
                    <div className="text-[8px] font-bold text-slate-500 uppercase">Faturação</div>
                    <div className="font-bold text-slate-900 mt-1">{totalGrossQuery.toLocaleString('pt-PT', { style: 'currency', currency: 'EUR' })}</div>
                  </div>
                  <div className="border border-slate-200 p-2 rounded bg-slate-50">
                    <div className="text-[8px] font-bold text-slate-500 uppercase">Horas</div>
                    <div className="font-bold font-mono mt-1">{formatHoursToHHMM(totalHoursQuery)}</div>
                  </div>
                  <div className="border border-blue-200 p-2 rounded bg-blue-50/50">
                    <div className="text-[8px] font-bold text-blue-700 uppercase">Média h/dia</div>
                    <div className="font-bold font-mono text-blue-900 mt-1">{formatHoursToHHMM(avgHoursPerActiveDay)}</div>
                    <div className="text-[7px] text-blue-600 mt-0.5">{uniqueShiftDaysCount}d c/ fat.</div>
                  </div>
                  <div className="border border-slate-200 p-2 rounded bg-slate-50">
                    <div className="text-[8px] font-bold text-slate-500 uppercase">Rend. h</div>
                    <div className="font-bold text-blue-600 mt-1">{avgPerHourQuery.toLocaleString('pt-PT', { style: 'currency', currency: 'EUR' })}/h</div>
                  </div>
                  <div className="border border-slate-200 p-2 rounded bg-slate-50">
                    <div className="text-[8px] font-bold text-slate-500 uppercase">Viagens</div>
                    <div className="font-bold text-slate-900 mt-1">{totalTripsQuery}</div>
                  </div>
                  <div className="border border-slate-200 p-2 rounded bg-slate-50">
                    <div className="text-[8px] font-bold text-slate-500 uppercase">Combustível</div>
                    <div className="font-bold text-rose-600 mt-1">{totalFuelQuery.toLocaleString('pt-PT', { style: 'currency', currency: 'EUR' })}</div>
                  </div>
                  <div className="border border-slate-200 p-2 rounded bg-slate-50">
                    <div className="text-[8px] font-bold text-slate-500 uppercase">Renda</div>
                    <div className="font-bold text-amber-700 mt-1">{totalRentalQuery.toLocaleString('pt-PT', { style: 'currency', currency: 'EUR' })}</div>
                  </div>
                  <div className="border border-slate-200 p-2 rounded bg-slate-50">
                    <div className="text-[8px] font-bold text-slate-500 uppercase">Lucro Est.</div>
                    <div className="font-bold text-emerald-600 mt-1">{totalNetQuery.toLocaleString('pt-PT', { style: 'currency', currency: 'EUR' })}</div>
                  </div>
                </div>
 
                {/* Table Preview */}
                <div className="border border-slate-200 rounded overflow-hidden">
                  <table className="w-full text-left text-[10px]">
                    <thead className="bg-slate-100 font-bold border-b border-slate-200">
                      <tr>
                        {ALL_SHIFT_COLUMNS.filter(c => visibleColumns.includes(c.id)).map(col => (
                          <th key={col.id} className="p-1.5 border-r last:border-0 border-slate-200 whitespace-nowrap">{col.label}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-200">
                      {processedResults.slice(0, 10).map((r, i) => (
                        <tr key={i} className="hover:bg-slate-50">
                          {visibleColumns.includes('date') && <td className="p-1.5 border-r border-slate-100 font-medium">{r.date}</td>}
                          {visibleColumns.includes('driverName') && <td className="p-1.5 border-r border-slate-100">{r.driverName}</td>}
                          {visibleColumns.includes('vehiclePlate') && <td className="p-1.5 border-r border-slate-100 font-mono">{r.vehiclePlate}</td>}
                          {visibleColumns.includes('grossEarnings') && <td className="p-1.5 border-r border-slate-100 font-bold">{r.grossEarnings.toFixed(2)} €</td>}
                          {visibleColumns.includes('uberEarnings') && <td className="p-1.5 border-r border-slate-100">{r.uberEarnings.toFixed(2)} €</td>}
                          {visibleColumns.includes('boltEarnings') && <td className="p-1.5 border-r border-slate-100">{r.boltEarnings.toFixed(2)} €</td>}
                          {visibleColumns.includes('hoursWorked') && <td className="p-1.5 border-r border-slate-100 font-mono font-bold">{r.hoursWorkedHHMM}</td>}
                          {visibleColumns.includes('kilometers') && <td className="p-1.5 border-r border-slate-100">{r.kilometers} km</td>}
                          {visibleColumns.includes('tripsCount') && <td className="p-1.5 border-r border-slate-100">{r.tripsCount}</td>}
                          {visibleColumns.includes('earningsPerHour') && <td className="p-1.5 border-r border-slate-100 text-blue-700">{r.earningsPerHour.toFixed(2)} €/h</td>}
                          {visibleColumns.includes('earningsPerKm') && <td className="p-1.5 border-r border-slate-100">{r.earningsPerKm.toFixed(2)} €/km</td>}
                          {visibleColumns.includes('fuelExpenseAmount') && <td className="p-1.5 border-r border-slate-100 text-rose-600">{r.fuelExpenseAmount.toFixed(2)} €</td>}
                          {visibleColumns.includes('rentalExpenseAmount') && <td className="p-1.5 border-r border-slate-100 text-amber-700">{r.rentalExpenseAmount.toFixed(2)} €</td>}
                          {visibleColumns.includes('netProfit') && <td className="p-1.5 border-r border-slate-100 text-emerald-600 font-bold">{r.netProfit.toFixed(2)} €</td>}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                  {processedResults.length > 10 && (
                    <div className="p-2 bg-slate-50 text-center text-[9px] text-slate-500 border-t border-slate-200">
                      + {processedResults.length - 10} linhas incluídas na impressão completa
                    </div>
                  )}
                </div>
 
                <div className="pt-2 border-t border-slate-200 flex items-center justify-between text-[9px] text-slate-400">
                  <span>TVDE FleetMaster Document</span>
                  <span>Página 1 de 1</span>
                </div>
              </div>
            </div>
 
            {/* Modal Footer */}
            <div className="p-3 bg-white border-t border-slate-200 flex items-center justify-between">
              <span className="text-xs text-slate-500">
                Se a janela de impressão não abrir no seu navegador, clique em <strong>"Abrir em Nova Aba / PDF"</strong>.
              </span>
              <button
                onClick={() => setShowPrintModal(false)}
                className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold text-xs rounded-md transition"
              >
                Fechar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};