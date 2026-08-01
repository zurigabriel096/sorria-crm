package br.com.sorria.crm.auth;

public record LoginResponse(
        String token,
        String nome,
        String email,
        String papel
) {
}
