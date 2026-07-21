import React from 'react';
import { useTVDE } from '../context/TVDEContext';
import {
  LayoutDashboard,
  UserCheck,
  Receipt,
  DollarSign,
  Car,
  Users,
  TrendingUp,
  Bell,
  Sparkles
} from 'lucide-react';

interface SidebarProps {
  activeTab: string;
  setActiveTab: (tab: string) => void;
  onOpenAiAdvisor: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({
  activeTab,
  setActiveTab,
  onOpenAiAdvisor
}) => {
  const { role, notifications } = useTVDE();
  const unreadCount = notifications.filter(n => !n.read).length;

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
      id: 'notifications',
      label: 'Alertas & Notificações',
      icon: Bell,
      badge: unreadCount > 0 ? unreadCount : null,
      badgeColor: 'bg-rose-500 text-white',
      roles: ['manager', 'driver']
    }
  ];

  return (
    <aside className="w-full md:w-64 bg-slate-900 border-r border-slate-800 text-white flex-shrink-0 flex flex-col justify-between p-4">
      <div className="space-y-6">
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
        <nav className="space-y-1.5">
          {navItems
            .filter(item => item.roles.includes(role))
            .map(item => {
              const Icon = item.icon;
              const isActive = activeTab === item.id;
              return (
                <button
                  key={item.id}
                  onClick={() => setActiveTab(item.id)}
                  className={`w-full flex items-center justify-between px-4 py-3 rounded-md text-sm font-medium transition-colors ${
                    isActive
                      ? 'bg-blue-600 text-white shadow-sm'
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
      <div className="mt-8 pt-4 border-t border-slate-800">
        <button
          onClick={onOpenAiAdvisor}
          className="w-full group p-3.5 rounded-md bg-slate-800/90 hover:bg-slate-800 border border-slate-700 text-left transition text-white shadow-sm"
        >
          <div className="flex items-center space-x-2 text-blue-400 font-semibold text-xs mb-1">
            <Sparkles className="w-4 h-4 text-blue-400 group-hover:scale-110 transition-transform" />
            <span>Consultor IA TVDE</span>
          </div>
          <p className="text-[11px] text-slate-400 leading-snug">
            Relatórios inteligentes sobre rentabilidade, custos de combustível e manutenção.
          </p>
        </button>
        <div className="mt-4 text-[10px] text-slate-500 font-medium">
          V. 2.4.0 • TVDE Fleet Manager
        </div>
      </div>
    </aside>
  );
};
