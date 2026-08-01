package br.com.sorria.crm.user.dto;

// Nunca inclui senha/hash — isso nunca sai do backend depois de criado.
public record UsuarioDTO(
        Long id,
        String nome,
        String cpf,
        String email,
        String papel
) {
}
