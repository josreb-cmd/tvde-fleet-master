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
      expenses: expSnap.docs.map(d => ({ id: d.id, ...d.data() })),
      drivers: drvSnap.docs.map(d => ({ id: d.id, ...d.data() })),
      vehicles: vehSnap.docs.map(d => ({ id: d.id, ...d.data() }))
    };
  } catch (err) {
    console.error('[Server Firestore Fetch Error]:', err);
    return null;
  }
}

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json());

  // Health check endpoint
  app.get('/api/health', (_req, res) => {
    res.json({ status: 'ok', time: new Date().toISOString() });
  });

  // Send Summary Email Endpoint
  app.post('/api/send-summary', async (req, res) => {
    try {
      const { startDate, endDate } = req.body;

      if (!startDate || !endDate) {
        return res.status(400).json({ error: 'Parâmetros startDate e endDate são obrigatórios.' });
      }

      const gmailUser = req.body.gmailUser || process.env.GMAIL_USER || 'josreb@gmail.com';
      const gmailPass = req.body.gmailAppPassword || process.env.GMAIL_APP_PASSWORD;

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

      // Filter within range [startDate, endDate]
      const filteredShifts = shiftLogs.filter((s: any) => s.date >= startDate && s.date <= endDate);
      const filteredExpenses = expenses.filter((e: any) => e.date >= startDate && e.date <= endDate);

      // Calculations
      const totalGross = filteredShifts.reduce((acc: number, s: any) => acc + (Number(s.grossEarnings) || 0), 0);
      const totalKm = filteredShifts.reduce((acc: number, s: any) => acc + (Number(s.kilometers) || 0), 0);
      const totalTrips = filteredShifts.reduce((acc: number, s: any) => acc + (Number(s.tripsCount) || 0), 0);

      const distinctDaysSet = new Set(filteredShifts.map((s: any) => s.date));
      const operationalDays = distinctDaysSet.size || (filteredShifts.length > 0 ? 1 : 0);

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
          e.id.startsWith('exp-rnd-shift-') ||
          e.id.startsWith('exp-nrg-') ||
          e.id.startsWith('exp-rnd-daily-') ||
          e.id.startsWith('exp-rnd-monday-')
        )) {
          return true;
        }
        if (e.description && (
          e.description.includes('Custo diário de energia') ||
          e.description.includes('Renda diária de viatura') ||
          e.description.includes('Sincronizado de Faturação Diária')
        )) {
          return true;
        }
        return false;
      };

      const shiftFuel = filteredShifts.reduce((acc: number, s: any) => acc + (Number(s.fuelExpenseAmount) || 0), 0);
      const shiftRental = filteredShifts.reduce((acc: number, s: any) => acc + (Number(s.rentalExpenseAmount) || 0), 0);

      const standaloneFuel = filteredExpenses
        .filter((e: any) => e.category === 'fuel_charging' && !isDuplicateShiftExpense(e))
        .reduce((acc: number, e: any) => acc + (Number(e.amount) || 0), 0);

      const standaloneRental = filteredExpenses
        .filter((e: any) => e.category === 'vehicle_rental' && !isDuplicateShiftExpense(e))
        .reduce((acc: number, e: any) => acc + (Number(e.amount) || 0), 0);

      const standaloneOther = filteredExpenses
        .filter((e: any) => e.category !== 'fuel_charging' && e.category !== 'vehicle_rental' && !isDuplicateShiftExpense(e))
        .reduce((acc: number, e: any) => acc + (Number(e.amount) || 0), 0);

      const energyTotal = shiftFuel + standaloneFuel;
      const rentalTotal = shiftRental + standaloneRental;
      const totalCosts = energyTotal + rentalTotal + standaloneOther;

      const netProfit = totalGross - totalCosts;
      const marginPct = totalGross > 0 ? (netProfit / totalGross) * 100 : 0;

      const revenuePerHour = totalHours > 0 ? totalGross / totalHours : 0;
      const avgTripsPerDay = operationalDays > 0 ? totalTrips / operationalDays : 0;
      const revenuePerTrip = totalTrips > 0 ? totalGross / totalTrips : 0;

      // Drivers Breakdown
      const driverMap = new Map<string, { name: string; gross: number; uber: number; bolt: number; trips: number; hours: number }>();

      filteredShifts.forEach((s: any) => {
        const dKey = s.driverId || s.driverName || 'Outro';
        const name = s.driverName || (drivers.find((d: any) => d.id === s.driverId)?.name) || dKey;

        if (!driverMap.has(dKey)) {
          driverMap.set(dKey, { name, gross: 0, uber: 0, bolt: 0, trips: 0, hours: 0 });
        }
        const item = driverMap.get(dKey)!;
        item.gross += Number(s.grossEarnings) || 0;
        item.uber += Number(s.uberEarnings) || 0;
        item.bolt += Number(s.boltEarnings) || 0;
        item.trips += Number(s.tripsCount) || 0;
        item.hours += parseHours(s.hoursWorked);
      });

      const driverRows = Array.from(driverMap.values())
        .map(d => ({ ...d, perHour: d.hours > 0 ? d.gross / d.hours : 0 }))
        .sort((a, b) => b.gross - a.gross);

      // Vehicles Breakdown
      const vehicleMap = new Map<string, { plate: string; model: string; fuel: number; rental: number; maintenance: number; insurance: number; other: number; total: number }>();

      vehicles.forEach((v: any) => {
        const key = v.id || v.licensePlate;
        vehicleMap.set(key, {
          plate: v.licensePlate || 'N/A',
          model: `${v.brand || ''} ${v.model || ''}`.trim(),
          fuel: 0,
          rental: 0,
          maintenance: 0,
          insurance: 0,
          other: 0,
          total: 0
        });
      });

      filteredShifts.forEach((s: any) => {
        const key = s.vehicleId || s.vehiclePlate;
        if (!key) return;
        if (!vehicleMap.has(key)) {
          vehicleMap.set(key, {
            plate: s.vehiclePlate || key,
            model: '',
            fuel: 0,
            rental: 0,
            maintenance: 0,
            insurance: 0,
            other: 0,
            total: 0
          });
        }
        const item = vehicleMap.get(key)!;
        item.fuel += Number(s.fuelExpenseAmount) || 0;
        item.rental += Number(s.rentalExpenseAmount) || 0;
      });

      const standaloneExpenses = filteredExpenses.filter((e: any) => !isDuplicateShiftExpense(e));

      standaloneExpenses.forEach((e: any) => {
        const key = e.vehicleId || e.vehiclePlate;
        if (!key) return;
        if (!vehicleMap.has(key)) {
          vehicleMap.set(key, {
            plate: e.vehiclePlate || key,
            model: '',
            fuel: 0,
            rental: 0,
            maintenance: 0,
            insurance: 0,
            other: 0,
            total: 0
          });
        }
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
      const generatedAt = now.toLocaleString('pt-PT', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
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

      if (!gmailUser || !gmailPass) {
        return res.status(400).json({
          error: 'Variáveis de ambiente GMAIL_USER e GMAIL_APP_PASSWORD não configuradas.',
          details: 'Por favor, adicione GMAIL_USER e GMAIL_APP_PASSWORD no ambiente do servidor.'
        });
      }

      try {
        const transporter = nodemailer.createTransport({
          service: 'gmail',
          auth: {
            user: gmailUser,
            pass: gmailPass
          }
        });

        const mailOptions = {
          from: `"TVDE Fleet Master" <${gmailUser}>`,
          to: ['josreb@gmail.com', 'alexreb60@gmail.com'],
          subject: `[TVDE Fleet Master] Resumo de Desempenho (${startDate} a ${endDate})`,
          html: htmlContent
        };

        await transporter.sendMail(mailOptions);

        return res.json({
          success: true,
          message: 'Resumo enviado com sucesso para josreb@gmail.com e alexreb60@gmail.com',
          recipients: ['josreb@gmail.com', 'alexreb60@gmail.com'],
          period: { startDate, endDate }
        });
      } catch (mailErr: any) {
        console.error('Erro ao enviar e-mail via SMTP Gmail:', mailErr);
        const errString = String(mailErr?.message || mailErr || '');
        if (errString.includes('534') || errString.includes('InvalidSecondFactor') || errString.includes('Application-specific password required')) {
          return res.status(401).json({
            error: 'Google exige Palavra-passe de Aplicação (Erro 534-5.7.9).',
            details: 'A conta Gmail tem a Verificação em 2 Passos ativa. A palavra-passe normal é rejeitada pela Google. É necessário gerar uma Palavra-passe de Aplicação de 16 letras em https://myaccount.google.com/apppasswords e definir na variável GMAIL_APP_PASSWORD.'
          });
        }
        return res.status(500).json({
          error: 'Falha no envio de e-mail via SMTP Gmail.',
          details: mailErr?.message || 'Erro de autenticação ou conexão ao servidor SMTP.'
        });
      }
    } catch (err: any) {
      console.error('Erro ao processar resumo:', err);
      return res.status(500).json({
        error: 'Erro interno ao processar o resumo.',
        details: err.message
      });
    }
  });

  // AI Insights Endpoint for TVDE Fleet Optimization
  app.post('/api/ai/tvde-insights', async (req, res) => {
    try {
      const apiKey = process.env.GEMINI_API_KEY;
      if (!apiKey) {
        return res.status(400).json({
          error: 'Chave de API do Gemini não configurada.',
          suggestion: 'Por favor, configure a chave GEMINI_API_KEY no painel de segredos.'
        });
      }

      const { fleetSummary } = req.body;

      const ai = new GoogleGenAI({
        apiKey,
        httpOptions: {
          headers: {
            'User-Agent': 'aistudio-build'
          }
        }
      });
      const response = await ai.models.generateContent({
        model: 'gemini-3.6-flash',
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

      const text = response.text || '';
      // Attempt to parse JSON from AI response
      const cleanJson = text.replace(/```json/g, '').replace(/```/g, '').trim();
      let data;
      try {
        data = JSON.parse(cleanJson);
      } catch {
        data = {
          resumoExecutivo: text.slice(0, 200),
          recomendacoes: [
            {
              titulo: "Otimização de Custos Elétricos",
              descricao: text,
              impactoEstimado: "+12% Rentabilidade",
              categoria: "combustivel"
            }
          ],
          pontoAtencaoCritico: "Monitore a relação entre nº de km e revisões preventivas dos veículos elétricos."
        };
      }

      return res.json(data);
    } catch (err: any) {
      console.error('Erro na chamada ao Gemini API:', err);
      return res.status(500).json({ error: 'Erro ao gerar análise inteligente da frota: ' + err.message });
    }
  });

  // Vite middleware setup for dev vs production static serving
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (_req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`[TVDE Fleet Server] A correr em http://0.0.0.0:${PORT}`);
  });
}

startServer().catch((err) => {
  console.error('Falha ao iniciar o servidor TVDE:', err);
});
