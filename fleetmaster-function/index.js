/**
 * TVDE Fleet Master — Cloud Function: enviarResumoFleetMaster
 *
 * POST /enviarResumoFleetMaster
 * Body: { startDate, endDate, shiftLogs, expenses, drivers, vehicles }
 *
 * Variável obrigatória (Secret Manager):
 *   GMAIL_APP_PASSWORD  → App Password de josreb@gmail.com
 *
 * Deploy:
 *   cd fleetmaster-function
 *   gcloud functions deploy enviarResumoFleetMaster \
 *     --gen2 --runtime nodejs20 --region europe-west2 \
 *     --trigger-http --allow-unauthenticated \
 *     --set-secrets GMAIL_APP_PASSWORD=GMAIL_APP_PASSWORD:latest
 */

const { onRequest } = require("firebase-functions/v2/https");
const { setGlobalOptions } = require("firebase-functions/v2");
const nodemailer = require("nodemailer");

setGlobalOptions({ region: "europe-west2" });

const REMETENTE     = "josreb@gmail.com";
const DESTINATARIOS = ["josreb@gmail.com", "alexreb60@gmail.com"];

// ─── Helpers ─────────────────────────────────────────────────────────────────
function formatEUR(val) {
  return "€" + Number(val).toLocaleString("pt-PT", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  });
}

function formatDatePt(dateStr) {
  if (!dateStr) return "";
  const [y, m, d] = dateStr.split("-");
  const months = ["jan","fev","mar","abr","mai","jun","jul","ago","set","out","nov","dez"];
  return `${parseInt(d, 10)} ${months[parseInt(m, 10) - 1]} ${y}`;
}

function formatHours(hoursDecimal) {
  const h = Math.floor(hoursDecimal);
  const m = Math.round((hoursDecimal - h) * 60);
  return `${h}h${m < 10 ? "0" + m : m}`;
}

function parseHours(val) {
  if (typeof val === "number") return val;
  if (typeof val === "string" && val.includes(":")) {
    const [h, m] = val.split(":").map(Number);
    return (h || 0) + (m || 0) / 60;
  }
  return Number(val) || 0;
}

function isDuplicateShiftExpense(e) {
  if (!e) return false;
  if (e.id && (
    e.id.startsWith("exp-fuel-shift-") ||
    e.id.startsWith("exp-rnd-shift-") ||
    e.id.startsWith("exp-nrg-") ||
    e.id.startsWith("exp-rnd-daily-") ||
    e.id.startsWith("exp-rnd-monday-")
  )) return true;
  if (e.description && (
    e.description.includes("Custo diário de energia") ||
    e.description.includes("Renda diária de viatura") ||
    e.description.includes("Sincronizado de Faturação Diária")
  )) return true;
  return false;
}

// ─── Calcular dados ───────────────────────────────────────────────────────────
function calcularDados(body) {
  const { startDate, endDate } = body;
  const shiftLogs = body.shiftLogs || [];
  const expenses  = body.expenses  || [];
  const drivers   = body.drivers   || [];
  const vehicles  = body.vehicles  || [];

  const filteredShifts   = shiftLogs.filter(s => s.date >= startDate && s.date <= endDate);
  const filteredExpenses = expenses.filter(e => e.date >= startDate && e.date <= endDate);

  const totalGross  = filteredShifts.reduce((acc, s) => acc + (Number(s.grossEarnings) || 0), 0);
  const totalKm     = filteredShifts.reduce((acc, s) => acc + (Number(s.kilometers) || 0), 0);
  const totalTrips  = filteredShifts.reduce((acc, s) => acc + (Number(s.tripsCount) || 0), 0);
  const totalHours  = filteredShifts.reduce((acc, s) => acc + parseHours(s.hoursWorked), 0);

  const distinctDays = new Set(filteredShifts.map(s => s.date)).size || (filteredShifts.length > 0 ? 1 : 0);

  const shiftFuel   = filteredShifts.reduce((acc, s) => acc + (Number(s.fuelExpenseAmount) || 0), 0);
  const shiftRental = filteredShifts.reduce((acc, s) => acc + (Number(s.rentalExpenseAmount) || 0), 0);

  const standaloneFuel = filteredExpenses
    .filter(e => e.category === "fuel_charging" && !isDuplicateShiftExpense(e))
    .reduce((acc, e) => acc + (Number(e.amount) || 0), 0);

  const standaloneRental = filteredExpenses
    .filter(e => e.category === "vehicle_rental" && !isDuplicateShiftExpense(e))
    .reduce((acc, e) => acc + (Number(e.amount) || 0), 0);

  const standaloneOther = filteredExpenses
    .filter(e => e.category !== "fuel_charging" && e.category !== "vehicle_rental" && !isDuplicateShiftExpense(e))
    .reduce((acc, e) => acc + (Number(e.amount) || 0), 0);

  const energyTotal = shiftFuel + standaloneFuel;
  const rentalTotal = shiftRental + standaloneRental;
  const totalCosts  = energyTotal + rentalTotal + standaloneOther;
  const netProfit   = totalGross - totalCosts;
  const marginPct   = totalGross > 0 ? (netProfit / totalGross) * 100 : 0;

  const revenuePerHour = totalHours > 0 ? totalGross / totalHours : 0;
  const avgTripsPerDay = distinctDays > 0 ? totalTrips / distinctDays : 0;
  const revenuePerTrip = totalTrips > 0 ? totalGross / totalTrips : 0;

  // Motoristas
  const driverMap = new Map();
  filteredShifts.forEach(s => {
    const dKey = s.driverId || s.driverName || "Outro";
    const name = s.driverName || (drivers.find(d => d.id === s.driverId)?.name) || dKey;
    if (!driverMap.has(dKey)) {
      driverMap.set(dKey, { name, gross: 0, uber: 0, bolt: 0, trips: 0, hours: 0 });
    }
    const item = driverMap.get(dKey);
    item.gross += Number(s.grossEarnings) || 0;
    item.uber  += Number(s.uberEarnings)  || 0;
    item.bolt  += Number(s.boltEarnings)  || 0;
    item.trips += Number(s.tripsCount)    || 0;
    item.hours += parseHours(s.hoursWorked);
  });

  const driverRows = Array.from(driverMap.values())
    .map(d => ({ ...d, perHour: d.hours > 0 ? d.gross / d.hours : 0 }))
    .sort((a, b) => b.gross - a.gross);

  // Viaturas
  const vehicleMap = new Map();
  vehicles.forEach(v => {
    const key = v.id || v.licensePlate;
    vehicleMap.set(key, {
      plate: v.licensePlate || "N/A",
      model: `${v.brand || ""} ${v.model || ""}`.trim(),
      fuel: 0, rental: 0, maintenance: 0, insurance: 0, other: 0, total: 0
    });
  });

  filteredShifts.forEach(s => {
    const key = s.vehicleId || s.vehiclePlate;
    if (!key) return;
    if (!vehicleMap.has(key)) {
      vehicleMap.set(key, { plate: s.vehiclePlate || key, model: "", fuel: 0, rental: 0, maintenance: 0, insurance: 0, other: 0, total: 0 });
    }
    const item = vehicleMap.get(key);
    item.fuel   += Number(s.fuelExpenseAmount)   || 0;
    item.rental += Number(s.rentalExpenseAmount)  || 0;
  });

  filteredExpenses.filter(e => !isDuplicateShiftExpense(e)).forEach(e => {
    const key = e.vehicleId || e.vehiclePlate;
    if (!key) return;
    if (!vehicleMap.has(key)) {
      vehicleMap.set(key, { plate: e.vehiclePlate || key, model: "", fuel: 0, rental: 0, maintenance: 0, insurance: 0, other: 0, total: 0 });
    }
    const item = vehicleMap.get(key);
    const amt = Number(e.amount) || 0;
    if (e.category === "maintenance") item.maintenance += amt;
    else if (e.category === "insurance") item.insurance += amt;
    else item.other += amt;
  });

  const vehicleRows = Array.from(vehicleMap.values())
    .map(v => ({ ...v, total: v.fuel + v.rental + v.maintenance + v.insurance + v.other }))
    .filter(v => v.total > 0 || filteredShifts.some(s => s.vehicleId === v.plate || s.vehiclePlate === v.plate));

  const now = new Date();
  const generatedAt = now.toLocaleString("pt-PT", {
    day: "2-digit", month: "2-digit", year: "numeric",
    hour: "2-digit", minute: "2-digit"
  });

  return {
    startDate, endDate,
    totalGross, totalCosts, netProfit, marginPct,
    operationalDays: distinctDays,
    totalHours, revenuePerHour,
    totalTrips, avgTripsPerDay, revenuePerTrip,
    totalKm, energyTotal, rentalTotal,
    driverRows, vehicleRows, generatedAt
  };
}

// ─── Gerar HTML ───────────────────────────────────────────────────────────────
function gerarHtml(d) {
  const periodText = `${formatDatePt(d.startDate)} a ${formatDatePt(d.endDate)}`;

  const driverRowsHtml = d.driverRows.length > 0
    ? d.driverRows.map((r, idx) => `
        <tr style="background-color:${idx % 2 === 0 ? "#FFFFFF" : "#F8FAFC"};border-bottom:1px solid #E2E8F0;">
          <td style="padding:10px 12px;font-weight:600;color:#1E293B;font-size:13px;">${r.name}</td>
          <td style="padding:10px 12px;text-align:right;font-weight:700;color:#0F172A;font-size:13px;">${formatEUR(r.gross)}</td>
          <td style="padding:10px 12px;text-align:right;color:#059669;font-size:12px;">${formatEUR(r.uber)}</td>
          <td style="padding:10px 12px;text-align:right;color:#2563EB;font-size:12px;">${formatEUR(r.bolt)}</td>
          <td style="padding:10px 12px;text-align:center;color:#475569;font-size:12px;">${r.trips}</td>
          <td style="padding:10px 12px;text-align:center;color:#475569;font-size:12px;">${formatHours(r.hours)}</td>
          <td style="padding:10px 12px;text-align:right;font-weight:600;color:#2563EB;font-size:12px;">${formatEUR(r.perHour)}/h</td>
        </tr>`).join("")
    : `<tr><td colspan="7" style="padding:16px;text-align:center;color:#64748B;font-size:13px;">Sem registos de motoristas para o período.</td></tr>`;

  const vehicleRowsHtml = d.vehicleRows.length > 0
    ? d.vehicleRows.map((v, idx) => `
        <tr style="background-color:${idx % 2 === 0 ? "#FFFFFF" : "#F8FAFC"};border-bottom:1px solid #E2E8F0;">
          <td style="padding:10px 12px;font-weight:700;color:#1E293B;font-size:13px;">
            ${v.plate}
            ${v.model ? `<span style="display:block;font-size:11px;font-weight:normal;color:#64748B;">${v.model}</span>` : ""}
          </td>
          <td style="padding:10px 12px;text-align:right;color:#DC2626;font-size:12px;">${formatEUR(v.fuel)}</td>
          <td style="padding:10px 12px;text-align:right;color:#B45309;font-size:12px;">${formatEUR(v.rental)}</td>
          <td style="padding:10px 12px;text-align:right;color:#D97706;font-size:12px;">${formatEUR(v.maintenance)}</td>
          <td style="padding:10px 12px;text-align:right;color:#0891B2;font-size:12px;">${formatEUR(v.insurance)}</td>
          <td style="padding:10px 12px;text-align:right;color:#475569;font-size:12px;">${formatEUR(v.other)}</td>
          <td style="padding:10px 12px;text-align:right;font-weight:700;color:#B91C1C;font-size:13px;">${formatEUR(v.total)}</td>
        </tr>`).join("")
    : `<tr><td colspan="7" style="padding:16px;text-align:center;color:#64748B;font-size:13px;">Sem custos registados no período.</td></tr>`;

  const kpi = (label, value, sub, color = "#0F172A") => `
    <td width="50%" valign="top" style="padding:6px;">
      <div style="background-color:#F3F4F6;border-radius:12px;padding:16px;">
        <span style="font-size:11px;font-weight:700;color:#6B7280;text-transform:uppercase;letter-spacing:0.5px;display:block;margin-bottom:6px;">${label}</span>
        <span style="font-size:22px;font-weight:800;color:${color};display:block;line-height:1.1;">${value}</span>
        <span style="font-size:12px;font-weight:500;color:#9CA3AF;display:block;margin-top:6px;">${sub}</span>
      </div>
    </td>`;

  return `<!DOCTYPE html>
<html lang="pt">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Resumo TVDE Fleet Master</title>
</head>
<body style="margin:0;padding:0;background-color:#FFFFFF;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;color:#0F172A;">
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background-color:#FFFFFF;">
    <tr>
      <td align="center">
        <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width:520px;background-color:#FFFFFF;margin:0 auto;">

          <!-- Header -->
          <tr>
            <td style="background-color:#161A26;padding:28px 24px 24px;text-align:left;">
              <h1 style="margin:0 0 8px 0;color:#FFFFFF;font-size:24px;font-weight:800;letter-spacing:-0.5px;">TVDE Fleet Master</h1>
              <p style="margin:0;color:#94A3B8;font-size:14px;">Resumo de desempenho · ${periodText} · Uber + Bolt</p>
            </td>
          </tr>

          <!-- Content -->
          <tr>
            <td style="padding:24px 20px;">

              <h2 style="margin:0 0 16px 0;color:#64748B;font-size:12px;font-weight:800;text-transform:uppercase;letter-spacing:0.8px;">RESULTADOS DO PERÍODO</h2>

              <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="margin-bottom:12px;">
                <tr>
                  ${kpi("FATURAÇÃO", formatEUR(d.totalGross), `${d.operationalDays} dias operacionais`)}
                  ${kpi("LUCRO LÍQUIDO", formatEUR(d.netProfit), "incl. custos operacionais", "#10B981")}
                </tr>
              </table>

              <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="margin-bottom:12px;">
                <tr>
                  ${kpi("RECEITA/HORA", `${formatEUR(d.revenuePerHour)}/h`, `${formatHours(d.totalHours)} operacionais`, "#4F46E5")}
                  ${kpi("TOTAL VIAGENS", `${d.totalTrips}`, `média ${d.avgTripsPerDay.toFixed(1)}/dia`)}
                </tr>
              </table>

              <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="margin-bottom:12px;">
                <tr>
                  ${kpi("€/VIAGEM", formatEUR(d.revenuePerTrip), "faturação média")}
                  ${kpi("TOTAL KMS", `${d.totalKm.toLocaleString("pt-PT")}`, "kms acumulados")}
                </tr>
              </table>

              <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="margin-bottom:24px;">
                <tr>
                  ${kpi("ENERGIA TOTAL", formatEUR(d.energyTotal), "combustível e carregamentos")}
                  ${kpi("RENDA TOTAL", formatEUR(d.rentalTotal), "custo com rendas")}
                </tr>
              </table>

              <!-- Motoristas -->
              <h2 style="margin:28px 0 12px 0;color:#64748B;font-size:12px;font-weight:800;text-transform:uppercase;letter-spacing:0.8px;">DETALHE POR MOTORISTA</h2>
              <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="border-collapse:collapse;border:1px solid #E2E8F0;border-radius:8px;overflow:hidden;margin-bottom:24px;">
                <thead>
                  <tr style="background-color:#161A26;color:#FFFFFF;">
                    <th style="padding:10px;text-align:left;font-size:11px;font-weight:700;text-transform:uppercase;">Motorista</th>
                    <th style="padding:10px;text-align:right;font-size:11px;font-weight:700;text-transform:uppercase;">Fat. Bruta</th>
                    <th style="padding:10px;text-align:right;font-size:11px;font-weight:700;text-transform:uppercase;">Uber</th>
                    <th style="padding:10px;text-align:right;font-size:11px;font-weight:700;text-transform:uppercase;">Bolt</th>
                    <th style="padding:10px;text-align:center;font-size:11px;font-weight:700;text-transform:uppercase;">Viagens</th>
                    <th style="padding:10px;text-align:center;font-size:11px;font-weight:700;text-transform:uppercase;">Horas</th>
                    <th style="padding:10px;text-align:right;font-size:11px;font-weight:700;text-transform:uppercase;">€/h</th>
                  </tr>
                </thead>
                <tbody>${driverRowsHtml}</tbody>
              </table>

              <!-- Viaturas -->
              <h2 style="margin:28px 0 12px 0;color:#64748B;font-size:12px;font-weight:800;text-transform:uppercase;letter-spacing:0.8px;">DETALHE DE CUSTOS POR VIATURA</h2>
              <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="border-collapse:collapse;border:1px solid #E2E8F0;border-radius:8px;overflow:hidden;margin-bottom:24px;">
                <thead>
                  <tr style="background-color:#161A26;color:#FFFFFF;">
                    <th style="padding:10px;text-align:left;font-size:11px;font-weight:700;text-transform:uppercase;">Viatura</th>
                    <th style="padding:10px;text-align:right;font-size:11px;font-weight:700;text-transform:uppercase;">Combust/EV</th>
                    <th style="padding:10px;text-align:right;font-size:11px;font-weight:700;text-transform:uppercase;">Renda</th>
                    <th style="padding:10px;text-align:right;font-size:11px;font-weight:700;text-transform:uppercase;">Manut.</th>
                    <th style="padding:10px;text-align:right;font-size:11px;font-weight:700;text-transform:uppercase;">Seguros</th>
                    <th style="padding:10px;text-align:right;font-size:11px;font-weight:700;text-transform:uppercase;">Outros</th>
                    <th style="padding:10px;text-align:right;font-size:11px;font-weight:700;text-transform:uppercase;">Total</th>
                  </tr>
                </thead>
                <tbody>${vehicleRowsHtml}</tbody>
              </table>

            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="background-color:#F8FAFC;border-top:1px solid #E2E8F0;padding:20px;text-align:center;">
              <p style="margin:0 0 4px 0;font-size:12px;font-weight:600;color:#475569;">TVDE Fleet Master · Gestão Inteligente de Frotas TVDE Portugal</p>
              <p style="margin:0;font-size:11px;color:#94A3B8;">Relatório gerado em ${d.generatedAt}</p>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
}

// ─── Cloud Function ───────────────────────────────────────────────────────────
exports.enviarResumoFleetMaster = onRequest(
  {
    region: "europe-west2",
    cors: true,
    secrets: ["GMAIL_APP_PASSWORD"]
  },
  async (req, res) => {
    if (req.method !== "POST") {
      return res.status(405).json({ error: "Método não permitido" });
    }

    try {
      const body = req.body || {};
      const { startDate, endDate } = body;

      if (!startDate || !endDate) {
        return res.status(400).json({ error: "Parâmetros startDate e endDate são obrigatórios." });
      }

      console.log(`[enviarResumoFleetMaster] ${startDate} → ${endDate}`);

      const dados = calcularDados(body);
      const html  = gerarHtml(dados);

      const transporter = nodemailer.createTransport({
        service: "gmail",
        auth: {
          user: REMETENTE,
          pass: process.env.GMAIL_APP_PASSWORD
        }
      });

      await transporter.sendMail({
        from: `"TVDE Fleet Master" <${REMETENTE}>`,
        to: DESTINATARIOS.join(", "),
        subject: `[TVDE Fleet Master] Resumo de Desempenho (${startDate} a ${endDate})`,
        html
      });

      console.log(`[enviarResumoFleetMaster] Email enviado para: ${DESTINATARIOS.join(", ")}`);

      return res.status(200).json({
        success: true,
        message: `Resumo enviado com sucesso para ${DESTINATARIOS.join(" e ")}`,
        recipients: DESTINATARIOS,
        period: { startDate, endDate }
      });

    } catch (err) {
      console.error("[enviarResumoFleetMaster] Erro:", err);
      return res.status(500).json({
        error: "Erro interno ao processar o resumo.",
        details: err.message
      });
    }
  }
);
