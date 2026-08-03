package br.com.sorria.crm.aquecimento.dto;

import java.time.LocalDateTime;

public record AquecimentoStatusDTO(
        Long numeroId,
        String nome,
        boolean conectado,
        Integer diaAquecimento,
        int metaHoje,
        long enviadosHoje,
        LocalDateTime proximoEnvioEm
) {
}
