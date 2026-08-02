package br.com.sorria.crm.whatsapp.dto;

import jakarta.validation.constraints.NotBlank;

import java.time.LocalDateTime;

// token só é lido na criação (write-only) - nunca é devolvido em listar(),
// mesmo padrão de nunca expor o EVOLUTION_API_KEY da instância principal.
public record WhatsAppNumeroDTO(
        Long id,
        @NotBlank String nome,
        String instancia,
        String token,
        LocalDateTime criadoEm,
        Boolean conectado,
        String nomeConectado
) {
}
