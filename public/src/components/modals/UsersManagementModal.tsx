import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { useTVDE } from '../../context/TVDEContext';
import {
  getAuthorizedUsers,
  addAuthorizedUser,
  removeAuthorizedUser,
  AuthorizedUser,
} from '../../lib/auth';
import {
  Users,
  UserPlus,
  Trash2,
  X,
  Shield,
  User,
  Mail,
  CheckCircle2,
  AlertCircle,
  RefreshCw,
  Search,
  RotateCcw,
  Database
} from 'lucide-react';

interface UsersManagementModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const UsersManagementModal: React.FC<UsersManagementModalProps> = ({
  isOpen,
  onClose,
}) => {
  const { user: currentUser, role: currentRole } = useAuth();
  const { resetToDefaultData } = useTVDE();

  const [users, setUsers]               = useState<AuthorizedUser[]>([]);
  const [loading, setLoading]           = useState<boolean>(false);
  const [submitting, setSubmitting]     = useState<boolean>(false);
  const [deletingEmail, setDeletingEmail] = useState<string | null>(null);

  // Form states
  const [newName, setNewName]   = useState('');
  const [newEmail, setNewEmail] = useState('');
  const [newRole, setNewRole]   = useState<'gestor' | 'motorista'>('motorista');

  // Search filter
  const [searchTerm, setSearchTerm] = useState('');

  // Notifications
  const [errorMsg, setErrorMsg]     = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  const loadUsers = useCallback(async () => {
    setLoading(true);
    setErrorMsg('');
    try {
      const data = await getAuthorizedUsers();
      setUsers(data);
    } catch (err: any) {
      console.error('Erro ao carregar utilizadores:', err);
      setErrorMsg(err.message || 'Erro ao carregar a lista de utilizadores.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (isOpen) {
      loadUsers();
      setErrorMsg('');
      setSuccessMsg('');
    }
  }, [isOpen, loadUsers]);

  if (!isOpen) return null;

  // Se não for gestor, não dá acesso
  if (currentRole !== 'gestor') {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/70 backdrop-blur-sm">
        <div className="bg-white rounded-2xl p-6 max-w-md w-full shadow-2xl text-center border border-slate-100">
          <Shield className="w-12 h-12 text-rose-500 mx-auto mb-3" />
          <h2 className="text-lg font-bold text-slate-900">Acesso Restrito</h2>
          <p className="text-sm text-slate-600 mt-2">
            Apenas utilizadores com a função de <strong>Gestor</strong> têm permissão para gerir os utilizadores autorizados.
          </p>
          <button
            onClick={onClose}
            className="mt-5 px-5 py-2.5 bg-slate-900 text-white rounded-xl text-xs font-semibold hover:bg-slate-800 transition"
          >
            Fechar
          </button>
        </div>
      </div>
    );
  }

  const handleAddUser = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');
    setSuccessMsg('');

    if (!newEmail.trim()) {
      setErrorMsg('O endereço de email é obrigatório.');
      return;
    }

    if (!newEmail.includes('@') || !newEmail.includes('.')) {
      setErrorMsg('Por favor insira um endereço de email válido.');
      return;
    }

    setSubmitting(true);
    try {
      await addAuthorizedUser(newEmail, newName, newRole);
      setSuccessMsg(`Utilizador ${newEmail} adicionado com sucesso!`);
      setNewName('');
      setNewEmail('');
      setNewRole('motorista');
      await loadUsers();
    } catch (err: any) {
      console.error('Erro ao adicionar utilizador:', err);
      setErrorMsg(err.message || 'Ocorreu um erro ao guardar o utilizador.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleRemoveUser = async (emailToRemove: string) => {
    if (currentUser?.email?.toLowerCase() === emailToRemove.toLowerCase()) {
      if (!confirm('Atenção: Está a tentar remover a sua própria conta! Deseja mesmo continuar?')) {
        return;
      }
    } else {
      if (!confirm(`Tem a certeza que deseja remover o acesso ao utilizador "${emailToRemove}"?`)) {
        return;
      }
    }

    setDeletingEmail(emailToRemove);
    setErrorMsg('');
    setSuccessMsg('');

    try {
      await removeAuthorizedUser(emailToRemove);
      setSuccessMsg(`Acesso de ${emailToRemove} removido.`);
      await loadUsers();
    } catch (err: any) {
      console.error('Erro ao remover utilizador:', err);
      setErrorMsg(err.message || 'Erro ao remover o utilizador.');
    } finally {
      setDeletingEmail(null);
    }
  };

  const filteredUsers = users.filter(
    u =>
      u.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      u.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
      u.role.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-900/70 backdrop-blur-sm overflow-y-auto">
      <div className="bg-white rounded-2xl w-full max-w-3xl shadow-2xl border border-slate-100 my-auto overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="bg-slate-900 text-white px-6 py-4 flex items-center justify-between shrink-0">
          <div className="flex items-center space-x-3">
            <div className="p-2 bg-blue-600/30 rounded-xl border border-blue-500/30">
              <Users className="w-5 h-5 text-blue-400" />
            </div>
            <div>
              <h2 className="text-base sm:text-lg font-bold tracking-tight">
                Gestão de Utilizadores Autorizados
              </h2>
              <p className="text-xs text-slate-400">
                Gerir acessos e permissões da coleção Firestore <code className="text-blue-300">authorizedUsers</code>
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content Body */}
        <div className="p-6 overflow-y-auto space-y-6 flex-1">
          {/* Feedback Messages */}
          {errorMsg && (
            <div className="p-3.5 bg-rose-50 border border-rose-200 text-rose-700 rounded-xl text-xs sm:text-sm flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
                <span>{errorMsg}</span>
              </div>
              <button onClick={() => setErrorMsg('')} className="p-1 hover:bg-rose-100 rounded">
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          )}

          {successMsg && (
            <div className="p-3.5 bg-emerald-50 border border-emerald-200 text-emerald-700 rounded-xl text-xs sm:text-sm flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                <span>{successMsg}</span>
              </div>
              <button onClick={() => setSuccessMsg('')} className="p-1 hover:bg-emerald-100 rounded">
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          )}

          {/* Form Section */}
          <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4 sm:p-5">
            <div className="flex items-center space-x-2 mb-3">
              <UserPlus className="w-4 h-4 text-blue-600" />
              <h3 className="text-xs sm:text-sm font-bold text-slate-900">
                Adicionar Novo Utilizador Autorizado
              </h3>
            </div>

            <form onSubmit={handleAddUser} className="grid grid-cols-1 sm:grid-cols-12 gap-3">
              <div className="sm:col-span-4">
                <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                  Nome do Utilizador
                </label>
                <div className="relative">
                  <User className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                  <input
                    type="text"
                    placeholder="Ex: Maria Santos"
                    value={newName}
                    onChange={e => setNewName(e.target.value)}
                    className="w-full pl-9 pr-3 py-2 text-xs rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
                  />
                </div>
              </div>

              <div className="sm:col-span-5">
                <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                  Endereço de Email <span className="text-rose-500">*</span>
                </label>
                <div className="relative">
                  <Mail className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                  <input
                    type="email"
                    required
                    placeholder="exemplo@gmail.com"
                    value={newEmail}
                    onChange={e => setNewEmail(e.target.value)}
                    className="w-full pl-9 pr-3 py-2 text-xs rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
                  />
                </div>
              </div>

              <div className="sm:col-span-3">
                <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                  Função / Permissão
                </label>
                <select
                  value={newRole}
                  onChange={e => setNewRole(e.target.value as 'gestor' | 'motorista')}
                  className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white font-medium"
                >
                  <option value="motorista">Motorista</option>
                  <option value="gestor">Gestor</option>
                </select>
              </div>

              <div className="sm:col-span-12 flex justify-end mt-1">
                <button
                  type="submit"
                  disabled={submitting}
                  className="w-full sm:w-auto px-5 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-semibold flex items-center justify-center space-x-2 transition disabled:opacity-50"
                >
                  {submitting ? (
                    <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                  ) : (
                    <UserPlus className="w-3.5 h-3.5" />
                  )}
                  <span>{submitting ? 'A guardar...' : 'Adicionar Utilizador'}</span>
                </button>
              </div>
            </form>
          </div>

          {/* Users List Section */}
          <div>
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-3">
              <div className="flex items-center space-x-2">
                <Shield className="w-4 h-4 text-slate-700" />
                <h3 className="text-xs sm:text-sm font-bold text-slate-900">
                  Utilizadores Atualmente Autorizados ({filteredUsers.length})
                </h3>
              </div>

              <div className="flex items-center space-x-2">
                <div className="relative">
                  <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-2" />
                  <input
                    type="text"
                    placeholder="Pesquisar utilizador..."
                    value={searchTerm}
                    onChange={e => setSearchTerm(e.target.value)}
                    className="pl-8 pr-3 py-1 text-xs rounded-lg border border-slate-200 focus:outline-none focus:ring-1 focus:ring-blue-500 bg-slate-50 w-44"
                  />
                </div>
                <button
                  onClick={loadUsers}
                  disabled={loading}
                  title="Atualizar Lista"
                  className="p-1.5 rounded-lg border border-slate-200 hover:bg-slate-100 text-slate-600 transition"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
                </button>
              </div>
            </div>

            {loading ? (
              <div className="p-8 text-center text-xs text-slate-500 bg-slate-50 rounded-xl border border-dashed border-slate-200">
                <RefreshCw className="w-5 h-5 animate-spin mx-auto text-blue-600 mb-2" />
                <span>A carregar utilizadores do Firestore...</span>
              </div>
            ) : filteredUsers.length === 0 ? (
              <div className="p-8 text-center text-xs text-slate-500 bg-slate-50 rounded-xl border border-dashed border-slate-200">
                Nenhum utilizador encontrado na coleção authorizedUsers.
              </div>
            ) : (
              <div className="border border-slate-200 rounded-xl overflow-hidden divide-y divide-slate-100 bg-white">
                {filteredUsers.map((u) => {
                  const isCurrent = currentUser?.email?.toLowerCase() === u.email.toLowerCase();

                  return (
                    <div
                      key={u.id || u.email}
                      className="p-3 sm:p-4 flex items-center justify-between hover:bg-slate-50/80 transition"
                    >
                      <div className="flex items-center space-x-3 min-w-0">
                        <div
                          className={`w-9 h-9 rounded-full flex items-center justify-center font-bold text-xs uppercase shrink-0 ${
                            u.role === 'gestor'
                              ? 'bg-blue-100 text-blue-700 border border-blue-200'
                              : 'bg-emerald-100 text-emerald-700 border border-emerald-200'
                          }`}
                        >
                          {u.name.charAt(0) || u.email.charAt(0)}
                        </div>
                        <div className="min-w-0">
                          <div className="flex items-center space-x-2">
                            <span className="text-xs sm:text-sm font-bold text-slate-900 truncate">
                              {u.name}
                            </span>
                            {isCurrent && (
                              <span className="text-[10px] bg-slate-100 text-slate-600 font-semibold px-1.5 py-0.5 rounded border border-slate-200">
                                Você
                              </span>
                            )}
                          </div>
                          <p className="text-[11px] text-slate-500 truncate">{u.email}</p>
                        </div>
                      </div>

                      <div className="flex items-center space-x-3 shrink-0 ml-2">
                        <span
                          className={`px-2.5 py-1 text-[10px] font-bold rounded-lg border ${
                            u.role === 'gestor'
                              ? 'bg-blue-50 text-blue-700 border-blue-200'
                              : 'bg-emerald-50 text-emerald-700 border-emerald-200'
                          }`}
                        >
                          {u.role === 'gestor' ? 'Gestor' : 'Motorista'}
                        </span>

                        <button
                          onClick={() => handleRemoveUser(u.email)}
                          disabled={deletingEmail === u.email}
                          title="Remover Acesso"
                          className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 border border-transparent hover:border-rose-200 transition"
                        >
                          {deletingEmail === u.email ? (
                            <RefreshCw className="w-4 h-4 animate-spin text-rose-600" />
                          ) : (
                            <Trash2 className="w-4 h-4" />
                          )}
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Maintenance / Data Reset Section */}
          <div className="bg-amber-50/60 border border-amber-200/80 rounded-2xl p-4 sm:p-5">
            <div className="flex items-center space-x-2 mb-2">
              <Database className="w-4 h-4 text-amber-700" />
              <h3 className="text-xs sm:text-sm font-bold text-amber-950">
                Manutenção e Reposição de Dados
              </h3>
            </div>
            <p className="text-xs text-amber-800 mb-3 leading-relaxed">
              Caso necessite de repor a estrutura de dados inicial da frota (veículos, motoristas, turnos e despesas de demonstração), utilize o botão abaixo.
            </p>
            <button
              onClick={() => {
                if (
                  confirm(
                    'ATENÇÃO: Tem a certeza que deseja repor os dados padrão de demonstração da frota?\n\nIsto irá recarregar a lista de veículos, motoristas, turnos e despesas para o estado inicial.'
                  )
                ) {
                  resetToDefaultData();
                  setSuccessMsg('Dados padrão da frota repostos com sucesso!');
                  setErrorMsg('');
                }
              }}
              className="px-4 py-2 bg-amber-600 hover:bg-amber-700 text-white rounded-xl text-xs font-semibold flex items-center space-x-2 transition shadow-sm"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>Repor Dados Padrão de Demonstração</span>
            </button>
          </div>
        </div>

        {/* Footer */}
        <div className="bg-slate-50 px-6 py-3 border-t border-slate-200 flex justify-between items-center text-xs text-slate-500 shrink-0">
          <span>Coleção: <code className="text-slate-700 font-mono">authorizedUsers</code></span>
          <button
            onClick={onClose}
            className="px-4 py-2 bg-slate-200 hover:bg-slate-300 text-slate-800 rounded-xl font-semibold transition"
          >
            Fechar
          </button>
        </div>
      </div>
    </div>
  );
};
