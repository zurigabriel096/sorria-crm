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

export const FIELD_META = {
  financ: { label: "Financeiro", ops: ["é", "não é"], values: ["Adimplente", "Inadimplente"] },
  recencia: { label: "Recência (dias)", ops: ["maior", "menor"], value: "number" },
  elegivel: { label: "Elegível", ops: ["é", "não é"], values: ["Sim", "Não"] },
  tag: { label: "Tag", ops: ["contém", "não contém"], values: [] },
};

export const OP_LABEL = {
  "é": "é", "não é": "não é", maior: "maior que", menor: "menor que",
  contém: "contém", "não contém": "não contém",
};

// Estende FIELD_META com um campo por CampoCustomizado ativo, pra virar
// condição de verdade no construtor de Segmentações. Chave carrega o tipo
// (custom:TIPO:nome) pra evalCond saber comparar sem precisar de outra
// consulta - ver utils/patients.js.
export function montarFieldMeta(camposCustomizados) {
  const meta = { ...FIELD_META };
  (camposCustomizados || []).forEach((campo) => {
    const chave = `custom:${campo.tipo}:${campo.nome}`;
    if (campo.tipo === "NUMERO") meta[chave] = { label: campo.nome, ops: ["maior", "menor"], value: "number" };
    else if (campo.tipo === "DATA") meta[chave] = { label: campo.nome, ops: ["maior", "menor"], value: "date" };
    else if (campo.tipo === "LISTA") meta[chave] = { label: campo.nome, ops: ["é", "não é"], values: campo.opcoes || [] };
    else meta[chave] = { label: campo.nome, ops: ["contém", "não contém"], value: "text" };
  });
  return meta;
}

// groups: lista de grupos "E" combinados entre si por "OU".
// Ex.: [[A,B],[C]] = (A E B) OU (C)
export const SEG_SEED = [
  { id: 1, nome: "Reativação +120D", groups: [[{ field: "recencia", op: "maior", value: 120 }, { field: "elegivel", op: "é", value: "Sim" }]] },
  { id: 2, nome: "Inadimplentes", groups: [[{ field: "tag", op: "contém", value: "Inadimplente" }]] },
];

export const PERIODOS = {
  "01/07/2026 até 01/08/2026": { contatos: 392, mkt: 210, util: 340 },
  "01/06/2026 até 01/07/2026": { contatos: 348, mkt: 180, util: 295 },
  "01/05/2026 até 01/06/2026": { contatos: 311, mkt: 150, util: 248 },
};

export const PRECOS = { mensalidade: 599, msgWhats: 0.31, msgEmail: 0.001 };
