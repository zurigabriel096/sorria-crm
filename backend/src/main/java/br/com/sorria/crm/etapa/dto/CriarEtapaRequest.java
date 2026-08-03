package br.com.sorria.crm.etapa.dto;

import jakarta.validation.constraints.NotBlank;

// nomeTag e opcional - se vier em branco, a tag vinculada usa o mesmo nome da
// coluna (comportamento antigo). Existe pra deixar o ADMIN escolher um nome
// de tag diferente do nome da coluna, sem criar automatico por baixo.
public record CriarEtapaRequest(@NotBlank String nome, String nomeTag) {
}
