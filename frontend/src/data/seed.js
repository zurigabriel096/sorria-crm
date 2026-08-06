// Dados de exemplo/seed usados apenas para o modo demo (sem backend).
// Quando o backend estiver no ar, troque os useState() que partem destes seeds em App.jsx
// por chamadas às funções de src/api/*.js (ver README "Contrato de API").

export const COLAB_SEED = [
  { id: 1, nome: "Rithieli Fatima Silva Gabriel", cpf: "", funcao: "Comercial", email: "rithieli@orthodonticsjc.com.br" },
  { id: 2, nome: "Guilherme Costa de Moura Mendes", cpf: "", funcao: "Recepção", email: "guilherme@orthodonticsjc.com.br" },
  { id: 3, nome: "Luiza Cristine Antonio", cpf: "", funcao: "Recepção", email: "luiza@orthodonticsjc.com.br" },
  { id: 4, nome: "Sarah Luiza Ferreira Serpa", cpf: "", funcao: "Comercial", email: "sarah@orthodonticsjc.com.br" },
  { id: 5, nome: "Giovanna Lopes Silva Cunha Ribeiro", cpf: "", funcao: "Recepção", email: "giovanna@orthodonticsjc.com.br" },
];

export const TEMPLATES_SEED = [
  { id: "t1", nome: "anti_no_show", categoria: "Utilidade", campanha: "Anti no-show", corpo: "Oi {nome}! Sua consulta na Orthodontic é dia {data}. Chegue 10 min antes pra agilizar. Posso confirmar sua presença?", botoes: [{ texto: "Confirmar", link: "" }, { texto: "Remarcar", link: "" }], imagem: "", ativo: true },
  { id: "t2", nome: "reativacao_bimestral", categoria: "Marketing", campanha: "Reativação", corpo: "Oi {nome}! Faz um tempo desde sua última visita. Este mês temos condição especial pro seu retorno. Quer agendar?", botoes: [{ texto: "Quero agendar", link: "" }], imagem: "", ativo: true },
  { id: "t3", nome: "confirmacao_horario", categoria: "Utilidade", campanha: "Relacionamento", corpo: "Oi {nome}, confirmando seu horário dia {data} às {hora}. Responda SIM pra confirmar ou 2 pra remarcar.", botoes: [], imagem: "", ativo: true },
  { id: "t4", nome: "cobranca_amigavel", categoria: "Utilidade", campanha: "Cobrança", corpo: "Oi {nome}, notamos uma pendência em aberto. Quer regularizar com condição especial? Estamos aqui pra ajudar.", botoes: [{ texto: "Negociar", link: "" }], imagem: "", ativo: true },
  { id: "t5", nome: "pos_consulta", categoria: "Utilidade", campanha: "Relacionamento", corpo: "Oi {nome}! Como você está após seu atendimento? Qualquer dúvida, é só chamar por aqui.", botoes: [], imagem: "", ativo: true },
];

export const OBJETIVOS_BASE = ["Reativação", "Anti no-show", "Cobrança", "Upsell", "Relacionamento", "Aquisição"];

// Ops que nao precisam de valor nenhum (so checam se o campo tem algo
// preenchido ou nao) - so fazem sentido pra campo que pode genuinamente estar
// vazio. Fora dos campos de texto (tag/custom TEXTO), que ja tem "contém"/"não
// contém" cobrindo esse caso (contém "" seria redundante) - por isso esses
// dois nunca ganham "está preenchido" aqui.
export const OPS_SEM_VALOR = ["está preenchido", "não está preenchido"];

// Campos nativos do Contato (nao Campo Personalizado) disponiveis pra
// segmentar - antes so 5 existiam aqui (financ/diasInadimplente/recencia/
// elegivel/tag), o resto do cadastro (nome, telefone, estagio, datas de
// mensagem/follow-up etc.) nao dava pra usar em Segmentacao nenhuma, mesmo
// sendo dado real do lead (pedido do Samuel, 05/08/2026 - "todo campo que
// existe de registro do lead", nao so os Personalizados). Ficam de fora de
// proposito (documentado, nao esquecido): "id" (uso interno, ja tem selecao
// dedicada em "Selecionar numero pra disparo"), "ordemKanban" (so ordem de
// arrastar no Kanban, nao e' criterio de negocio), "enviado" (status legado
// de disparo de Campanha, superado pelas tags "Automação: respondeu"/"sem
// resposta"), "responsavelId" (precisaria de um seletor de colaboradores a
// parte - dá pra adicionar depois se fizer falta).
export const FIELD_META = {
  financ: { label: "Financeiro", ops: ["é", "não é", ...OPS_SEM_VALOR], values: ["Adimplente", "Inadimplente"] },
  diasInadimplente: { label: "Inadimplente há (dias)", ops: ["maior", "menor", "entre", ...OPS_SEM_VALOR], value: "number" },
  inadimplenteDesde: { label: "Ficou inadimplente em", ops: ["maior", "menor", "entre", ...OPS_SEM_VALOR], value: "date" },
  recencia: { label: "Tempo sem atendimento (dias)", ops: ["maior", "menor", "entre", ...OPS_SEM_VALOR], value: "number" },
  elegivel: { label: "Elegível", ops: ["é", "não é"], values: ["Sim", "Não"] },
  tag: { label: "Tag", ops: ["contém", "não contém"], value: "text" },
  nome: { label: "Nome", ops: ["contém", "não contém", ...OPS_SEM_VALOR], value: "text" },
  telefone: { label: "Telefone", ops: ["contém", "não contém", ...OPS_SEM_VALOR], value: "text" },
  email: { label: "Email", ops: ["contém", "não contém", ...OPS_SEM_VALOR], value: "text" },
  cod: { label: "Código", ops: ["contém", "não contém", ...OPS_SEM_VALOR], value: "text" },
  dentista: { label: "Dentista", ops: ["contém", "não contém", ...OPS_SEM_VALOR], value: "text" },
  origem: { label: "Origem do lead", ops: ["contém", "não contém", ...OPS_SEM_VALOR], value: "text" },
  // Nomes de estagio sao livres (colunas do Kanban, mudam por clinica) - sem
  // um catalogo fixo aqui, "contém"/"não contém" tolera pequenas diferenças
  // de digitacao melhor que exigir bater exato.
  estagio: { label: "Estágio", ops: ["é", "não é", "contém", "não contém", ...OPS_SEM_VALOR], value: "text" },
  ultimaMensagemTexto: { label: "Texto da última mensagem", ops: ["contém", "não contém", ...OPS_SEM_VALOR], value: "text" },
  ultimaMensagemDirecao: { label: "Direção da última mensagem", ops: ["é", "não é", ...OPS_SEM_VALOR], values: ["ENTRADA", "SAIDA"] },
  ultimaMensagemEm: { label: "Última mensagem em", ops: ["maior", "menor", "entre", ...OPS_SEM_VALOR], value: "date" },
  // "faltam" faz sentido aqui (e' uma data futura de verdade, diferente de
  // ultimaMensagemEm/inadimplenteDesde que sao sempre passado) - mesmo
  // conceito dos filtros "Hoje/Amanhã/Esta semana" da Fila de Trabalho.
  proximaAcaoEm: { label: "Próxima ação (follow-up) em", ops: ["maior", "menor", "entre", "faltam", ...OPS_SEM_VALOR], value: "date" },
  criadoEm: { label: "Cadastrado em", ops: ["maior", "menor", "entre", ...OPS_SEM_VALOR], value: "date" },
};

export const OP_LABEL = {
  "é": "é", "não é": "não é", maior: "maior que", menor: "menor que", entre: "entre",
  contém: "contém", "não contém": "não contém",
  "está preenchido": "está preenchido", "não está preenchido": "não está preenchido",
  faltam: "faltam exatamente (dias, a partir de hoje)",
};

// Estende FIELD_META com um campo por CampoCustomizado ativo, pra virar
// condição de verdade no construtor de Segmentações. Chave carrega o tipo
// (custom:TIPO:nome) pra evalCond saber comparar sem precisar de outra
// consulta - ver utils/patients.js.
export function montarFieldMeta(camposCustomizados) {
  const meta = { ...FIELD_META };
  (camposCustomizados || []).forEach((campo) => {
    const chave = `custom:${campo.tipo}:${campo.nome}`;
    if (campo.tipo === "NUMERO" || campo.tipo === "MOEDA") meta[chave] = { label: campo.nome, ops: ["maior", "menor", "entre", ...OPS_SEM_VALOR], value: "number" };
    // "faltam" e' dinamico (compara com hoje+N dias, nao com uma data fixa) -
    // por isso o input de valor dele e' numero mesmo o campo sendo DATA (ver
    // tratamento especial em Segmentacoes.jsx e evalCondCustomizado).
    else if (campo.tipo === "DATA") meta[chave] = { label: campo.nome, ops: ["maior", "menor", "entre", "faltam", ...OPS_SEM_VALOR], value: "date" };
    else if (campo.tipo === "LISTA") meta[chave] = { label: campo.nome, ops: ["é", "não é", ...OPS_SEM_VALOR], values: campo.opcoes || [] };
    // TEXTO ganhou "está preenchido"/"não está preenchido" (05/08/2026) - o
    // backend (SegmentacaoMatcher.avaliarCondicaoCustomizada) sempre aceitou
    // esses dois ops pra qualquer tipo customizado, mas o dropdown daqui nunca
    // oferecia - divergencia entre o que a UI deixava montar e o que o motor
    // sabia processar.
    else meta[chave] = { label: campo.nome, ops: ["contém", "não contém", ...OPS_SEM_VALOR], value: "text" };
  });
  return meta;
}

// groups: lista de grupos "E" combinados entre si por "OU".
// Ex.: [[A,B],[C]] = (A E B) OU (C)
export const SEG_SEED = [
  { id: 1, nome: "Reativação +120D", groups: [[{ field: "recencia", op: "maior", value: 120 }, { field: "elegivel", op: "é", value: "Sim" }]] },
  { id: 2, nome: "Inadimplentes", groups: [[{ field: "tag", op: "contém", value: "Inadimplente" }]] },
];

// Fatura da tela "Meu Plano" e' ilustrativa (Sorr.ia nao fatura o Samuel de
// verdade por isso) - mas o CONSUMO mostrado em cima dela (leads, disparos
// por categoria) vem de dado real, nao mockado (ver Plano.jsx). Precos e
// volumetria calibrados pra parecer um plano profissional de mercado
// (~R$300-500/mes) - ver pesquisa citada na sessao de 03/08/2026.
export const PRECOS = {
  mensalidade: 347,
  msgEmail: 0.001, // "em breve" - preco unitario ainda nao usado de verdade
  msgMarketing: 0.24,
  msgUtilidade: 0.15,
  msgAutenticacao: 0.08, // "Autenticação" ainda nao e' funcional - ver Templates.jsx
  volumetriaIncluida: 5000,
};

export function precoPorCategoria(categoria) {
  if (categoria === "Marketing") return PRECOS.msgMarketing;
  if (categoria === "Autenticação") return PRECOS.msgAutenticacao;
  return PRECOS.msgUtilidade;
}
