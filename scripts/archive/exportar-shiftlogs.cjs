#!/usr/bin/env node
/**
 * ARQUIVADO — script de uso único (Setembro 2026).
 * Usado durante a recuperação pontual dos registos diários em falta de
 * Agosto 2026: este script exportou a colecção shiftLogs para CSV antes e
 * depois da correcção feita por restaurar-shiftlogs.cjs. Mantido apenas
 * como referência histórica; não faz parte de nenhum fluxo automático.
 */
/**
 * exportar-shiftlogs.js
 * TVDE Fleet Master — exporta colecção shiftLogs ordenada por data para CSV
 *
 * Pré-requisitos:
 *   npm install @google-cloud/firestore
 *
 * Uso:
 *   node exportar-shiftlogs.js
 *
 * Gera: shiftLogs_export_YYYYMMDD_HHMMSS.csv no directório actual
 */

const { Firestore } = require("@google-cloud/firestore");
const fs = require("fs");
const path = require("path");

// ─── Configuração ────────────────────────────────────────────────────────────
const PROJECT_ID = "gen-lang-client-0465939536";
const DATABASE_ID =
  "ai-studio-tvdefleetmasterg-300d7ace-afbe-48b4-b1fb-ca191a9d7c9f";
const COLLECTION = "shiftLogs";

// Colunas a exportar (ordem do CSV)
const CAMPOS = [
  "date",
  "status",
  "grossEarnings",
  "boltEarnings",
  "uberEarnings",
  "kilometers",
  "tripsCount",
  "hoursWorked",
  "fuelExpenseAmount",
  "rentalExpenseAmount",
  "notes",
];

// ─── Autenticação ─────────────────────────────────────────────────────────────
// Opção A (recomendada): variável de ambiente com caminho para service account JSON
//   $env:GOOGLE_APPLICATION_CREDENTIALS = "C:\caminho\para\serviceaccount.json"
//
// Opção B: Application Default Credentials (se já fizeste `gcloud auth application-default login`)
//   Nenhuma configuração adicional necessária
//
// Opção C: path directo — descomenta e ajusta a linha abaixo:
// process.env.GOOGLE_APPLICATION_CREDENTIALS = "C:\\caminho\\para\\serviceaccount.json";

// ─── Helpers ─────────────────────────────────────────────────────────────────

/** Formata horas decimais (8.75) em "8h45min" para leitura humana no CSV */
function formatarHoras(h) {
  if (h === undefined || h === null || h === "") return "";
  const horas = Math.floor(h);
  const minutos = Math.round((h - horas) * 60);
  return `${horas}h${String(minutos).padStart(2, "0")}min`;
}

/** Escapa um valor para CSV (virgula como separador, aspas duplas para escape) */
function csvCell(val) {
  if (val === undefined || val === null) return "";
  const s = String(val);
  if (s.includes(",") || s.includes('"') || s.includes("\n")) {
    return `"${s.replace(/"/g, '""')}"`;
  }
  return s;
}

/** Converte um documento Firestore numa linha CSV */
function docParaLinha(doc) {
  const d = doc.data();
  return CAMPOS.map((campo) => {
    if (campo === "hoursWorked") return csvCell(formatarHoras(d[campo]));
    if (
      ["grossEarnings", "boltEarnings", "uberEarnings",
       "fuelExpenseAmount", "rentalExpenseAmount"].includes(campo)
    ) {
      const v = d[campo];
      return csvCell(v !== undefined && v !== null ? Number(v).toFixed(2) : "");
    }
    return csvCell(d[campo]);
  }).join(",");
}

// ─── Main ─────────────────────────────────────────────────────────────────────

async function main() {
  console.log("🔌 A ligar ao Firestore...");
  console.log(`   Projecto : ${PROJECT_ID}`);
  console.log(`   Database : ${DATABASE_ID}`);
  console.log(`   Colecção : ${COLLECTION}\n`);

  const db = new Firestore({
    projectId: PROJECT_ID,
    databaseId: DATABASE_ID,
  });

  console.log("📥 A carregar documentos...");
  const snapshot = await db.collection(COLLECTION).get();

  if (snapshot.empty) {
    console.log("⚠️  Colecção vazia ou sem acesso.");
    process.exit(1);
  }

  console.log(`   ${snapshot.size} documentos encontrados\n`);

  // Ordenar por campo "date" (string YYYY-MM-DD ordena correctamente)
  const docs = snapshot.docs.slice().sort((a, b) => {
    const da = a.data().date || "";
    const db_ = b.data().date || "";
    return da.localeCompare(db_);
  });

  // Cabeçalho CSV
  const cabecalho = [
    "Data",
    "Estado",
    "Receita Bruta (€)",
    "Bolt (€)",
    "Uber (€)",
    "Km",
    "Viagens",
    "Horas Trabalhadas",
    "Combustível/Energia (€)",
    "Renda (€)",
    "Notas",
  ].join(",");

  const linhas = [cabecalho, ...docs.map(docParaLinha)];
  const csv = linhas.join("\n");

  // Nome do ficheiro com timestamp
  const agora = new Date();
  const ts = agora
    .toISOString()
    .replace(/[-:T]/g, "")
    .slice(0, 15);
  const nomeFicheiro = `shiftLogs_export_${ts}.csv`;
  const caminho = path.join(process.cwd(), nomeFicheiro);

  fs.writeFileSync(caminho, "\uFEFF" + csv, "utf8"); // BOM para Excel PT reconhecer UTF-8

  console.log(`✅ CSV gerado com sucesso!`);
  console.log(`   Ficheiro : ${caminho}`);
  console.log(`   Registos : ${docs.length}`);
  console.log(`   Período  : ${docs[0]?.data().date} → ${docs[docs.length - 1]?.data().date}`);
}

main().catch((err) => {
  console.error("❌ Erro:", err.message);
  process.exit(1);
});
