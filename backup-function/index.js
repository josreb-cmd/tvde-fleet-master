/**
 * backupShiftLogs — Cloud Function Gen 2
 * Corre diariamente à meia-noite (Lisboa)
 * Lê shiftLogs do Firestore → gera CSV → envia por email para josreb@gmail.com
 * → arquiva o CSV numa pasta do Google Drive (archive adicional)
 *
 * Projecto GCP : gen-lang-client-0465939536
 * Firestore DB : ai-studio-tvdefleetmasterg-300d7ace-afbe-48b4-b1fb-ca191a9d7c9f
 * Secrets      : GMAIL_APP_PASSWORD, GMAIL_DRIVE_OAUTH_CLIENT (clientId::clientSecret),
 *               GMAIL_DRIVE_REFRESH_TOKEN (Secret Manager)
 * Drive        : upload OAuth 2.0 como josreb@gmail.com (refresh token), scope drive.file
 */

const { onSchedule } = require("firebase-functions/v2/scheduler");
const { Firestore } = require("@google-cloud/firestore");
const { SecretManagerServiceClient } = require("@google-cloud/secret-manager");
const { drive, auth } = require("@googleapis/drive");
const { Readable } = require("node:stream");
const nodemailer = require("nodemailer");

const PROJECT_ID  = "gen-lang-client-0465939536";
const DATABASE_ID = "ai-studio-tvdefleetmasterg-300d7ace-afbe-48b4-b1fb-ca191a9d7c9f";
const COLLECTION  = "shiftLogs";
const EMAIL_FROM  = "josreb@gmail.com";
const EMAIL_TO    = "josreb@gmail.com";
const DRIVE_FOLDER_ID = "1lp9mAAWDDjP4pqrLyeb2VMa-OH3K_XH6";

// Campos a exportar
const CAMPOS = [
  "date", "status", "grossEarnings", "uberEarnings", "boltEarnings",
  "kilometers", "tripsCount", "hoursWorked", "fuelExpenseAmount",
  "rentalExpenseAmount", "notes"
];

const CABECALHO = [
  "Data", "Estado", "Receita Bruta (€)", "Uber (€)", "Bolt (€)",
  "Km", "Viagens", "Horas Trabalhadas", "Combustível/Energia (€)",
  "Renda (€)", "Notas"
];

function formatarHoras(h) {
  if (h === undefined || h === null || h === "") return "";
  const horas = Math.floor(h);
  const minutos = Math.round((h - horas) * 60);
  return `${horas}h${String(minutos).padStart(2, "0")}min`;
}

function csvCell(val) {
  if (val === undefined || val === null) return "";
  const s = String(val);
  if (s.includes(";") || s.includes('"') || s.includes("\n")) {
    return `"${s.replace(/"/g, '""')}"`;
  }
  return s;
}

function docParaLinha(data) {
  return CAMPOS.map((campo) => {
    if (campo === "hoursWorked") return csvCell(formatarHoras(data[campo]));
    if (["grossEarnings", "uberEarnings", "boltEarnings",
         "fuelExpenseAmount", "rentalExpenseAmount"].includes(campo)) {
      const v = data[campo];
      return csvCell(v !== undefined && v !== null ? Number(v).toFixed(2).replace(".", ",") : "");
    }
    return csvCell(data[campo]);
  }).join(";");
}

async function getSecret(nome) {
  const client = new SecretManagerServiceClient();
  const [version] = await client.accessSecretVersion({
    name: `projects/${PROJECT_ID}/secrets/${nome}/versions/latest`,
  });
  return version.payload.data.toString("utf8").trim();
}

async function getDriveOAuthClient() {
  const [clientPair, refreshToken] = await Promise.all([
    getSecret("GMAIL_DRIVE_OAUTH_CLIENT"),
    getSecret("GMAIL_DRIVE_REFRESH_TOKEN"),
  ]);

  const sep = clientPair.indexOf("::");
  if (sep === -1) {
    throw new Error("GMAIL_DRIVE_OAUTH_CLIENT sem separador '::'");
  }
  const clientId = clientPair.slice(0, sep);
  const clientSecret = clientPair.slice(sep + 2);

  const oauth2 = new auth.OAuth2(clientId, clientSecret);
  oauth2.setCredentials({ refresh_token: refreshToken });
  return oauth2;
}

async function uploadParaDrive(nomeFicheiro, csv) {
  const authClient = await getDriveOAuthClient();
  const client = drive({ version: "v3", auth: authClient });

  const res = await client.files.create({
    requestBody: {
      name: nomeFicheiro,
      parents: [DRIVE_FOLDER_ID],
      mimeType: "text/csv",
    },
    media: {
      mimeType: "text/csv",
      body: Readable.from(Buffer.from(csv, "utf8")),
    },
    fields: "id, name, webViewLink",
    supportsAllDrives: true,
  });

  return res.data;
}

async function getGmailPassword() {
  return getSecret("GMAIL_APP_PASSWORD");
}

exports.backupShiftLogs = onSchedule(
  {
    schedule: "0 0 * * *",        // Todos os dias à meia-noite (hora de Lisboa)
    timeZone: "Europe/Lisbon",
    region: "europe-west2",
    memory: "256MiB",
    timeoutSeconds: 120,
  },
  async () => {
    console.log("🔄 Início do backup diário de shiftLogs...");

    // 1. Ler Firestore
    const db = new Firestore({ projectId: PROJECT_ID, databaseId: DATABASE_ID });
    const snapshot = await db.collection(COLLECTION).get();

    if (snapshot.empty) {
      console.log("⚠️  Colecção vazia — backup ignorado.");
      return;
    }

    // 2. Ordenar por data
    const docs = snapshot.docs
      .map(d => d.data())
      .sort((a, b) => (a.date || "").localeCompare(b.date || ""));

    console.log(`   ${docs.length} registos encontrados`);
    console.log(`   Período: ${docs[0].date} → ${docs[docs.length - 1].date}`);

    // 3. Gerar CSV
    const linhas = [CABECALHO.join(";"), ...docs.map(docParaLinha)];
    const csv = linhas.join("\n");
    // 4. Nome do ficheiro
    const hoje = new Date().toISOString().slice(0, 10);
    const nomeFicheiro = `shiftLogs_backup_${hoje}.csv`;

    // 5. Enviar email com CSV em anexo
    const gmailPassword = await getGmailPassword();

    const transporter = nodemailer.createTransport({
      service: "gmail",
      auth: {
        user: EMAIL_FROM,
        pass: gmailPassword,
      },
    });

    await transporter.sendMail({
      from: `"TVDE Fleet Master" <${EMAIL_FROM}>`,
      to: EMAIL_TO,
      subject: `📦 Backup TVDE ShiftLogs — ${hoje}`,
      html: `
        <p>Olá José,</p>
        <p>Segue em anexo o backup diário dos registos de faturação do TVDE Fleet Master.</p>
        <ul>
          <li><strong>Data:</strong> ${hoje}</li>
          <li><strong>Registos:</strong> ${docs.length}</li>
          <li><strong>Período:</strong> ${docs[0].date} → ${docs[docs.length - 1].date}</li>
        </ul>
        <p style="color:#6b7280;font-size:12px;">TVDE Fleet Master · Backup Automático Diário</p>
      `,
      attachments: [
        {
          filename: nomeFicheiro,
          content: Buffer.from(csv, "utf8"),
          contentType: "text/csv",
        },
      ],
    });

    console.log(`✅ Email enviado para ${EMAIL_TO} com anexo: ${nomeFicheiro}`);

    // 6. Arquivar cópia no Google Drive (archive adicional — falha não quebra o backup)
    try {
      const ficheiroDrive = await uploadParaDrive(nomeFicheiro, csv);
      console.log(`✅ CSV arquivado no Drive: ${ficheiroDrive.name} (id ${ficheiroDrive.id})`);
    } catch (err) {
      console.error(`⚠️  Upload para o Drive falhou (email já enviado): ${err.message}`);
    }
  }
);
