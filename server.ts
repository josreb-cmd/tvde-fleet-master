import express from 'express';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import { createServer as createViteServer } from 'vite';
import { GoogleGenAI } from '@google/genai';
import nodemailer from 'nodemailer';
import { initializeApp, getApps } from 'firebase/app';
import { getFirestore, collection, getDocs } from 'firebase/firestore';
import { generateSummaryEmailHtml } from './server/emailTemplate';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// ── Utilizadores autorizados (fonte de verdade partilhada com o frontend) ──
const AUTHORIZED_USERS = [
  { email: 'josreb@gmail.com',    role: 'gestor', name: 'José Rebelo' },
  { email: 'alexreb60@gmail.com', role: 'gestor', name: 'Alexandre'   },
];

async function fetchFirestoreCollections() {
  try {
    const configPath = path.join(process.cwd(), 'firebase-applet-config.json');
    if (!fs.existsSync(configPath)) return null;
    const config = JSON.parse(fs.readFileSync(configPath, 'utf-8'));
    const firebaseApp = getApps().length === 0 ? initializeApp(config) : getApps()[0];
    const db = config.firestoreDatabaseId && config.firestoreDatabaseId !== '(default)'
      ? getFirestore(firebaseApp, config.firestoreDatabaseId)
      : getFirestore(firebaseApp);

    const [shiftsSnap, expSnap, drvSnap, vehSnap] = await Promise.all([
      getDocs(collection(db, 'shiftLogs')),
      getDocs(collection(db, 'expenses')),
      getDocs(collection(db, 'drivers')),
      getDocs(collection(db, 'vehicles'))
    ]);

    return {
      shiftLogs: shiftsSnap.docs.map(d => ({ id: d.id, ...d.data() })),
      expenses:  expSnap.docs.map(d => ({ id: d.id, ...d.data() })),
      drivers:   drvSnap.docs.map(d => ({ id: d.id, ...d.data() })),
      vehicles:  vehSnap.docs.map(d => ({ id: d.id, ...d.data() }))
    };
  } catch (err) {
    console.error('[Server Firestore Fetch Error]:', err);
    return null;
  }
}

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json({ limit: '10mb' }));
  app.use(express.urlencoded({ limit: '10mb', extended: true }));

  // CORS & OPTIONS middleware
  app.use((req, res, next) => {
    res.header('Access-Control-Allow-Origin', '*');
    res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept');
    res.header('Access-Control-Allow-Methods', 'GET, POST, OPTIONS, PUT, DELETE');
    if (req.method === 'OPTIONS') return res.sendStatus(200);
    next();
  });

  // Health check
  app.all('/api/health*', (_req, res) => {
    res.json({ status: 'ok', time: new Date().toISOString() });
  });

  // SMTP Status
  app.all('/api/smtp-status*', (_req, res) => {
    const hasEnvPass = Boolean(process.env.GMAIL_APP_PASSWORD);
    const user = process.env.GMAIL_USER || 'josreb@gmail.com';
    res.json({ configured: hasEnvPass, user });
  });

  // ── Gestão de utilizadores autorizados ───────────────────────────────────
  app.get('/api/admin/users', (_req, res) => {
    res.json({ users: AUTHORIZED_USERS });
  });
  // ─────────────────────────────────────────────────────────────────────────

  // Send Summary Email
  const handleSendSummary = async (req: express.Request, res: express.Response) => {
    try {
      const { startDate, endDate } = req.body;

      if (!startDate || !endDate) {
        return res.status(400).json({ error: 'Parâmetros startDate e endDate são obrigatórios.' });
      }

      const gmailUser    = (req.body.gmailUser || process.env.GMAIL_USER || 'josreb@gmail.com').trim();
      const rawGmailPass = req.body.gmailAppPassword || process.env.GMAIL_APP_PASSWORD;

      let { shiftLogs, expenses, drivers, vehicles } = req.body;

      if (!shiftLogs || !expenses) {
        const dbData = await fetchFirestoreCollections();
        if (dbData) {
          shiftLogs = shiftLogs || dbData.shiftLogs;
          expenses  = expenses  || dbData.expenses;
          drivers   = drivers   || dbData.drivers;
          vehicles  = vehicles  || dbData.vehicles;
        }
      }

      shiftLogs = shiftLogs || [];
      expenses  = expenses  || [];
      drivers   = drivers   || [];
      vehicles  = vehicles  || [];

      const filteredShifts   = shiftLogs.filter((s: any) => s.date >= startDate && s.date <= endDate);
      const filteredExpenses = expenses.filter((e: any) => e.date >= startDate && e.date <= endDate);

      const totalGross = filteredShifts.reduce((acc: number, s: any) => acc + (Number(s.grossEarnings) || 0), 0);
      const totalKm    = filteredShifts.reduce((acc: number, s: any) => acc + (Number(s.kilometers)    || 0), 0);
      const totalTrips = filteredShifts.reduce((acc: number, s: any) => acc + (Number(s.tripsCount)    || 0), 0);

      const distinctDaysSet  = new Set(filteredShifts.map((s: any) => s.date));
      const operationalDays  = distinctDaysSet.size || (filteredShifts.length > 0 ? 1 : 0);

      const parseHours = (val: any) => {
        if (typeof val === 'number') return val;
        if (typeof val === 'string' && val.includes(':')) {
          const [h, m] = val.split(':').map(Number);
          return (h || 0) + (m || 0) / 60;
        }
        return Number(val) || 0;
      };

      const totalHours = filteredShifts.reduce((acc: number, s: any) => acc + parseHours(s.hoursWorked), 0);

      const isDuplicateShiftExpense = (e: any) => {
        if (!e) return false;
        if (e.id && (
          e.id.startsWith('exp-fuel-shift-') ||
          e.id.startsWith('exp-rnd-shift-')  ||
          e.id.startsWith('exp-nrg-')        ||
          e.id.startsWith('exp-rnd-daily-')  ||
          e.id.startsWith('exp-rnd-monday-')
        )) return true;
        if (e.description && (
          e.description.includes('Custo diário de energia')    ||
          e.description.includes('Renda diária de viatura')    ||
          e.description.includes('Sincronizado de Faturação Diária')
        )) return true;
        return false;
      };

      const shiftFuel   = filteredShifts.reduce((acc: number, s: any) => acc + (Number(s.fuelExpenseAmount)   || 0), 0);
      const shiftRental = filteredShifts.reduce((acc: number, s: any) => acc + (Number(s.rentalExpenseAmount) || 0), 0);

      const standaloneFuel   = filteredExpenses.filter((e: any) => e.category === 'fuel_charging'   && !isDuplicateShiftExpense(e)).reduce((acc: number, e: any) => acc + (Number(e.amount) || 0), 0);
      const standaloneRental = filteredExpenses.filter((e: any) => e.category === 'vehicle_rental'  && !isDuplicateShiftExpense(e)).reduce((acc: number, e: any) => acc + (Number(e.amount) || 0), 0);
      const standaloneOther  = filteredExpenses.filter((e: any) => e.category !== 'fuel_charging' && e.category !== 'vehicle_rental' && !isDuplicateShiftExpense(e)).reduce((acc: number, e: any) => acc + (Number(e.amount) || 0), 0);

      const energyTotal = shiftFuel   + standaloneFuel;
      const rentalTotal = shiftRental + standaloneRental;
      const totalCosts  = energyTotal + rentalTotal + standaloneOther;
      const netProfit   = totalGross - totalCosts;
      const marginPct   = totalGross > 0 ? (netProfit / totalGross) * 100 : 0;

      const revenuePerHour  = totalHours > 0        ? totalGross / totalHours        : 0;
      const avgTripsPerDay  = operationalDays > 0   ? totalTrips / operationalDays   : 0;
      const revenuePerTrip  = totalTrips > 0        ? totalGross / totalTrips        : 0;

      const driverMap = new Map<string, { name: string; gross: number; uber: number; bolt: number; trips: number; hours: number }>();
      filteredShifts.forEach((s: any) => {
        const dKey = s.driverId || s.driverName || 'Outro';
        const name = s.driverName || (drivers.find((d: any) => d.id === s.driverId)?.name) || dKey;
        if (!driverMap.has(dKey)) driverMap.set(dKey, { name, gross: 0, uber: 0, bolt: 0, trips: 0, hours: 0 });
        const item = driverMap.get(dKey)!;
        item.gross += Number(s.grossEarnings) || 0;
        item.uber  += Number(s.uberEarnings)  || 0;
        item.bolt  += Number(s.boltEarnings)  || 0;
        item.trips += Number(s.tripsCount)    || 0;
        item.hours += parseHours(s.hoursWorked);
      });
      const driverRows = Array.from(driverMap.values())
        .map(d => ({ ...d, perHour: d.hours > 0 ? d.gross / d.hours : 0 }))
        .sort((a, b) => b.gross - a.gross);

      const vehicleMap = new Map<string, { plate: string; model: string; fuel: number; rental: number; maintenance: number; insurance: number; other: number; total: number }>();
      vehicles.forEach((v: any) => {
        const key = v.id || v.licensePlate;
        vehicleMap.set(key, { plate: v.licensePlate || 'N/A', model: `${v.brand || ''} ${v.model || ''}`.trim(), fuel: 0, rental: 0, maintenance: 0, insurance: 0, other: 0, total: 0 });
      });
      filteredShifts.forEach((s: any) => {
        const key = s.vehicleId || s.vehiclePlate;
        if (!key) return;
        if (!vehicleMap.has(key)) vehicleMap.set(key, { plate: s.vehiclePlate || key, model: '', fuel: 0, rental: 0, maintenance: 0, insurance: 0, other: 0, total: 0 });
        const item = vehicleMap.get(key)!;
        item.fuel   += Number(s.fuelExpenseAmount)   || 0;
        item.rental += Number(s.rentalExpenseAmount) || 0;
      });
      const standaloneExpenses = filteredExpenses.filter((e: any) => !isDuplicateShiftExpense(e));
      standaloneExpenses.forEach((e: any) => {
        const key = e.vehicleId || e.vehiclePlate;
        if (!key) return;
        if (!vehicleMap.has(key)) vehicleMap.set(key, { plate: e.vehiclePlate || key, model: '', fuel: 0, rental: 0, maintenance: 0, insurance: 0, other: 0, total: 0 });
        const item = vehicleMap.get(key)!;
        const amt = Number(e.amount) || 0;
        if (e.category === 'maintenance') item.maintenance += amt;
        else if (e.category === 'insurance') item.insurance += amt;
        else item.other += amt;
      });
      const vehicleRows = Array.from(vehicleMap.values())
        .map(v => ({ ...v, total: v.fuel + v.rental + v.maintenance + v.insurance + v.other }))
        .filter(v => v.total > 0 || filteredShifts.some((s: any) => s.vehicleId === v.plate || s.vehiclePlate === v.plate));

      const now = new Date();
      const generatedAt = now.toLocaleString('pt-PT', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' });

      const htmlContent = generateSummaryEmailHtml({
        startDate, endDate, totalGross, totalCosts, netProfit, marginPct,
        operationalDays, totalHours, revenuePerHour, totalTrips, avgTripsPerDay,
        revenuePerTrip, totalKm, energyTotal, rentalTotal, driverRows, vehicleRows, generatedAt
      });

      if (!gmailUser || !rawGmailPass) {
        return res.status(400).json({
          error: 'Palavra-passe de Aplicação do Gmail não fornecida.',
          details: 'Introduza a sua Palavra-passe de Aplicação de 16 letras do Google no campo correspondente ou configure GMAIL_APP_PASSWORD no servidor.'
        });
      }

      const cleanGmailPass = rawGmailPass.replace(/\s+/g, '');

      try {
        const optionsList = [
          { service: 'gmail', auth: { user: gmailUser, pass: cleanGmailPass }, connectionTimeout: 8000, greetingTimeout: 8000, socketTimeout: 10000 },
          { host: 'smtp.gmail.com', port: 587, secure: false, requireTLS: true, auth: { user: gmailUser, pass: cleanGmailPass }, tls: { rejectUnauthorized: false }, connectionTimeout: 8000, greetingTimeout: 8000, socketTimeout: 10000 },
          { host: 'smtp.gmail.com', port: 465, secure: true,  auth: { user: gmailUser, pass: cleanGmailPass }, tls: { rejectUnauthorized: false }, connectionTimeout: 8000, greetingTimeout: 8000, socketTimeout: 10000 }
        ];

        let lastErr: any  = null;
        let mailSent      = false;
        let sendResult: any = null;

        for (const opts of optionsList) {
          try {
            const tempTransporter = nodemailer.createTransport(opts);
            sendResult = await tempTransporter.sendMail({
              from:    `"TVDE Fleet Master" <${gmailUser}>`,
              to:      ['josreb@gmail.com', 'alexreb60@gmail.com'],
              subject: `[TVDE Fleet Master] Resumo de Desempenho (${startDate} a ${endDate})`,
              html:    htmlContent
            });
            mailSent = true;
            break;
          } catch (err: any) {
            lastErr = err;
            console.warn(`Tentativa SMTP (${(opts as any).service || (opts as any).port}) falhou:`, err?.message);
            const errStr = String(err?.message || err || '');
            if (errStr.includes('535') || errStr.includes('EAUTH') || errStr.includes('Invalid login')) break;
          }
        }

        if (!mailSent) throw lastErr || new Error('Falha ao estabelecer ligação ao servidor Gmail.');

        return res.json({
          success:    true,
          message:    'Resumo enviado com sucesso para josreb@gmail.com e alexreb60@gmail.com',
          recipients: ['josreb@gmail.com', 'alexreb60@gmail.com'],
          period:     { startDate, endDate },
          info:       sendResult?.messageId
        });
      } catch (mailErr: any) {
        console.error('Erro ao enviar e-mail via SMTP Gmail:', mailErr);
        const errString  = String(mailErr?.message || mailErr || '');
        const errCode    = mailErr?.code     ? ` [Código: ${mailErr.code}]`         : '';
        const errResponse = mailErr?.response ? ` [Resposta: ${mailErr.response}]`  : '';

        if (errString.includes('535') || errString.includes('EAUTH') || errString.includes('Username and Password not accepted') || errString.includes('Invalid login')) {
          return res.status(401).json({ error: 'Palavra-passe de Aplicação rejeitada pela Google (Erro 535).', details: `A conta ${gmailUser} não aceitou a palavra-passe introduzida.` });
        }
        if (errString.includes('534') || errString.includes('InvalidSecondFactor') || errString.includes('Application-specific password required')) {
          return res.status(401).json({ error: 'Google exige Palavra-passe de Aplicação (Erro 534).', details: 'Gere uma Palavra-passe de Aplicação em https://myaccount.google.com/apppasswords.' });
        }
        if (errString.includes('ETIMEDOUT') || errString.includes('ESOCKETTIMEDOUT') || errString.includes('ECONNREFUSED')) {
          return res.status(504).json({ error: 'Não foi possível ligar ao servidor SMTP do Gmail.', details: `A conexão ao smtp.gmail.com expirou.${errCode}` });
        }
        return res.status(500).json({ error: 'Falha no envio de e-mail via SMTP Gmail.', details: `${errString}${errCode}${errResponse}` });
      }
    } catch (err: any) {
      console.error('Erro ao processar resumo:', err);
      return res.status(500).json({ error: 'Erro interno ao processar o resumo.', details: err.message });
    }
  };

  app.all('/api/send-summary*',       handleSendSummary);
  app.all('/api/send-summary-email*', handleSendSummary);

  // AI Insights
  app.all('/api/ai/tvde-insights*', async (req, res) => {
    try {
      const apiKey = process.env.GEMINI_API_KEY;
      if (!apiKey) return res.status(400).json({ error: 'Chave de API do Gemini não configurada.' });

      const { fleetSummary } = req.body;
      const ai = new GoogleGenAI({ apiKey, httpOptions: { headers: { 'User-Agent': 'aistudio-build' } } });
      const response = await ai.models.generateContent({
        model:    'gemini-3.6-flash',
        contents: `És um consultor especialista em gestão de frotas TVDE (Uber/Bolt) em Portugal.
Analisa os seguintes dados da empresa e fornece 3 a 4 recomendações práticas e concretas em Português de Portugal (pt-PT):
- Faturação total recente, custos de combustível/carregamento, manutenção, seguros e rendas.
- Dados atuais: ${JSON.stringify(fleetSummary)}

Responde num formato JSON válido com a seguinte estrutura:
{
  "resumoExecutivo": "string curta",
  "recomendacoes": [
    {"titulo": "string", "descricao": "string", "impactoEstimado": "string", "categoria": "combustivel|manutencao|rendas|motoristas"}
  ],
  "pontoAtencaoCritico": "string com um alerta prioritário"
}`,
      });

      const text      = response.text || '';
      const cleanJson = text.replace(/```json/g, '').replace(/```/g, '').trim();
      let data;
      try {
        data = JSON.parse(cleanJson);
      } catch {
        data = { resumoExecutivo: text.slice(0, 200), recomendacoes: [{ titulo: 'Otimização de Custos Elétricos', descricao: text, impactoEstimado: '+12% Rentabilidade', categoria: 'combustivel' }], pontoAtencaoCritico: 'Monitore a relação entre nº de km e revisões preventivas dos veículos elétricos.' };
      }
      return res.json(data);
    } catch (err: any) {
      console.error('Erro na chamada ao Gemini API:', err);
      return res.status(500).json({ error: 'Erro ao gerar análise inteligente da frota: ' + err.message });
    }
  });

  // Catch-all /api/*
  app.all('/api/*', (req, res) => {
    res.status(404).json({ error: `Rota de API não encontrada: ${req.method} ${req.path}` });
  });

  // Vite / static
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({ server: { middlewareMode: true }, appType: 'spa' });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (_req, res) => res.sendFile(path.join(distPath, 'index.html')));
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`[TVDE Fleet Server] A correr em http://0.0.0.0:${PORT}`);
  });
}

startServer().catch((err) => {
  console.error('Falha ao iniciar o servidor TVDE:', err);
});
