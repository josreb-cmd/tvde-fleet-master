import React from 'react';
import {
  LayoutDashboard,
  Sliders,
  Receipt,
  DollarSign,
  Sparkles
} from 'lucide-react';

interface MobileBottomNavProps {
  activeTab: string;
  setActiveTab: (tab: string) => void;
  onOpenAiAdvisor: () => void;
}

export const MobileBottomNav: React.FC<MobileBottomNavProps> = ({
  activeTab,
  setActiveTab,
  onOpenAiAdvisor
}) => {
  const navItems = [
    {
      id: 'dashboard',
      label: 'Painel',
      icon: LayoutDashboard
    },
    {
      id: 'custom-query',
      label: 'Consultas',
      icon: Sliders
    },
    {
      id: 'shift-logs',
      label: 'Turnos',
      icon: Receipt
    },
    {
      id: 'expenses',
      label: 'Custos',
      icon: DollarSign
    }
  ];

  return (
    <div className="fixed bottom-0 left-0 right-0 z-40 bg-white/95 backdrop-blur-md border-t border-slate-200 py-1.5 px-3 md:hidden flex items-center justify-around shadow-lg">
      {navItems.map(item => {
        const Icon = item.icon;
        const isActive = activeTab === item.id;
        return (
          <button
            key={item.id}
            onClick={() => setActiveTab(item.id)}
            className={`flex flex-col items-center justify-center space-y-0.5 py-1 px-2.5 rounded-lg transition ${
              isActive
                ? 'text-blue-600 font-bold bg-blue-50/80'
                : 'text-slate-500 hover:text-slate-900 font-medium'
            }`}
          >
            <Icon className={`w-5 h-5 ${isActive ? 'text-blue-600' : 'text-slate-500'}`} />
            <span className="text-[10px] tracking-tight">{item.label}</span>
          </button>
        );
      })}

      <button
        onClick={onOpenAiAdvisor}
        className="flex flex-col items-center justify-center space-y-0.5 py-1 px-2.5 rounded-lg text-slate-700 hover:text-slate-900 font-medium"
      >
        <Sparkles className="w-5 h-5 text-blue-500 animate-pulse" />
        <span className="text-[10px] tracking-tight">IA Frota</span>
      </button>
    </div>
  );
};
