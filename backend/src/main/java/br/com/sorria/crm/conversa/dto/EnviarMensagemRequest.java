package br.com.sorria.crm.conversa.dto;

import jakarta.validation.constraints.NotBlank;

public record EnviarMensagemRequest(
        @NotBlank String texto,
        Long whatsappNumeroId // null = numero principal
) {
}
