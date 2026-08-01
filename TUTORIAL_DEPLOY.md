# Tutorial passo a passo — subir o Sorr.ia de graça pra validar

Este tutorial parte do zero: da conta em cada ferramenta até o arquivo/pasta exata que
você vai apontar em cada uma. A pasta do projeto no seu computador é:

```
C:\Users\Marketing\Documents\02_Projetos\CRM\sorria-crm
  ├── frontend\   ← vai para a Vercel
  └── backend\    ← vai para o Render
```

Ordem recomendada (cada etapa usa informação da anterior): **GitHub → Supabase → Fly.io
(WhatsApp) → Render (backend) → Vercel (frontend) → ajuste final de CORS**.

Tempo estimado: 45–60 min na primeira vez.

---

## 0. Antes de começar

Você vai precisar ter o **Git** instalado no seu Windows. Pra checar, abra o terminal
(PowerShell) e digite:
```powershell
git --version
```
Se aparecer um número de versão, já tem. Se der erro "não é reconhecido", baixe em
https://git-scm.com/download/win, instale com as opções padrão (Next, Next, Next) e
abra um terminal novo depois.

---

## 1. GitHub — guardar o código

### 1.1 Criar a conta
1. Acesse **https://github.com** → botão **Sign up** (canto superior direito).
2. Preencha email, senha, nome de usuário → siga o passo a passo (confirma email).

### 1.2 Criar o repositório vazio
1. Já logado, clique no **+** no canto superior direito → **New repository**.
2. **Repository name**: `sorria-crm`.
3. Deixe **Public** ou **Private** (tanto faz para validação; Private se quiser manter fechado).
4. **Não marque** nenhuma caixinha de "Add a README", "Add .gitignore" ou "Choose a license" — o projeto já tem esses arquivos, marcar isso aqui só ia dar conflito.
5. Clique **Create repository**.
6. Na página que abre, copie a URL que aparece em "…or push an existing repository from the command line", algo como:
   `https://github.com/SEU_USUARIO/sorria-crm.git`

### 1.3 Subir os arquivos da pasta do projeto
Abra o PowerShell **na pasta do projeto** e rode, um comando de cada vez (troque a URL do passo 1.2):
```powershell
cd "C:\Users\Marketing\Documents\02_Projetos\CRM\sorria-crm"
git init
git add .
git commit -m "Sorr.ia CRM: frontend + backend"
git branch -M main
git remote add origin https://github.com/SEU_USUARIO/sorria-crm.git
git push -u origin main
```
Na hora do `git push`, pode abrir uma janela pedindo pra logar no GitHub pelo navegador —
é normal, só autorize. Ao terminar, atualize a página do repositório no GitHub: você
deve ver as pastas `frontend` e `backend` lá.

> Isso é feito **uma vez só**. Se editar o código depois, o ciclo pra atualizar é sempre:
> `git add .` → `git commit -m "mensagem"` → `git push`.

---

## 2. Supabase — banco de dados PostgreSQL grátis

### 2.1 Criar a conta e o projeto
1. Acesse **https://supabase.com** → **Start your project** → entre com GitHub (mais rápido) ou email.
2. Clique **New project**.
3. Escolha uma organização (ele cria uma padrão com seu nome se for a primeira vez).
4. **Name**: `sorria-crm`. **Database Password**: crie uma senha forte e **anote em algum lugar** (vai precisar dela). **Region**: escolha `South America (São Paulo)` se disponível (menor latência pro Brasil).
5. Clique **Create new project** e espere uns 1-2 minutos ele provisionar.

### 2.2 Pegar as credenciais de conexão
1. Com o projeto aberto, vá no menu lateral esquerdo → ícone de engrenagem **Project Settings** → **Database**.
2. Role até **Connection string** → aba **URI** → mas em vez de copiar a URI inteira, você vai usar os campos separados que aparecem logo acima ("Connection parameters" ou similar):
   - **Host**: algo como `db.xxxxxxxxxxxx.supabase.co`
   - **Port**: `5432` (use esse, **não** o `6543` do pooler)
   - **Database name**: `postgres`
   - **User**: `postgres`
   - **Password**: a senha que você criou no passo 2.1
3. Anote esses 5 valores num bloco de notas — você vai colar no Render daqui a pouco.

---

## 3. Fly.io — hospedar a Evolution API GO (envio de WhatsApp)

A Evolution API GO precisa ficar sempre ligada (ela mantém a sessão do WhatsApp
conectada), por isso ela fica separada do backend, num serviço que não "dorme".

### 3.1 Criar a conta
1. Acesse **https://fly.io** → **Sign Up** → pode entrar com GitHub.
2. Ele vai pedir pra confirmar um cartão só pra verificação de identidade (não cobra nada
   dentro da cota free) — se preferir pular isso por enquanto, dá pra voltar a este passo
   depois; sem cartão alguns recursos free ficam limitados.

### 3.2 Instalar o flyctl (linha de comando do Fly.io)
No PowerShell:
```powershell
iwr https://fly.io/install.ps1 -useb | iex
```
Feche e abra o terminal de novo, depois confirme:
```powershell
fly version
```
Faça login:
```powershell
fly auth login
```
(abre o navegador pra confirmar).

### 3.3 Baixar e configurar o projeto Evolution GO
1. Escolha uma pasta separada do `sorria-crm` pra isso (ex: `C:\Users\Marketing\Documents\02_Projetos\CRM\evolution-go`):
   ```powershell
   cd "C:\Users\Marketing\Documents\02_Projetos\CRM"
   git clone https://github.com/evolution-foundation/evolution-go.git
   cd evolution-go
   ```
2. Copie o arquivo de exemplo de variáveis e ajuste:
   ```powershell
   copy .env.example .env
   ```
   Abra `.env` num editor e preencha pelo menos:
   - `GLOBAL_API_KEY` → invente uma chave forte (ex: uma senha aleatória longa) — essa é a chave que o backend vai usar pra falar com a Evolution GO.
   - `CLIENT_NAME` → pode deixar `sorria` ou o que preferir.
   - As variáveis de banco (se pedir), pode usar as mesmas credenciais do Supabase (passo 2.2) ou deixar como o projeto sugerir para SQLite/local, conforme a documentação oficial em https://docs.evolutionfoundation.com.br/en/evolution-go/installation — os nomes exatos das variáveis podem mudar entre versões, então essa página oficial é a fonte de verdade.
3. Rode `fly launch` dentro da pasta:
   ```powershell
   fly launch
   ```
   Ele vai perguntar o nome do app (ex: `sorria-evolution`), a região (escolha `gru` = São Paulo se disponível), e se quer criar um Postgres do Fly (pode dizer **não** se for usar o Supabase). Ao final ele gera um arquivo `fly.toml` na pasta.
4. Crie um volume pra guardar a sessão do WhatsApp (senão você teria que escanear o QR Code de novo a cada deploy):
   ```powershell
   fly volumes create evolution_data --size 1 --region gru
   ```
   Depois abra o `fly.toml` gerado e adicione (se ainda não tiver) uma seção apontando esse volume para a pasta de dados da aplicação — a documentação oficial do projeto mostra o caminho exato de mount esperado.
5. Suba de verdade:
   ```powershell
   fly deploy
   ```
6. Ao terminar, sua Evolution GO está em `https://sorria-evolution.fly.dev` (ou o nome que você escolheu).

### 3.4 Conectar o número de WhatsApp
1. Siga a documentação oficial (https://docs.evolutionfoundation.com.br) pra criar uma
   instância via `POST /instance/create` (usando o `GLOBAL_API_KEY` do passo 3.3 no header
   `apikey`) — pode usar o **Postman**, **Insomnia** ou até o `curl` no PowerShell.
2. O retorno/endpoint de QR Code vai te dar uma imagem — abra ela e escaneie com o
   WhatsApp do celular que vai disparar as mensagens (Configurações → Aparelhos conectados
   → Conectar um aparelho).
3. Depois de conectado, anote os 3 valores que o backend vai precisar:
   - **EVOLUTION_API_URL** = `https://sorria-evolution.fly.dev`
   - **EVOLUTION_INSTANCE** = o nome que você deu à instância
   - **EVOLUTION_API_KEY** = o `GLOBAL_API_KEY` que você definiu no `.env`

---

## 4. Render — hospedar o backend (Spring Boot)

### 4.1 Criar a conta
1. Acesse **https://render.com** → **Get Started** → entre com GitHub (facilita o próximo passo, pois ele já lista seus repositórios).

### 4.2 Criar o Web Service
1. No painel, clique **New +** → **Web Service**.
2. Em **Source Code**, conecte sua conta do GitHub se pedir, e escolha o repositório **`sorria-crm`** (o mesmo do passo 1).
3. Preencha:
   - **Name**: `sorria-backend`
   - **Root Directory**: `backend`   ← **este campo é o que aponta pro arquivo `Dockerfile` dentro de `C:\...\sorria-crm\backend\Dockerfile`**
   - **Region**: mais perto do Brasil disponível.
   - **Instance Type**: **Free**.
   - **Runtime/Environment**: deve detectar **Docker** automaticamente (por causa do `Dockerfile` na pasta `backend`). Se pedir pra escolher manualmente, selecione Docker.
4. Role até **Environment Variables** e clique **Add Environment Variable** pra cada uma
   (os nomes têm que ser exatamente estes, batendo com o `backend/.env.example`):

   | Key | Value |
   |---|---|
   | `DB_HOST` | o host do Supabase (passo 2.2) |
   | `DB_PORT` | `5432` |
   | `DB_NAME` | `postgres` |
   | `DB_USER` | `postgres` |
   | `DB_PASSWORD` | a senha do Supabase (passo 2.1) |
   | `DB_SSLMODE` | `require` |
   | `JWT_SECRET` | uma frase longa e aleatória (ex: gere em https://www.uuidgenerator.net/ e junte duas) |
   | `JWT_EXPIRATION_MS` | `86400000` |
   | `CORS_ALLOWED_ORIGIN` | `http://localhost:5173` (por enquanto — ajustamos no passo 6) |
   | `EVOLUTION_API_URL` | a URL do Fly.io (passo 3.4) |
   | `EVOLUTION_INSTANCE` | o nome da instância (passo 3.4) |
   | `EVOLUTION_API_KEY` | a chave (passo 3.4) |

5. Clique **Create Web Service**. Ele vai buildar a imagem Docker (usando
   `backend/Dockerfile`) — a primeira vez demora uns 3-5 minutos. Acompanhe em **Logs**.
6. Quando aparecer "Live" no topo, copie a URL pública, algo como
   `https://sorria-backend.onrender.com`.

> ⚠️ No plano free, se o serviço ficar ~15 min sem receber requisição, ele "dorme" e a
> próxima chamada demora uns 30-50s pra responder (ele "acorda"). Normal pra validação.

---

## 5. Vercel — hospedar o frontend

### 5.1 Criar a conta
1. Acesse **https://vercel.com** → **Sign Up** → entre com GitHub.

### 5.2 Importar o projeto
1. No painel, **Add New...** → **Project**.
2. Na lista de repositórios do GitHub, encontre **`sorria-crm`** → **Import**.
3. Em **Configure Project**:
   - **Root Directory**: clique **Edit** ao lado e escolha `frontend`   ← **aponta pra pasta `C:\...\sorria-crm\frontend`, onde estão o `package.json` e o `vite.config.js`**
   - **Framework Preset**: deve detectar **Vite** sozinho.
   - Build Command e Output Directory pode deixar como veio (`npm run build` / `dist`).
4. Abra **Environment Variables** (ainda nessa mesma tela de configuração) e adicione:
   - Key: `VITE_API_URL` → Value: a URL do Render do passo 4.2 (ex: `https://sorria-backend.onrender.com`)
5. Clique **Deploy**. Espera 1-2 minutos.
6. Ao terminar, clique **Visit** — copie a URL final, algo como `https://sorria-crm.vercel.app`.

---

## 6. Fechar o ciclo: liberar o CORS no Render

Sem este passo, o navegador bloqueia o frontend de falar com o backend (erro de CORS
no console).

1. Volte no **Render** → seu serviço `sorria-backend` → aba **Environment**.
2. Edite a variável `CORS_ALLOWED_ORIGIN` e coloque a URL exata da Vercel do passo 5.2
   (ex: `https://sorria-crm.vercel.app`, **sem barra `/` no final**).
3. Salve — o Render redeploya sozinho automaticamente.

---

## 7. Checklist final (teste tudo)

- [ ] Abra a URL da Vercel → deve carregar a tela de login do Sorr.ia.
- [ ] Ainda sem tocar em nada do backend, o app já funciona em modo demo (import de planilha, etc.) mesmo se o Render/Supabase falharem — é o "modo local" do frontend.
- [ ] Para testar o backend de verdade, é preciso ligar as chamadas de API nas páginas (hoje elas usam dados locais — ver os comentários `TODO(backend)` no código, conforme explicado no `README.md` seção 2).
- [ ] `https://sorria-backend.onrender.com/actuator/health` deve responder `{"status":"UP"}` (confirma que o backend e a conexão com o Supabase estão ok).
- [ ] Envie uma mensagem de teste pela Evolution GO (via Postman/Insomnia, chamando o endpoint de envio com a `EVOLUTION_API_KEY`) pra confirmar que o WhatsApp está realmente conectado.

Se algum passo falhar, o lugar mais rápido pra descobrir o motivo é a aba **Logs** de
cada plataforma (Render tem "Logs" no menu do serviço; Fly.io usa `fly logs` no
terminal; Vercel tem "Deployments → clique no deploy → View Function Logs").
