import React, { useState } from 'react';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { LoginScreen } from './components/LoginScreen';
import { TVDEProvider } from './context/TVDEContext';
import { DailyShiftLog, Expense } from './types';
import { Navbar } from './components/Navbar';
import { Sidebar } from './components/Sidebar';
import { DashboardView } from './components/DashboardView';
import { DriverPortalView } from './components/DriverPortalView';
import { ShiftLogsView } from './components/ShiftLogsView';
import { ExpensesView } from './components/ExpensesView';
import { FleetView } from './components/FleetView';
import { DriversView } from './components/DriversView';
import { NotificationsView } from './components/NotificationsView';
import { ProfitabilityView } from './components/ProfitabilityView';
import { CustomQueryView } from './components/CustomQueryView';
import { MobileBottomNav } from './components/MobileBottomNav';
import { KmRentabilidade } from './components/KmRentabilidade';

// Modals
import { ShiftModal } from './components/modals/ShiftModal';
import { ExpenseModal } from './components/modals/ExpenseModal';
import { VehicleModal } from './components/modals/VehicleModal';
import { DriverModal } from './components/modals/DriverModal';
import { AiAdvisorModal } from './components/modals/AiAdvisorModal';
import { UsersManagementModal } from './components/UsersManagementModal';

function AppContent() {
  const { user, signOut } = useAuth();
  const [activeTab, setActiveTab] = useState<string>('dashboard');
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState<boolean>(false);

  // Modal states
  const [showShiftModal, setShowShiftModal] = useState(false);
  const [editingShiftLog, setEditingShiftLog] = useState<DailyShiftLog | null>(null);

  const [showExpenseModal, setShowExpenseModal] = useState(false);
  const [editingExpense, setEditingExpense] = useState<Expense | null>(null);

  const [showVehicleModal, setShowVehicleModal] = useState(false);
  const [vehicleIdToEdit, setVehicleIdToEdit] = useState<string | null>(null);

  const [showDriverModal, setShowDriverModal] = useState(false);
  const [driverIdToEdit, setDriverIdToEdit] = useState<string | null>(null);

  const [showAiAdvisorModal, setShowAiAdvisorModal] = useState(false);
  const [showUsersModal, setShowUsersModal] = useState(false);

  const handleNewShiftModal = () => {
    setEditingShiftLog(null);
    setShowShiftModal(true);
  };

  const handleEditShiftLog = (log: DailyShiftLog) => {
    setEditingShiftLog(log);
    setShowShiftModal(true);
  };

  const handleNewExpenseModal = () => {
    setEditingExpense(null);
    setShowExpenseModal(true);
  };

  const handleEditExpense = (expense: Expense) => {
    setEditingExpense(expense);
    setShowExpenseModal(true);
  };

  const handleEditVehicle = (vId: string) => {
    setVehicleIdToEdit(vId);
    setShowVehicleModal(true);
  };

  const handleEditDriver = (dId: string) => {
    setDriverIdToEdit(dId);
    setShowDriverModal(true);
  };

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 flex flex-col font-sans selection:bg-blue-600 selection:text-white">
      {/* Top Navbar */}
      <Navbar
        userEmail={user?.email || ''}
        onSignOut={signOut}
        onOpenAiAdvisor={() => setShowAiAdvisorModal(true)}
        onOpenNewShiftModal={handleNewShiftModal}
        onOpenUsersModal={() => setShowUsersModal(true)}
        activeTab={activeTab}
        setActiveTab={(tab) => {
          setActiveTab(tab);
          setIsMobileMenuOpen(false);
        }}
        isMobileMenuOpen={isMobileMenuOpen}
        setIsMobileMenuOpen={setIsMobileMenuOpen}
      />

      {/* Main Body Layout */}
      <div className="flex-1 flex flex-col md:flex-row max-w-7xl w-full mx-auto">
        <Sidebar
          activeTab={activeTab}
          setActiveTab={(tab) => {
            setActiveTab(tab);
            setIsMobileMenuOpen(false);
          }}
          onOpenAiAdvisor={() => {
            setShowAiAdvisorModal(true);
            setIsMobileMenuOpen(false);
          }}
          isMobileMenuOpen={isMobileMenuOpen}
          onCloseMobileMenu={() => setIsMobileMenuOpen(false)}
        />

        <main className="flex-1 p-3 sm:p-6 lg:p-8 pb-20 md:pb-8 overflow-y-auto min-w-0">
          {activeTab === 'dashboard' && (
            <DashboardView
              onOpenNewShiftModal={handleNewShiftModal}
              onOpenNewExpenseModal={handleNewExpenseModal}
              setActiveTab={setActiveTab}
            />
          )}

          {activeTab === 'driver-portal' && (
            <DriverPortalView
              onOpenNewShiftModal={handleNewShiftModal}
            />
          )}

          {activeTab === 'shift-logs' && (
            <ShiftLogsView
              onOpenNewShiftModal={handleNewShiftModal}
              onEditShiftLog={handleEditShiftLog}
            />
          )}

          {activeTab === 'expenses' && (
            <ExpensesView
              onOpenNewExpenseModal={handleNewExpenseModal}
              onEditExpense={handleEditExpense}
            />
          )}

          {activeTab === 'fleet' && (
            <FleetView
              onOpenNewVehicleModal={() => {
                setVehicleIdToEdit(null);
                setShowVehicleModal(true);
              }}
              onEditVehicle={handleEditVehicle}
            />
          )}

          {activeTab === 'drivers' && (
            <DriversView
              onOpenNewDriverModal={() => {
                setDriverIdToEdit(null);
                setShowDriverModal(true);
              }}
              onEditDriver={handleEditDriver}
            />
          )}

          {activeTab === 'profitability' && <ProfitabilityView />}

          {activeTab === 'km-rentabilidade' && <KmRentabilidade />}

          {activeTab === 'custom-query' && <CustomQueryView />}

          {activeTab === 'notifications' && <NotificationsView />}
        </main>
      </div>

      {/* Mobile Bottom Navigation Bar */}
      <MobileBottomNav
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        onOpenAiAdvisor={() => setShowAiAdvisorModal(true)}
      />

      {/* Global Modals */}
      <ShiftModal
        isOpen={showShiftModal}
        onClose={() => {
          setShowShiftModal(false);
          setEditingShiftLog(null);
        }}
        initialData={editingShiftLog}
      />

      <ExpenseModal
        isOpen={showExpenseModal}
        onClose={() => {
          setShowExpenseModal(false);
          setEditingExpense(null);
        }}
        initialData={editingExpense}
      />

      <VehicleModal
        isOpen={showVehicleModal}
        onClose={() => {
          setShowVehicleModal(false);
          setVehicleIdToEdit(null);
        }}
        vehicleIdToEdit={vehicleIdToEdit}
      />

      <DriverModal
        isOpen={showDriverModal}
        onClose={() => {
          setShowDriverModal(false);
          setDriverIdToEdit(null);
        }}
        driverIdToEdit={driverIdToEdit}
      />

      <AiAdvisorModal
        isOpen={showAiAdvisorModal}
        onClose={() => setShowAiAdvisorModal(false)}
      />

      <UsersManagementModal
        isOpen={showUsersModal}
        onClose={() => setShowUsersModal(false)}
      />
    </div>
  );
}

function MainApp() {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-950 flex items-center justify-center text-white">
        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-white"></div>
      </div>
    );
  }

  if (!user) {
    return <LoginScreen />;
  }

  return <AppContent />;
}

export default function App() {
  return (
    <TVDEProvider>
      <MainApp />
    </TVDEProvider>
  );
}
