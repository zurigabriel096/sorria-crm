# Backup / estado conhecido — Evolution Go (antes do teste de pairing code)

Data do registro: 2026-08-01, por volta das 15h.
Motivo: registrar o estado atual ANTES de rotacionar `GLOBAL_API_KEY` e rodar
"Deploy Secrets" na Fly.io, pra ter uma referencia de comparacao/reversao caso
algo saia diferente do esperado.

## 1. Onde fica cada coisa

- App na Fly.io: `sorria-evolution` (organizacao "Personal")
- Hostname publico: `https://sorria-evolution.fly.dev`
- Regiao: GRU (Sao Paulo), 1 maquina, `shared-1x-cpu@1024MB`

## 2. Estado da instancia de WhatsApp ANTES de qualquer alteracao

Testado via `GET /instance/status` (somente leitura, sem efeito colateral):

```json
{"data":{"Connected":true,"LoggedIn":true,"Name":"Samuel Climaco"},"message":"success"}
```

=> Instancia real, conectada e logada como "Samuel Climaco". Este e o estado
"bom" pro qual precisamos voltar depois do teste.

## 3. Variaveis configuradas no Render (servico `sorria-backend`)

Estas NAO devem precisar mudar em nenhum momento deste teste:

- `EVOLUTION_API_URL` = https://sorria-evolution.fly.dev
- `EVOLUTION_INSTANCE` = SorriaCRM
- `EVOLUTION_API_KEY` = 0b70dd82-ac7e-4c13-b87a-a6b09f5d7000
  (token especifico da instancia SorriaCRM, usado pra ENVIAR mensagem —
  diferente do GLOBAL_API_KEY da Fly, que serve so pra gerenciar instancias)

## 4. Secrets configurados na Fly.io (app `sorria-evolution`)

Lista de NOMES presentes (valores nao sao visiveis — Fly.io e write-only,
nunca mostra o valor de um secret depois de criado, nem pro dono da conta):

- AMQP_GLOBAL_ENABLED
- CLIENT_NAME
- CONNECT_ON_STARTUP  (provavel nome da instancia que reconecta sozinha ao subir)
- DATABASE_SAVE_MESSAGES
- GLOBAL_API_KEY  <- este e o que vamos ROTACIONAR pro teste
- LOGTYPE
- MINIO_ENABLED
- OS_NAME
- POSTGRES_AUTH_DB
- POSTGRES_USERS_DB
- SERVER_PORT
- WADEBUG
- WEBHOOK_FILES

IMPORTANTE: o valor atual do `GLOBAL_API_KEY` ja era desconhecido antes deste
backup (nunca foi possivel ler de volta, por design da Fly.io). Ou seja, nao
existe uma "copia" do valor antigo pra restaurar — so da pra ROTACIONAR pra um
valor novo, nunca reverter pro antigo. Isso e esperado e nao e culpa de
nenhuma acao feita aqui.

## 5. O que vamos alterar agora

1. Definir um valor NOVO para `GLOBAL_API_KEY` na Fly (Secrets > Edit).
2. Clicar em "Deploy Secrets" — isso reinicia o container/maquina da
   Evolution Go (necessario pra qualquer secret novo entrar em vigor).
3. Criar uma instancia de TESTE separada (`teste-pairing`), usando o novo
   GLOBAL_API_KEY, SEM tocar na instancia `SorriaCRM`.
4. Testar `POST /instance/pair` so na instancia de teste.
5. Apagar a instancia de teste depois (ou deixar, dependendo do resultado).

## 6. Como verificar se voltou tudo certo depois do restart

Rodar de novo (leitura, sem risco):

```
curl -s https://sorria-evolution.fly.dev/instance/status -H "apikey: 0b70dd82-ac7e-4c13-b87a-a6b09f5d7000"
```

Esperado: mesmo resultado da secao 2 acima
(`"Connected":true,"LoggedIn":true,"Name":"Samuel Climaco"`).

Se vier `Connected:false` ou `LoggedIn:false` depois do restart, aguardar
1-2 minutos (Baileys costuma reconectar sozinho usando a sessao salva no
Postgres). Se nao reconectar sozinho, sera necessario entrar em
Configuracoes > Integracao WhatsApp e reconectar (escanear QR novamente) —
isso e o pior cenario possivel deste teste, e e recuperavel.
