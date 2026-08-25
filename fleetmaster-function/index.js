const functions = require('@google-cloud/functions-framework');
const nodemailer = require('nodemailer');

/**
 * Cloud Function: enviarResumoFleetMaster
 * Recebe dados do frontend, calcula o resumo e envia por email via Gmail SMTP.
 * A GMAIL_APP_PASSWORD vem do Secret Manager (injetada como variável de ambiente).
 */
functions.http('enviarResumoFleetMaster', async (req, res) => {
  // — CORS —
  res.set('Access-Control-Allow-Origin', '*');
  res.set('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.set('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(204).send('');
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Método não permitido. Use POST.' });
  }

  // — Validação —
  const { startDate, endDate, shiftLogs, expenses, drivers, vehicles } = req.body || {};

  if (!startDate || !endDate) {
    return res.status(400).json({ error: 'startDate e endDate são obrigatórios.' });
  }

  if (!Array.isArray(shiftLogs) || shiftLogs.length === 0) {
    return res.status(400).json({ error: 'Nenhum turno (shiftLogs) enviado para o período.' });
  }

  const GMAIL_APP_PASSWORD = process.env.GMAIL_APP_PASSWORD;
  if (!GMAIL_APP_PASSWORD) {
    return res.status(500).json({
      error: 'GMAIL_APP_PASSWORD não configurada no Secret Manager.',
      details: 'Contacte o administrador do sistema.'
    });
  }

  const GMAIL_USER = 'josreb@gmail.com';
  const RECIPIENTS = ['josreb@gmail.com', 'alexreb60@gmail.com'];

  // — Constantes Rentabilidade (alinhadas com KmRentabilidade.tsx) —
  const KM_BASE = 2000;
  const TAXA_ADICIONAL = 0.25; // €/km acima de 2000

  try {
    // — Cálculos —
    const filtered = shiftLogs.filter(s => s.date >= startDate && s.date <= endDate);
    const filteredExpenses = (expenses || []).filter(e => e.date >= startDate && e.date <= endDate);

    const isDuplicateShiftExpense = (e) => {
      if (!e) return false;
      if (e.id && (
        e.id.startsWith('exp-fuel-shift-') ||
        e.id.startsWith('exp-rnd-shift-') ||
        e.id.startsWith('exp-nrg-') ||
        e.id.startsWith('exp-rnd-daily-') ||
        e.id.startsWith('exp-rnd-monday-')
      )) return true;
      if (e.description && (
        e.description.includes('Custo diário de energia') ||
        e.description.includes('Renda diária de viatura') ||
        e.description.includes('Sincronizado de Faturação Diária')
      )) return true;
      return false;
    };

    const parseHHMM = (v) => {
      if (typeof v === 'number') return v;
      if (typeof v !== 'string') return 0;
      const parts = v.split(':');
      return (parseInt(parts[0]) || 0) + (parseInt(parts[1]) || 0) / 60;
    };

    const gross = filtered.reduce((a, s) => a + (s.grossEarnings || 0), 0);
    const trips = filtered.reduce((a, s) => a + (s.tripsCount || 0), 0);
    const km = filtered.reduce((a, s) => a + (s.kilometers || 0), 0);
    const hours = filtered.reduce((a, s) => a + parseHHMM(s.hoursWorked), 0);
    const shiftFuel = filtered.reduce((a, s) => a + (s.fuelExpenseAmount || 0), 0);
    const shiftRental = filtered.reduce((a, s) => a + (s.rentalExpenseAmount || 0), 0);

    const standaloneFuel = filteredExpenses
      .filter(e => e.category === 'fuel_charging' && !isDuplicateShiftExpense(e))
      .reduce((a, e) => a + e.amount, 0);
    const standaloneRental = filteredExpenses
      .filter(e => e.category === 'vehicle_rental' && !isDuplicateShiftExpense(e))
      .reduce((a, e) => a + e.amount, 0);
    const standaloneOther = filteredExpenses
      .filter(e => e.category !== 'fuel_charging' && e.category !== 'vehicle_rental' && !isDuplicateShiftExpense(e))
      .reduce((a, e) => a + e.amount, 0);

    const energy = shiftFuel + standaloneFuel;
    const rental = shiftRental + standaloneRental;

    // — Sobretaxa km extra —
    const kmExtra = Math.max(0, km - KM_BASE);
    const sobretaxa = kmExtra * TAXA_ADICIONAL;

    const costs = energy + rental + standaloneOther + sobretaxa;
    const profit = gross - costs;
    const receiptIssuance = gross - rental;
    const costPerKm = km > 0 ? costs / km : 0;
    const distinctDays = new Set(filtered.map(s => s.date)).size || (filtered.length > 0 ? 1 : 0);
    const revenuePerHour = hours > 0 ? gross / hours : 0;
    const avgTripsPerDay = distinctDays > 0 ? trips / distinctDays : 0;
    const revenuePerTrip = trips > 0 ? gross / trips : 0;
    const hoursH = Math.floor(hours);
    const hoursM = Math.round((hours % 1) * 60);

    // — Indicador de km (badge dinâmico) —
    const kmBadge = km > KM_BASE
      ? `<span style="color:#dc2626;font-weight:700;">⚠️ ${kmExtra.toLocaleString('pt-PT')} km acima do limite</span>`
      : `<span style="color:#059669;font-weight:700;">✅ Sem sobretaxa (&lt; ${KM_BASE.toLocaleString('pt-PT')}km)</span>`;

    // — Email HTML —
    const fmt = (v) => v.toFixed(2).replace('.', ',') + ' €';
    const subject = `[TVDE Fleet Master] Resumo de Desempenho (${startDate} a ${endDate})`;

    const html = `
    <div style="font-family:'Segoe UI',Arial,sans-serif;max-width:600px;margin:0 auto;background:#f8fafc;padding:24px;border-radius:12px;">
      <div style="background:#0f172a;color:#fff;padding:20px 24px;border-radius:10px 10px 0 0;text-align:center;">
        <h1 style="margin:0;font-size:20px;">🚗 TVDE Fleet Master</h1>
        <p style="margin:6px 0 0;font-size:13px;color:#94a3b8;">Resumo de Desempenho — ${startDate} a ${endDate}</p>
      </div>
      <div style="background:#fff;padding:20px 24px;border:1px solid #e2e8f0;border-top:none;border-radius:0 0 10px 10px;">
        <table style="width:100%;border-collapse:collapse;font-size:13px;color:#334155;">
          <tr style="border-bottom:1px solid #f1f5f9;">
            <td style="padding:10px 8px;font-weight:600;">📊 Turnos Registados</td>
            <td style="padding:10px 8px;text-align:right;font-weight:700;">${filtered.length}</td>
          </tr>
          <tr style="border-bottom:1px solid #f1f5f9;">
            <td style="padding:10px 8px;font-weight:600;">💰 Faturação Bruta</td>
            <td style="padding:10px 8px;text-align:right;font-weight:700;">${fmt(gross)} (${distinctDays} dias)</td>
          </tr>
          <tr style="border-bottom:1px solid #f1f5f9;background:#eef2ff;">
            <td style="padding:10px 8px;font-weight:600;color:#3730a3;">🧾 Emissão de Recibo</td>
            <td style="padding:10px 8px;text-align:right;font-weight:700;color:#3730a3;">${fmt(receiptIssuance)}</td>
          </tr>
          <tr style="border-bottom:1px solid #f1f5f9;background:#fef2f2;">
            <td style="padding:10px 8px;font-weight:600;color:#dc2626;">📉 Custos Totais</td>
            <td style="padding:10px 8px;text-align:right;font-weight:700;color:#dc2626;">${fmt(costs)}</td>
          </tr>
          <tr style="border-bottom:1px solid #f1f5f9;">
            <td style="padding:10px 8px;font-weight:600;">✅ Lucro Líquido</td>
            <td style="padding:10px 8px;text-align:right;font-weight:700;color:#059669;">${fmt(profit)}</td>
          </tr>
          <tr style="border-bottom:1px solid #f1f5f9;">
            <td style="padding:10px 8px;font-weight:600;">⏱️ Receita/Hora</td>
            <td style="padding:10px 8px;text-align:right;font-weight:700;">${fmt(revenuePerHour)}/h (${hoursH}h${hoursM}m)</td>
          </tr>
          <tr style="border-bottom:1px solid #f1f5f9;">
            <td style="padding:10px 8px;font-weight:600;">🚕 Total Viagens</td>
            <td style="padding:10px 8px;text-align:right;font-weight:700;">${trips} (média ${avgTripsPerDay.toFixed(1)}/dia)</td>
          </tr>
          <tr style="border-bottom:1px solid #f1f5f9;">
            <td style="padding:10px 8px;font-weight:600;">💵 Média/Viagem</td>
            <td style="padding:10px 8px;text-align:right;font-weight:700;">${fmt(revenuePerTrip)}</td>
          </tr>
          <tr style="border-bottom:1px solid #f1f5f9;">
            <td style="padding:10px 8px;font-weight:600;">📍 Total Kms</td>
            <td style="padding:10px 8px;text-align:right;font-weight:700;">${km.toLocaleString('pt-PT')} kms</td>
          </tr>
          <tr style="border-bottom:1px solid #f1f5f9;background:#fffbeb;">
            <td style="padding:10px 8px;font-weight:600;color:#b45309;">📏 Custo por Km</td>
            <td style="padding:10px 8px;text-align:right;font-weight:700;color:#b45309;">${costPerKm.toFixed(3).replace('.', ',')} €/km — ${kmBadge}</td>
          </tr>
          <tr style="border-bottom:1px solid #f1f5f9;">
            <td style="padding:10px 8px;font-weight:600;">⛽ Custo Energia</td>
            <td style="padding:10px 8px;text-align:right;font-weight:700;color:#dc2626;">${fmt(energy)}</td>
          </tr>
          <tr style="border-bottom:1px solid #f1f5f9;">
            <td style="padding:10px 8px;font-weight:600;">🏠 Custo Renda</td>
            <td style="padding:10px 8px;text-align:right;font-weight:700;color:#dc2626;">${fmt(rental)}</td>
          </tr>
          ${sobretaxa > 0 ? `
          <tr style="background:#fef2f2;">
            <td style="padding:10px 8px;font-weight:600;color:#dc2626;">⚠️ Sobretaxa Km Extra</td>
            <td style="padding:10px 8px;text-align:right;font-weight:700;color:#dc2626;">${fmt(sobretaxa)} (${kmExtra.toLocaleString('pt-PT')} km × ${TAXA_ADICIONAL.toFixed(2).replace('.', ',')} €)</td>
          </tr>
          ` : ''}
        </table>
        <p style="margin:18px 0 0;font-size:11px;color:#94a3b8;text-align:center;">
          Enviado automaticamente por TVDE Fleet Master • Cloud Function
        </p>
      </div>
    </div>`;

    // — Enviar —
    const transporter = nodemailer.createTransport({
      service: 'gmail',
      auth: {
        user: GMAIL_USER,
        pass: GMAIL_APP_PASSWORD,
      },
    });

    await transporter.sendMail({
      from: `"TVDE Fleet Master" <${GMAIL_USER}>`,
      to: RECIPIENTS.join(', '),
      subject,
      html,
    });

    console.log(`✅ Resumo enviado para ${RECIPIENTS.join(', ')} (${startDate} a ${endDate})`);
    return res.status(200).json({
      success: true,
      message: `Resumo enviado com sucesso para ${RECIPIENTS.join(' e ')}.`
    });

  } catch (err) {
    console.error('❌ Erro ao enviar email:', err);
    return res.status(500).json({
      error: 'Falha ao enviar o email.',
      details: err.message || String(err)
    });
  }
});
