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
        LocalDateTime atualizadoEm,
        // Corte de seguranca (Fase 5) - ver FluxoAutomacao.contatoTesteId.
        Long contatoTesteId,
        // null = numero principal - ver FluxoAutomacao.whatsappNumeroId.
        Long whatsappNumeroId,
        // So refletido aqui pra leitura - so muda de verdade via PATCH .../arquivar
        // (ver FluxoAutomacaoService.arquivar). Nao e' tocado por criar/atualizar
        // de proposito, senao um simples salvar do editor desarquivava o fluxo.
        Boolean arquivado,
        // "Fura fila" de envio - ver FluxoAutomacao.prioritario. Esse SIM pode ser
        // tocado por criar/atualizar normal (nao precisa de PATCH dedicado, e' so
        // configuracao do fluxo, nao acao sensivel como ativar).
        Boolean prioritario
) {
}
