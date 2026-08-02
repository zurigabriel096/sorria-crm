package br.com.sorria.crm.contact.dto;

import jakarta.validation.constraints.NotBlank;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Map;

public record ContatoDTO(
        Long id,
        String cod,
        @NotBlank String nome,
        String telefone,
        String email,
        String financ,
        String dentista,
        String ultAtendimento,
        Integer recencia,
        String estagio,
        Long responsavelId,
        boolean elegivel,
        String enviado,
        List<String> tags,
        String origem,
        Double ordemKanban,
        Map<String, String> camposCustomizados,
        // Somente leitura - gravado so por MensagemService, ignorado se vier num PUT/POST.
        LocalDateTime ultimaMensagemEm,
        String ultimaMensagemDirecao,
        // Editavel - o follow-up agendado pelo colaborador.
        LocalDateTime proximaAcaoEm
) {
}
