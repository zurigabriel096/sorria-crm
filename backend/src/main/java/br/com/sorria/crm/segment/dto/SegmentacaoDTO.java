package br.com.sorria.crm.segment.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;

// "groups" chega/sai como JSON de verdade (lista de listas de condicoes), nao como
// string — o frontend nao precisa saber que a gente guarda serializado no banco.
public record SegmentacaoDTO(
        Long id,
        @NotBlank String nome,
        @NotNull Object groups
) {
}
