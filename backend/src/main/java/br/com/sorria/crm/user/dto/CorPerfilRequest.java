package br.com.sorria.crm.user.dto;

import jakarta.validation.constraints.NotBlank;

public record CorPerfilRequest(@NotBlank String cor) {
}
