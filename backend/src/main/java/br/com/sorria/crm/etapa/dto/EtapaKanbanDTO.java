package br.com.sorria.crm.etapa.dto;

import jakarta.validation.constraints.NotBlank;

public record EtapaKanbanDTO(Long id, @NotBlank String nome, Integer ordem) {
}
