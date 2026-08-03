// Campos fixos do cadastro que tambem podem virar card personalizado no
// Painel Executivo, alem dos campos customizados que o usuario cria (ver
// CampoCustomizado) - prefixo "fixo:" no campoNome distingue dos nomes
// livres de campo customizado (ver PainelCardService.bate no backend).
// Compartilhado entre Dashboard.jsx (monta os cards) e Pacientes.jsx (clique
// num valor do card leva pra Base de Leads ja filtrada pro mesmo grupo).
export const CAMPOS_FIXOS = [
  { chave: "fixo:financ", rotulo: "Financeiro", opcoes: ["Adimplente", "Inadimplente", "—"] },
  { chave: "fixo:estagio", rotulo: "Estágio" },
  { chave: "fixo:elegivel", rotulo: "Elegível", opcoes: ["Sim", "Não"] },
  { chave: "fixo:dentista", rotulo: "Dentista" },
];

// Campo customizado usa o proprio nome como rotulo; campo fixo (prefixo
// "fixo:") traduz pro rotulo amigavel de CAMPOS_FIXOS.
export const rotuloCampo = (campoNome) => CAMPOS_FIXOS.find((c) => c.chave === campoNome)?.rotulo || campoNome;

// Mesma logica de PainelCardService.valorDoCampo (backend) - precisa bater
// exatamente pro clique num valor do card (Dashboard.jsx) filtrar em
// Pacientes.jsx o MESMO grupo que o card mostrou.
export function valorDoCampoPainel(p, campoNome) {
  let valor;
  if (campoNome.startsWith("fixo:")) {
    valor = {
      financ: p.financ,
      estagio: p.estagio,
      elegivel: p.elegivel ? "Sim" : "Não",
      dentista: p.dentista,
    }[campoNome.slice(5)];
  } else {
    valor = p.camposCustomizados?.[campoNome];
  }
  return !valor || !String(valor).trim() ? "(vazio)" : valor;
}
