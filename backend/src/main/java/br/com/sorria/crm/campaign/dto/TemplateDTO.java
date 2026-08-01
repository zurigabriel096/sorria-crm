package br.com.sorria.crm.campaign.dto;

import jakarta.validation.constraints.NotBlank;

public record TemplateDTO(
        Long id,
        @NotBlank String nome,
        String categoria,
        String campanhaObjetivo,
        String corpo,
        String imagemUrl,
        boolean ativo
) {
}
