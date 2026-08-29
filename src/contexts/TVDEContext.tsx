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
  // Comportamento correcto: carregar e manter notificações do Firestore.
  // O listener anterior apagava tudo ao detectar — notificações nunca persistiam.
  useEffect(() => {
    if (!authUser) return;
    const unsub = onSnapshot(collection(db, 'notifications'), snapshot => {
      if (snapshot.empty) {
        setNotifications([]);
        setIsCloudSynced(true);
        return;
      }
      const loaded = snapshot.docs.map(d => ({ id: d.id, ...d.data() })) as AppNotification[];
      loaded.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
      setNotifications(loaded);
      setIsCloudSynced(true);
    }, err => {
      console.error('Firestore notifications listener error:', err);
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
  // Diagnóstico automático de reconciliação — V.2.9.3
  // Corre 1x por sessão após shiftLogs carregados.
  // Compara shiftLog.fuelExpenseAmount com a soma real das charges
  // do mesmo dia. Se houver divergência > 0.01€, cria notificação
  // para o gestor corrigir manualmente via Faturação Diária.
  // Sem escritas no Firestore — apenas leituras + notificação.
  // ═══════════════════════════════════════════════════════════════
  const reconciliationRan = useRef(false);

  useEffect(() => {
    if (reconciliationRan.current) return;
    if (shiftLogs.length === 0) return;

    reconciliationRan.current = true;

    const runDiagnosis = async () => {
      try {
        // Filtrar shiftLogs do mês activo com fuelExpenseAmount > 0
        const shiftsWithFuel = shiftLogs.filter(
          s => s.date.startsWith(selectedMonth) && (s.fuelExpenseAmount || 0) > 0
        );

        if (shiftsWithFuel.length === 0) return;

        const divergences: { date: string; diff: number }[] = [];

        for (const shift of shiftsWithFuel) {
          const chargesSnap = await getDocs(
            query(collection(db, 'charges'), where('date', '==', shift.date))
          );

          // Sem charges para este dia — valor manual é fonte de verdade, ignorar
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

        // Verificar se já existe notificação não lida do mesmo tipo
        const alreadyExists = notifications.some(
          n => n.type === 'data_reconciliation' && !n.read
        );
        if (alreadyExists) return;

        // Construir mensagem com os dias divergentes
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
  }, [shiftLogs]);

  // ═══════════════════════════════════════════════════════════════
  // syncShiftExpenses — V.2.9.1 FIX
  // Sincroniza expenses de renda e fuel a partir de um shiftLog.
  // REGRA FUEL: se existem registos na coleção "charges" para o
  // mesmo dia, o chargesSync.ts é a fonte de verdade — esta função
  // NÃO toca no expense de fuel para evitar conflito de escrita.
  // ═══════════════════════════════════════════════════════════════
  const syncShiftExpenses = async (shiftLog: DailyShiftLog) => {
    const rentalExpId = `exp-rnd-shift-${shiftLog.id}`;
    const fuelExpId = `exp-fuel-shift-${shiftLog.id}`;

    // 1. Rental Expense Sync (sem alterações)
    if (shiftLog.rentalExpenseAmount && shiftLog.rentalExpenseAmount > 0) {
      const rentalExpense: Expense = {
        id: rentalExpId,
        category: 'vehicle_rental',
        title: `Renda de Viatura (${shiftLog.vehiclePlate})`,
        amount: shiftLog.rentalExpenseAmount,
        date: shiftLog.date,
        vehicleId: shiftLog.vehicleId,
        vehiclePlate: shiftLog.vehiclePlate,
        driverId: shiftLog.driverId,
        driverName: shiftLog.driverName,
        description: `Sincronizado de Faturação Diária (${shiftLog.driverName})`
      };
      setExpenses(prev => [...prev.filter(e => e.id !== rentalExpId), rentalExpense]);
      try {
        await setDoc(doc(db, 'expenses', rentalExpId), cleanObject(rentalExpense));
      } catch (err) {
        console.error("Error syncing rental expense:", err);
      }
    } else {
      setExpenses(prev => prev.filter(e => e.id !== rentalExpId));
      try { await deleteDoc(doc(db, 'expenses', rentalExpId)); } catch (_) {}
    }

    // 2. Fuel Expense Sync — V.2.9.1: verificar se charges existem
    let hasChargesForDay = false;
    try {
      const chargesSnap = await getDocs(
        query(collection(db, 'charges'), where('date', '==', shiftLog.date))
      );
      hasChargesForDay = !chargesSnap.empty;
    } catch (err) {
      // Se falhar a query (ex: índice em falta), comportamento seguro:
      // assumir que NÃO há charges → manter lógica original
      console.warn("Could not check charges for day, falling back to manual sync:", err);
    }

    if (hasChargesForDay) {
      // chargesSync.ts é a fonte de verdade — re-sincronizar agora que o shiftLog existe.
      // Cobre o cenário: Carregamento criado ANTES da Faturação Diária.
      // Na primeira passagem do chargesSync o shiftLog ainda não existia (warn + return);
      // agora que existe, forçar a criação do expense de Combustível.
      try {
        const { syncChargesToShiftLog } = await import('../utils/chargesSync');
        await syncChargesToShiftLog(shiftLog.date);
      } catch (err) {
        console.error('[syncShiftExpenses] Erro ao re-sincronizar charges:', err);
      }
      return;
    }

    // Lógica original — só para dias SEM módulo carregamentos
    if (shiftLog.fuelExpenseAmount && shiftLog.fuelExpenseAmount > 0) {
      const fuelExpense: Expense = {
        id: fuelExpId,
        category: 'fuel_charging',
        title: `Combustível / Energia (${shiftLog.vehiclePlate})`,
        amount: shiftLog.fuelExpenseAmount,
        date: shiftLog.date,
        vehicleId: shiftLog.vehicleId,
        vehiclePlate: shiftLog.vehiclePlate,
        driverId: shiftLog.driverId,
        driverName: shiftLog.driverName,
        description: `Sincronizado de Faturação Diária (${shiftLog.driverName})`
      };
      setExpenses(prev => [...prev.filter(e => e.id !== fuelExpId), fuelExpense]);
      try {
        await setDoc(doc(db, 'expenses', fuelExpId), cleanObject(fuelExpense));
      } catch (err) {
        console.error("Error syncing fuel expense:", err);
      }
    } else {
      setExpenses(prev => prev.filter(e => e.id !== fuelExpId));
      try { await deleteDoc(doc(db, 'expenses', fuelExpId)); } catch (_) {}
    }
  };

  // Actions writing directly to Firestore
  const addShiftLog = async (logData: Omit<DailyShiftLog, 'id' | 'status'>) => {
    const newId = `sft-${Date.now()}`;
    const newLog: DailyShiftLog = {
      ...logData,
      id: newId,
      status: 'submitted'
    };

    setShiftLogs(prev => [newLog, ...prev]);

    try {
      await setDoc(doc(db, 'shiftLogs', newId), cleanObject(newLog));

      if (logData.vehicleId) {
        const targetVehicle = vehicles.find(v => v.id === logData.vehicleId);
        if (targetVehicle) {
          const newKm = Math.max(targetVehicle.currentKm, targetVehicle.currentKm + logData.kilometers);
          await updateDoc(doc(db, 'vehicles', logData.vehicleId), cleanObject({ currentKm: newKm }));
        }
      }

      await syncShiftExpenses(newLog);
    } catch (err) {
      console.error("Error adding shiftLog to Firestore:", err);
    }
  };

  const updateShiftLog = async (id: string, logData: Partial<DailyShiftLog>) => {
    let updatedLog: DailyShiftLog | undefined;
    setShiftLogs(prev => {
      return prev.map(s => {
        if (s.id === id) {
          updatedLog = { ...s, ...logData };
          return updatedLog;
        }
        return s;
      });
    });
    try {
      await updateDoc(doc(db, 'shiftLogs', id), cleanObject(logData));
      if (updatedLog) {
        await syncShiftExpenses(updatedLog);
      }
    } catch (err) {
      console.error("Error updating shiftLog in Firestore:", err);
    }
  };

  const updateShiftLogStatus = async (id: string, status: DailyShiftLog['status']) => {
    try {
      await updateDoc(doc(db, 'shiftLogs', id), cleanObject({ status }));
    } catch (err) {
      console.error("Error updating shiftLog in Firestore:", err);
    }
  };

  const deleteShiftLog = async (id: string) => {
    setShiftLogs(prev => prev.filter(s => s.id !== id));
    const rentalExpId = `exp-rnd-shift-${id}`;
    const fuelExpId = `exp-fuel-shift-${id}`;
    setExpenses(prev => prev.filter(e => e.id !== rentalExpId && e.id !== fuelExpId));
    try {
      await deleteDoc(doc(db, 'shiftLogs', id));
      await deleteDoc(doc(db, 'expenses', rentalExpId));
      await deleteDoc(doc(db, 'expenses', fuelExpId));
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
    setExpenses(prev => [...prev.filter(e => e.id !== newId), newExpense]);
    try {
      await setDoc(doc(db, 'expenses', newId), cleanObject(newExpense));
    } catch (err) {
      console.error("Error adding expense to Firestore:", err);
    }
  };

  const updateExpense = async (id: string, expenseData: Partial<Expense>) => {
    setExpenses(prev => prev.map(e => e.id === id ? { ...e, ...expenseData } : e));
    try {
      await updateDoc(doc(db, 'expenses', id), cleanObject(expenseData));
    } catch (err) {
      console.error("Error updating expense in Firestore:", err);
    }
  };

  const deleteExpense = async (id: string) => {
    setExpenses(prev => prev.filter(e => e.id !== id));
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
    setVehicles(prev => [...prev.filter(v => v.id !== newId), newVehicle]);
    try {
      await setDoc(doc(db, 'vehicles', newId), cleanObject(newVehicle));
    } catch (err) {
      console.error("Error adding vehicle to Firestore:", err);
    }
  };

  const updateVehicle = async (id: string, vehicleData: Partial<Vehicle>) => {
    setVehicles(prev => prev.map(v => v.id === id ? { ...v, ...vehicleData } : v));
    try {
      await updateDoc(doc(db, 'vehicles', id), cleanObject(vehicleData));
    } catch (err) {
      console.error("Error updating vehicle in Firestore:", err);
    }
  };

  const deleteVehicle = async (id: string) => {
    setVehicles(prev => prev.filter(v => v.id !== id));
    setDrivers(prev => prev.map(d => d.assignedVehicleId === id ? { ...d, assignedVehicleId: undefined } : d));
    try {
      await deleteDoc(doc(db, 'vehicles', id));
    } catch (err) {
      console.error("Error deleting vehicle from Firestore:", err);
    }
  };

  const addDriver = async (driverData: Omit<Driver, 'id'>) => {
    const newId = `drv-${Date.now()}`;
    const newDriver: Driver = {
      ...driverData,
      id: newId
    };
    setDrivers(prev => [...prev.filter(d => d.id !== newId), newDriver]);
    try {
      await setDoc(doc(db, 'drivers', newId), cleanObject(newDriver));
    } catch (err) {
      console.error("Error adding driver to Firestore:", err);
    }
  };

  const updateDriver = async (id: string, driverData: Partial<Driver>) => {
    setDrivers(prev => prev.map(d => d.id === id ? { ...d, ...driverData } : d));
    try {
      await updateDoc(doc(db, 'drivers', id), cleanObject(driverData));
    } catch (err) {
      console.error("Error updating driver in Firestore:", err);
    }
  };

  const deleteDriver = async (id: string) => {
    try {
      await deleteDoc(doc(db, 'drivers', id));
    } catch (err) {
      console.error("Error deleting driver from Firestore:", err);
    }
    setDrivers(prev => prev.filter(d => d.id !== id));
    setVehicles(prev => prev.map(v => v.assignedDriverId === id ? { ...v, assignedDriverId: undefined, assignedDriverName: undefined } : v));
  };

  const markNotificationAsRead = async (id: string) => {
    setNotifications(prev => prev.map(n => n.id === id ? { ...n, read: true } : n));
    try {
      await updateDoc(doc(db, 'notifications', id), cleanObject({ read: true }));
    } catch (err) {
      console.error('Error marking notification read in Firestore:', err);
    }
  };

  const markAllNotificationsAsRead = async () => {
    setNotifications(prev => prev.map(n => ({ ...n, read: true })));
    try {
      const batch = writeBatch(db);
      notifications.forEach(n => {
        batch.update(doc(db, 'notifications', n.id), cleanObject({ read: true }));
      });
      await batch.commit();
    } catch (err) {
      console.error('Error marking all notifications read in Firestore:', err);
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
    // Actualização optimista — UI responde imediatamente sem esperar onSnapshot
    setNotifications(prev => [newNotif, ...prev]);
    try {
      await setDoc(doc(db, 'notifications', newId), cleanObject(newNotif));
    } catch (err) {
      console.error('Error adding notification to Firestore:', err);
      // Reverter se falhar
      setNotifications(prev => prev.filter(n => n.id !== newId));
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

      INITIAL_DRIVERS.forEach(d => batch.set(doc(db, 'drivers', d.id), cleanObject(d)));
      INITIAL_VEHICLES.forEach(v => batch.set(doc(db, 'vehicles', v.id), cleanObject(v)));
      INITIAL_SHIFT_LOGS.forEach(s => batch.set(doc(db, 'shiftLogs', s.id), cleanObject(s)));
      INITIAL_EXPENSES.forEach(e => batch.set(doc(db, 'expenses', e.id), cleanObject(e)));
      INITIAL_NOTIFICATIONS.forEach(n => batch.set(doc(db, 'notifications', n.id), cleanObject(n)));

      await batch.commit();

      setSelectedMonthState('2026-07');
      setRoleState('manager');
      localStorage.clear();
    } catch (err) {
      console.error("Error resetting data in Firestore:", err);
    }
  };

  const isDuplicateShiftExpense = (e: { id?: string; description?: string }) => {
    if (!e) return false;
    if (e.id && (
      e.id.startsWith('exp-fuel-shift-') ||
      e.id.startsWith('exp-rnd-shift-') ||
      e.id.startsWith('exp-nrg-') ||
      e.id.startsWith('exp-rnd-daily-') ||
      e.id.startsWith('exp-rnd-monday-')
    )) {
      return true;
    }
    if (e.description && (
      e.description.includes('Custo diário de energia') ||
      e.description.includes('Renda diária de viatura') ||
      e.description.includes('Sincronizado de Faturação Diária')
    )) {
      return true;
    }
    return false;
  };

  // CALCULATED MONTHLY STATS
  const monthlyStats = useMemo(() => {
    const targetMonth = selectedMonth;
    const isAll = targetMonth === 'all';
    const matchesMonth = (d: string) => isAll || d.startsWith(targetMonth);

    const filteredShifts = shiftLogs.filter(s => matchesMonth(s.date));
    const filteredExpenses = expenses.filter(e => matchesMonth(e.date));

    const totalGrossEarnings = filteredShifts.reduce((acc, s) => acc + s.grossEarnings, 0);
    const totalTrips = filteredShifts.reduce((acc, s) => acc + s.tripsCount, 0);
    const totalKm = filteredShifts.reduce((acc, s) => acc + s.kilometers, 0);
    const totalHours = filteredShifts.reduce((acc, s) => acc + parseHHMMToHours(s.hoursWorked), 0);

    // V.2.9.2 fix — fonte de verdade: expenses (chargesSync + syncShiftExpenses garantem correctitude)
    // Remover dupla contagem via shiftFuelCost + standaloneFuelCost
    const totalFuelCost = filteredExpenses
      .filter(e => e.category === 'fuel_charging')
      .reduce((acc, e) => acc + e.amount, 0);

    const totalVehicleRentals = filteredExpenses
      .filter(e => e.category === 'vehicle_rental')
      .reduce((acc, e) => acc + e.amount, 0);

    const totalMaintenanceCost = filteredExpenses
      .filter(e => e.category === 'maintenance')
      .reduce((acc, e) => acc + e.amount, 0);

    const totalInsuranceCost = filteredExpenses
      .filter(e => e.category === 'insurance')
      .reduce((acc, e) => acc + e.amount, 0);

    const totalIrsCost = filteredExpenses
      .filter(e => e.category === 'irs')
      .reduce((acc, e) => acc + e.amount, 0);

    const totalIvaCost = filteredExpenses
      .filter(e => e.category === 'iva')
      .reduce((acc, e) => acc + e.amount, 0);

    const totalOtherCost = filteredExpenses
      .filter(e => (e.category === 'tolls_wash' || e.category === 'other') && !isDuplicateShiftExpense(e))
      .reduce((acc, e) => acc + e.amount, 0);

    const totalExpenses = totalFuelCost + totalVehicleRentals + totalMaintenanceCost + totalInsuranceCost + totalIrsCost + totalIvaCost + totalOtherCost;
    const netProfit = totalGrossEarnings - totalExpenses;
    const receiptIssuanceAmount = totalGrossEarnings - totalVehicleRentals;

    const earningsPerKm = totalKm > 0 ? totalGrossEarnings / totalKm : 0;
    const earningsPerHour = totalHours > 0 ? totalGrossEarnings / totalHours : 0;
    const netProfitMarginPct = totalGrossEarnings > 0 ? (netProfit / totalGrossEarnings) * 100 : 0;

    let monthName = isAll ? 'Todos os Meses (Geral)' : `Ano Completo ${targetMonth}`;
    if (!isAll && targetMonth.includes('-')) {
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
      totalIrsCost,
      totalIvaCost,
      totalOtherCost,
      earningsPerKm,
      earningsPerHour,
      netProfitMarginPct,
      receiptIssuanceAmount
    };
  }, [selectedMonth, shiftLogs, expenses]);

  // HISTORICAL COMPARATIVE MONTHLY DATA
  const historicalMonthlyData = useMemo(() => {
    const monthKeys = ['2026-04', '2026-05', '2026-06', '2026-07', '2026-08'];
    const monthNamesMap: Record<string, string> = {
      '2026-04': 'Abr 26',
      '2026-05': 'Mai 26',
      '2026-06': 'Jun 26',
      '2026-07': 'Jul 26',
      '2026-08': 'Ago 26'
    };

    return monthKeys.map(mKey => {
      const mShifts = shiftLogs.filter(s => s.date.startsWith(mKey));
      const mExpenses = expenses.filter(e => e.date.startsWith(mKey));

      const gross = mShifts.reduce((acc, s) => acc + s.grossEarnings, 0);
      // V.2.9.2 fix — fonte de verdade: expenses (chargesSync + syncShiftExpenses garantem correctitude)
      const totalFuelCost = mExpenses
        .filter(e => e.category === 'fuel_charging')
        .reduce((a, e) => a + e.amount, 0);

      const totalVehicleRentals = mExpenses
        .filter(e => e.category === 'vehicle_rental')
        .reduce((a, e) => a + e.amount, 0);

      const totalMaintenanceCost = mExpenses.filter(e => e.category === 'maintenance').reduce((a, e) => a + e.amount, 0);
      const totalInsuranceCost = mExpenses.filter(e => e.category === 'insurance').reduce((a, e) => a + e.amount, 0);
      const totalOtherCost = mExpenses.filter(e => (e.category === 'tolls_wash' || e.category === 'other') && !isDuplicateShiftExpense(e)).reduce((a, e) => a + e.amount, 0);

      const exp = totalFuelCost + totalVehicleRentals + totalMaintenanceCost + totalInsuranceCost + totalOtherCost;
      const trips = mShifts.reduce((acc, s) => acc + s.tripsCount, 0);
      const km = mShifts.reduce((acc, s) => acc + s.kilometers, 0);
      const hours = mShifts.reduce((acc, s) => acc + parseHHMMToHours(s.hoursWorked), 0);
      const netProfit = gross - exp;

      return {
        monthKey: mKey,
        monthName: monthNamesMap[mKey] || mKey,
        totalGrossEarnings: gross,
        totalExpenses: exp,
        netProfit,
        totalTrips: trips,
        totalKm: km,
        totalHours: hours,
        totalFuelCost,
        totalMaintenanceCost,
        totalInsuranceCost,
        totalVehicleRentals,
        earningsPerKm: km > 0 ? gross / km : 0,
        earningsPerHour: hours > 0 ? gross / hours : 0,
        netProfitMarginPct: gross > 0 ? (netProfit / gross) * 100 : 0
      };
    });
  }, [shiftLogs, expenses]);

  // DRIVER PERFORMANCE COMPARISON
  const driverPerformanceList = useMemo(() => {
    const isAll = selectedMonth === 'all';
    return drivers.map(driver => {
      const dShifts = shiftLogs.filter(s => s.driverId === driver.id && (isAll || s.date.startsWith(selectedMonth)));
      const totalEarnings = dShifts.reduce((acc, s) => acc + s.grossEarnings, 0);
      const totalKm = dShifts.reduce((acc, s) => acc + s.kilometers, 0);
      const totalTrips = dShifts.reduce((acc, s) => acc + s.tripsCount, 0);
      const totalHours = dShifts.reduce((acc, s) => acc + parseHHMMToHours(s.hoursWorked), 0);

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
    const isAll = selectedMonth === 'all';
    return vehicles.map(vehicle => {
      const vShifts = shiftLogs.filter(s => s.vehicleId === vehicle.id && (isAll || s.date.startsWith(selectedMonth)));
      const vExpenses = expenses.filter(e => e.vehicleId === vehicle.id && (isAll || e.date.startsWith(selectedMonth)));

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
