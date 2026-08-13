var __create = Object.create;
var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __getProtoOf = Object.getPrototypeOf;
var __hasOwnProp = Object.prototype.hasOwnProperty;
var __copyProps = (to, from, except, desc) => {
  if (from && typeof from === "object" || typeof from === "function") {
    for (let key of __getOwnPropNames(from))
      if (!__hasOwnProp.call(to, key) && key !== except)
        __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
  }
  return to;
};
var __toESM = (mod, isNodeMode, target) => (target = mod != null ? __create(__getProtoOf(mod)) : {}, __copyProps(
  // If the importer is in node compatibility mode or this is not an ESM
  // file that has been converted to a CommonJS file using a Babel-
  // compatible transform (i.e. "__esModule" has not been set), then set
  // "default" to the CommonJS "module.exports" for node compatibility.
  isNodeMode || !mod || !mod.__esModule ? __defProp(target, "default", { value: mod, enumerable: true }) : target,
  mod
));

// server.ts
var import_express = __toESM(require("express"), 1);
var import_path = __toESM(require("path"), 1);
var import_fs = __toESM(require("fs"), 1);
var import_url = require("url");
var import_vite = require("vite");
var import_genai = require("@google/genai");
var import_nodemailer = __toESM(require("nodemailer"), 1);
var import_app = require("firebase/app");
var import_firestore = require("firebase/firestore");

// server/emailTemplate.ts
function formatDatePt(dateStr) {
  if (!dateStr) return "";
  const parts = dateStr.split("-");
  if (parts.length !== 3) return dateStr;
  const [y, m, d] = parts;
  const months = ["jan", "fev", "mar", "abr", "mai", "jun", "jul", "ago", "set", "out", "nov", "dez"];
  const mIdx = parseInt(m, 10) - 1;
  return `${parseInt(d, 10)} ${months[mIdx] || m} ${y}`;
}
function formatHoursFormatted(hoursDecimal) {
  const h = Math.floor(hoursDecimal);
  const m = Math.round((hoursDecimal - h) * 60);
  return `${h}h${m < 10 ? "0" + m : m}`;
}
function generateSummaryEmailHtml(data) {
  const formatEUR = (val) => "\u20AC" + val.toLocaleString("pt-PT", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  const formatKm = (val) => val.toLocaleString("pt-PT", { maximumFractionDigits: 0 });
  const startDateFormatted = formatDatePt(data.startDate);
  const endDateFormatted = formatDatePt(data.endDate);
  const periodText = `${startDateFormatted} a ${endDateFormatted}`;
  const subtitleText = `Resumo de desempenho \xB7 ${periodText} \xB7 ${data.platformsText || "Uber + Bolt"}`;
  const driverTableRowsHtml = data.driverRows.length > 0 ? data.driverRows.map((d, idx) => `
        <tr style="background-color: ${idx % 2 === 0 ? "#FFFFFF" : "#F8FAFC"}; border-bottom: 1px solid #E2E8F0;">
          <td style="padding: 10px 12px; font-weight: 600; color: #1E293B; font-size: 13px;">${d.name}</td>
          <td style="padding: 10px 12px; text-align: right; font-weight: 700; color: #0F172A; font-size: 13px;">${formatEUR(d.gross)}</td>
          <td style="padding: 10px 12px; text-align: right; color: #059669; font-size: 12px;">${formatEUR(d.uber)}</td>
          <td style="padding: 10px 12px; text-align: right; color: #2563EB; font-size: 12px;">${formatEUR(d.bolt)}</td>
          <td style="padding: 10px 12px; text-align: center; color: #475569; font-size: 12px;">${d.trips}</td>
          <td style="padding: 10px 12px; text-align: center; color: #475569; font-size: 12px;">${formatHoursFormatted(d.hours)}</td>
          <td style="padding: 10px 12px; text-align: right; font-weight: 600; color: #2563EB; font-size: 12px;">${formatEUR(d.perHour)}/h</td>
        </tr>
      `).join("") : `<tr><td colspan="7" style="padding: 16px; text-align: center; color: #64748B; font-size: 13px;">Sem registos de motoristas para o per\xEDodo.</td></tr>`;
  const vehicleTableRowsHtml = data.vehicleRows.length > 0 ? data.vehicleRows.map((v, idx) => `
        <tr style="background-color: ${idx % 2 === 0 ? "#FFFFFF" : "#F8FAFC"}; border-bottom: 1px solid #E2E8F0;">
          <td style="padding: 10px 12px; font-weight: 700; color: #1E293B; font-size: 13px;">
            ${v.plate}
            ${v.model ? `<span style="display: block; font-size: 11px; font-weight: normal; color: #64748B;">${v.model}</span>` : ""}
          </td>
          <td style="padding: 10px 12px; text-align: right; color: #DC2626; font-size: 12px;">${formatEUR(v.fuel)}</td>
          <td style="padding: 10px 12px; text-align: right; color: #B45309; font-size: 12px;">${formatEUR(v.rental)}</td>
          <td style="padding: 10px 12px; text-align: right; color: #D97706; font-size: 12px;">${formatEUR(v.maintenance)}</td>
          <td style="padding: 10px 12px; text-align: right; color: #0891B2; font-size: 12px;">${formatEUR(v.insurance)}</td>
          <td style="padding: 10px 12px; text-align: right; color: #475569; font-size: 12px;">${formatEUR(v.other)}</td>
          <td style="padding: 10px 12px; text-align: right; font-weight: 700; color: #B91C1C; font-size: 13px;">${formatEUR(v.total)}</td>
        </tr>
      `).join("") : `<tr><td colspan="7" style="padding: 16px; text-align: center; color: #64748B; font-size: 13px;">Sem custos registados no per\xEDodo.</td></tr>`;
  return `
<!DOCTYPE html>
<html lang="pt">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Resumo TVDE Fleet Master</title>
</head>
<body style="margin: 0; padding: 0; background-color: #FFFFFF; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; color: #0F172A;">

  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background-color: #FFFFFF; padding: 0; margin: 0;">
    <tr>
      <td align="center">
        <!-- Main Wrapper -->
        <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width: 520px; background-color: #FFFFFF; margin: 0 auto;">
          
          <!-- Header Banner (Exact TVDE ProFlow style) -->
          <tr>
            <td style="background-color: #161A26; padding: 28px 24px 24px 24px; text-align: left;">
              <h1 style="margin: 0 0 8px 0; color: #FFFFFF; font-size: 24px; font-weight: 800; letter-spacing: -0.5px; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;">
                TVDE Fleet Master
              </h1>
              <p style="margin: 0; color: #94A3B8; font-size: 14px; font-weight: 400; line-height: 1.4;">
                ${subtitleText}
              </p>
            </td>
          </tr>

          <!-- Content Area -->
          <tr>
            <td style="padding: 24px 20px;">

              <!-- Section Title -->
              <h2 style="margin: 0 0 16px 0; color: #64748B; font-size: 12px; font-weight: 800; text-transform: uppercase; letter-spacing: 0.8px;">
                RESULTADOS DO PER\xCDODO
              </h2>

              <!-- 2-Column KPI Cards Grid (Exact TVDE ProFlow Cards Layout) -->
              
              <!-- ROW 1: FATURA\xC7\xC3O & LUCRO L\xCDQUIDO -->
              <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="margin-bottom: 12px;">
                <tr>
                  <td width="50%" valign="top" style="padding-right: 6px;">
                    <div style="background-color: #F3F4F6; border-radius: 12px; padding: 16px; text-align: left;">
                      <span style="font-size: 11px; font-weight: 700; color: #6B7280; text-transform: uppercase; letter-spacing: 0.5px; display: block; margin-bottom: 6px;">FATURA\xC7\xC3O</span>
                      <span style="font-size: 22px; font-weight: 800; color: #0F172A; display: block; line-height: 1.1;">${formatEUR(data.totalGross)}</span>
                      <span style="font-size: 12px; font-weight: 500; color: #9CA3AF; display: block; margin-top: 6px;">${data.operationalDays} ${data.operationalDays === 1 ? "dia operacional" : "dias operacionais"}</span>
                    </div>
                  </td>
                  <td width="50%" valign="top" style="padding-left: 6px;">
                    <div style="background-color: #F3F4F6; border-radius: 12px; padding: 16px; text-align: left;">
                      <span style="font-size: 11px; font-weight: 700; color: #6B7280; text-transform: uppercase; letter-spacing: 0.5px; display: block; margin-bottom: 6px;">LUCRO L\xCDQUIDO</span>
                      <span style="font-size: 22px; font-weight: 800; color: #10B981; display: block; line-height: 1.1;">${formatEUR(data.netProfit)}</span>
                      <span style="font-size: 12px; font-weight: 500; color: #9CA3AF; display: block; margin-top: 6px;">incl. custos operacionais</span>
                    </div>
                  </td>
                </tr>
              </table>

              <!-- ROW 2: RECEITA/HORA & TOTAL VIAGENS -->
              <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="margin-bottom: 12px;">
                <tr>
                  <td width="50%" valign="top" style="padding-right: 6px;">
                    <div style="background-color: #F3F4F6; border-radius: 12px; padding: 16px; text-align: left;">
                      <span style="font-size: 11px; font-weight: 700; color: #6B7280; text-transform: uppercase; letter-spacing: 0.5px; display: block; margin-bottom: 6px;">RECEITA/HORA</span>
                      <span style="font-size: 22px; font-weight: 800; color: #4F46E5; display: block; line-height: 1.1;">${formatEUR(data.revenuePerHour)}/h</span>
                      <span style="font-size: 12px; font-weight: 500; color: #9CA3AF; display: block; margin-top: 6px;">${formatHoursFormatted(data.totalHours)} operacionais</span>
                    </div>
                  </td>
                  <td width="50%" valign="top" style="padding-left: 6px;">
                    <div style="background-color: #F3F4F6; border-radius: 12px; padding: 16px; text-align: left;">
                      <span style="font-size: 11px; font-weight: 700; color: #6B7280; text-transform: uppercase; letter-spacing: 0.5px; display: block; margin-bottom: 6px;">TOTAL VIAGENS</span>
                      <span style="font-size: 22px; font-weight: 800; color: #0F172A; display: block; line-height: 1.1;">${data.totalTrips}</span>
                      <span style="font-size: 12px; font-weight: 500; color: #9CA3AF; display: block; margin-top: 6px;">m\xE9dia ${data.avgTripsPerDay.toFixed(1)}/dia</span>
                    </div>
                  </td>
                </tr>
              </table>

              <!-- ROW 3: \u20AC/VIAGEM & TOTAL KMS -->
              <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="margin-bottom: 12px;">
                <tr>
                  <td width="50%" valign="top" style="padding-right: 6px;">
                    <div style="background-color: #F3F4F6; border-radius: 12px; padding: 16px; text-align: left;">
                      <span style="font-size: 11px; font-weight: 700; color: #6B7280; text-transform: uppercase; letter-spacing: 0.5px; display: block; margin-bottom: 6px;">\u20AC/VIAGEM</span>
                      <span style="font-size: 22px; font-weight: 800; color: #0F172A; display: block; line-height: 1.1;">${formatEUR(data.revenuePerTrip)}</span>
                      <span style="font-size: 12px; font-weight: 500; color: #9CA3AF; display: block; margin-top: 6px;">fatura\xE7\xE3o m\xE9dia</span>
                    </div>
                  </td>
                  <td width="50%" valign="top" style="padding-left: 6px;">
                    <div style="background-color: #F3F4F6; border-radius: 12px; padding: 16px; text-align: left;">
                      <span style="font-size: 11px; font-weight: 700; color: #6B7280; text-transform: uppercase; letter-spacing: 0.5px; display: block; margin-bottom: 6px;">TOTAL KMS</span>
                      <span style="font-size: 22px; font-weight: 800; color: #0F172A; display: block; line-height: 1.1;">${formatKm(data.totalKm)}</span>
                      <span style="font-size: 12px; font-weight: 500; color: #9CA3AF; display: block; margin-top: 6px;">kms acumulados</span>
                    </div>
                  </td>
                </tr>
              </table>

              <!-- ROW 4: ENERGIA TOTAL & RENDA TOTAL -->
              <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="margin-bottom: 24px;">
                <tr>
                  <td width="50%" valign="top" style="padding-right: 6px;">
                    <div style="background-color: #F3F4F6; border-radius: 12px; padding: 16px; text-align: left;">
                      <span style="font-size: 11px; font-weight: 700; color: #6B7280; text-transform: uppercase; letter-spacing: 0.5px; display: block; margin-bottom: 6px;">ENERGIA TOTAL</span>
                      <span style="font-size: 22px; font-weight: 800; color: #0F172A; display: block; line-height: 1.1;">${formatEUR(data.energyTotal)}</span>
                      <span style="font-size: 12px; font-weight: 500; color: #9CA3AF; display: block; margin-top: 6px;">combust\xEDvel e carregamentos</span>
                    </div>
                  </td>
                  <td width="50%" valign="top" style="padding-left: 6px;">
                    <div style="background-color: #F3F4F6; border-radius: 12px; padding: 16px; text-align: left;">
                      <span style="font-size: 11px; font-weight: 700; color: #6B7280; text-transform: uppercase; letter-spacing: 0.5px; display: block; margin-bottom: 6px;">RENDA TOTAL</span>
                      <span style="font-size: 22px; font-weight: 800; color: #0F172A; display: block; line-height: 1.1;">${formatEUR(data.rentalTotal)}</span>
                      <span style="font-size: 12px; font-weight: 500; color: #9CA3AF; display: block; margin-top: 6px;">custo com rendas</span>
                    </div>
                  </td>
                </tr>
              </table>

              <!-- Detailed Breakdowns -->
              <h2 style="margin: 28px 0 12px 0; color: #64748B; font-size: 12px; font-weight: 800; text-transform: uppercase; letter-spacing: 0.8px;">
                DETALHE POR MOTORISTA
              </h2>

              <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="border-collapse: collapse; border: 1px solid #E2E8F0; border-radius: 8px; overflow: hidden; margin-bottom: 24px;">
                <thead>
                  <tr style="background-color: #161A26; color: #FFFFFF;">
                    <th style="padding: 10px 10px; text-align: left; font-size: 11px; font-weight: 700; text-transform: uppercase;">Motorista</th>
                    <th style="padding: 10px 10px; text-align: right; font-size: 11px; font-weight: 700; text-transform: uppercase;">Fat. Bruta</th>
                    <th style="padding: 10px 10px; text-align: right; font-size: 11px; font-weight: 700; text-transform: uppercase;">Uber</th>
                    <th style="padding: 10px 10px; text-align: right; font-size: 11px; font-weight: 700; text-transform: uppercase;">Bolt</th>
                    <th style="padding: 10px 10px; text-align: center; font-size: 11px; font-weight: 700; text-transform: uppercase;">Viagens</th>
                    <th style="padding: 10px 10px; text-align: center; font-size: 11px; font-weight: 700; text-transform: uppercase;">Horas</th>
                    <th style="padding: 10px 10px; text-align: right; font-size: 11px; font-weight: 700; text-transform: uppercase;">\u20AC/h</th>
                  </tr>
                </thead>
                <tbody>
                  ${driverTableRowsHtml}
                </tbody>
              </table>

              <h2 style="margin: 28px 0 12px 0; color: #64748B; font-size: 12px; font-weight: 800; text-transform: uppercase; letter-spacing: 0.8px;">
                DETALHE DE CUSTOS POR VIATURA
              </h2>

              <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="border-collapse: collapse; border: 1px solid #E2E8F0; border-radius: 8px; overflow: hidden; margin-bottom: 24px;">
                <thead>
                  <tr style="background-color: #161A26; color: #FFFFFF;">
                    <th style="padding: 10px 10px; text-align: left; font-size: 11px; font-weight: 700; text-transform: uppercase;">Viatura</th>
                    <th style="padding: 10px 10px; text-align: right; font-size: 11px; font-weight: 700; text-transform: uppercase;">Combust/EV</th>
                    <th style="padding: 10px 10px; text-align: right; font-size: 11px; font-weight: 700; text-transform: uppercase;">Renda</th>
                    <th style="padding: 10px 10px; text-align: right; font-size: 11px; font-weight: 700; text-transform: uppercase;">Manut.</th>
                    <th style="padding: 10px 10px; text-align: right; font-size: 11px; font-weight: 700; text-transform: uppercase;">Seguros</th>
                    <th style="padding: 10px 10px; text-align: right; font-size: 11px; font-weight: 700; text-transform: uppercase;">Outros</th>
                    <th style="padding: 10px 10px; text-align: right; font-size: 11px; font-weight: 700; text-transform: uppercase;">Total</th>
                  </tr>
                </thead>
                <tbody>
                  ${vehicleTableRowsHtml}
                </tbody>
              </table>

            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="background-color: #F8FAFC; border-top: 1px solid #E2E8F0; padding: 20px; text-align: center;">
              <p style="margin: 0 0 4px 0; font-size: 12px; font-weight: 600; color: #475569;">
                TVDE Fleet Master \u2022 Gest\xE3o Inteligente de Frotas TVDE Portugal
              </p>
              <p style="margin: 0; font-size: 11px; color: #94A3B8;">
                Relat\xF3rio gerado em ${data.generatedAt}
              </p>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>

</body>
</html>
  `;
}

// server.ts
var import_meta = {};
var __filename = (0, import_url.fileURLToPath)(import_meta.url);
var __dirname = import_path.default.dirname(__filename);
async function fetchFirestoreCollections() {
  try {
    const configPath = import_path.default.join(process.cwd(), "firebase-applet-config.json");
    if (!import_fs.default.existsSync(configPath)) return null;
    const config = JSON.parse(import_fs.default.readFileSync(configPath, "utf-8"));
    const firebaseApp = (0, import_app.getApps)().length === 0 ? (0, import_app.initializeApp)(config) : (0, import_app.getApps)()[0];
    const db = config.firestoreDatabaseId && config.firestoreDatabaseId !== "(default)" ? (0, import_firestore.getFirestore)(firebaseApp, config.firestoreDatabaseId) : (0, import_firestore.getFirestore)(firebaseApp);
    const [shiftsSnap, expSnap, drvSnap, vehSnap] = await Promise.all([
      (0, import_firestore.getDocs)((0, import_firestore.collection)(db, "shiftLogs")),
      (0, import_firestore.getDocs)((0, import_firestore.collection)(db, "expenses")),
      (0, import_firestore.getDocs)((0, import_firestore.collection)(db, "drivers")),
      (0, import_firestore.getDocs)((0, import_firestore.collection)(db, "vehicles"))
    ]);
    return {
      shiftLogs: shiftsSnap.docs.map((d) => ({ id: d.id, ...d.data() })),
      expenses: expSnap.docs.map((d) => ({ id: d.id, ...d.data() })),
      drivers: drvSnap.docs.map((d) => ({ id: d.id, ...d.data() })),
      vehicles: vehSnap.docs.map((d) => ({ id: d.id, ...d.data() }))
    };
  } catch (err) {
    console.error("[Server Firestore Fetch Error]:", err);
    return null;
  }
}
async function startServer() {
  const app = (0, import_express.default)();
  const PORT = 3e3;
  app.use(import_express.default.json({ limit: "10mb" }));
  app.use(import_express.default.urlencoded({ limit: "10mb", extended: true }));
  app.use((req, res, next) => {
    res.header("Access-Control-Allow-Origin", "*");
    res.header("Access-Control-Allow-Headers", "Origin, X-Requested-With, Content-Type, Accept");
    res.header("Access-Control-Allow-Methods", "GET, POST, OPTIONS, PUT, DELETE");
    if (req.method === "OPTIONS") {
      return res.sendStatus(200);
    }
    next();
  });
  app.all("/api/health*", (_req, res) => {
    res.json({ status: "ok", time: (/* @__PURE__ */ new Date()).toISOString() });
  });
  app.all("/api/smtp-status*", (_req, res) => {
    const hasEnvPass = Boolean(process.env.GMAIL_APP_PASSWORD);
    const user = process.env.GMAIL_USER || "josreb@gmail.com";
    res.json({ configured: hasEnvPass, user });
  });
  const handleSendSummary = async (req, res) => {
    try {
      const { startDate, endDate } = req.body;
      if (!startDate || !endDate) {
        return res.status(400).json({ error: "Par\xE2metros startDate e endDate s\xE3o obrigat\xF3rios." });
      }
      const gmailUser = (req.body.gmailUser || process.env.GMAIL_USER || "josreb@gmail.com").trim();
      const rawGmailPass = req.body.gmailAppPassword || process.env.GMAIL_APP_PASSWORD;
      let { shiftLogs, expenses, drivers, vehicles } = req.body;
      if (!shiftLogs || !expenses) {
        const dbData = await fetchFirestoreCollections();
        if (dbData) {
          shiftLogs = shiftLogs || dbData.shiftLogs;
          expenses = expenses || dbData.expenses;
          drivers = drivers || dbData.drivers;
          vehicles = vehicles || dbData.vehicles;
        }
      }
      shiftLogs = shiftLogs || [];
      expenses = expenses || [];
      drivers = drivers || [];
      vehicles = vehicles || [];
      const filteredShifts = shiftLogs.filter((s) => s.date >= startDate && s.date <= endDate);
      const filteredExpenses = expenses.filter((e) => e.date >= startDate && e.date <= endDate);
      const totalGross = filteredShifts.reduce((acc, s) => acc + (Number(s.grossEarnings) || 0), 0);
      const totalKm = filteredShifts.reduce((acc, s) => acc + (Number(s.kilometers) || 0), 0);
      const totalTrips = filteredShifts.reduce((acc, s) => acc + (Number(s.tripsCount) || 0), 0);
      const distinctDaysSet = new Set(filteredShifts.map((s) => s.date));
      const operationalDays = distinctDaysSet.size || (filteredShifts.length > 0 ? 1 : 0);
      const parseHours = (val) => {
        if (typeof val === "number") return val;
        if (typeof val === "string" && val.includes(":")) {
          const [h, m] = val.split(":").map(Number);
          return (h || 0) + (m || 0) / 60;
        }
        return Number(val) || 0;
      };
      const totalHours = filteredShifts.reduce((acc, s) => acc + parseHours(s.hoursWorked), 0);
      const isDuplicateShiftExpense = (e) => {
        if (!e) return false;
        if (e.id && (e.id.startsWith("exp-fuel-shift-") || e.id.startsWith("exp-rnd-shift-") || e.id.startsWith("exp-nrg-") || e.id.startsWith("exp-rnd-daily-") || e.id.startsWith("exp-rnd-monday-"))) {
          return true;
        }
        if (e.description && (e.description.includes("Custo di\xE1rio de energia") || e.description.includes("Renda di\xE1ria de viatura") || e.description.includes("Sincronizado de Fatura\xE7\xE3o Di\xE1ria"))) {
          return true;
        }
        return false;
      };
      const shiftFuel = filteredShifts.reduce((acc, s) => acc + (Number(s.fuelExpenseAmount) || 0), 0);
      const shiftRental = filteredShifts.reduce((acc, s) => acc + (Number(s.rentalExpenseAmount) || 0), 0);
      const standaloneFuel = filteredExpenses.filter((e) => e.category === "fuel_charging" && !isDuplicateShiftExpense(e)).reduce((acc, e) => acc + (Number(e.amount) || 0), 0);
      const standaloneRental = filteredExpenses.filter((e) => e.category === "vehicle_rental" && !isDuplicateShiftExpense(e)).reduce((acc, e) => acc + (Number(e.amount) || 0), 0);
      const standaloneOther = filteredExpenses.filter((e) => e.category !== "fuel_charging" && e.category !== "vehicle_rental" && !isDuplicateShiftExpense(e)).reduce((acc, e) => acc + (Number(e.amount) || 0), 0);
      const energyTotal = shiftFuel + standaloneFuel;
      const rentalTotal = shiftRental + standaloneRental;
      const totalCosts = energyTotal + rentalTotal + standaloneOther;
      const netProfit = totalGross - totalCosts;
      const marginPct = totalGross > 0 ? netProfit / totalGross * 100 : 0;
      const revenuePerHour = totalHours > 0 ? totalGross / totalHours : 0;
      const avgTripsPerDay = operationalDays > 0 ? totalTrips / operationalDays : 0;
      const revenuePerTrip = totalTrips > 0 ? totalGross / totalTrips : 0;
      const driverMap = /* @__PURE__ */ new Map();
      filteredShifts.forEach((s) => {
        const dKey = s.driverId || s.driverName || "Outro";
        const name = s.driverName || drivers.find((d) => d.id === s.driverId)?.name || dKey;
        if (!driverMap.has(dKey)) {
          driverMap.set(dKey, { name, gross: 0, uber: 0, bolt: 0, trips: 0, hours: 0 });
        }
        const item = driverMap.get(dKey);
        item.gross += Number(s.grossEarnings) || 0;
        item.uber += Number(s.uberEarnings) || 0;
        item.bolt += Number(s.boltEarnings) || 0;
        item.trips += Number(s.tripsCount) || 0;
        item.hours += parseHours(s.hoursWorked);
      });
      const driverRows = Array.from(driverMap.values()).map((d) => ({ ...d, perHour: d.hours > 0 ? d.gross / d.hours : 0 })).sort((a, b) => b.gross - a.gross);
      const vehicleMap = /* @__PURE__ */ new Map();
      vehicles.forEach((v) => {
        const key = v.id || v.licensePlate;
        vehicleMap.set(key, {
          plate: v.licensePlate || "N/A",
          model: `${v.brand || ""} ${v.model || ""}`.trim(),
          fuel: 0,
          rental: 0,
          maintenance: 0,
          insurance: 0,
          other: 0,
          total: 0
        });
      });
      filteredShifts.forEach((s) => {
        const key = s.vehicleId || s.vehiclePlate;
        if (!key) return;
        if (!vehicleMap.has(key)) {
          vehicleMap.set(key, {
            plate: s.vehiclePlate || key,
            model: "",
            fuel: 0,
            rental: 0,
            maintenance: 0,
            insurance: 0,
            other: 0,
            total: 0
          });
        }
        const item = vehicleMap.get(key);
        item.fuel += Number(s.fuelExpenseAmount) || 0;
        item.rental += Number(s.rentalExpenseAmount) || 0;
      });
      const standaloneExpenses = filteredExpenses.filter((e) => !isDuplicateShiftExpense(e));
      standaloneExpenses.forEach((e) => {
        const key = e.vehicleId || e.vehiclePlate;
        if (!key) return;
        if (!vehicleMap.has(key)) {
          vehicleMap.set(key, {
            plate: e.vehiclePlate || key,
            model: "",
            fuel: 0,
            rental: 0,
            maintenance: 0,
            insurance: 0,
            other: 0,
            total: 0
          });
        }
        const item = vehicleMap.get(key);
        const amt = Number(e.amount) || 0;
        if (e.category === "maintenance") item.maintenance += amt;
        else if (e.category === "insurance") item.insurance += amt;
        else item.other += amt;
      });
      const vehicleRows = Array.from(vehicleMap.values()).map((v) => ({ ...v, total: v.fuel + v.rental + v.maintenance + v.insurance + v.other })).filter((v) => v.total > 0 || filteredShifts.some((s) => s.vehicleId === v.plate || s.vehiclePlate === v.plate));
      const now = /* @__PURE__ */ new Date();
      const generatedAt = now.toLocaleString("pt-PT", {
        day: "2-digit",
        month: "2-digit",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit"
      });
      const htmlContent = generateSummaryEmailHtml({
        startDate,
        endDate,
        totalGross,
        totalCosts,
        netProfit,
        marginPct,
        operationalDays,
        totalHours,
        revenuePerHour,
        totalTrips,
        avgTripsPerDay,
        revenuePerTrip,
        totalKm,
        energyTotal,
        rentalTotal,
        driverRows,
        vehicleRows,
        generatedAt
      });
      if (!gmailUser || !rawGmailPass) {
        return res.status(400).json({
          error: "Palavra-passe de Aplica\xE7\xE3o do Gmail n\xE3o fornecida.",
          details: "Introduza a sua Palavra-passe de Aplica\xE7\xE3o de 16 letras do Google no campo correspondente ou configure GMAIL_APP_PASSWORD no servidor."
        });
      }
      const cleanGmailPass = rawGmailPass.replace(/\s+/g, "");
      try {
        let transporter;
        const optionsList = [
          // Tier 1: Standard Nodemailer Gmail Service (uses pooled connections)
          {
            service: "gmail",
            auth: { user: gmailUser, pass: cleanGmailPass },
            connectionTimeout: 8e3,
            greetingTimeout: 8e3,
            socketTimeout: 1e4
          },
          // Tier 2: Port 587 with STARTTLS (commonly permitted in cloud environments)
          {
            host: "smtp.gmail.com",
            port: 587,
            secure: false,
            requireTLS: true,
            auth: { user: gmailUser, pass: cleanGmailPass },
            tls: { rejectUnauthorized: false },
            connectionTimeout: 8e3,
            greetingTimeout: 8e3,
            socketTimeout: 1e4
          },
          // Tier 3: Port 465 direct SSL
          {
            host: "smtp.gmail.com",
            port: 465,
            secure: true,
            auth: { user: gmailUser, pass: cleanGmailPass },
            tls: { rejectUnauthorized: false },
            connectionTimeout: 8e3,
            greetingTimeout: 8e3,
            socketTimeout: 1e4
          }
        ];
        let lastErr = null;
        let mailSent = false;
        let sendResult = null;
        for (const opts of optionsList) {
          try {
            const tempTransporter = import_nodemailer.default.createTransport(opts);
            sendResult = await tempTransporter.sendMail({
              from: `"TVDE Fleet Master" <${gmailUser}>`,
              to: ["josreb@gmail.com", "alexreb60@gmail.com"],
              subject: `[TVDE Fleet Master] Resumo de Desempenho (${startDate} a ${endDate})`,
              html: htmlContent
            });
            mailSent = true;
            transporter = tempTransporter;
            break;
          } catch (err) {
            lastErr = err;
            console.warn(`Tentativa SMTP com configura\xE7\xE3o (${opts.service || opts.port}) falhou:`, err?.message);
            const errStr = String(err?.message || err || "");
            if (errStr.includes("535") || errStr.includes("EAUTH") || errStr.includes("Invalid login")) {
              break;
            }
          }
        }
        if (!mailSent) {
          throw lastErr || new Error("Falha ao estabelecer liga\xE7\xE3o ao servidor Gmail.");
        }
        return res.json({
          success: true,
          message: "Resumo enviado com sucesso para josreb@gmail.com e alexreb60@gmail.com",
          recipients: ["josreb@gmail.com", "alexreb60@gmail.com"],
          period: { startDate, endDate },
          info: sendResult?.messageId
        });
      } catch (mailErr) {
        console.error("Erro ao enviar e-mail via SMTP Gmail:", mailErr);
        const errString = String(mailErr?.message || mailErr || "");
        const errCode = mailErr?.code ? ` [C\xF3digo: ${mailErr.code}]` : "";
        const errResponse = mailErr?.response ? ` [Resposta: ${mailErr.response}]` : "";
        if (errString.includes("535") || errString.includes("EAUTH") || errString.includes("Username and Password not accepted") || errString.includes("Invalid login")) {
          return res.status(401).json({
            error: "Palavra-passe de Aplica\xE7\xE3o rejeitada pela Google (Erro 535).",
            details: `A conta ${gmailUser} n\xE3o aceitou a palavra-passe introduzida. Certifique-se de que utilizou a Palavra-passe de Aplica\xE7\xE3o de 16 letras gerada em https://myaccount.google.com/apppasswords (e n\xE3o a sua palavra-passe habitual do email).`
          });
        }
        if (errString.includes("534") || errString.includes("InvalidSecondFactor") || errString.includes("Application-specific password required")) {
          return res.status(401).json({
            error: "Google exige Palavra-passe de Aplica\xE7\xE3o (Erro 534).",
            details: "A sua conta Gmail tem a Verifica\xE7\xE3o em 2 Passos ativa. A palavra-passe normal do email n\xE3o \xE9 permitida pela Google. Gere uma Palavra-passe de Aplica\xE7\xE3o de 16 letras em https://myaccount.google.com/apppasswords."
          });
        }
        if (errString.includes("ETIMEDOUT") || errString.includes("ESOCKETTIMEDOUT") || errString.includes("ECONNREFUSED")) {
          return res.status(504).json({
            error: "N\xE3o foi poss\xEDvel ligar ao servidor SMTP do Gmail.",
            details: `A conex\xE3o ao smtp.gmail.com expirou por tempo limite.${errCode} Pode clicar em "Abrir no E-mail" para enviar atrav\xE9s da sua aplica\xE7\xE3o de e-mail.`
          });
        }
        return res.status(500).json({
          error: "Falha no envio de e-mail via SMTP Gmail.",
          details: `${errString}${errCode}${errResponse}`
        });
      }
    } catch (err) {
      console.error("Erro ao processar resumo:", err);
      return res.status(500).json({
        error: "Erro interno ao processar o resumo.",
        details: err.message
      });
    }
  };
  app.all("/api/send-summary*", handleSendSummary);
  app.all("/api/send-summary-email*", handleSendSummary);
  app.all("/api/ai/tvde-insights*", async (req, res) => {
    try {
      const apiKey = process.env.GEMINI_API_KEY;
      if (!apiKey) {
        return res.status(400).json({
          error: "Chave de API do Gemini n\xE3o configurada.",
          suggestion: "Por favor, configure a chave GEMINI_API_KEY no painel de segredos."
        });
      }
      const { fleetSummary } = req.body;
      const ai = new import_genai.GoogleGenAI({
        apiKey,
        httpOptions: {
          headers: {
            "User-Agent": "aistudio-build"
          }
        }
      });
      const response = await ai.models.generateContent({
        model: "gemini-3.6-flash",
        contents: `\xC9s um consultor especialista em gest\xE3o de frotas TVDE (Uber/Bolt) em Portugal.
Analisa os seguintes dados da empresa e fornece 3 a 4 recomenda\xE7\xF5es pr\xE1ticas e concretas em Portugu\xEAs de Portugal (pt-PT):
- Fatura\xE7\xE3o total recente, custos de combust\xEDvel/carregamento, manuten\xE7\xE3o, seguros e rendas.
- Dados atuais: ${JSON.stringify(fleetSummary)}

Responde num formato JSON v\xE1lido com a seguinte estrutura:
{
  "resumoExecutivo": "string curta",
  "recomendacoes": [
    {"titulo": "string", "descricao": "string", "impactoEstimado": "string", "categoria": "combustivel|manutencao|rendas|motoristas"}
  ],
  "pontoAtencaoCritico": "string com um alerta priorit\xE1rio"
}`
      });
      const text = response.text || "";
      const cleanJson = text.replace(/```json/g, "").replace(/```/g, "").trim();
      let data;
      try {
        data = JSON.parse(cleanJson);
      } catch {
        data = {
          resumoExecutivo: text.slice(0, 200),
          recomendacoes: [
            {
              titulo: "Otimiza\xE7\xE3o de Custos El\xE9tricos",
              descricao: text,
              impactoEstimado: "+12% Rentabilidade",
              categoria: "combustivel"
            }
          ],
          pontoAtencaoCritico: "Monitore a rela\xE7\xE3o entre n\xBA de km e revis\xF5es preventivas dos ve\xEDculos el\xE9tricos."
        };
      }
      return res.json(data);
    } catch (err) {
      console.error("Erro na chamada ao Gemini API:", err);
      return res.status(500).json({ error: "Erro ao gerar an\xE1lise inteligente da frota: " + err.message });
    }
  });
  app.all("/api/admin/users*", (_req, res) => {
    const users = [
      { email: "josreb@gmail.com", name: "Jos\xE9 Rebelo", role: "gestor" },
      { email: "alexreb60@gmail.com", name: "Alexandre", role: "gestor" }
    ];
    res.json({ users });
  });
  app.all("/api/*", (req, res) => {
    res.status(404).json({ error: `Rota de API n\xE3o encontrada: ${req.method} ${req.path}` });
  });
  if (process.env.NODE_ENV !== "production") {
    const vite = await (0, import_vite.createServer)({
      server: { middlewareMode: true },
      appType: "spa"
    });
    app.use(vite.middlewares);
  } else {
    const distPath = import_path.default.join(process.cwd(), "dist");
    app.use(import_express.default.static(distPath));
    app.get("*", (_req, res) => {
      res.sendFile(import_path.default.join(distPath, "index.html"));
    });
  }
  app.listen(PORT, "0.0.0.0", () => {
    console.log(`[TVDE Fleet Server] A correr em http://0.0.0.0:${PORT}`);
  });
}
startServer().catch((err) => {
  console.error("Falha ao iniciar o servidor TVDE:", err);
});
//# sourceMappingURL=server.cjs.map
