package br.com.sorria.crm.conversa.dto;

import java.time.LocalDateTime;

public record MensagemDTO(
        Long id,
        Long contatoId,
        Long whatsappNumeroId,
        String direcao,
        String texto,
        Long enviadoPorUsuarioId,
        String enviadoPorNome,
        boolean numeroAlternativo,
        LocalDateTime criadoEm,
        String payloadBrutoMidia
) {
}
