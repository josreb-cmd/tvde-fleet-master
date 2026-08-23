// src/components/KmRentabilidade.tsx
// Orquestrador: toggle Gestor/Motorista + seletor de semana + sparklines
import React, { useState } from "react";
import {
  Calendar,
  ChevronLeft,
  ChevronRight,
  AlertCircle,
  Briefcase,
  Car,
} from "lucide-react";
import { useKmRentabilidade } from "./rentabilidade/useKmRentabilidade";
import { useWeeklySparklines } from "./rentabilidade/useWeeklySparklines"; // 🆕
import { KmRentabilidadeGestor } from "./rentabilidade/KmRentabilidadeGestor";
import { KmRentabilidadeMotorista } from "./rentabilidade/KmRentabilidadeMotorista";

type ViewMode = "gestor" | "motorista";

function formatDate(d: Date) {
  return d.toLocaleDateString("pt-PT", { day: "2-digit", month: "2-digit" });
}

export function KmRentabilidade() {
  const [view, setView] = useState<ViewMode>("gestor");
  const data = useKmRentabilidade();
  const { series, tendencia, hasData: hasSparklineData } = useWeeklySparklines(8, data.weekOffset); // 🆕

  const {
    monday,
    sunday,
    isCurrentWeek,
    weekOffset,
    setWeekOffset,
    temDados,
  } = data;

  return (
    <div className="min-h-screen bg-gray-950 text-gray-100 p-4 md:p-8">
      {/* —— Cabeçalho —— */}
      <div className="mb-8">
        <p className="text-xs font-mono tracking-widest text-indigo-400 uppercase mb-1">
          Análise de Rentabilidade
        </p>
        <h1 className="text-3xl font-bold text-white">
          Quilómetros & Margem
        </h1>
        <p className="text-gray-400 mt-1 text-sm">
          Modelo: renda 350€/sem · limiar 2.000 km · sobretaxa +0,25€/km
          acima do limite · semana Seg-Dom
        </p>
      </div>

      {/* —— Controlos: Seletor de semana + Toggle de vista —— */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3 mb-8">
        {/* Seletor de semana */}
        <div className="flex items-center gap-3 bg-gray-900 rounded-xl p-3 border border-gray-800">
          <button
            onClick={() => setWeekOffset((o) => o - 1)}
            className="p-1.5 rounded-lg hover:bg-gray-700 transition-colors text-gray-300"
          >
            <ChevronLeft size={18} />
          </button>
          <div className="flex items-center gap-2 min-w-[200px] justify-center">
            <Calendar size={15} className="text-indigo-400" />
            <span className="text-sm font-medium">
              {isCurrentWeek ? (
                <span className="text-indigo-300 font-semibold">
                  Semana actual
                </span>
              ) : (
                <span className="text-gray-300">
                  {formatDate(monday)} - {formatDate(sunday)}
                </span>
              )}
            </span>
          </div>
          <button
            onClick={() =>
              setWeekOffset((o) => Math.min(0, o + 1))
            }
            disabled={isCurrentWeek}
            className="p-1.5 rounded-lg hover:bg-gray-700 transition-colors text-gray-300 disabled:opacity-30 disabled:cursor-not-allowed"
          >
            <ChevronRight size={18} />
          </button>
        </div>

        {/* Toggle Gestor / Motorista */}
        <div className="flex items-center gap-1 bg-gray-900 rounded-xl p-1 border border-gray-800">
          <button
            onClick={() => setView("gestor")}
            className={`flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-medium transition-all ${
              view === "gestor"
                ? "bg-gray-700 text-white shadow-sm"
                : "text-gray-400 hover:text-gray-200"
            }`}
          >
            <Briefcase size={15} />
            Gestor
          </button>
          <button
            onClick={() => setView("motorista")}
            className={`flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-medium transition-all ${
              view === "motorista"
                ? "bg-gray-700 text-white shadow-sm"
                : "text-gray-400 hover:text-gray-200"
            }`}
          >
            <Car size={15} />
            Motorista
          </button>
        </div>
      </div>

      {/* —— Sem dados —— */}
      {!temDados ? (
        <div className="flex flex-col items-center justify-center h-64 text-gray-500">
          <AlertCircle size={40} className="mb-3 text-gray-700" />
          <p className="text-sm">
            Sem turnos registados para esta semana.
          </p>
        </div>
      ) : view === "gestor" ? (
        <KmRentabilidadeGestor
          data={data}
          sparklineSeries={hasSparklineData ? series : null}       // 🆕
          sparklineTendencia={hasSparklineData ? tendencia : null} // 🆕
          hasSparklineData={hasSparklineData}                      // 🆕
        />
      ) : (
        <KmRentabilidadeMotorista data={data} />
      )}
    </div>
  );
}
