package br.com.sorria.crm.dashboard.dto;

import jakarta.validation.constraints.NotBlank;

public record PainelCardDTO(
        Long id,
        @NotBlank String campoNome,
        @NotBlank String valor,
        String rotulo,
        Integer ordem,
        // Somente leitura - calculado na hora de listar, ignorado se vier num POST/PUT.
        Long contagem
) {
}
