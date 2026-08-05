package br.com.sorria.crm.automacao;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;

// Uma aresta do grafo salva em FluxoAutomacao.edgesJson - liga o no "source" ao
// no "target". "sourceHandle" importa de verdade a partir do no "condicao" (qual
// ramo/condicao essa aresta representa - ver AutomacaoEngineService.resolverProximoId);
// null pra qualquer aresta saindo de um no com saida unica. Outros campos como
// "animated"/"style" (so importam pro desenho no editor) continuam ignorados.
@JsonIgnoreProperties(ignoreUnknown = true)
record ArestaFluxo(String id, String source, String target, String sourceHandle) {
}
