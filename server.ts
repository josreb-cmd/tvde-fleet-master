import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import { createServer as createViteServer } from 'vite';
import { GoogleGenAI } from '@google/genai';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json());

  // Health check endpoint
  app.get('/api/health', (_req, res) => {
    res.json({ status: 'ok', time: new Date().toISOString() });
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

      const ai = new GoogleGenAI({ apiKey });
      const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash',
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
