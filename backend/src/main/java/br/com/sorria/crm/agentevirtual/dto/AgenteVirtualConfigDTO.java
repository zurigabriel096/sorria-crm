package br.com.sorria.crm.agentevirtual.dto;

public record AgenteVirtualConfigDTO(
        Long id,
        boolean ativo,
        String mensagemPadrao
) {
}
