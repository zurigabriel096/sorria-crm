package br.com.sorria.crm.user.dto;

import java.util.List;

// Nunca inclui senha/hash — isso nunca sai do backend depois de criado.
public record UsuarioDTO(
        Long id,
        String nome,
        String cpf,
        String email,
        String papel,
        String corPerfil,
        String avatarUrl,
        // Abas do Painel Executivo liberadas pra este colaborador quando ele
        // NAO e' ADMIN/GESTOR - ver Usuario.abasDashboardPermitidas.
        List<String> abasDashboardPermitidas
) {
}
