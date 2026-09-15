#!/usr/bin/env node
/**
 * ARQUIVADO — script de uso único (Setembro 2026).
 * Correu uma única vez para restaurar os registos diários de shiftLogs em
 * falta no período 03/08–31/08/2026. Mantido apenas como referência
 * histórica; não deve voltar a ser executado (escreve directamente no
 * Firestore de produção e não tem guarda de dry-run).
 */
/**
 * restaurar-shiftlogs.cjs
 * TVDE Fleet Master — restaura registos diários em falta (03/08 a 31/08/2026)
 *
 * Uso:
 *   node restaurar-shiftlogs.cjs
 */

const { Firestore } = require("@google-cloud/firestore");

const PROJECT_ID   = "gen-lang-client-0465939536";
const DATABASE_ID  = "ai-studio-tvdefleetmasterg-300d7ace-afbe-48b4-b1fb-ca191a9d7c9f";
const DRIVER_ID    = "drv-1";
const DRIVER_NAME  = "Alexandre Rebelo";
const VEHICLE_ID   = "veh-1";
const VEHICLE_PLATE = "CE-84-UO";

const DRY_RUN = process.env.DRY_RUN !== "false";

const db = new Firestore({ projectId: PROJECT_ID, databaseId: DATABASE_ID });

function hhmmToDecimal(hhmm) {
  const [h, m] = hhmm.split(":").map(Number);
  return Math.round((h + m / 60) * 100) / 100;
}

function pt(s) {
  return parseFloat(s.replace(",", "."));
}

// Dados exactos do CSV consulta_tvde_2026-09-01.csv
// 100% Uber (boltEarnings = 0); dias com grossEarnings=0 são Folga
const rawData = [
  { date: "2026-08-03", gross: "0,00",   horas: "00:00", km: "0,00",   viagens: "0,00",  fuel: "15,74", renda: "50,00" },
  { date: "2026-08-04", gross: "171,66", horas: "08:45", km: "380,00", viagens: "33,00", fuel: "3,23",  renda: "50,00" },
  { date: "2026-08-05", gross: "175,80", horas: "08:40", km: "380,00", viagens: "25,00", fuel: "32,19", renda: "50,00" },
  { date: "2026-08-06", gross: "161,23", horas: "09:20", km: "380,00", viagens: "30,00", fuel: "27,70", renda: "50,00" },
  { date: "2026-08-07", gross: "187,91", horas: "09:00", km: "380,00", viagens: "36,00", fuel: "16,29", renda: "50,00" },
  { date: "2026-08-08", gross: "193,86", horas: "09:15", km: "380,00", viagens: "29,00", fuel: "32,31", renda: "50,00" },
  { date: "2026-08-09", gross: "173,18", horas: "08:20", km: "380,00", viagens: "25,00", fuel: "18,94", renda: "50,00" },
  { date: "2026-08-10", gross: "169,69", horas: "08:00", km: "350,00", viagens: "29,00", fuel: "33,69", renda: "50,00" },
  { date: "2026-08-17", gross: "0,00",   horas: "00:00", km: "0,00",   viagens: "0,00",  fuel: "0,00",  renda: "50,00" },
  { date: "2026-08-18", gross: "167,72", horas: "08:36", km: "333,00", viagens: "33,00", fuel: "11,14", renda: "50,00" },
  { date: "2026-08-19", gross: "163,14", horas: "08:50", km: "333,00", viagens: "27,00", fuel: "22,61", renda: "50,00" },
  { date: "2026-08-20", gross: "167,62", horas: "14:30", km: "333,00", viagens: "32,00", fuel: "19,43", renda: "50,00" },
  { date: "2026-08-21", gross: "174,07", horas: "08:45", km: "333,00", viagens: "29,00", fuel: "24,55", renda: "50,00" },
  { date: "2026-08-22", gross: "189,97", horas: "09:00", km: "333,00", viagens: "33,00", fuel: "27,50", renda: "50,00" },
  { date: "2026-08-23", gross: "108,58", horas: "05:45", km: "333,00", viagens: "18,00", fuel: "3,53",  renda: "50,00" },
  { date: "2026-08-24", gross: "0,00",   horas: "00:00", km: "0,00",   viagens: "0,00",  fuel: "18,60", renda: "50,00" },
  { date: "2026-08-25", gross: "176,60", horas: "08:30", km: "356,00", viagens: "31,00", fuel: "17,01", renda: "50,00" },
  { date: "2026-08-26", gross: "166,00", horas: "09:00", km: "340,00", viagens: "30,00", fuel: "20,84", renda: "50,00" },
  { date: "2026-08-27", gross: "62,97",  horas: "04:00", km: "129,00", viagens: "13,00", fuel: "12,51", renda: "50,00" },
  { date: "2026-08-28", gross: "170,29", horas: "09:10", km: "317,00", viagens: "31,00", fuel: "16,55", renda: "50,00" },
  { date: "2026-08-29", gross: "196,04", horas: "09:20", km: "424,00", viagens: "28,00", fuel: "18,81", renda: "50,00" },
  { date: "2026-08-30", gross: "170,96", horas: "08:40", km: "350,00", viagens: "24,00", fuel: "23,09", renda: "50,00" },
  { date: "2026-08-31", gross: "180,34", horas: "08:20", km: "327,00", viagens: "20,00", fuel: "25,35", renda: "50,00" },
];

async function main() {
  console.log(`\n🔧 TVDE Fleet Master — Restauro de shiftLogs`);
  console.log(`   Registos a processar : ${rawData.length}`);
  console.log(`   Período              : ${rawData[0].date} → ${rawData[rawData.length - 1].date}\n`);

  // Verificar datas já existentes
  console.log("🔍 A verificar datas existentes no Firestore...");
  const snapshot = await db.collection("shiftLogs").get();
  const existingDates = new Set(snapshot.docs.map(d => d.data().date));

  const novos   = rawData.filter(r => !existingDates.has(r.date));
  const dupls   = rawData.filter(r =>  existingDates.has(r.date));

  if (dupls.length > 0) {
    console.log(`⚠️  Já existem (ignorados): ${dupls.map(r => r.date).join(", ")}\n`);
  }

  if (novos.length === 0) {
    console.log("✅ Todos os registos já existem. Nada a fazer.");
    return;
  }

  console.log(`📝 A inserir ${novos.length} registos:\n`);

  const batch = db.batch();
  let idCounter = 104;

  novos.forEach(r => {
    const gross = pt(r.gross);
    const isOff = gross === 0;
    const doc = {
      id:                  `sft-imported-${idCounter}`,
      date:                r.date,
      driverId:            DRIVER_ID,
      driverName:          DRIVER_NAME,
      vehicleId:           VEHICLE_ID,
      vehiclePlate:        VEHICLE_PLATE,
      grossEarnings:       gross,
      uberEarnings:        gross,      // 100% Uber
      boltEarnings:        0,
      hoursWorked:         hhmmToDecimal(r.horas),
      kilometers:          pt(r.km),
      tripsCount:          pt(r.viagens),
      fuelExpenseAmount:   pt(r.fuel),
      rentalExpenseAmount: pt(r.renda),
      status:              "approved",
      notes:               isOff ? "Folga" : "",
    };
    const docRef = db.collection("shiftLogs").doc(doc.id);
    batch.set(docRef, doc);
    const tag = isOff ? "🔴 Folga" : `✅ ${gross.toFixed(2)}€`;
    console.log(`   sft-imported-${idCounter} → ${r.date}  ${tag}  ${pt(r.km)}km  ${pt(r.viagens)} viagens`);
    idCounter++;
  });

  if (DRY_RUN) {
    console.log(`\n🟡 DRY_RUN activo — nada escrito no Firestore. Usa DRY_RUN=false para executar.`);
    return;
  }

  await batch.commit();
  console.log(`\n✅ ${novos.length} registos inseridos com sucesso!`);
  console.log(`   IDs: sft-imported-104 → sft-imported-${idCounter - 1}`);
}

main().catch(err => {
  console.error("❌ Erro:", err.message);
  process.exit(1);
});
