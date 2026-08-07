import React, { useState } from 'react';
import { useTVDE } from '../context/TVDEContext';
import { NotificationType } from '../types';
import {
  Bell,
  AlertTriangle,
  Wrench,
  DollarSign,
  FileText,
  CheckCircle2,
  Send,
  Check
} from 'lucide-react';

export const NotificationsView: React.FC = () => {
  const {
    notifications,
    markNotificationAsRead,
    markAllNotificationsAsRead,
    addNotification
  } = useTVDE();

  const [activeFilter, setActiveFilter] = useState<NotificationType | 'all'>('all');
  const [pushEnabled, setPushEnabled] = useState<boolean>(false);
  const [pushMessage, setPushMessage] = useState<string | null>(null);

  const filterLabels: Record<NotificationType, { label: string; icon: any }> = {
    maintenance: { label: 'Manutenção', icon: Wrench },
    payment_pending: { label: 'Pagamentos Pendentes', icon: DollarSign },
    document_expiry: { label: 'Validade de Documentos', icon: FileText },
    performance_alert: { label: 'Alertas Desempenho', icon: Bell }
  };

  const filteredNotifs = notifications.filter(n => {
    return activeFilter === 'all' || n.type === activeFilter;
  });

  const handleSimulatePush = () => {
    // Dispatch a test alert
    addNotification({
      type: 'maintenance',
      title: 'Alerta de Pressão dos Pneus / Travões',
      message: 'Notificação Push em tempo real: Viatura AA-42-TV registou alerta de manutenção periódica!',
      priority: 'high',
      actionRequired: 'Verificar sensores'
    });

    setPushMessage('Notificação Push de teste enviada com sucesso!');
    setTimeout(() => setPushMessage(null), 3500);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-white border border-slate-200 rounded-md p-6 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center space-x-2">
            <Bell className="w-5 h-5 text-blue-600" />
            <h1 className="text-xl font-bold text-slate-900">Central de Alertas e Notificações Push</h1>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            Receba notificações automáticas para avisos de manutenção das viaturas, cobranças de rendas e caducidade de documentos.
          </p>
        </div>

        <div className="flex items-center space-x-3">
          <button
            onClick={handleSimulatePush}
            className="px-3.5 py-2 rounded-md bg-blue-600 hover:bg-blue-700 text-white font-medium text-xs shadow-sm transition flex items-center space-x-2"
          >
            <Send className="w-4 h-4" />
            <span>Simular Notificação Push</span>
          </button>

          <button
            onClick={markAllNotificationsAsRead}
            className="px-3.5 py-2 rounded-md bg-slate-100 hover:bg-slate-200 text-slate-800 border border-slate-200 font-medium text-xs transition shadow-sm"
          >
            Marcar Todas como Lidas
          </button>
        </div>
      </div>

      {pushMessage && (
        <div className="bg-emerald-50 border border-emerald-200 text-emerald-800 p-4 rounded-md text-xs font-bold flex items-center space-x-2 animate-fadeIn">
          <CheckCircle2 className="w-4 h-4 text-emerald-600" />
          <span>{pushMessage}</span>
        </div>
      )}

      {/* Push Toggle Status Card */}
      <div className="bg-white border border-slate-200 rounded-md p-4 shadow-sm flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <div className="p-2.5 rounded bg-blue-50 text-blue-600">
            <Bell className="w-5 h-5" />
          </div>
          <div>
            <p className="text-xs font-bold text-slate-900">Serviço de Notificações Ativo</p>
            <p className="text-[11px] text-slate-500">
              Notificações de fundo para reparações mecânicas urgentes e pagamentos em atraso
            </p>
          </div>
        </div>

        <div className="flex items-center space-x-2">
          <span className="text-xs text-slate-600 font-medium">Alertas no Browser:</span>
          <button
            onClick={() => setPushEnabled(!pushEnabled)}
            className={`w-12 h-6 rounded-full transition-colors p-1 ${
              pushEnabled ? 'bg-blue-600' : 'bg-slate-300'
            }`}
          >
            <div
              className={`w-4 h-4 rounded-full bg-white transition-transform ${
                pushEnabled ? 'translate-x-6' : 'translate-x-0'
              }`}
            />
          </button>
        </div>
      </div>

      {/* Filter Tabs */}
      <div className="flex flex-wrap gap-2">
        <button
          onClick={() => setActiveFilter('all')}
          className={`px-3.5 py-2 rounded-md text-xs font-bold transition ${
            activeFilter === 'all'
              ? 'bg-blue-600 text-white shadow-sm'
              : 'bg-white border border-slate-200 text-slate-600 hover:text-slate-900 hover:bg-slate-50'
          }`}
        >
          Todas ({notifications.length})
        </button>

        {Object.entries(filterLabels).map(([key, item]) => {
          const count = notifications.filter(n => n.type === key).length;
          const Icon = item.icon;
          return (
            <button
              key={key}
              onClick={() => setActiveFilter(key as NotificationType)}
              className={`px-3.5 py-2 rounded-md text-xs font-bold flex items-center space-x-1.5 transition ${
                activeFilter === key
                  ? 'bg-blue-600 text-white shadow-sm'
                  : 'bg-white border border-slate-200 text-slate-600 hover:text-slate-900 hover:bg-slate-50'
              }`}
            >
              <Icon className="w-3.5 h-3.5" />
              <span>{item.label} ({count})</span>
            </button>
          );
        })}
      </div>

      {/* Notifications List */}
      <div className="space-y-3">
        {filteredNotifs.length === 0 ? (
          <div className="bg-white border border-slate-200 rounded-md p-8 text-center text-slate-500 text-xs shadow-sm">
            Sem notificações para a categoria selecionada.
          </div>
        ) : (
          filteredNotifs.map(n => (
            <div
              key={n.id}
              className={`bg-white border rounded-md p-4 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-4 transition ${
                !n.read
                  ? 'border-blue-300 bg-blue-50/20 border-l-4 border-l-blue-600'
                  : 'border-slate-200 opacity-80'
              }`}
            >
              <div className="flex items-start space-x-3">
                <div className="mt-1">
                  {n.priority === 'high' ? (
                    <div className="p-2 rounded bg-red-50 text-red-600">
                      <AlertTriangle className="w-5 h-5" />
                    </div>
                  ) : (
                    <div className="p-2 rounded bg-slate-100 text-blue-600">
                      <Bell className="w-5 h-5" />
                    </div>
                  )}
                </div>

                <div>
                  <div className="flex items-center space-x-2">
                    <h3 className="text-sm font-bold text-slate-900">{n.title}</h3>
                    <span
                      className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                        n.priority === 'high'
                          ? 'bg-red-50 text-red-700 border border-red-200'
                          : 'bg-slate-100 text-slate-600 border border-slate-200'
                      }`}
                    >
                      {n.priority === 'high' ? 'Alta Prioridade' : 'Normal'}
                    </span>
                  </div>
                  <p className="text-xs text-slate-600 mt-1">{n.message}</p>
                  <p className="text-[10px] text-slate-400 mt-2">
                    Data do alerta: {new Date(n.date).toLocaleString('pt-PT')}
                  </p>
                </div>
              </div>

              <div className="flex items-center space-x-2 sm:self-center flex-shrink-0">
                {n.actionRequired && (
                  <span className="px-3 py-1 bg-amber-50 text-amber-800 border border-amber-200 rounded text-xs font-bold">
                    {n.actionRequired}
                  </span>
                )}
                {!n.read && (
                  <button
                    onClick={() => markNotificationAsRead(n.id)}
                    className="p-2 rounded-md bg-slate-100 hover:bg-slate-200 text-blue-600 transition border border-slate-200"
                    title="Marcar como lida"
                  >
                    <Check className="w-4 h-4" />
                  </button>
                )}
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
};
