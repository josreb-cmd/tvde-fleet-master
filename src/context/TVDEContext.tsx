import React, { createContext, useContext, useState, useEffect, useMemo } from 'react';
import {
  collection,
  doc,
  setDoc,
  updateDoc,
  deleteDoc,
  onSnapshot,
  writeBatch
} from 'firebase/firestore';
import { signInAnonymously } from 'firebase/auth';
import { db, auth } from '../lib/firebase';
import {
  Driver,
  Vehicle,
  DailyShiftLog,
  Expense,
  AppNotification,
  MonthlyStats
} from '../types';
import {
  INITIAL_DRIVERS,
  INITIAL_VEHICLES,
  INITIAL_SHIFT_LOGS,
  INITIAL_EXPENSES,
  INITIAL_NOTIFICATIONS
} from '../data/mockData';

export type UserRole = 'manager' | 'driver';

interface TVDEContextType {
  role: UserRole;
  setRole: (role: UserRole) => void;
  currentDriverId: string;
  setCurrentDriverId: (driverId: string) => void;
  drivers: Driver[];
  vehicles: Vehicle[];
  shiftLogs: DailyShiftLog[];
  expenses: Expense[];
  notifications: AppNotification[];
  selectedMonth: string; // YYYY-MM
  setSelectedMonth: (month: string) => void;
  isCloudSynced: boolean;
  
  // Actions
  addShiftLog: (log: Omit<DailyShiftLog, 'id' | 'status'>) => void;
  updateShiftLogStatus: (id: string, status: DailyShiftLog['status']) => void;
  deleteShiftLog: (id: string) => void;
  
  addExpense: (expense: Omit<Expense, 'id'>) => void;
  deleteExpense: (id: string) => void;
  
  addVehicle: (vehicle: Omit<Vehicle, 'id'>) => void;
  updateVehicle: (id: string, vehicle: Partial<Vehicle>) => void;
  
  addDriver: (driver: Omit<Driver, 'id'>) => void;
  updateDriver: (id: string, driver: Partial<Driver>) => void;
  
  markNotificationAsRead: (id: string) => void;
  markAllNotificationsAsRead: () => void;
  addNotification: (notification: Omit<AppNotification, 'id' | 'date' | 'read'>) => void;
  
  // Reset Data
  resetToDefaultData: () => void;
  
  // Calculated Statistics
  monthlyStats: MonthlyStats;
  historicalMonthlyData: MonthlyStats[];
  driverPerformanceList: Array<{
    driver: Driver;
    totalEarnings: number;
    totalKm: number;
    totalTrips: number;
    totalHours: number;
    earningsPerHour: number;
    earningsPerKm: number;
  }>;
  vehicleProfitabilityList: Array<{
    vehicle: Vehicle;
    grossEarnings: number;
    totalExpenses: number;
    netProfit: number;
    totalKm: number;
    costPerKm: number;
  }>;
}

const TVDEContext = createContext<TVDEContextType | undefined>(undefined);

const STORAGE_KEYS = {
  ROLE: 'tvde_user_role_v1',
  DRIVER_ID: 'tvde_current_driver_v1',
  MONTH: 'tvde_selected_month_v1'
};

export const TVDEProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [role, setRoleState] = useState<UserRole>(() => {
    return (localStorage.getItem(STORAGE_KEYS.ROLE) as UserRole) || 'manager';
  });

  const [currentDriverId, setCurrentDriverIdState] = useState<string>(() => {
    return localStorage.getItem(STORAGE_KEYS.DRIVER_ID) || 'drv-1';
  });

  const [selectedMonth, setSelectedMonthState] = useState<string>(() => {
    return localStorage.getItem(STORAGE_KEYS.MONTH) || '2026-07';
  });

  const [drivers, setDrivers] = useState<Driver[]>(INITIAL_DRIVERS);
  const [vehicles, setVehicles] = useState<Vehicle[]>(INITIAL_VEHICLES);
  const [shiftLogs, setShiftLogs] = useState<DailyShiftLog[]>(INITIAL_SHIFT_LOGS);
  const [expenses, setExpenses] = useState<Expense[]>(INITIAL_EXPENSES);
  const [notifications, setNotifications] = useState<AppNotification[]>(INITIAL_NOTIFICATIONS);
  const [isCloudSynced, setIsCloudSynced] = useState<boolean>(false);

  // Sign in anonymously to ensure Firestore auth token is present
  useEffect(() => {
    signInAnonymously(auth).catch(err => {
      console.warn("Firebase Auth notice:", err);
    });
  }, []);

  // Real-time Firestore Sync for DRIVERS
  useEffect(() => {
    const unsub = onSnapshot(collection(db, 'drivers'), async snapshot => {
      if (snapshot.empty) {
        // Seed initial data to cloud if collection is empty
        const batch = writeBatch(db);
        INITIAL_DRIVERS.forEach(d => {
          batch.set(doc(db, 'drivers', d.id), d);
        });
        await batch.commit();
      } else {
        const loaded = snapshot.docs.map(doc => doc.data() as Driver);
        setDrivers(loaded);
        setIsCloudSynced(true);
      }
    }, err => {
      console.error("Firestore drivers listener error:", err);
    });
    return () => unsub();
  }, []);

  // Real-time Firestore Sync for VEHICLES
  useEffect(() => {
    const unsub = onSnapshot(collection(db, 'vehicles'), async snapshot => {
      if (snapshot.empty) {
        const batch = writeBatch(db);
        INITIAL_VEHICLES.forEach(v => {
          batch.set(doc(db, 'vehicles', v.id), v);
        });
        await batch.commit();
      } else {
        const loaded = snapshot.docs.map(doc => doc.data() as Vehicle);
        setVehicles(loaded);
        setIsCloudSynced(true);
      }
    }, err => {
      console.error("Firestore vehicles listener error:", err);
    });
    return () => unsub();
  }, []);

  // Real-time Firestore Sync for SHIFT LOGS
  useEffect(() => {
    const unsub = onSnapshot(collection(db, 'shiftLogs'), async snapshot => {
      if (snapshot.empty) {
        const batch = writeBatch(db);
        INITIAL_SHIFT_LOGS.forEach(s => {
          batch.set(doc(db, 'shiftLogs', s.id), s);
        });
        await batch.commit();
      } else {
        const loaded = snapshot.docs.map(doc => doc.data() as DailyShiftLog);
        // Sort descending by date
        loaded.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
        setShiftLogs(loaded);
        setIsCloudSynced(true);
      }
    }, err => {
      console.error("Firestore shiftLogs listener error:", err);
    });
    return () => unsub();
  }, []);

  // Real-time Firestore Sync for EXPENSES
  useEffect(() => {
    const unsub = onSnapshot(collection(db, 'expenses'), async snapshot => {
      if (snapshot.empty) {
        const batch = writeBatch(db);
        INITIAL_EXPENSES.forEach(e => {
          batch.set(doc(db, 'expenses', e.id), e);
        });
        await batch.commit();
      } else {
        const loaded = snapshot.docs.map(doc => doc.data() as Expense);
        loaded.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
        setExpenses(loaded);
        setIsCloudSynced(true);
      }
    }, err => {
      console.error("Firestore expenses listener error:", err);
    });
    return () => unsub();
  }, []);

  // Real-time Firestore Sync for NOTIFICATIONS
  useEffect(() => {
    const unsub = onSnapshot(collection(db, 'notifications'), async snapshot => {
      if (snapshot.empty) {
        const batch = writeBatch(db);
        INITIAL_NOTIFICATIONS.forEach(n => {
          batch.set(doc(db, 'notifications', n.id), n);
        });
        await batch.commit();
      } else {
        const loaded = snapshot.docs.map(doc => doc.data() as AppNotification);
        loaded.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
        setNotifications(loaded);
        setIsCloudSynced(true);
      }
    }, err => {
      console.error("Firestore notifications listener error:", err);
    });
    return () => unsub();
  }, []);

  const setRole = (newRole: UserRole) => {
    setRoleState(newRole);
    localStorage.setItem(STORAGE_KEYS.ROLE, newRole);
  };

  const setCurrentDriverId = (driverId: string) => {
    setCurrentDriverIdState(driverId);
    localStorage.setItem(STORAGE_KEYS.DRIVER_ID, driverId);
  };

  const setSelectedMonth = (month: string) => {
    setSelectedMonthState(month);
    localStorage.setItem(STORAGE_KEYS.MONTH, month);
  };

  // Check vehicle maintenance alerts whenever shiftLogs change
  useEffect(() => {
    vehicles.forEach(vehicle => {
      const kmToMaintenance = vehicle.nextMaintenanceKm - vehicle.currentKm;
      if (kmToMaintenance <= 500 && kmToMaintenance > 0) {
        const exists = notifications.some(
          n => n.relatedVehicleId === vehicle.id && n.type === 'maintenance' && !n.read
        );
        if (!exists) {
          addNotification({
            type: 'maintenance',
            title: `Aviso de Revisão Próxima (${vehicle.brand} ${vehicle.model})`,
            message: `A viatura ${vehicle.licensePlate} está a escassos ${kmToMaintenance} km da manutenção programada.`,
            priority: 'high',
            relatedVehicleId: vehicle.id,
            actionRequired: 'Agendar oficina'
          });
        }
      }
    });
  }, [shiftLogs, vehicles]);

  // Actions writing directly to Firestore
  const addShiftLog = async (logData: Omit<DailyShiftLog, 'id' | 'status'>) => {
    const newId = `sft-${Date.now()}`;
    const newLog: DailyShiftLog = {
      ...logData,
      id: newId,
      status: 'submitted'
    };

    try {
      await setDoc(doc(db, 'shiftLogs', newId), newLog);

      if (logData.vehicleId) {
        const targetVehicle = vehicles.find(v => v.id === logData.vehicleId);
        if (targetVehicle) {
          const newKm = Math.max(targetVehicle.currentKm, targetVehicle.currentKm + logData.kilometers);
          await updateDoc(doc(db, 'vehicles', logData.vehicleId), { currentKm: newKm });
        }
      }
    } catch (err) {
      console.error("Error adding shiftLog to Firestore:", err);
    }
  };

  const updateShiftLogStatus = async (id: string, status: DailyShiftLog['status']) => {
    try {
      await updateDoc(doc(db, 'shiftLogs', id), { status });
    } catch (err) {
      console.error("Error updating shiftLog in Firestore:", err);
    }
  };

  const deleteShiftLog = async (id: string) => {
    try {
      await deleteDoc(doc(db, 'shiftLogs', id));
    } catch (err) {
      console.error("Error deleting shiftLog from Firestore:", err);
    }
  };

  const addExpense = async (expenseData: Omit<Expense, 'id'>) => {
    const newId = `exp-${Date.now()}`;
    const newExpense: Expense = {
      ...expenseData,
      id: newId
    };
    try {
      await setDoc(doc(db, 'expenses', newId), newExpense);
    } catch (err) {
      console.error("Error adding expense to Firestore:", err);
    }
  };

  const deleteExpense = async (id: string) => {
    try {
      await deleteDoc(doc(db, 'expenses', id));
    } catch (err) {
      console.error("Error deleting expense from Firestore:", err);
    }
  };

  const addVehicle = async (vehicleData: Omit<Vehicle, 'id'>) => {
    const newId = `veh-${Date.now()}`;
    const newVehicle: Vehicle = {
      ...vehicleData,
      id: newId
    };
    try {
      await setDoc(doc(db, 'vehicles', newId), newVehicle);
    } catch (err) {
      console.error("Error adding vehicle to Firestore:", err);
    }
  };

  const updateVehicle = async (id: string, vehicleData: Partial<Vehicle>) => {
    try {
      await updateDoc(doc(db, 'vehicles', id), vehicleData);
    } catch (err) {
      console.error("Error updating vehicle in Firestore:", err);
    }
  };

  const addDriver = async (driverData: Omit<Driver, 'id'>) => {
    const newId = `drv-${Date.now()}`;
    const newDriver: Driver = {
      ...driverData,
      id: newId
    };
    try {
      await setDoc(doc(db, 'drivers', newId), newDriver);
    } catch (err) {
      console.error("Error adding driver to Firestore:", err);
    }
  };

  const updateDriver = async (id: string, driverData: Partial<Driver>) => {
    try {
      await updateDoc(doc(db, 'drivers', id), driverData);
    } catch (err) {
      console.error("Error updating driver in Firestore:", err);
    }
  };

  const markNotificationAsRead = async (id: string) => {
    try {
      await updateDoc(doc(db, 'notifications', id), { read: true });
    } catch (err) {
      console.error("Error marking notification read in Firestore:", err);
    }
  };

  const markAllNotificationsAsRead = async () => {
    try {
      const batch = writeBatch(db);
      notifications.forEach(n => {
        batch.update(doc(db, 'notifications', n.id), { read: true });
      });
      await batch.commit();
    } catch (err) {
      console.error("Error marking all notifications read in Firestore:", err);
    }
  };

  const addNotification = async (nData: Omit<AppNotification, 'id' | 'date' | 'read'>) => {
    const newId = `notif-${Date.now()}`;
    const newNotif: AppNotification = {
      ...nData,
      id: newId,
      date: new Date().toISOString(),
      read: false
    };
    try {
      await setDoc(doc(db, 'notifications', newId), newNotif);
    } catch (err) {
      console.error("Error adding notification to Firestore:", err);
    }
  };

  const resetToDefaultData = async () => {
    try {
      const batch = writeBatch(db);

      drivers.forEach(d => batch.delete(doc(db, 'drivers', d.id)));
      vehicles.forEach(v => batch.delete(doc(db, 'vehicles', v.id)));
      shiftLogs.forEach(s => batch.delete(doc(db, 'shiftLogs', s.id)));
      expenses.forEach(e => batch.delete(doc(db, 'expenses', e.id)));
      notifications.forEach(n => batch.delete(doc(db, 'notifications', n.id)));

      INITIAL_DRIVERS.forEach(d => batch.set(doc(db, 'drivers', d.id), d));
      INITIAL_VEHICLES.forEach(v => batch.set(doc(db, 'vehicles', v.id), v));
      INITIAL_SHIFT_LOGS.forEach(s => batch.set(doc(db, 'shiftLogs', s.id), s));
      INITIAL_EXPENSES.forEach(e => batch.set(doc(db, 'expenses', e.id), e));
      INITIAL_NOTIFICATIONS.forEach(n => batch.set(doc(db, 'notifications', n.id), n));

      await batch.commit();

      setSelectedMonthState('2026-07');
      setRoleState('manager');
      localStorage.clear();
    } catch (err) {
      console.error("Error resetting data in Firestore:", err);
    }
  };

  // CALCULATED MONTHLY STATS
  const monthlyStats = useMemo(() => {
    const targetMonth = selectedMonth; // e.g. '2026-07'

    const filteredShifts = shiftLogs.filter(s => s.date.startsWith(targetMonth));
    const filteredExpenses = expenses.filter(e => e.date.startsWith(targetMonth));

    const totalGrossEarnings = filteredShifts.reduce((acc, s) => acc + s.grossEarnings, 0);
    const totalTrips = filteredShifts.reduce((acc, s) => acc + s.tripsCount, 0);
    const totalKm = filteredShifts.reduce((acc, s) => acc + s.kilometers, 0);
    const totalHours = filteredShifts.reduce((acc, s) => acc + s.hoursWorked, 0);

    const totalFuelCost = filteredExpenses
      .filter(e => e.category === 'fuel_charging')
      .reduce((acc, e) => acc + e.amount, 0) +
      filteredShifts.reduce((acc, s) => acc + (s.fuelExpenseAmount || 0), 0);

    const totalMaintenanceCost = filteredExpenses
      .filter(e => e.category === 'maintenance')
      .reduce((acc, e) => acc + e.amount, 0);

    const totalInsuranceCost = filteredExpenses
      .filter(e => e.category === 'insurance')
      .reduce((acc, e) => acc + e.amount, 0);

    const totalVehicleRentals = filteredExpenses
      .filter(e => e.category === 'vehicle_rental')
      .reduce((acc, e) => acc + e.amount, 0);

    const totalExpenses = filteredExpenses.reduce((acc, e) => acc + e.amount, 0);
    const netProfit = totalGrossEarnings - totalExpenses;

    const earningsPerKm = totalKm > 0 ? totalGrossEarnings / totalKm : 0;
    const earningsPerHour = totalHours > 0 ? totalGrossEarnings / totalHours : 0;
    const netProfitMarginPct = totalGrossEarnings > 0 ? (netProfit / totalGrossEarnings) * 100 : 0;

    let monthName = `Ano Completo ${targetMonth}`;
    if (targetMonth.includes('-')) {
      const dateObj = new Date(`${targetMonth}-01T00:00:00`);
      const monthNamesPt = [
        'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
        'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'
      ];
      monthName = `${monthNamesPt[dateObj.getMonth()]} ${dateObj.getFullYear()}`;
    }

    return {
      monthKey: targetMonth,
      monthName,
      totalGrossEarnings,
      totalExpenses,
      netProfit,
      totalTrips,
      totalKm,
      totalHours,
      totalFuelCost,
      totalMaintenanceCost,
      totalInsuranceCost,
      totalVehicleRentals,
      earningsPerKm,
      earningsPerHour,
      netProfitMarginPct
    };
  }, [selectedMonth, shiftLogs, expenses]);

  // HISTORICAL COMPARATIVE MONTHLY DATA
  const historicalMonthlyData = useMemo(() => {
    const monthKeys = ['2026-03', '2026-04', '2026-05', '2026-06', '2026-07'];
    const monthNamesMap: Record<string, string> = {
      '2026-03': 'Mar 26',
      '2026-04': 'Abr 26',
      '2026-05': 'Mai 26',
      '2026-06': 'Jun 26',
      '2026-07': 'Jul 26'
    };

    return monthKeys.map(mKey => {
      const mShifts = shiftLogs.filter(s => s.date.startsWith(mKey));
      const mExpenses = expenses.filter(e => e.date.startsWith(mKey));

      const gross = mShifts.reduce((acc, s) => acc + s.grossEarnings, 0);
      const exp = mExpenses.reduce((acc, e) => acc + e.amount, 0);
      const trips = mShifts.reduce((acc, s) => acc + s.tripsCount, 0);
      const km = mShifts.reduce((acc, s) => acc + s.kilometers, 0);
      const hours = mShifts.reduce((acc, s) => acc + s.hoursWorked, 0);

      const isCurrentMonth = mKey === '2026-07';
      const syntheticBaseGross = isCurrentMonth ? gross : Math.max(gross, mKey === '2026-06' ? 4120 : mKey === '2026-05' ? 3850 : 3600);
      const syntheticBaseExp = isCurrentMonth ? exp : Math.max(exp, mKey === '2026-06' ? 1280 : mKey === '2026-05' ? 1150 : 1080);

      return {
        monthKey: mKey,
        monthName: monthNamesMap[mKey] || mKey,
        totalGrossEarnings: syntheticBaseGross,
        totalExpenses: syntheticBaseExp,
        netProfit: syntheticBaseGross - syntheticBaseExp,
        totalTrips: isCurrentMonth ? trips : (trips || 480),
        totalKm: isCurrentMonth ? km : (km || 6200),
        totalHours: isCurrentMonth ? hours : (hours || 210),
        totalFuelCost: 350,
        totalMaintenanceCost: 280,
        totalInsuranceCost: 400,
        totalVehicleRentals: 750,
        earningsPerKm: km > 0 ? gross / km : 0.65,
        earningsPerHour: hours > 0 ? gross / hours : 19.5,
        netProfitMarginPct: syntheticBaseGross > 0 ? ((syntheticBaseGross - syntheticBaseExp) / syntheticBaseGross) * 100 : 0
      };
    });
  }, [shiftLogs, expenses]);

  // DRIVER PERFORMANCE COMPARISON
  const driverPerformanceList = useMemo(() => {
    return drivers.map(driver => {
      const dShifts = shiftLogs.filter(s => s.driverId === driver.id && s.date.startsWith(selectedMonth));
      const totalEarnings = dShifts.reduce((acc, s) => acc + s.grossEarnings, 0);
      const totalKm = dShifts.reduce((acc, s) => acc + s.kilometers, 0);
      const totalTrips = dShifts.reduce((acc, s) => acc + s.tripsCount, 0);
      const totalHours = dShifts.reduce((acc, s) => acc + s.hoursWorked, 0);

      return {
        driver,
        totalEarnings,
        totalKm,
        totalTrips,
        totalHours,
        earningsPerHour: totalHours > 0 ? totalEarnings / totalHours : 0,
        earningsPerKm: totalKm > 0 ? totalEarnings / totalKm : 0
      };
    }).sort((a, b) => b.totalEarnings - a.totalEarnings);
  }, [drivers, shiftLogs, selectedMonth]);

  // VEHICLE PROFITABILITY LIST
  const vehicleProfitabilityList = useMemo(() => {
    return vehicles.map(vehicle => {
      const vShifts = shiftLogs.filter(s => s.vehicleId === vehicle.id && s.date.startsWith(selectedMonth));
      const vExpenses = expenses.filter(e => e.vehicleId === vehicle.id && e.date.startsWith(selectedMonth));

      const grossEarnings = vShifts.reduce((acc, s) => acc + s.grossEarnings, 0);
      const totalExpenses = vExpenses.reduce((acc, e) => acc + e.amount, 0);
      const totalKm = vShifts.reduce((acc, s) => acc + s.kilometers, 0);
      const netProfit = grossEarnings - totalExpenses;

      return {
        vehicle,
        grossEarnings,
        totalExpenses,
        netProfit,
        totalKm,
        costPerKm: totalKm > 0 ? totalExpenses / totalKm : 0
      };
    });
  }, [vehicles, shiftLogs, expenses, selectedMonth]);

  return (
    <TVDEContext.Provider
      value={{
        role,
        setRole,
        currentDriverId,
        setCurrentDriverId,
        drivers,
        vehicles,
        shiftLogs,
        expenses,
        notifications,
        selectedMonth,
        setSelectedMonth,
        isCloudSynced,
        addShiftLog,
        updateShiftLogStatus,
        deleteShiftLog,
        addExpense,
        deleteExpense,
        addVehicle,
        updateVehicle,
        addDriver,
        updateDriver,
        markNotificationAsRead,
        markAllNotificationsAsRead,
        addNotification,
        resetToDefaultData,
        monthlyStats,
        historicalMonthlyData,
        driverPerformanceList,
        vehicleProfitabilityList
      }}
    >
      {children}
    </TVDEContext.Provider>
  );
};

export const useTVDE = () => {
  const context = useContext(TVDEContext);
  if (!context) {
    throw new Error('useTVDE must be used within a TVDEProvider');
  }
  return context;
};
