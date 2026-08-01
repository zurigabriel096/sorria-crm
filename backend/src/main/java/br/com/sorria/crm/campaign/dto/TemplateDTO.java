package br.com.sorria.crm.campaign.dto;

import jakarta.validation.constraints.NotBlank;

import java.util.List;

public record TemplateDTO(
        Long id,
        @NotBlank String nome,
        String categoria,
        String campanhaObjetivo,
        String corpo,
        String imagemUrl,
        boolean ativo,
        List<BotaoDTO> botoes
) {
    public record BotaoDTO(String texto, String link) {
    }
}
