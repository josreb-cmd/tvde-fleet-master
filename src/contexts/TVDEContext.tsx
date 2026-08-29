import React, { createContext, useContext, useState, useEffect, useMemo, useRef } from 'react';
import {
  collection,
  doc,
  setDoc,
  updateDoc,
  deleteDoc,
  onSnapshot,
  writeBatch,
  getDocs,
  query,
  where
} from 'firebase/firestore';
import { signInAnonymously, onAuthStateChanged, User as FirebaseUser } from 'firebase/auth';
import { db, auth } from '../lib/firebase';
import { parseHHMMToHours } from '../utils/formatters';
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
  selectedMonth: string;
  setSelectedMonth: (month: string) => void;
  selectedPresetId: string | null;
  setSelectedPresetId: (id: string | null) => void;
  isCloudSynced: boolean;
  
  addShiftLog: (log: Omit<DailyShiftLog, 'id' | 'status'>) => void;
  updateShiftLog: (id: string, logData: Partial<DailyShiftLog>) => void;
  updateShiftLogStatus: (id: string, status: DailyShiftLog['status']) => void;
  deleteShiftLog: (id: string) => void;
  
  addExpense: (expense: Omit<Expense, 'id'>) => void;
  updateExpense: (id: string, expense: Partial<Expense>) => void;
  deleteExpense: (id: string) => void;
  
  addVehicle: (vehicle: Omit<Vehicle, 'id'>) => void;
  updateVehicle: (id: string, vehicle: Partial<Vehicle>) => void;
  deleteVehicle: (id: string) => void;
  
  addDriver: (driver: Omit<Driver, 'id'>) => void;
  updateDriver: (id: string, driver: Partial<Driver>) => void;
  deleteDriver: (id: string) => void;
  
  markNotificationAsRead: (id: string) => void;
  markAllNotificationsAsRead: () => void;
  addNotification: (notification: Omit<AppNotification, 'id' | 'date' | 'read'>) => void;
  
  resetToDefaultData: () => void;
  
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

function cleanObject<T extends Record<string, any>>(obj: T): T {
  const cleaned: Record<string, any> = {};
  Object.keys(obj).forEach(key => {
    const val = obj[key];
    if (val !== undefined) {
      if (val !== null && typeof val === 'object' && !Array.isArray(val) && !(val instanceof Date)) {
        cleaned[key] = cleanObject(val);
      } else {
        cleaned[key] = val;
      }
    }
  });
  return cleaned as T;
}

export const TVDEProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [role, setRoleState] = useState<UserRole>(() => {
    return (localStorage.getItem(STORAGE_KEYS.ROLE) as UserRole) || 'manager';
  });

  const [currentDriverId, setCurrentDriverIdState] = useState<string>(() => {
    return localStorage.getItem(STORAGE_KEYS.DRIVER_ID) || 'drv-1';
  });

  const [selectedMonth, setSelectedMonthState] = useState<string>(() => {
    return localStorage.getItem(STORAGE_KEYS.MONTH) || '2026-08';
  });

  const [drivers, setDrivers] = useState<Driver[]>(INITIAL_DRIVERS);
  const [vehicles, setVehicles] = useState<Vehicle[]>(INITIAL_VEHICLES);
  const [shiftLogs, setShiftLogs] = useState<DailyShiftLog[]>(INITIAL_SHIFT_LOGS);
  const [expenses, setExpenses] = useState<Expense[]>(INITIAL_EXPENSES);
  const [notifications, setNotifications] = useState<AppNotification[]>(INITIAL_NOTIFICATIONS);
  
  // Novo estado de controlo de carregamento das notificações
  const [notificationsLoaded, setNotificationsLoaded] = useState<boolean>(false);

  const [selectedPresetId, setSelectedPresetId] = useState<string | null>(null);
  const [isCloudSynced, setIsCloudSynced] = useState<boolean>(false);
  const [authUser, setAuthUser] = useState<FirebaseUser | null>(null);

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (u) => {
      if (u) {
        setAuthUser(u);
      } else {
        try {
          const cred = await signInAnonymously(auth);
          setAuthUser(cred.user);
        } catch (err) {
          // Ignore if anonymous auth is disabled
        }
      }
    });
    return () => unsub();
  }, []);

  // Real-time Firestore Sync for DRIVERS
  useEffect(() => {
    const unsub = onSnapshot(collection(db, 'drivers'), async snapshot => {
      const oldIds = ['drv-2', 'drv-3', 'drv-4', 'drv-5'];
      const hasOldDrivers = snapshot.docs.some(d => oldIds.includes(d.id) || d.data().name === 'João Silva');
      if (snapshot.empty || hasOldDrivers) {
        const batch = writeBatch(db);
        snapshot.docs.forEach(d => batch.delete(d.ref));
        INITIAL_DRIVERS.forEach(d => {
          batch.set(doc(db, 'drivers', d.id), cleanObject(d));
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
      const oldIds = ['veh-2', 'veh-3', 'veh-4', 'veh-5'];
      const hasOldVehicles = snapshot.docs.some(d => oldIds.includes(d.id) || d.data().assignedDriverName === 'João Silva' || d.data().licensePlate === 'AA-42-TV');
      if (snapshot.empty || hasOldVehicles) {
        const batch = writeBatch(db);
        snapshot.docs.forEach(d => batch.delete(d.ref));
        INITIAL_VEHICLES.forEach(v => {
          batch.set(doc(db, 'vehicles', v.id), cleanObject(v));
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
      const hasOldData = snapshot.docs.some(d => d.data().driverName === 'João Silva' || (d.data().boltEarnings || 0) > 0 || d.data().vehiclePlate === 'AA-42-TV');
      if (snapshot.empty || hasOldData) {
        const batch = writeBatch(db);
        snapshot.docs.forEach(d => batch.delete(d.ref));
        INITIAL_SHIFT_LOGS.forEach(s => {
          batch.set(doc(db, 'shiftLogs', s.id), cleanObject(s));
        });
        await batch.commit();
      } else {
        const loaded = snapshot.docs.map(doc => doc.data() as DailyShiftLog);
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
      const testExpenses = snapshot.docs.filter(
        d => d.id === 'exp-maint-1' ||
             d.data().amount === 180 ||
             d.data().driverName === 'João Silva' ||
             d.id.startsWith('exp-rnd-monday-') ||
             d.id.startsWith('exp-nrg-') ||
             d.id.startsWith('exp-rnd-daily-') ||
             d.data().vehiclePlate === 'AA-42-TV'
      );
      if (testExpenses.length > 0) {
        const batch = writeBatch(db);
        testExpenses.forEach(d => batch.delete(d.ref));
        await batch.commit();
      } else if (snapshot.empty) {
        const batch = writeBatch(db);
        const seedExpenses: Expense[] = [];
        INITIAL_SHIFT_LOGS.forEach(s => {
          if (s.rentalExpenseAmount && s.rentalExpenseAmount > 0) {
            seedExpenses.push({
              id: `exp-rnd-shift-${s.id}`,
              category: 'vehicle_rental',
              title: `Renda de Viatura (${s.vehiclePlate})`,
              amount: s.rentalExpenseAmount,
              date: s.date,
              vehicleId: s.vehicleId,
              vehiclePlate: s.vehiclePlate,
              driverId: s.driverId,
              driverName: s.driverName,
              description: `Sincronizado de Faturação Diária (${s.driverName})`
            });
          }
          if (s.fuelExpenseAmount && s.fuelExpenseAmount > 0) {
            seedExpenses.push({
              id: `exp-fuel-shift-${s.id}`,
              category: 'fuel_charging',
              title: `Combustível / Energia (${s.vehiclePlate})`,
              amount: s.fuelExpenseAmount,
              date: s.date,
              vehicleId: s.vehicleId,
              vehiclePlate: s.vehiclePlate,
              driverId: s.driverId,
              driverName: s.driverName,
              description: `Sincronizado de Faturação Diária (${s.driverName})`
            });
          }
        });
        seedExpenses.forEach(e => {
          batch.set(doc(db, 'expenses', e.id), cleanObject(e));
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

  // Real-time Firestore Sync for NOTIFICATIONS — V.2.9.3
  useEffect(() => {
    if (!authUser) return;
    const unsub = onSnapshot(collection(db, 'notifications'), snapshot => {
      if (snapshot.empty) {
        setNotifications([]);
        setNotificationsLoaded(true); // Marca como carregado mesmo se vazio
        setIsCloudSynced(true);
        return;
      }
      const loaded = snapshot.docs.map(d => ({ id: d.id, ...d.data() })) as AppNotification[];
      loaded.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
      setNotifications(loaded);
      setNotificationsLoaded(true); // Marca notificações como prontas/carregadas
      setIsCloudSynced(true);
    }, err => {
      console.error('Firestore notifications listener error:', err);
      setNotificationsLoaded(true); // Garante que avança mesmo em caso de erro
    });
    return () => unsub();
  }, [authUser]);

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

  // Check vehicle maintenance alerts
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

  // ═══════════════════════════════════════════════════════════════
  // Diagnóstico automático de reconciliação — V.2.9.3 (Corrigido)
  // Só corre após shiftLogs E notificações estarem totalmente carregados.
  // ═══════════════════════════════════════════════════════════════
  const reconciliationRan = useRef(false);

  useEffect(() => {
    if (reconciliationRan.current) return;
    if (shiftLogs.length === 0 || !notificationsLoaded) return; // Aguarda ambos os dados estarem prontos

    reconciliationRan.current = true;

    const runDiagnosis = async () => {
      try {
        const shiftsWithFuel = shiftLogs.filter(
          s => s.date.startsWith(selectedMonth) && (s.fuelExpenseAmount || 0) > 0
        );

        if (shiftsWithFuel.length === 0) return;

        const divergences: { date: string; diff: number }[] = [];

        for (const shift of shiftsWithFuel) {
          const chargesSnap = await getDocs(
            query(collection(db, 'charges'), where('date', '==', shift.date))
          );

          if (chargesSnap.empty) continue;

          let chargesTotal = 0;
          chargesSnap.forEach(d => {
            chargesTotal += (d.data().netAmount ?? 0);
          });
          chargesTotal = Math.round(chargesTotal * 100) / 100;

          const shiftTotal = Math.round((shift.fuelExpenseAmount || 0) * 100) / 100;
          const diff = Math.abs(shiftTotal - chargesTotal);

          if (diff > 0.01) {
            divergences.push({ date: shift.date, diff });
          }
        }

        if (divergences.length === 0) {
          console.log('[reconciliação] Diagnóstico concluído — 0 divergências encontradas.');
          return;
        }

        const alreadyExists = notifications.some(
          n => n.type === 'data_reconciliation' && !n.read
        );
        if (alreadyExists) return;

        const detail = divergences
          .map(d => {
            const [, m, day] = d.date.split('-');
            return `${day}/${m} (${d.diff.toFixed(2)}€)`;
          })
          .join(', ');

        await addNotification({
          type: 'data_reconciliation',
          title: 'Divergência de carregamentos detectada',
          message: `${divergences.length} dia(s) com valores inconsistentes: ${detail}`,
          priority: 'medium',
          actionRequired: `Faturação Diária → ${divergences.map(d => {
            const [, m, day] = d.date.split('-');
            return `${day}/${m}`;
          }).join(', ')} → Guardar`
        });

      } catch (err) {
        console.error('[reconciliação] Erro no diagnóstico:', err);
      }
    };

    runDiagnosis();
  }, [shiftLogs, notificationsLoaded]); // Dependência adicionada para escutar o carregamento das notificações

  // Restante do código mantém-se inalterado...
  // (Funções de syncShiftExpenses, addShiftLog, etc.)

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
        selectedPresetId,
        setSelectedPresetId,
        isCloudSynced,
        addShiftLog,
        updateShiftLog,
        updateShiftLogStatus,
        deleteShiftLog,
        addExpense,
        updateExpense,
        deleteExpense,
        addVehicle,
        updateVehicle,
        deleteVehicle,
        addDriver,
        updateDriver,
        deleteDriver,
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