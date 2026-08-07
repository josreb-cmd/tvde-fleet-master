export interface SummaryEmailData {
  startDate: string;
  endDate: string;
  platformsText?: string;
  
  totalGross: number;
  netProfit: number;
  totalCosts: number;
  marginPct: number;
  
  operationalDays: number;
  totalHours: number;
  revenuePerHour: number;
  
  totalTrips: number;
  avgTripsPerDay: number;
  revenuePerTrip: number;
  
  totalKm: number;
  energyTotal: number;
  rentalTotal: number;

  driverRows: Array<{
    name: string;
    gross: number;
    uber: number;
    bolt: number;
    trips: number;
    hours: number;
    perHour: number;
  }>;
  vehicleRows: Array<{
    plate: string;
    model: string;
    fuel: number;
    rental: number;
    maintenance: number;
    insurance: number;
    other: number;
    total: number;
  }>;
  generatedAt: string;
}

function formatDatePt(dateStr: string): string {
  if (!dateStr) return '';
  const parts = dateStr.split('-');
  if (parts.length !== 3) return dateStr;
  const [y, m, d] = parts;
  const months = ['jan', 'fev', 'mar', 'abr', 'mai', 'jun', 'jul', 'ago', 'set', 'out', 'nov', 'dez'];
  const mIdx = parseInt(m, 10) - 1;
  return `${parseInt(d, 10)} ${months[mIdx] || m} ${y}`;
}

function formatHoursFormatted(hoursDecimal: number): string {
  const h = Math.floor(hoursDecimal);
  const m = Math.round((hoursDecimal - h) * 60);
  return `${h}h${m < 10 ? '0' + m : m}`;
}

export function generateSummaryEmailHtml(data: SummaryEmailData): string {
  const formatEUR = (val: number) =>
    '€' + val.toLocaleString('pt-PT', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

  const formatKm = (val: number) =>
    val.toLocaleString('pt-PT', { maximumFractionDigits: 0 });

  const startDateFormatted = formatDatePt(data.startDate);
  const endDateFormatted = formatDatePt(data.endDate);
  const periodText = `${startDateFormatted} a ${endDateFormatted}`;
  const subtitleText = `Resumo de desempenho · ${periodText} · ${data.platformsText || 'Uber + Bolt'}`;

  const driverTableRowsHtml = data.driverRows.length > 0
    ? data.driverRows.map((d, idx) => `
        <tr style="background-color: ${idx % 2 === 0 ? '#FFFFFF' : '#F8FAFC'}; border-bottom: 1px solid #E2E8F0;">
          <td style="padding: 10px 12px; font-weight: 600; color: #1E293B; font-size: 13px;">${d.name}</td>
          <td style="padding: 10px 12px; text-align: right; font-weight: 700; color: #0F172A; font-size: 13px;">${formatEUR(d.gross)}</td>
          <td style="padding: 10px 12px; text-align: right; color: #059669; font-size: 12px;">${formatEUR(d.uber)}</td>
          <td style="padding: 10px 12px; text-align: right; color: #2563EB; font-size: 12px;">${formatEUR(d.bolt)}</td>
          <td style="padding: 10px 12px; text-align: center; color: #475569; font-size: 12px;">${d.trips}</td>
          <td style="padding: 10px 12px; text-align: center; color: #475569; font-size: 12px;">${formatHoursFormatted(d.hours)}</td>
          <td style="padding: 10px 12px; text-align: right; font-weight: 600; color: #2563EB; font-size: 12px;">${formatEUR(d.perHour)}/h</td>
        </tr>
      `).join('')
    : `<tr><td colspan="7" style="padding: 16px; text-align: center; color: #64748B; font-size: 13px;">Sem registos de motoristas para o período.</td></tr>`;

  const vehicleTableRowsHtml = data.vehicleRows.length > 0
    ? data.vehicleRows.map((v, idx) => `
        <tr style="background-color: ${idx % 2 === 0 ? '#FFFFFF' : '#F8FAFC'}; border-bottom: 1px solid #E2E8F0;">
          <td style="padding: 10px 12px; font-weight: 700; color: #1E293B; font-size: 13px;">
            ${v.plate}
            ${v.model ? `<span style="display: block; font-size: 11px; font-weight: normal; color: #64748B;">${v.model}</span>` : ''}
          </td>
          <td style="padding: 10px 12px; text-align: right; color: #DC2626; font-size: 12px;">${formatEUR(v.fuel)}</td>
          <td style="padding: 10px 12px; text-align: right; color: #B45309; font-size: 12px;">${formatEUR(v.rental)}</td>
          <td style="padding: 10px 12px; text-align: right; color: #D97706; font-size: 12px;">${formatEUR(v.maintenance)}</td>
          <td style="padding: 10px 12px; text-align: right; color: #0891B2; font-size: 12px;">${formatEUR(v.insurance)}</td>
          <td style="padding: 10px 12px; text-align: right; color: #475569; font-size: 12px;">${formatEUR(v.other)}</td>
          <td style="padding: 10px 12px; text-align: right; font-weight: 700; color: #B91C1C; font-size: 13px;">${formatEUR(v.total)}</td>
        </tr>
      `).join('')
    : `<tr><td colspan="7" style="padding: 16px; text-align: center; color: #64748B; font-size: 13px;">Sem custos registados no período.</td></tr>`;

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
                RESULTADOS DO PERÍODO
              </h2>

              <!-- 2-Column KPI Cards Grid (Exact TVDE ProFlow Cards Layout) -->
              
              <!-- ROW 1: FATURAÇÃO & LUCRO LÍQUIDO -->
              <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="margin-bottom: 12px;">
                <tr>
                  <td width="50%" valign="top" style="padding-right: 6px;">
                    <div style="background-color: #F3F4F6; border-radius: 12px; padding: 16px; text-align: left;">
                      <span style="font-size: 11px; font-weight: 700; color: #6B7280; text-transform: uppercase; letter-spacing: 0.5px; display: block; margin-bottom: 6px;">FATURAÇÃO</span>
                      <span style="font-size: 22px; font-weight: 800; color: #0F172A; display: block; line-height: 1.1;">${formatEUR(data.totalGross)}</span>
                      <span style="font-size: 12px; font-weight: 500; color: #9CA3AF; display: block; margin-top: 6px;">${data.operationalDays} ${data.operationalDays === 1 ? 'dia operacional' : 'dias operacionais'}</span>
                    </div>
                  </td>
                  <td width="50%" valign="top" style="padding-left: 6px;">
                    <div style="background-color: #F3F4F6; border-radius: 12px; padding: 16px; text-align: left;">
                      <span style="font-size: 11px; font-weight: 700; color: #6B7280; text-transform: uppercase; letter-spacing: 0.5px; display: block; margin-bottom: 6px;">LUCRO LÍQUIDO</span>
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
                      <span style="font-size: 12px; font-weight: 500; color: #9CA3AF; display: block; margin-top: 6px;">média ${data.avgTripsPerDay.toFixed(1)}/dia</span>
                    </div>
                  </td>
                </tr>
              </table>

              <!-- ROW 3: €/VIAGEM & TOTAL KMS -->
              <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="margin-bottom: 12px;">
                <tr>
                  <td width="50%" valign="top" style="padding-right: 6px;">
                    <div style="background-color: #F3F4F6; border-radius: 12px; padding: 16px; text-align: left;">
                      <span style="font-size: 11px; font-weight: 700; color: #6B7280; text-transform: uppercase; letter-spacing: 0.5px; display: block; margin-bottom: 6px;">€/VIAGEM</span>
                      <span style="font-size: 22px; font-weight: 800; color: #0F172A; display: block; line-height: 1.1;">${formatEUR(data.revenuePerTrip)}</span>
                      <span style="font-size: 12px; font-weight: 500; color: #9CA3AF; display: block; margin-top: 6px;">faturação média</span>
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
                      <span style="font-size: 12px; font-weight: 500; color: #9CA3AF; display: block; margin-top: 6px;">combustível e carregamentos</span>
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
                    <th style="padding: 10px 10px; text-align: right; font-size: 11px; font-weight: 700; text-transform: uppercase;">€/h</th>
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
                TVDE Fleet Master • Gestão Inteligente de Frotas TVDE Portugal
              </p>
              <p style="margin: 0; font-size: 11px; color: #94A3B8;">
                Relatório gerado em ${data.generatedAt}
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
