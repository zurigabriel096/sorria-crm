package br.com.sorria.crm.automacao;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;

import java.util.Map;

// Um no do grafo salvo em FluxoAutomacao.nodesJson (formato do @xyflow/react no
// frontend, ver frontend/src/components/automacao/EditorFluxo.jsx). So os campos
// que o motor de execucao precisa - "position" (coordenada no canvas) e ignorado
// de proposito, so importa pra renderizar o editor visual.
@JsonIgnoreProperties(ignoreUnknown = true)
record NoFluxo(String id, String type, Map<String, Object> data) {
}
