package br.com.sorria.crm.tag.dto;

import jakarta.validation.constraints.NotBlank;

public record TagDTO(Long id, @NotBlank String nome, String cor) {
}
