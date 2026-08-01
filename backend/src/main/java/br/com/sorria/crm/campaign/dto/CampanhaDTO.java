package br.com.sorria.crm.campaign.dto;

import jakarta.validation.constraints.NotBlank;

public record CampanhaDTO(
        Long id,
        @NotBlank String nome,
        String objetivo,
        String canal,
        String responsavel,
        String status,
        String inicio,
        String emailMsg,
        Long templateId
) {
}
