package br.com.sorria.crm.common.dto;

// Corpo compartilhado pelo PATCH /.../{id}/arquivar de campanhas, templates e segmentacoes.
public record ArquivarRequest(boolean arquivado) {
}
