// Catálogo de ações disponíveis no construtor de fluxo. Enxugado de propósito
// (limpeza pedida em 01/08/2026): so o que ja tem uso real validado fica aqui -
// Contato/Atendimento/CRM/IA/Direcionar-fluxo foram cortados por nao terem
// sistema de verdade por tras ainda (sem API oficial pra parametrizar "contato
// respondeu tal coisa"). Reintroduzir aos poucos, junto de outras frentes que
// ja estao funcionando. "Condição" foi reintroduzida em 05/08/2026, junto da
// ramificacao real no motor (ver AutomacaoEngineService.resolverProximoId).

// Reexporta do theme.js real do sorria-crm - fonte unica de verdade, o mesmo
// vocabulario usado no Select de estagio da Base de Leads.
export { ESTAGIOS_LEAD } from "../../theme";

export const CATEGORIAS = [
  {
    id: "mensagem",
    label: "Mensagem",
    cor: "#3B82F6",
    itens: [
      { tipo: "enviar_mensagem", nome: "Enviar mensagem" },
    ],
  },
  {
    id: "contato",
    label: "Contato",
    cor: "#0FA895",
    itens: [
      { tipo: "adicionar_tag", nome: "Adicionar tag" },
      { tipo: "remover_tag", nome: "Remover tag" },
      { tipo: "alterar_estagio", nome: "Alterar Estágio dos Leads" },
    ],
  },
  {
    id: "tempo",
    label: "Tempo",
    cor: "#EC4899",
    itens: [
      { tipo: "aguardar_mensagem", nome: "Aguardar mensagens do contato" },
      { tipo: "esperar_segundos", nome: "Esperar alguns segundos" },
      { tipo: "pausar_horario_comercial", nome: "Aguardar horário comercial" },
    ],
  },
  {
    id: "fluxo",
    label: "Fluxo",
    cor: "#F59E0B",
    itens: [
      { tipo: "condicao", nome: "Condição (ramifica por resposta)" },
    ],
  },
];

export function corDoTipo(tipo) {
  const cat = CATEGORIAS.find((c) => c.itens.some((i) => i.tipo === tipo));
  return cat?.cor || "#64748B";
}

export function categoriaDoTipo(tipo) {
  return CATEGORIAS.find((c) => c.itens.some((i) => i.tipo === tipo))?.label || "";
}
