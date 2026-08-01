# Sorr.ia CRM

CRM de reativação de pacientes (WhatsApp + email) para clínicas, migrado do protótipo
`Sorria 3107.jsx` (arquivo único) para um projeto de verdade, separado em:

- **`frontend/`** — React + Vite, pronto para deploy na **Vercel**.
- **`backend/`** — Java 17 + Spring Boot, pronto para rodar via **Docker Compose** numa VPS (ex: Hostinger).

---

## 1. Árvore de arquivos

```
sorria-crm/
├── README.md
├── frontend/
│   ├── index.html
│   ├── package.json
│   ├── vite.config.js
│   ├── .gitignore
│   ├── .env.example
│   └── src/
│       ├── main.jsx
│       ├── App.jsx
│       ├── theme.js                  # cores, tokens, constantes da clínica
│       ├── data/
│       │   └── seed.js               # dados de exemplo do modo demo
│       ├── utils/
│       │   ├── format.js             # brl(), num(), pct()
│       │   └── patients.js           # parsing de planilha, segmentação, telefone
│       ├── api/                      # camada de integração com o backend (ver seção 3)
│       │   ├── client.js
│       │   ├── auth.js
│       │   ├── contacts.js
│       │   ├── campaigns.js
│       │   └── dashboard.js
│       ├── components/
│       │   ├── icons.jsx
│       │   ├── Logo.jsx
│       │   ├── ui/
│       │   │   ├── Card.jsx
│       │   │   ├── KpiCard.jsx
│       │   │   ├── Metric.jsx
│       │   │   ├── StatusBadge.jsx
│       │   │   ├── Field.jsx
│       │   │   ├── Select.jsx
│       │   │   ├── Toast.jsx
│       │   │   ├── Modal.jsx
│       │   │   └── ImportBox.jsx
│       │   └── layout/
│       │       ├── Sidebar.jsx
│       │       └── Topbar.jsx
│       ├── pages/
│       │   ├── Login.jsx
│       │   ├── Dashboard.jsx
│       │   ├── Pacientes.jsx         # + EditarPaciente
│       │   ├── Segmentacoes.jsx      # + SegBuilder
│       │   ├── Campanhas.jsx
│       │   ├── Templates.jsx         # + TemplateEditor
│       │   ├── Disparo.jsx           # DisparoFlow + Steps
│       │   ├── HistoricoDisparos.jsx
│       │   ├── Colaboradores.jsx
│       │   ├── Plano.jsx
│       │   ├── Suporte.jsx
│       │   └── Config.jsx
│       └── styles/
│           ├── global.css            # era o componente <Style/>
│           └── s.js                  # objeto de estilos inline compartilhado
│
└── backend/
    ├── pom.xml
    ├── Dockerfile
    ├── docker-compose.yml
    ├── .env.example
    ├── .gitignore
    └── src/main/
        ├── resources/application.yml
        └── java/br/com/sorria/crm/
            ├── SorriaCrmApplication.java
            ├── config/SecurityConfig.java
            ├── security/{JwtService,JwtAuthFilter}.java
            ├── auth/{AuthController,LoginRequest,LoginResponse,DataInitializer}.java
            ├── user/{Usuario,Papel,UsuarioRepository}.java
            ├── contact/{Contato,ContatoRepository,ContatoService,ContatoController}.java
            │   └── dto/ContatoDTO.java
            ├── campaign/{Campanha,Template,*Repository,*Service,*Controller}.java
            │   └── dto/{CampanhaDTO,TemplateDTO,DispatchResultDTO}.java
            ├── dispatch/{DisparoHistorico,DisparoRepository,DisparoController}.java
            ├── dashboard/DashboardController.java
            ├── whatsapp/EvolutionApiClient.java
            └── common/GlobalExceptionHandler.java
```

---

## 2. Arquitetura: o que roda onde

O protótipo original guardava **tudo** (pacientes, campanhas, templates, histórico) em
`useState()` no navegador — nada persistia entre sessões. A separação abaixo mostra o
que já está pronto para produção (frontend) e o que precisa do backend para virar um
CRM de verdade.

| Funcionalidade | Hoje (frontend puro) | Produção (com backend) |
|---|---|---|
| Login | formulário local, `onEnter()` libera o app sem checar nada | `POST /api/auth/login` com JWT, `frontend/src/api/auth.js` já pronto |
| Pacientes/contatos | array em memória (`useState`), some ao dar refresh | `contact/*` no backend (PostgreSQL), `frontend/src/api/contacts.js` |
| Importação de planilha (.xlsx) | parseada 100% no navegador (`utils/patients.js`) — **continua assim mesmo com backend**, é rápido e não expõe dados | opcionalmente enviar o arquivo pro backend processar (bases grandes) |
| Segmentações | filtro em memória sobre o array de pacientes | mesma lógica, mas rodando contra os dados persistidos do backend |
| Campanhas / Templates | array em memória | `campaign/*` no backend |
| Disparo de campanha | **simulado** com `setInterval` + `Math.random()` no navegador | `POST /api/campaigns/{id}/dispatch` no backend, que chama a Evolution API de verdade (`whatsapp/EvolutionApiClient.java`) |
| Histórico de disparos | array em memória | `dispatch/*` no backend |
| Dashboard (KPIs) | calculado no cliente a partir do array completo | `GET /api/dashboard/kpis`, calculado no backend |
| Colaboradores | array em memória, senha em texto puro (⚠️ só para protótipo) | vira parte do módulo de usuários (`user/Usuario`, senha com BCrypt) |

**Importante:** o frontend entregue aqui **continua funcionando sozinho** (modo demo, sem
backend) — é assim que ele sobe direto na Vercel sem configuração nenhuma. A camada
`frontend/src/api/*.js` já existe, documentada e pronta, mas as páginas ainda usam o
estado local do `App.jsx`. Para ligar o backend de verdade, troque os `useState`/handlers
de `App.jsx` pelas funções de `src/api/*.js` (ver comentários `TODO(backend)` espalhados
pelas páginas — cada uma diz exatamente o que trocar).

---

## 3. Contrato de API (frontend ⇄ backend)

Base URL configurável via `VITE_API_URL` (frontend) / `CORS_ALLOWED_ORIGIN` (backend).
Todas as rotas exceto `/api/auth/login` exigem header `Authorization: Bearer <token>`.

| Método | Rota | Descrição |
|---|---|---|
| POST | `/api/auth/login` | `{email, senha}` → `{token, nome, email, papel}` |
| GET/POST | `/api/contacts` | listar / criar contato |
| GET/PUT/DELETE | `/api/contacts/{id}` | ler / atualizar / remover contato |
| GET/POST | `/api/campaigns` | listar / criar campanha |
| PUT/DELETE | `/api/campaigns/{id}` | atualizar / remover campanha |
| POST | `/api/campaigns/{id}/dispatch` | dispara a campanha para os contatos elegíveis |
| GET | `/api/dispatch-history` | histórico de disparos |
| GET/POST | `/api/templates` | listar / criar template de WhatsApp |
| PUT | `/api/templates/{id}` | atualizar template |
| GET | `/api/dashboard/kpis` | KPIs agregados do painel |

Usuário seed criado automaticamente no primeiro boot do backend (bate com o formulário
de login do protótipo): `clinica@orthodonticsjc.com.br` / `demodemo`.

---

## 4. Rodando localmente

### Só o frontend (modo demo, sem backend)
```bash
cd frontend
npm install
npm run dev
```
Abre em `http://localhost:5173`. Funciona sozinho, sem nenhuma variável de ambiente.

### Frontend + backend completos
```bash
# backend (Postgres + Spring Boot via Docker)
cd backend
cp .env.example .env
docker compose up --build

# frontend, em outro terminal
cd frontend
cp .env.example .env   # VITE_API_URL=http://localhost:8080
npm install
npm run dev
```

---

## 5. Deploy em produção

### 5.1 Frontend na Vercel
1. Suba a pasta `frontend/` (ou o monorepo inteiro, apontando o **Root Directory** da Vercel para `frontend`) num repositório Git (GitHub/GitLab/Bitbucket).
2. Na Vercel: **New Project** → importe o repo → Root Directory = `frontend`.
3. Framework Preset: Vite (a Vercel detecta sozinha pelo `vite.config.js`).
4. Build Command: `npm run build` · Output Directory: `dist` (padrão, não precisa mexer).
5. Em **Settings → Environment Variables**, adicione `VITE_API_URL` apontando para o
   domínio/IP do backend (ex: `https://api.seudominio.com.br`).
6. Deploy. Pronto — funciona mesmo sem o passo 5 (roda em modo demo).

### 5.2 Backend numa VPS Hostinger (Docker)
1. Contrate uma VPS Hostinger (Ubuntu 22.04+ recomendado) e acesse via SSH.
2. Instale Docker e Docker Compose:
   ```bash
   curl -fsSL https://get.docker.com | sh
   sudo apt install docker-compose-plugin -y
   ```
3. Envie a pasta `backend/` para a VPS (`scp -r backend/ usuario@ip:/opt/sorria-backend`)
   ou clone o repositório Git direto na VPS.
4. Na VPS, dentro de `backend/`:
   ```bash
   cp .env.example .env
   nano .env   # troque JWT_SECRET, senha do banco, EVOLUTION_API_URL/KEY reais
   docker compose up -d --build
   ```
5. Libere a porta 8080 no firewall (`ufw allow 8080`) — ou, melhor, coloque um proxy
   reverso (Nginx/Caddy) na frente com HTTPS (Let's Encrypt) e aponte um subdomínio
   (`api.seudominio.com.br`) para a VPS, liberando só 80/443 publicamente.
6. Aponte o `VITE_API_URL` da Vercel para essa URL pública do backend.

### 5.3 PostgreSQL
Duas opções:
- **Mais simples**: deixe o `docker-compose.yml` do backend subir o Postgres junto (serviço `db`), como já vem configurado. Bom para começar.
- **Mais robusto**: use um Postgres gerenciado (ex: banco separado na própria Hostinger,
  Neon, Supabase, Railway) e aponte `DB_HOST`/`DB_PORT`/`DB_NAME`/`DB_USER`/`DB_PASSWORD`
  no `.env` do backend para ele — nesse caso, remova o serviço `db` do `docker-compose.yml`
  pra não rodar um Postgres duplicado na VPS.

Em qualquer um dos casos, o Hibernate (`ddl-auto: update`) cria as tabelas sozinho no
primeiro boot — não precisa rodar migration manual para este escopo.

### 5.4 Evolution API (WhatsApp)
O backend já tem o cliente pronto em `whatsapp/EvolutionApiClient.java`. Se as variáveis
`EVOLUTION_API_URL` / `EVOLUTION_INSTANCE` / `EVOLUTION_API_KEY` não estiverem preenchidas,
o disparo funciona em **modo simulado** (sorteia status Entregue/Falhou como no protótipo) —
útil para testar o fluxo sem uma instância real. Para usar de verdade, suba sua própria
instância da [Evolution API](https://github.com/EvolutionAPI/evolution-api) (ela também
roda em Docker, pode ficar na mesma VPS) e preencha as três variáveis no `.env`.

### 5.5 Roteiro 100% gratuito para validação (GitHub + Supabase + Render + Fly.io)

> Quer o passo a passo bem detalhado, clique a clique, desde criar a conta em cada
> ferramenta até qual pasta/arquivo apontar em cada uma? Veja **[TUTORIAL_DEPLOY.md](./TUTORIAL_DEPLOY.md)**.

Pra só **validar** o SaaS sem gastar nada, a combinação que encaixa com o que já está
pronto neste repo é: **GitHub** (código) + **Supabase** (Postgres gerenciado, plano free)
+ **Render** (roda o backend Spring Boot via Docker, plano free) + **Fly.io** (roda a
Evolution API GO, plano free) + **Vercel** (frontend). Nenhum passo pede cartão além do
cadastro padrão de cada plataforma.

> Vercel **não roda Spring Boot** (é uma plataforma de frontend/serverless Node,
> Python, Go, etc., não de containers Java de longa duração) — por isso o backend
> precisa de um segundo serviço. Render é o mais simples pra isso e tem plano free.

**Passo 1 — GitHub**
1. Crie um repositório novo e suba a pasta `sorria-crm/` inteira (`frontend/` e
   `backend/` no mesmo repo — monorepo funciona, cada plataforma abaixo deixa você
   escolher o "Root Directory").
   ```bash
   cd sorria-crm
   git init
   git add .
   git commit -m "Sorr.ia CRM: frontend + backend"
   git branch -M main
   git remote add origin https://github.com/SEU_USUARIO/sorria-crm.git
   git push -u origin main
   ```

**Passo 2 — Supabase (banco Postgres gratuito)**
1. Crie um projeto em [supabase.com](https://supabase.com) (plano Free: 500MB, pausa
   automaticamente após ~1 semana sem uso — só reative no painel quando for validar de novo).
2. Em **Project Settings → Database**, copie os dados da **Connection string** no modo
   "Direct connection" (porta `5432`, não use o pooler `6543` — o Hibernate com
   `ddl-auto: update` funciona melhor na conexão direta).
3. Anote: host (`db.xxxxxxxx.supabase.co`), porta `5432`, database `postgres`, usuário
   `postgres`, senha (a que você definiu ao criar o projeto).
4. Esses valores vão virar `DB_HOST`, `DB_PORT`, `DB_NAME`, `DB_USER`, `DB_PASSWORD` no
   passo 3. Defina também `DB_SSLMODE=require` (o Supabase exige SSL) — já preparei essa
   variável no `application.yml` e no `.env.example` do backend.

**Passo 3 — Render (backend Spring Boot, plano free)**
1. Em [render.com](https://render.com), **New → Web Service** → conecte o repositório do GitHub.
2. Root Directory: `backend`. Runtime: **Docker** (ele usa o `Dockerfile` que já existe).
3. Instance Type: **Free**.
4. Em **Environment**, adicione as variáveis (valores do Supabase + os seus):
   ```
   DB_HOST=db.xxxxxxxx.supabase.co
   DB_PORT=5432
   DB_NAME=postgres
   DB_USER=postgres
   DB_PASSWORD=<senha do Supabase>
   DB_SSLMODE=require
   JWT_SECRET=<gere uma string aleatória longa>
   CORS_ALLOWED_ORIGIN=https://seu-projeto.vercel.app   (ajuste depois do passo 5)
   EVOLUTION_API_URL=<preenchido no passo 4>
   EVOLUTION_INSTANCE=<preenchido no passo 4>
   EVOLUTION_API_KEY=<preenchido no passo 4>
   ```
5. Deploy. Anote a URL pública que o Render gera (ex: `https://sorria-backend.onrender.com`).
   ⚠️ No plano free o serviço "dorme" após ~15 min sem requisições e demora uns 30-50s
   pra acordar na próxima chamada — normal para validação, não use assim em produção real.

**Passo 4 — Evolution API GO (WhatsApp, plano free no Fly.io)**
A Evolution API precisa ficar **sempre no ar** (ela mantém a sessão do WhatsApp
conectada) — por isso não é uma boa ideia colocá-la no Render free (que dorme e
derruba a sessão). O [Fly.io](https://fly.io) tem uma cota free que permite manter
uma VM pequena sempre ligada, o que serve bem aqui:
1. Instale o `flyctl` e rode `fly auth login`.
2. Clone o repositório da Evolution API GO (versão leve, em Go) e rode `fly launch`
   dentro da pasta — ele detecta o Dockerfile do projeto e gera o `fly.toml`.
3. Crie um volume pra persistir a sessão do WhatsApp entre deploys/restarts:
   `fly volumes create evolution_data --size 1`, e referencie esse volume no `fly.toml`.
4. `fly deploy`. Anote a URL pública (`https://sua-evolution.fly.dev`).
5. Acesse o painel/manager da Evolution API GO, crie uma instância, escaneie o QR Code
   com o WhatsApp que vai disparar as mensagens, e copie: URL base, nome da instância e
   a API key gerada.
6. Volte no Render (passo 3) e preencha `EVOLUTION_API_URL`, `EVOLUTION_INSTANCE`,
   `EVOLUTION_API_KEY` com esses três valores, e refaça o deploy do backend.

**Passo 5 — Vercel (frontend)**
1. Em [vercel.com](https://vercel.com), **Add New → Project** → importe o mesmo
   repositório do GitHub.
2. Root Directory: `frontend`. Framework: Vite (detectado automaticamente).
3. Em **Environment Variables**, adicione `VITE_API_URL` = a URL do Render (passo 3),
   ex: `https://sorria-backend.onrender.com`.
4. Deploy. Pegue a URL final (`https://seu-projeto.vercel.app`).
5. Volte no Render e atualize `CORS_ALLOWED_ORIGIN` com essa URL exata do Vercel, e
   redeploy o backend — sem isso o navegador bloqueia as chamadas por CORS.

**Resumo do fluxo de dados:** Vercel (React) → Render (Spring Boot, lê/grava no
Supabase) → Fly.io (Evolution API GO, envia o WhatsApp de verdade). Tudo em planos
free, suficiente pra validar o produto de ponta a ponta antes de decidir investir em
infra paga (aí sim faz sentido migrar pra VPS Hostinger como na seção 5.2, que aguenta
mais uso e não "dorme").

---

## 6. Limitações conhecidas / próximos passos

- `/api/contacts/import` (upload de planilha direto pro backend) tem o stub pronto no
  frontend (`api/contacts.js`) mas **não foi implementado no backend** — hoje a
  importação continua 100% client-side (`utils/patients.js`), o que já é suficiente e
  mais rápido para o tamanho de planilha do protótipo.
- O backend não restringe endpoints por papel (`ADMIN`/`COMERCIAL`/`RECEPCAO`) ainda —
  todo usuário autenticado tem acesso igual. Dá pra adicionar `@PreAuthorize` nos
  controllers quando o frontend precisar diferenciar permissões.
- Senha de colaborador no modo demo do frontend (`pages/Colaboradores.jsx`) fica em
  texto puro em memória — isso é só decorativo no protótipo; a entidade real de usuário
  (`user/Usuario.java`) já usa BCrypt no backend.
- O bundle do frontend ficou ~640kB (aviso do Vite sobre chunk size). Não impede o
  deploy, mas se quiser otimizar depois: `React.lazy()` nas páginas mais pesadas
  (Disparo, Segmentacoes) ou `build.rollupOptions.output.manualChunks` no `vite.config.js`.
