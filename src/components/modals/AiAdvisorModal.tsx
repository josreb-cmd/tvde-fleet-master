import React, { useState, useEffect } from 'react';
import { useTVDE } from '../../contexts/TVDEContext';
import { X, Sparkles, AlertCircle, CheckCircle2, Loader2, ArrowRight } from 'lucide-react';

interface AiAdvisorModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const AiAdvisorModal: React.FC<AiAdvisorModalProps> = ({ isOpen, onClose }) => {
  const { monthlyStats, vehicles, drivers } = useTVDE();

  const [loading, setLoading] = useState(false);
  const [analysisResult, setAnalysisResult] = useState<any | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };
    if (isOpen) {
      window.addEventListener('keydown', handleKeyDown);
    }
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const handleGenerateAnalysis = async () => {
    setLoading(true);
    setErrorMessage(null);

    const fleetSummary = {
      faturacaoBruta: monthlyStats.totalGrossEarnings,
      custosTotais: monthlyStats.totalExpenses,
      lucroLiquido: monthlyStats.netProfit,
      margemLucroPct: monthlyStats.netProfitMarginPct,
      totalViagens: monthlyStats.totalTrips,
      totalKm: monthlyStats.totalKm,
      totalHoras: monthlyStats.totalHours,
      custoCombustivelEV: monthlyStats.totalFuelCost,
      custoManutencao: monthlyStats.totalMaintenanceCost,
      custoSeguros: monthlyStats.totalInsuranceCost,
      custoRendas: monthlyStats.totalVehicleRentals,
      numeroViaturas: vehicles.length,
      numeroMotoristas: drivers.length
    };

    try {
      const res = await fetch('/api/ai/tvde-insights', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ fleetSummary })
      });

      const contentType = res.headers.get('content-type') || '';
      if (res.ok && contentType.includes('application/json')) {
        const data = await res.json();
        setAnalysisResult(data);
      } else {
        // Fallback para motor de análise local
        const localInsights = generateLocalTvdeInsights(fleetSummary);
        setAnalysisResult(localInsights);
      }
    } catch (err: any) {
      // Fallback em caso de erro de rede ou hosting estático
      const localInsights = generateLocalTvdeInsights(fleetSummary);
      setAnalysisResult(localInsights);
    } finally {
      setLoading(false);
    }
  };

  const generateLocalTvdeInsights = (summary: any) => {
    const faturacao = summary.faturacaoBruta || 0;
    const margem = summary.margemLucroPct || 0;
    const km = summary.totalKm || 1;
    const custoKm = (summary.custosTotais || 0) / km;
    const custoEnergia = summary.custoCombustivelEV || 0;
    const pctEnergia = faturacao > 0 ? (custoEnergia / faturacao) * 100 : 0;

    const recs = [];

    if (pctEnergia > 12) {
      recs.push({
        titulo: 'Otimização de Carregamento / Combustível',
        descricao: `Os custos de energia representam ${pctEnergia.toFixed(1)}% da faturação. Recomendamos aderir a cartões de frota TVDE com desconto ou priorizar carregamento elétrico em horários de tarifa simples/vazio.`,
        impactoEstimado: '+8% a +15% Margem',
        categoria: 'combustivel'
      });
    } else {
      recs.push({
        titulo: 'Eficiência de Consumo Energético',
        descricao: `O custo energético está otimizado (${pctEnergia.toFixed(1)}% da faturação). Verifique semanalmente a pressão dos pneus para manter a autonomia máxima.`,
        impactoEstimado: 'Desgaste Mínimo',
        categoria: 'combustivel'
      });
    }

    if (custoKm > 0.45) {
      recs.push({
        titulo: 'Plano Preventivo de Manutenção da Frota',
        descricao: `O custo por km percorrido está em ${custoKm.toFixed(2)}€/km. Agende revisões preventivas periódicas para evitar reparações de emergência e viaturas paradas.`,
        impactoEstimado: '-10% Custo Operacional',
        categoria: 'manutencao'
      });
    } else {
      recs.push({
        titulo: 'Maximização do Uso das Viaturas',
        descricao: `Com um custo por km controlado (${custoKm.toFixed(2)}€/km), estude a atribuição de turnos rotativos duplos para diluir os custos fixos de rendas e seguros.`,
        impactoEstimado: '+20% Faturação Semanal',
        categoria: 'motoristas'
      });
    }

    recs.push({
      titulo: 'Acompanhamento por Hora de Trabalho',
      descricao: `O rendimento médio atual é de ${summary.totalHoras > 0 ? (faturacao / summary.totalHoras).toFixed(2) : '0'}€/hora. Incentive os motoristas a atuar nos horários de pico (manhã e final de tarde).`,
      impactoEstimado: '+5€/hora por Turno',
      categoria: 'motoristas'
    });

    return {
      resumoExecutivo: `A frota registou uma faturação bruta de ${faturacao.toFixed(2)}€ com uma margem líquida estimada de ${margem.toFixed(1)}%.`,
      recomendacoes: recs,
      pontoAtencaoCritico: margem < 25
        ? `A margem líquida (${margem.toFixed(1)}%) encontra-se abaixo do valor ideal de 30% em frotas TVDE. Reveja os custos fixos com rendas e seguros.`
        : `Mantenha o controlo dos custos operacionais para preservar a margem atual de ${margem.toFixed(1)}%.`,
      isLocal: true
    };
  };

  return (
    <div
      onClick={onClose}
      className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center p-4"
    >
      <div
        onClick={e => e.stopPropagation()}
        className="bg-white border border-slate-200 rounded-md w-full max-w-2xl p-6 shadow-xl relative overflow-hidden max-h-[90vh] flex flex-col justify-between"
      >
        {/* Modal Header */}
        <div>
          <div className="flex items-center justify-between pb-4 border-b border-slate-200">
            <div className="flex items-center space-x-2">
              <div className="p-2 rounded-md bg-blue-50 text-blue-600 border border-blue-100">
                <Sparkles className="w-5 h-5 animate-pulse" />
              </div>
              <div>
                <h2 className="text-base font-bold text-slate-900">Consultor IA de Frota TVDE</h2>
                <p className="text-xs text-slate-500">Análise inteligente de rentabilidade e custos</p>
              </div>
            </div>
            <button onClick={onClose} className="text-slate-400 hover:text-slate-600 transition">
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Modal Content */}
          <div className="py-4 space-y-4 text-xs overflow-y-auto max-h-[60vh] pr-1">
            {!analysisResult && !loading && !errorMessage && (
              <div className="bg-slate-50 border border-slate-200 rounded-md p-6 text-center space-y-3">
                <p className="text-slate-600">
                  O nosso sistema de IA analisa os dados de faturação diária, quilómetros percorridos, custos de combustível/EV, e rendas de viaturas para apresentar recomendações práticas.
                </p>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 text-left pt-2">
                  <div className="p-2.5 bg-white rounded-md border border-slate-200 shadow-sm">
                    <span className="text-[10px] text-slate-500 block font-semibold">Faturação Atual</span>
                    <span className="text-emerald-600 font-bold text-sm block">
                      {monthlyStats.totalGrossEarnings.toFixed(2)} €
                    </span>
                  </div>
                  <div className="p-2.5 bg-white rounded-md border border-slate-200 shadow-sm">
                    <span className="text-[10px] text-slate-500 block font-semibold">Margem Líquida</span>
                    <span className="text-blue-600 font-bold text-sm block">
                      {monthlyStats.netProfitMarginPct.toFixed(1)}%
                    </span>
                  </div>
                  <div className="p-2.5 bg-white rounded-md border border-slate-200 shadow-sm">
                    <span className="text-[10px] text-slate-500 block font-semibold">Custo p/ Km</span>
                    <span className="text-red-600 font-bold text-sm block">
                      {(monthlyStats.totalExpenses / (monthlyStats.totalKm || 1)).toFixed(2)} €/km
                    </span>
                  </div>
                </div>
              </div>
            )}

            {loading && (
              <div className="py-12 text-center space-y-3">
                <Loader2 className="w-8 h-8 text-blue-600 animate-spin mx-auto" />
                <p className="text-slate-700 font-medium">
                  A analisar métricas de rodagem, carregamentos elétricos e margem operacional...
                </p>
              </div>
            )}

            {errorMessage && (
              <div className="bg-red-50 border border-red-200 p-4 rounded-md text-red-700 space-y-1">
                <p className="font-bold flex items-center space-x-1">
                  <AlertCircle className="w-4 h-4 text-red-600" />
                  <span>Aviso de Configuração</span>
                </p>
                <p>{errorMessage}</p>
              </div>
            )}

            {analysisResult && (
              <div className="space-y-4">
                {/* Resumo executivo */}
                <div className="bg-blue-50 border border-blue-200 rounded-md p-4">
                  <span className="text-[10px] uppercase font-bold text-blue-700 tracking-wider block">
                    Resumo Executivo da Frota
                  </span>
                  <p className="text-slate-800 text-xs font-semibold mt-1">
                    {analysisResult.resumoExecutivo}
                  </p>
                </div>

                {/* Alerta crítico se existir */}
                {analysisResult.pontoAtencaoCritico && (
                  <div className="bg-amber-50 border border-amber-200 rounded-md p-4 flex items-start space-x-2">
                    <AlertCircle className="w-4 h-4 text-amber-600 flex-shrink-0 mt-0.5" />
                    <div>
                      <span className="text-[10px] uppercase font-bold text-amber-700 tracking-wider block">
                        Ponto de Atenção Prioritário
                      </span>
                      <p className="text-amber-900 text-xs mt-0.5">
                        {analysisResult.pontoAtencaoCritico}
                      </p>
                    </div>
                  </div>
                )}

                {/* Recomendacoes */}
                <div className="space-y-2">
                  <span className="text-[11px] font-bold text-slate-700 block">Recomendações Práticas:</span>
                  {analysisResult.recomendacoes?.map((rec: any, idx: number) => (
                    <div key={idx} className="bg-white border border-slate-200 rounded-md p-3.5 space-y-1 shadow-sm">
                      <div className="flex items-center justify-between">
                        <span className="font-bold text-slate-900 text-xs">{rec.titulo}</span>
                        {rec.impactoEstimado && (
                          <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                            {rec.impactoEstimado}
                          </span>
                        )}
                      </div>
                      <p className="text-slate-600 text-[11px]">{rec.descricao}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Modal Footer */}
        <div className="pt-3 border-t border-slate-200 flex items-center justify-between">
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-md bg-slate-100 text-slate-700 font-medium hover:bg-slate-200 transition shadow-sm"
          >
            Fechar
          </button>

          <button
            onClick={handleGenerateAnalysis}
            disabled={loading}
            className="px-5 py-2 rounded-md bg-blue-600 hover:bg-blue-700 text-white font-medium text-xs shadow-sm transition flex items-center space-x-1.5 disabled:opacity-50"
          >
            <Sparkles className="w-4 h-4" />
            <span>{analysisResult ? 'Gerar Nova Análise' : 'Iniciar Análise IA da Frota'}</span>
          </button>
        </div>
      </div>
    </div>
  );
};
