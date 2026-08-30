import React, { useEffect } from 'react';
import { useTVDE } from '../contexts/TVDEContext';
import {
  LayoutDashboard,
  UserCheck,
  Receipt,
  DollarSign,
  Zap,
  Car,
  Users,
  TrendingUp,
  Sliders,
  Bell,
  Sparkles,
  X,
  Gauge
} from 'lucide-react';

interface SidebarProps {
  activeTab: string;
  setActiveTab: (tab: string) => void;
  onOpenAiAdvisor: () => void;
  isMobileMenuOpen?: boolean;
  onCloseMobileMenu?: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({
  activeTab,
  setActiveTab,
  onOpenAiAdvisor,
  isMobileMenuOpen = false,
  onCloseMobileMenu
}) => {
  const { role, notifications } = useTVDE();
  const unreadCount = notifications.filter(n => !n.read).length;

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isMobileMenuOpen && onCloseMobileMenu) {
        onCloseMobileMenu();
      }
    };
    if (isMobileMenuOpen) {
      window.addEventListener('keydown', handleKeyDown);
    }
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isMobileMenuOpen, onCloseMobileMenu]);

  const navItems = [
    {
      id: 'dashboard',
      label: 'Painel Geral',
      icon: LayoutDashboard,
      badge: null,
      roles: ['manager', 'driver']
    },
    {
      id: 'driver-portal',
      label: 'Portal do Motorista',
      icon: UserCheck,
      badge: role === 'driver' ? 'Ativo' : null,
      roles: ['manager', 'driver']
    },
    {
      id: 'shift-logs',
      label: 'Faturação Diária',
      icon: Receipt,
      badge: null,
      roles: ['manager', 'driver']
    },
    {
      id: 'expenses',
      label: 'Custos & Rendas',
      icon: DollarSign,
      badge: null,
      roles: ['manager', 'driver']
    },
    {
      id: 'carregamentos',
      label: 'Carregamentos',
      icon: Zap,
      badge: 'Novo',
      badgeColor: 'bg-amber-500 text-white',
      roles: ['manager', 'driver']
    },
    {
      id: 'fleet',
      label: 'Frota de Viaturas',
      icon: Car,
      badge: null,
      roles: ['manager']
    },
    {
      id: 'drivers',
      label: 'Motoristas',
      icon: Users,
      badge: null,
      roles: ['manager']
    },
    {
      id: 'profitability',
      label: 'Rentabilidade Mensal',
      icon: TrendingUp,
      badge: null,
      roles: ['manager']
    },
    {
      id: 'km-rentabilidade',
      label: 'Rentabilidade km',
      icon: Gauge,
      badge: null,
      roles: ['manager']
    },
    {
      id: 'custom-query',
      label: 'Consulta Personalizada',
      icon: Sliders,
      badge: 'Novo',
      badgeColor: 'bg-blue-500 text-white',
      roles: ['manager', 'driver']
    },
    {
      id: 'notifications',
      label: 'Alertas & Notificações',
      icon: Bell,
      badge: unreadCount > 0 ? unreadCount : null,
      badgeColor: 'bg-rose-500 text-white',
      roles: ['manager', 'driver']
    }
  ];

  const handleSelectTab = (tabId: string) => {
    setActiveTab(tabId);
    if (onCloseMobileMenu) onCloseMobileMenu();
  };

  const handleAiClick = () => {
    onOpenAiAdvisor();
    if (onCloseMobileMenu) onCloseMobileMenu();
  };

  const SidebarContent = (
    <div className="flex flex-col h-full justify-between p-4">
      <div className="space-y-5">
        {/* Mobile Header Title if rendered in mobile drawer */}
        <div className="flex items-center justify-between md:hidden pb-2 border-b border-slate-800">
          <div className="flex items-center space-x-2">
            <Car className="w-5 h-5 text-blue-500" />
            <span className="font-bold text-base text-white">Navegação TVDE</span>
          </div>
          <button
            onClick={onCloseMobileMenu}
            className="p-1.5 rounded-md hover:bg-slate-800 text-slate-400 hover:text-white transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Role Badge Indicator */}
        <div className="bg-slate-800/90 rounded-md p-3 border border-slate-700/80">
          <p className="text-[10px] text-slate-400 uppercase tracking-wider font-bold">
            Modo de Visualização
          </p>
          <div className="flex items-center space-x-2 mt-1">
            <div className={`w-2 h-2 rounded-full ${role === 'manager' ? 'bg-blue-500' : 'bg-emerald-400'}`} />
            <span className="text-xs font-semibold text-white">
              {role === 'manager' ? 'Painel de Controlo' : 'Área do Motorista'}
            </span>
          </div>
        </div>

        {/* Navigation List */}
        <nav className="space-y-1">
          {navItems
            .filter(item => item.roles.includes(role))
            .map(item => {
              const Icon = item.icon;
              const isActive = activeTab === item.id;
              return (
                <button
                  key={item.id}
                  onClick={() => handleSelectTab(item.id)}
                  className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-md text-xs sm:text-sm font-medium transition-colors ${
                    isActive
                      ? 'bg-blue-600 text-white shadow-sm font-semibold'
                      : 'text-slate-400 hover:text-white hover:bg-slate-800'
                  }`}
                >
                  <div className="flex items-center space-x-3">
                    <Icon className={`w-4 h-4 ${isActive ? 'text-white' : 'text-slate-400'}`} />
                    <span>{item.label}</span>
                  </div>
                  {item.badge !== null && (
                    <span
                      className={`px-2 py-0.5 text-[10px] rounded font-bold ${
                        item.badgeColor || 'bg-slate-800 text-slate-300'
                      }`}
                    >
                      {item.badge}
                    </span>
                  )}
                </button>
              );
            })}
        </nav>
      </div>

      {/* AI Assistant Banner Footer */}
      <div className="mt-6 pt-4 border-t border-slate-800">
        <button
          onClick={handleAiClick}
          className="w-full group p-3.5 rounded-md bg-slate-800/90 hover:bg-slate-800 border border-slate-700 text-left transition text-white shadow-sm"
        >
          <div className="flex items-center space-x-2 text-blue-400 font-semibold text-xs mb-1">
            <Sparkles className="w-4 h-4 text-blue-400 group-hover:scale-110 transition-transform" />
            <span>Consultor IA TVDE</span>
          </div>
          <p className="text-[11px] text-slate-400 leading-snug">
            Relatórios inteligentes sobre rentabilidade e custos.
          </p>
        </button>
        <div className="mt-3 text-[10px] text-slate-500 font-medium">
          V. {__APP_VERSION__} • TVDE Fleet Manager
        </div>
      </div>
    </div>
  );

  return (
    <>
      {/* Desktop Fixed Sidebar */}
      <aside className="w-64 bg-slate-900 border-r border-slate-800 text-white flex-shrink-0 hidden md:flex flex-col justify-between">
        {SidebarContent}
      </aside>

      {/* Mobile Drawer Backdrop & Drawer */}
      {isMobileMenuOpen && (
        <div className="fixed inset-0 z-50 md:hidden">
          {/* Backdrop */}
          <div
            className="fixed inset-0 bg-slate-900/70 backdrop-blur-sm transition-opacity"
            onClick={onCloseMobileMenu}
          />
          {/* Drawer Slide Panel */}
          <div className="fixed inset-y-0 left-0 max-w-xs w-full bg-slate-900 text-white shadow-2xl z-50 flex flex-col transform transition-transform ease-in-out duration-300">
            {SidebarContent}
          </div>
        </div>
      )}
    </>
  );
};
