# TVDE Fleet Master — Contexto para Claude Code

## Projecto
App de gestão de frota TVDE. Versão actual: **V.2.9.5**
URL produção: https://frotatvde.solucoeseficazes.pt
Repositório: josreb-cmd/tvde-fleet-master (privado)
Caminho local: `C:\projetos\tvde-fleet-master\tvde-fleet-master`

## Stack
- **Frontend**: Vite + React 18 + TypeScript + Tailwind CSS
- **Componentes**: Lucide React, Recharts
- **Backend IA**: Express.js (Node) + Google Gemini (@google/genai)
- **Base de dados**: Firestore (Firebase SDK client-side)
- **Deploy**: Cloudflare Pages — auto-deploy no push para `main`
- **Backend Cloud**: Cloud Run (europe-west2) — projecto GCP `gen-lang-client-0465939536`
- **Testes**: Vitest v5.0.0 + jsdom + @testing-library/react

## Regras obrigatórias

### Encoding
- **NUNCA** usar escapes Unicode (`\u20AC`, `\u00e9`, etc.)
- Usar sempre caracteres UTF-8 nativos directamente: `€`, `é`, `ã`, `ç`

### Cloudflare Pages (Linux — case-sensitive)
- A pasta chama-se `contexts` com **S** (não `context`)
- Todos os imports são case-sensitive — verificar sempre

### TypeScript / Firestore
- `hoursWorked` é **NUMBER DECIMAL** (ex: 8.75 = 8h45min) — nunca fazer `.split(":")`
- `cleanObject` em `TVDEContext.tsx` remove `undefined` antes de escrever no Firestore
- Listeners Firestore fazem apenas **load simples** — sem detectores de dados antigos (bug crítico corrigido em V.2.9.4/V.2.9.5)

### Testes
- Correr **sempre** `npx vitest run` antes de qualquer commit
- 37 testes devem passar: 23 em `rentabilidade.test.ts` + 14 em `monthlyStats.test.ts`
- Nunca fazer commit com testes a falhar

### Git
- Trabalhar sempre em branch antes de fazer merge para `main`
- Convenção de branches: `feat/`, `fix/`, `redesign-`
- Push para `main` = deploy automático no Cloudflare Pages

## Arquitectura de ficheiros relevantes

```
src/
  components/
    rentabilidade/               # ← TODOS os ficheiros do módulo vivem AQUI
      KmRentabilidade.tsx        # orquestrador (tabs Gestor/Motorista/Comparação)
      KmRentabilidadeGestor.tsx  # vista gestor (sparklines + tabela sensibilidade)
      KmRentabilidadeMotorista.tsx # vista motorista (progresso + ranking + resumo)
      ComparacaoSemanal.tsx      # tabela comparativa semanal + export CSV
      SparklineChart.tsx         # SVG puro para mini-gráficos (sem deps externas)
      constants.ts               # constantes do modelo de negócio
      types.ts                   # WeeklySnapshot, SparklineDataPoint, etc.
      useKmRentabilidade.ts      # hook de cálculos semanais
      useWeeklySparklines.ts     # tendências 8 semanas (TREND_THRESHOLD=2%)
    Sidebar.tsx                  # versão dinâmica via {__APP_VERSION__}
  contexts/
    TVDEContext.tsx               # contexto global + listeners Firestore
  styles/
    kmRentabilidadeTheme.css     # tokens CSS do tema claro
  utils/
    dayOff.ts                    # isDayOff() centralizado
  __tests__/
    rentabilidade.test.ts        # 23 testes
    monthlyStats.test.ts         # 14 testes
    setup.ts                     # configuração jsdom
```

## Constantes do modelo de negócio (`src/constants.ts`)

```typescript
RENDA_SEMANAL      = 350      // €/sem — custo fixo contratual
KM_BASE            = 2000     // km incluídos na renda
TAXA_ADICIONAL     = 0.25     // €/km sobretaxa acima dos 2000 km
ENERGIA_POR_KM     = 0.065    // €/km — Tesla Model Y (15 kWh/100km × 0,41€/kWh)
RECEITA_ESTIMADA_POR_KM = 0.35 // €/km — tabela de sensibilidade (ilustrativo)
```

## Código de cores (usar sempre estes valores)

```
#10b981  verde   — lucro / margem positiva / contratual
#f59e0b  âmbar   — energia / custos / atenção
#6366f1  indigo  — km / info / neutralidade
#ef4444  vermelho — alertas / tendência negativa / prejuízo
cinza            — tendência neutra (dentro da dead band ±2%)
```

## Campos Firestore — colecção `shiftLogs`

| Campo | Tipo | Notas |
|---|---|---|
| `date` | string | YYYY-MM-DD |
| `grossEarnings` | number | receita bruta total |
| `kilometers` | number | km percorridos |
| `tripsCount` | number | nº de viagens |
| `hoursWorked` | number | **decimal** (8.75 = 8h45min) |
| `boltEarnings` | number | receita Bolt |
| `uberEarnings` | number | receita Uber |
| `fuelExpenseAmount` | number | carregamentos reais (não estimativa) |
| `rentalExpenseAmount` | number | renda paga |
| `status` | string | estado do turno |
| `notes` | string | "Folga" para dias de descanso |

## Semana operacional
Segunda a Domingo (weekBounds em UTC para evitar desvio de timezone)

## Motorista e viatura
- Motorista: Alexandre Rebelo (`alexreb60@gmail.com`)
- Viatura: Tesla Model Y, matrícula CE-84-UO, 100% eléctrico
- Gestor: José Rebelo (`josreb@gmail.com`)

## Firebase Auth
Acesso restrito a `josreb@gmail.com` (gestor) e `alexreb60@gmail.com` (gestor/motorista)

## Auditoria de referência (semana 03–09 Ago 2026)
- 2.280 km · 53,3h · 614 viagens
- Receita: 1.063,64€ · Lucro líquido: 495,44€
- Receita/km: 0,467€ (33% acima da estimativa 0,35€)
- Energia real: 148,20€ · Sobretaxa: 70€ (280 km × 0,25€)

## Funções Cloud (não tocar sem aviso explícito)
- `enviarResumoFleetMaster` — email semanal para josreb@gmail.com e alexreb60@gmail.com
- `backupShiftLogs` — backup diário CSV à meia-noite (hora Lisboa)
- Secret: `GMAIL_APP_PASSWORD` (Secret Manager)

## Histórico de incidentes críticos (não repetir)
- **V.2.9.4**: detector `boltEarnings > 0` apagou registos 03/08–02/09 → nunca adicionar
  detectores de dados antigos nos listeners Firestore
- **Encoding**: double-encoding corrigido em V.2.8.5 → nunca usar `\uXXXX`
- **hoursWorked**: era string HH:MM em versões antigas → sempre tratar como decimal

## Workflow preferido do José
1. Criar branch antes de qualquer alteração
2. Gerar ficheiros completos prontos para substituição (não patches parciais)
3. Correr `npx vitest run` — todos os 37 testes devem passar
4. Só fazer merge para `main` após confirmação do José
5. Push para `main` = deploy automático Cloudflare Pages
