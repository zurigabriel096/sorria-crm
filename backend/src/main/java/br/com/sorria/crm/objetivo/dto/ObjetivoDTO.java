package br.com.sorria.crm.objetivo.dto;

import jakarta.validation.constraints.NotBlank;

public record ObjetivoDTO(Long id, @NotBlank String nome) {
}
