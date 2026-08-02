package br.com.sorria.crm.automacao.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;

import java.time.LocalDateTime;

// "nodes"/"edges" chegam/saem como JSON de verdade (array de objetos do
// @xyflow/react), nao como string - o frontend nao precisa saber que a gente
// guarda serializado no banco (mesmo padrao de SegmentacaoDTO.groups).
public record FluxoAutomacaoDTO(
        Long id,
        @NotBlank String nome,
        Boolean ativo,
        @NotNull Object nodes,
        @NotNull Object edges,
        LocalDateTime atualizadoEm
) {
}
