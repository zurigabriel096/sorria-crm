package br.com.sorria.crm.user.dto;

import jakarta.validation.constraints.NotBlank;

// "chave" e' somente leitura na edicao (gravado so na criacao, ignorado se
// vier num PUT) - ver PapelCargoService.
public record PapelCargoDTO(Long id, String chave, @NotBlank String rotulo, @NotBlank String cor) {
}
