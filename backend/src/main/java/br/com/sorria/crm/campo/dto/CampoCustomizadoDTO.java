package br.com.sorria.crm.campo.dto;

import jakarta.validation.constraints.NotBlank;

import java.util.List;

public record CampoCustomizadoDTO(
        Long id,
        @NotBlank String nome,
        @NotBlank String tipo,
        List<String> opcoes,
        Integer ordem
) {
}
