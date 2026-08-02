package br.com.sorria.crm.automacao;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;

// Uma aresta do grafo salva em FluxoAutomacao.edgesJson - liga o no "source" ao
// no "target". Campos como "animated"/"style"/"sourceHandle" (so importam pro
// desenho no editor) sao ignorados.
@JsonIgnoreProperties(ignoreUnknown = true)
record ArestaFluxo(String id, String source, String target) {
}
