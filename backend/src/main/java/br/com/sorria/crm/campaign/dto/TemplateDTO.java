package br.com.sorria.crm.campaign.dto;

import jakarta.validation.constraints.NotBlank;

import java.time.LocalDateTime;

public record TemplateDTO(
        Long id,
        @NotBlank String nome,
        String categoria,
        String campanhaObjetivo,
        String corpo,
        String imagemUrl,
        boolean ativo,
        Boolean arquivado,
        LocalDateTime atualizadoEm
) {
}
