import React, { useState } from 'react';
import { TVDEProvider } from './context/TVDEContext';
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

// Modals
import { ShiftModal } from './components/modals/ShiftModal';
import { ExpenseModal } from './components/modals/ExpenseModal';
import { VehicleModal } from './components/modals/VehicleModal';
import { DriverModal } from './components/modals/DriverModal';
import { AiAdvisorModal } from './components/modals/AiAdvisorModal';

function AppContent() {
  const [activeTab, setActiveTab] = useState<string>('dashboard');

  // Modal states
  const [showShiftModal, setShowShiftModal] = useState(false);
  const [showExpenseModal, setShowExpenseModal] = useState(false);
  const [showVehicleModal, setShowVehicleModal] = useState(false);
  const [vehicleIdToEdit, setVehicleIdToEdit] = useState<string | null>(null);

  const [showDriverModal, setShowDriverModal] = useState(false);
  const [driverIdToEdit, setDriverIdToEdit] = useState<string | null>(null);

  const [showAiAdvisorModal, setShowAiAdvisorModal] = useState(false);

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
        onOpenAiAdvisor={() => setShowAiAdvisorModal(true)}
        onOpenNewShiftModal={() => setShowShiftModal(true)}
        activeTab={activeTab}
        setActiveTab={setActiveTab}
      />

      {/* Main Body Layout */}
      <div className="flex-1 flex flex-col md:flex-row max-w-7xl w-full mx-auto">
        <Sidebar
          activeTab={activeTab}
          setActiveTab={setActiveTab}
          onOpenAiAdvisor={() => setShowAiAdvisorModal(true)}
        />

        <main className="flex-1 p-4 sm:p-6 lg:p-8 overflow-y-auto">
          {activeTab === 'dashboard' && (
            <DashboardView
              onOpenNewShiftModal={() => setShowShiftModal(true)}
              onOpenNewExpenseModal={() => setShowExpenseModal(true)}
              setActiveTab={setActiveTab}
            />
          )}

          {activeTab === 'driver-portal' && (
            <DriverPortalView
              onOpenNewShiftModal={() => setShowShiftModal(true)}
            />
          )}

          {activeTab === 'shift-logs' && (
            <ShiftLogsView
              onOpenNewShiftModal={() => setShowShiftModal(true)}
            />
          )}

          {activeTab === 'expenses' && (
            <ExpensesView
              onOpenNewExpenseModal={() => setShowExpenseModal(true)}
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

          {activeTab === 'notifications' && <NotificationsView />}
        </main>
      </div>

      {/* Global Modals */}
      <ShiftModal
        isOpen={showShiftModal}
        onClose={() => setShowShiftModal(false)}
      />

      <ExpenseModal
        isOpen={showExpenseModal}
        onClose={() => setShowExpenseModal(false)}
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
    </div>
  );
}

export default function App() {
  return (
    <TVDEProvider>
      <AppContent />
    </TVDEProvider>
  );
}
