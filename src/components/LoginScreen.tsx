import React, { useState } from 'react';
import { useAuth } from '../contexts/AuthContext';

export function LoginScreen() {
  const { signIn, signInDemo } = useAuth();
  const [error, setError]     = useState('');
  const [loading, setLoading] = useState(false);

  const handleSignIn = async () => {
    setError('');
    setLoading(true);
    try {
      await signIn();
    } catch (e: any) {
      if (isIframe) {
        setError('A autenticação Google foi bloqueada pelo iFrame do navegador. Clique no botão "Abrir num Novo Separador" para iniciar sessão com a sua conta Google real, ou entre instantaneamente em "Modo Demo".');
      } else {
        setError(e.message || 'Erro ao autenticar.');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleDemoSignIn = async (roleTarget: 'gestor' | 'motorista' = 'gestor') => {
    setError('');
    setLoading(true);
    try {
      await signInDemo(roleTarget);
    } catch (e: any) {
      setError(e.message || 'Erro ao entrar em Modo Demonstração.');
    } finally {
      setLoading(false);
    }
  };

  const handleOpenNewTab = () => {
    window.open(window.location.href, '_blank');
  };

  const isIframe = window.self !== window.top;

  return (
    <div className="min-h-screen bg-gray-950 flex items-center justify-center px-4">
      <div className="bg-gray-900 border border-gray-700 rounded-2xl p-8 flex flex-col items-center gap-5 w-full max-w-sm shadow-2xl">
        <div className="flex flex-col items-center gap-2 text-center">
          <span className="text-4xl">🚗</span>
          <h1 className="text-white text-2xl font-bold tracking-tight">TVDE Fleet Master</h1>
          <p className="text-gray-400 text-xs">Acesso ao sistema de Gestão de Frota</p>
        </div>

        {error && (
          <div className="bg-amber-950/60 border border-amber-600/80 text-amber-200 text-xs rounded-xl p-3.5 w-full text-left leading-relaxed flex flex-col gap-1.5">
            <span className="font-semibold text-amber-400">⚠️ Nota sobre Login Google:</span>
            <span>{error}</span>
          </div>
        )}

        <div className="w-full flex flex-col gap-3">
          <p className="text-[11px] text-gray-400 text-center font-medium uppercase tracking-wider">
            Acesso Rápido de Teste (Preview)
          </p>

          <button
            onClick={() => handleDemoSignIn('gestor')}
            disabled={loading}
            className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-500 text-white font-semibold px-4 py-3 rounded-xl transition-all w-full justify-center disabled:opacity-50 disabled:cursor-not-allowed shadow-lg shadow-indigo-900/30 cursor-pointer text-xs"
          >
            <span>🚀 Entrar como Gestor (Acesso Completo)</span>
          </button>

          <button
            onClick={() => handleDemoSignIn('motorista')}
            disabled={loading}
            className="flex items-center gap-2 bg-gray-800 hover:bg-gray-700 text-indigo-300 border border-indigo-500/30 font-medium px-4 py-2.5 rounded-xl transition-all w-full justify-center disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer text-xs"
          >
            <span>👤 Entrar como Motorista (Portal do Motorista)</span>
          </button>

          <div className="relative flex py-1 items-center">
            <div className="flex-grow border-t border-gray-800"></div>
            <span className="shrink-0 mx-3 text-gray-500 text-[10px] uppercase tracking-wider font-medium">ou em produção</span>
            <div className="flex-grow border-t border-gray-800"></div>
          </div>

          <button
            onClick={handleSignIn}
            disabled={loading}
            className="flex items-center gap-2.5 bg-gray-800 hover:bg-gray-750 text-gray-200 border border-gray-700 font-medium px-4 py-2.5 rounded-xl transition-all w-full justify-center disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer text-xs"
          >
            <svg className="w-4 h-4 shrink-0" viewBox="0 0 24 24">
              <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
              <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
              <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z"/>
              <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
            </svg>
            {loading ? 'A autenticar…' : 'Entrar com Conta Google Autorizada'}
          </button>
        </div>

        <div className="pt-2 border-t border-gray-800 w-full flex flex-col items-center gap-2">
          {isIframe && (
            <p className="text-[11px] text-amber-400/90 text-center">
              💡 Para login com conta Google real no preview, abre a app num separador separado:
            </p>
          )}
          <button
            onClick={handleOpenNewTab}
            type="button"
            className="text-xs text-indigo-400 hover:text-indigo-300 hover:underline flex items-center gap-1.5 cursor-pointer font-medium"
          >
            <span>Abrir Aplicação num Novo Separador</span>
            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
            </svg>
          </button>
        </div>
      </div>
    </div>
  );
}
