import React, { useState, Suspense } from 'react';
import { useAuth } from './contexts/AuthContext';
import { LoginScreen } from './components/LoginScreen';
import { TVDEProvider } from './contexts/TVDEContext';
import { DailyShiftLog, Expense } from './types';
import { Navbar } from './components/Navbar';
import { Sidebar } from './components/Sidebar';
import { MobileBottomNav } from './components/MobileBottomNav';

// ── Lazy-loaded Views ────────────────────────────────────────────
const DashboardView      = React.lazy(() => import('./components/DashboardView').then(m => ({ default: m.DashboardView })));
const DriverPortalView   = React.lazy(() => import('./components/DriverPortalView').then(m => ({ default: m.DriverPortalView })));
const ShiftLogsView      = React.lazy(() => import('./components/ShiftLogsView').then(m => ({ default: m.ShiftLogsView })));
const ExpensesView       = React.lazy(() => import('./components/ExpensesView').then(m => ({ default: m.ExpensesView })));
const FleetView          = React.lazy(() => import('./components/FleetView').then(m => ({ default: m.FleetView })));
const DriversView        = React.lazy(() => import('./components/DriversView').then(m => ({ default: m.DriversView })));
const NotificationsView  = React.lazy(() => import('./components/NotificationsView').then(m => ({ default: m.NotificationsView })));
const ProfitabilityView  = React.lazy(() => import('./components/ProfitabilityView').then(m => ({ default: m.ProfitabilityView })));
const CustomQueryView    = React.lazy(() => import('./components/CustomQueryView').then(m => ({ default: m.CustomQueryView })));
const KmRentabilidade    = React.lazy(() => import('./components/KmRentabilidade').then(m => ({ default: m.KmRentabilidade })));

// ── Lazy-loaded Modals ──────────────────────────────────────────
const ShiftModal           = React.lazy(() => import('./components/modals/ShiftModal').then(m => ({ default: m.ShiftModal })));
const ExpenseModal         = React.lazy(() => import('./components/modals/ExpenseModal').then(m => ({ default: m.ExpenseModal })));
const VehicleModal         = React.lazy(() => import('./components/modals/VehicleModal').then(m => ({ default: m.VehicleModal })));
const DriverModal          = React.lazy(() => import('./components/modals/DriverModal').then(m => ({ default: m.DriverModal })));
const AiAdvisorModal       = React.lazy(() => import('./components/modals/AiAdvisorModal').then(m => ({ default: m.AiAdvisorModal })));
const UsersManagementModal = React.lazy(() => import('./components/modals/UsersManagementModal').then(m => ({ default: m.UsersManagementModal })));

// ── Fallback spinner para Suspense ──────────────────────────────
function LoadingFallback() {
  return (
    <div className="flex items-center justify-center py-20">
      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
    </div>
  );
}

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
          <Suspense fallback={<LoadingFallback />}>
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
          </Suspense>
        </main>
      </div>

      {/* Mobile Bottom Navigation Bar */}
      <MobileBottomNav
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        onOpenAiAdvisor={() => setShowAiAdvisorModal(true)}
      />

      {/* Global Modals — cada um só carrega quando abre */}
      <Suspense fallback={null}>
        {showShiftModal && (
          <ShiftModal
            isOpen={showShiftModal}
            onClose={() => {
              setShowShiftModal(false);
              setEditingShiftLog(null);
            }}
            initialData={editingShiftLog}
          />
        )}

        {showExpenseModal && (
          <ExpenseModal
            isOpen={showExpenseModal}
            onClose={() => {
              setShowExpenseModal(false);
              setEditingExpense(null);
            }}
            initialData={editingExpense}
          />
        )}

        {showVehicleModal && (
          <VehicleModal
            isOpen={showVehicleModal}
            onClose={() => {
              setShowVehicleModal(false);
              setVehicleIdToEdit(null);
            }}
            vehicleIdToEdit={vehicleIdToEdit}
          />
        )}

        {showDriverModal && (
          <DriverModal
            isOpen={showDriverModal}
            onClose={() => {
              setShowDriverModal(false);
              setDriverIdToEdit(null);
            }}
            driverIdToEdit={driverIdToEdit}
          />
        )}

        {showAiAdvisorModal && (
          <AiAdvisorModal
            isOpen={showAiAdvisorModal}
            onClose={() => setShowAiAdvisorModal(false)}
          />
        )}

        {showUsersModal && (
          <UsersManagementModal
            isOpen={showUsersModal}
            onClose={() => setShowUsersModal(false)}
          />
        )}
      </Suspense>
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
