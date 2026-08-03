package br.com.sorria.crm.contact.dto;

import java.util.List;

// Adicionar/remover uma tag em varios contatos de uma vez (ex.: todo mundo que
// uma Segmentacao captura hoje) - ver ContatoService.adicionarTagEmLote/removerTagEmLote.
public record AplicarTagLoteRequest(List<Long> contatoIds, String tag, boolean remover) {
}
