import React, { useState } from 'react';
import { useTVDE } from '../context/TVDEContext';
import {
  Car,
  UserCheck,
  Bell,
  Calendar,
  Sparkles,
  RefreshCw,
  CheckCircle2,
  AlertTriangle,
  ChevronDown,
  Shield,
  Layers,
  Menu,
  LogOut
} from 'lucide-react';

interface NavbarProps {
  onOpenAiAdvisor: () => void;
  onOpenNewShiftModal: () => void;
  activeTab: string;
  setActiveTab: (tab: string) => void;
  isMobileMenuOpen?: boolean;
  setIsMobileMenuOpen?: (open: boolean) => void;
  userEmail: string;
  onSignOut: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({
  onOpenAiAdvisor,
  onOpenNewShiftModal,
  activeTab,
  setActiveTab,
  isMobileMenuOpen = false,
  setIsMobileMenuOpen,
  userEmail,
  onSignOut
}) => {
  const {
    role,
    setRole,
    currentDriverId,
    setCurrentDriverId,
    drivers,
    notifications,
    markNotificationAsRead,
    markAllNotificationsAsRead,
    selectedMonth,
    setSelectedMonth,
    resetToDefaultData,
    isCloudSynced
  } = useTVDE();

  const [showNotifPopover, setShowNotifPopover] = useState(false);
  const [showRoleDropdown, setShowRoleDropdown] = useState(false);

  const unreadCount = notifications.filter(n => !n.read).length;
  const currentDriver = drivers.find(d => d.id === currentDriverId) || drivers[0];

  const handleMonthChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    setSelectedMonth(e.target.value);
  };

  return (
    <header className="sticky top-0 z-30 bg-white text-slate-900 border-b border-slate-200 shadow-sm">
      <div className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Brand Logo & Mobile Menu Toggle */}
          <div className="flex items-center space-x-2 sm:space-x-3">
            <button
              onClick={() => setIsMobileMenuOpen && setIsMobileMenuOpen(!isMobileMenuOpen)}
              className="p-2 rounded-md hover:bg-slate-100 text-slate-700 md:hidden transition border border-slate-200 focus:outline-none"
              title="Abrir Menu de Navegação"
            >
              <Menu className="w-5 h-5" />
            </button>

            <div className="w-8 h-8 bg-blue-500 rounded-sm flex items-center justify-center shadow-sm flex-shrink-0">
              <Car className="w-5 h-5 text-white stroke-[2.5]" />
            </div>

            <div>
              <div className="flex items-center space-x-1.5 sm:space-x-2">
                <span className="font-bold text-base sm:text-lg tracking-tight text-slate-900">
                  TVDE Manager
                </span>
                <span className="px-1.5 py-0.5 text-[9px] sm:text-[10px] font-bold bg-blue-50 text-blue-600 border border-blue-200 rounded-sm uppercase tracking-wider hidden sm:inline-block">
                  Frota PT
                </span>
                {isCloudSynced ? (
                  <span className="px-1.5 py-0.5 text-[9px] sm:text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200 rounded-sm flex items-center space-x-1" title="Sincronizado na nuvem Firebase">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
                    <span className="hidden sm:inline">Nuvem em Tempo Real</span>
                    <span className="sm:hidden">Nuvem</span>
                  </span>
                ) : (
                  <span className="px-1.5 py-0.5 text-[9px] sm:text-[10px] font-bold bg-amber-50 text-amber-700 border border-amber-200 rounded-sm flex items-center space-x-1">
                    <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-ping"></span>
                    <span>A Ligar...</span>
                  </span>
                )}
              </div>
              <p className="text-xs text-slate-500 hidden lg:block">
                Gestão de Frota, Faturação e Rentabilidade
              </p>
            </div>
          </div>

          {/* Controls Right */}
          <div className="flex items-center space-x-2 sm:space-x-3">
            {/* Quick Action for Shift Log */}
            {role === 'driver' && (
              <button
                onClick={onOpenNewShiftModal}
                className="hidden sm:flex items-center space-x-2 px-3.5 py-2 rounded-md bg-blue-600 hover:bg-blue-700 text-white font-medium text-xs shadow-sm transition"
              >
                <span>+ Registar Turno</span>
              </button>
            )}

            {/* AI Advisor Button */}
            <button
              onClick={onOpenAiAdvisor}
              className="flex items-center space-x-1.5 px-3.5 py-2 rounded-md bg-slate-900 hover:bg-slate-800 text-white text-xs font-medium transition shadow-sm"
              title="Consultor Inteligente TVDE"
            >
              <Sparkles className="w-4 h-4 text-blue-400 animate-pulse" />
              <span className="hidden md:inline">IA Frota</span>
            </button>

            {/* Month Selector */}
            <div className="flex items-center space-x-1 bg-slate-50 border border-slate-200 rounded-md px-2.5 py-1.5 text-xs text-slate-700">
              <Calendar className="w-3.5 h-3.5 text-slate-500" />
              <select
                value={selectedMonth}
                onChange={handleMonthChange}
                className="bg-transparent text-slate-800 text-xs font-medium focus:outline-none cursor-pointer"
              >
                <optgroup label="Consultas Gerais">
                  <option value="all">Todos os Meses (Ver Tudo)</option>
                  <option value="2026">Ano Completo 2026</option>
                </optgroup>
                <optgroup label="Consultas Mensais">
                  <option value="2026-08">Agosto 2026</option>
                  <option value="2026-07">Julho 2026</option>
                  <option value="2026-06">Junho 2026</option>
                  <option value="2026-05">Maio 2026</option>
                  <option value="2026-04">Abril 2026</option>
                  <option value="2026-03">Março 2026</option>
                </optgroup>
              </select>
            </div>

            {/* Role / Mode Switcher Dropdown */}
            <div className="relative">
              <button
                onClick={() => setShowRoleDropdown(!showRoleDropdown)}
                className="flex items-center space-x-2 bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded-md px-3 py-1.5 text-xs text-slate-800 font-medium transition"
              >
                {role === 'manager' ? (
                  <>
                    <Shield className="w-3.5 h-3.5 text-blue-600" />
                    <span className="font-semibold text-slate-800 hidden sm:inline">Gestor de Frota</span>
                  </>
                ) : (
                  <>
                    <UserCheck className="w-3.5 h-3.5 text-blue-600" />
                    <span className="font-semibold text-slate-800 hidden sm:inline">
                      {currentDriver?.name.split(' ')[0]}
                    </span>
                  </>
                )}
                <ChevronDown className="w-3 h-3 text-slate-500" />
              </button>

              {showRoleDropdown && (
                <div className="absolute right-0 mt-2 w-56 bg-white border border-slate-200 rounded-md shadow-xl py-2 z-50">
                  <div className="px-3 py-1.5 border-b border-slate-100">
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                      Selecione o Perfil
                    </p>
                  </div>

                  <button
                    onClick={() => {
                      setRole('manager');
                      setActiveTab('dashboard');
                      setShowRoleDropdown(false);
                    }}
                    className={`w-full text-left px-3 py-2 text-xs flex items-center justify-between hover:bg-slate-50 ${
                      role === 'manager' ? 'bg-blue-50 text-blue-700 font-semibold' : 'text-slate-700'
                    }`}
                  >
                    <div className="flex items-center space-x-2">
                      <Shield className="w-4 h-4 text-blue-600" />
                      <span>Visão Gestor da Frota</span>
                    </div>
                    {role === 'manager' && <CheckCircle2 className="w-3.5 h-3.5 text-blue-600" />}
                  </button>

                  <div className="px-3 py-1.5 border-t border-slate-100 mt-1">
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                      Modo Motorista
                    </p>
                  </div>

                  {drivers.map(d => (
                    <button
                      key={d.id}
                      onClick={() => {
                        setRole('driver');
                        setCurrentDriverId(d.id);
                        setActiveTab('driver-portal');
                        setShowRoleDropdown(false);
                      }}
                      className={`w-full text-left px-3 py-2 text-xs flex items-center justify-between hover:bg-slate-50 ${
                        role === 'driver' && currentDriverId === d.id
                          ? 'bg-blue-50 text-blue-700 font-semibold'
                          : 'text-slate-700'
                      }`}
                    >
                      <div className="flex items-center space-x-2 truncate">
                        <UserCheck className="w-3.5 h-3.5 text-blue-600 flex-shrink-0" />
                        <span className="truncate">{d.name}</span>
                      </div>
                      {role === 'driver' && currentDriverId === d.id && (
                        <CheckCircle2 className="w-3.5 h-3.5 text-blue-600 flex-shrink-0" />
                      )}
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Notifications Bell Dropdown */}
            <div className="relative">
              <button
                onClick={() => setShowNotifPopover(!showNotifPopover)}
                className="relative p-2 rounded-md bg-slate-50 hover:bg-slate-100 text-slate-700 border border-slate-200 transition"
                title="Notificações e Alertas"
              >
                <Bell className="w-4 h-4 text-slate-600" />
                {unreadCount > 0 && (
                  <span className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-red-500 text-white text-[10px] font-bold flex items-center justify-center">
                    {unreadCount}
                  </span>
                )}
              </button>

              {showNotifPopover && (
                <div className="absolute right-0 mt-2 w-80 sm:w-96 bg-white border border-slate-200 rounded-md shadow-xl z-50 overflow-hidden">
                  <div className="px-4 py-3 bg-slate-50 flex items-center justify-between border-b border-slate-200">
                    <div className="flex items-center space-x-2">
                      <Bell className="w-4 h-4 text-blue-600" />
                      <span className="text-xs font-bold text-slate-900">Notificações e Alertas</span>
                      {unreadCount > 0 && (
                        <span className="px-2 py-0.5 text-[10px] bg-red-100 text-red-700 rounded font-bold">
                          {unreadCount} novos
                        </span>
                      )}
                    </div>
                    {unreadCount > 0 && (
                      <button
                        onClick={markAllNotificationsAsRead}
                        className="text-[11px] text-blue-600 hover:underline font-medium"
                      >
                        Marcar lidas
                      </button>
                    )}
                  </div>

                  <div className="max-h-80 overflow-y-auto divide-y divide-slate-100">
                    {notifications.length === 0 ? (
                      <div className="p-6 text-center text-xs text-slate-500">
                        Sem alertas no momento.
                      </div>
                    ) : (
                      notifications.slice(0, 6).map(n => (
                        <div
                          key={n.id}
                          onClick={() => {
                            markNotificationAsRead(n.id);
                            setActiveTab('notifications');
                            setShowNotifPopover(false);
                          }}
                          className={`p-3 text-xs cursor-pointer hover:bg-slate-50 transition flex space-x-3 ${
                            !n.read ? 'bg-blue-50/50 border-l-2 border-blue-600' : 'opacity-75'
                          }`}
                        >
                          <div className="mt-0.5">
                            {n.type === 'maintenance'       && <AlertTriangle className="w-4 h-4 text-orange-500" />}
                            {n.type === 'payment_pending'   && <AlertTriangle className="w-4 h-4 text-red-500" />}
                            {n.type === 'document_expiry'   && <Layers        className="w-4 h-4 text-blue-500" />}
                            {n.type === 'performance_alert' && <Sparkles      className="w-4 h-4 text-emerald-500" />}
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="font-bold text-slate-900 truncate">{n.title}</p>
                            <p className="text-slate-600 text-[11px] line-clamp-2 mt-0.5">{n.message}</p>
                            <p className="text-[10px] text-slate-400 mt-1">
                              {new Date(n.date).toLocaleDateString('pt-PT')}
                            </p>
                          </div>
                        </div>
                      ))
                    )}
                  </div>

                  <div className="p-2.5 bg-slate-50 text-center border-t border-slate-200">
                    <button
                      onClick={() => {
                        setActiveTab('notifications');
                        setShowNotifPopover(false);
                      }}
                      className="text-xs text-blue-600 font-bold hover:underline"
                    >
                      Ver todas as notificações ({notifications.length}) →
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* Reset Data Button */}
            <button
              onClick={() => {
                if (confirm('Deseja repor os dados de teste padrão da frota TVDE?')) {
                  resetToDefaultData();
                }
              }}
              className="p-2 rounded-md bg-slate-50 hover:bg-slate-100 text-slate-600 border border-slate-200 transition"
              title="Resetar Dados Padrão"
            >
              <RefreshCw className="w-4 h-4" />
            </button>

            {/* ── Logout ──────────────────────────────────────────────────── */}
            <button
              onClick={onSignOut}
              className="flex items-center space-x-1.5 p-2 rounded-md bg-slate-50 hover:bg-red-50 hover:border-red-200 text-slate-600 hover:text-red-600 border border-slate-200 transition"
              title={`Terminar sessão (${userEmail})`}
            >
              <LogOut className="w-4 h-4" />
              <span className="hidden lg:inline text-xs font-medium truncate max-w-[120px]">
                {userEmail}
              </span>
            </button>
            {/* ─────────────────────────────────────────────────────────────── */}
          </div>
        </div>
      </div>
    </header>
  );
};
