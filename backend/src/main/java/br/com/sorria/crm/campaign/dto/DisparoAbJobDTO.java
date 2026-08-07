package br.com.sorria.crm.campaign.dto;

import java.time.LocalDateTime;
import java.util.List;

public record DisparoAbJobDTO(
        Long id,
        String status,
        String letras,
        Integer minutosEscalonamento,
        Integer proximoIndice,
        Integer totalGrupos,
        LocalDateTime proximaExecucaoEm,
        LocalDateTime criadoEm,
        // So' vai no POST de criacao - na leitura (listar/status), volta so'
        // pra quem criou saber quantos grupos tinha (totalGrupos ja cobre isso).
        List<GrupoNumeroDTO> grupos
) {
    public record GrupoNumeroDTO(Long numeroId, List<ItemDispatchDTO> itens) {
    }

    public record ItemDispatchDTO(Long campanhaId, List<Long> contatoIds) {
    }
}
