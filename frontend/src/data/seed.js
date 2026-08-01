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
  segmento: { label: "Segmento", ops: ["é", "não é"], values: ["VIP", "Fidelizado", "Regular", "Risco", "Inativo"] },
  financ: { label: "Financeiro", ops: ["é", "não é"], values: ["Adimplente", "Inadimplente"] },
  recencia: { label: "Recência (dias)", ops: ["maior", "menor"], value: "number" },
  elegivel: { label: "Elegível", ops: ["é", "não é"], values: ["Sim", "Não"] },
  tag: { label: "Tag", ops: ["contém"], values: [] },
};

export const OP_LABEL = { "é": "é", "não é": "não é", maior: "maior que", menor: "menor que", contém: "contém" };

export const SEG_SEED = [
  { id: 1, nome: "Reativação +120D", match: "E", conditions: [{ field: "recencia", op: "maior", value: 120 }, { field: "elegivel", op: "é", value: "Sim" }] },
  { id: 2, nome: "Inadimplentes", match: "OU", conditions: [{ field: "tag", op: "contém", value: "Inadimplente" }] },
];

export const PERIODOS = {
  "01/07/2026 até 01/08/2026": { contatos: 3912, mkt: 41300, util: 33870, auth: 0, cotaUtil: 25130 },
  "01/06/2026 até 01/07/2026": { contatos: 3480, mkt: 38900, util: 29500, auth: 0, cotaUtil: 25130 },
  "01/05/2026 até 01/06/2026": { contatos: 3110, mkt: 33100, util: 24800, auth: 0, cotaUtil: 25130 },
};

export const PRECOS = { mensalidade: 12480, excedenteContato: 0.258, mkt: 0.341, util: 0.270, auth: 0.190, volumetria: 60000, desconto: 68 };
