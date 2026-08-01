package br.com.sorria.crm.user.dto;

import jakarta.validation.constraints.NotBlank;

// senha: obrigatoria so na criacao; na edicao, em branco = mantem a senha atual.
public record UsuarioRequest(
        @NotBlank String nome,
        String cpf,
        @NotBlank String email,
        String senha,
        @NotBlank String papel
) {
}
