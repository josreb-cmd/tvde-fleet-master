<div align="center">

# 🚗 TVDE Fleet Master

### Sistema Inteligente de Gestão de Frotas TVDE

[![Versão](https://img.shields.io/badge/versão-2.4.0-blue.svg)](https://github.com/josreb-cmd/tvde-fleet-master/releases)
[![Status](https://img.shields.io/badge/status-em%20produção-brightgreen.svg)](https://frotatvde.solucoeseficazes.pt/)
[![React](https://img.shields.io/badge/React-19-61DAFB?logo=react&logoColor=white)](https://react.dev/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5-3178C6?logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![Vite](https://img.shields.io/badge/Vite-6-646CFF?logo=vite&logoColor=white)](https://vitejs.dev/)
[![Firebase](https://img.shields.io/badge/Firebase-Firestore-FFCA28?logo=firebase&logoColor=black)](https://firebase.google.com/)
[![Tailwind CSS](https://img.shields.io/badge/Tailwind_CSS-4-06B6D4?logo=tailwindcss&logoColor=white)](https://tailwindcss.com/)
[![PWA](https://img.shields.io/badge/PWA-Instalável-5A0FC8?logo=pwa&logoColor=white)](https://web.dev/progressive-web-apps/)
[![License](https://img.shields.io/badge/licença-MIT-green.svg)](LICENSE)

**Plataforma PWA completa para gestão operacional e financeira de frotas TVDE (Uber/Bolt)**

[🌐 **Ver App em Produção**](https://frotatvde.solucoeseficazes.pt/) · [📋 Issues](https://github.com/josreb-cmd/tvde-fleet-master/issues) · [🗺️ Roadmap](#-roadmap)

</div>

---

## 📸 Screenshots

<div align="center">

### Painel Geral — KPIs em Tempo Real
<img src="docs/screenshots/painel-geral.png" alt="Painel Geral" width="900"/>

### Rentabilidade Mensal — Por Viatura e Motorista
<img src="docs/screenshots/rentabilidade-mensal.png" alt="Rentabilidade Mensal" width="900"/>

### Alertas & Notificações
<img src="docs/screenshots/alertas-notificacoes.png" alt="Alertas e Notificações" width="900"/>

</div>

---

## ✨ Funcionalidades

### 📊 Dashboard & KPIs
- **Painel Geral** com faturação, emissão de recibos, custos, lucro líquido e métricas de rodagem em tempo real
- **Evolução Mensal** — gráfico Faturação vs Custos
- **Distribuição por Plataforma** — Uber vs Bolt
- **Ranking de Faturação** por motorista

### 💰 Gestão Financeira
- **Faturação Diária** — registo e consulta por motorista/viatura
- **Custos & Rendas** — controlo de rendas semanais, energia, manutenção e seguros
- **Rentabilidade Mensal** — análise por viatura e por motorista (ganhos/hora e ganhos/km)
- **Rentabilidade por Km** — identificação do ponto ótimo (~2000 km/semana) com análise de sensibilidade

### 🚘 Gestão de Frota
- **Frota de Viaturas** — registo completo (Tesla Model Y, 100% elétrico)
- **Motoristas** — perfil, documentos e histórico
- **Portal do Motorista** — acesso dedicado para cada condutor

### 🤖 Inteligência Artificial
- **IA Frota** — consulta personalizada com linguagem natural sobre toda a operação
- **Análise Preditiva** — projeções de rentabilidade baseadas em dados reais

### 🔔 Alertas & Notificações
- **Manutenção** — avisos programados
- **Pagamentos Pendentes** — controlo de recibos e faturas
- **Validade de Documentos** — alertas automáticos de expiração
- **Desempenho** — alertas quando métricas saem dos parâmetros esperados

### 📧 Comunicações
- **Resumo por Email** — envio automático via Cloud Functions com credenciais seguras (Secret Manager)

---

## 🏗️ Arquitetura

