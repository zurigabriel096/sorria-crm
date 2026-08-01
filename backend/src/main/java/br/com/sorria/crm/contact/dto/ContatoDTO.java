package br.com.sorria.crm.contact.dto;

import jakarta.validation.constraints.NotBlank;

import java.util.List;

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
        String segmento,
        String estagio,
        boolean elegivel,
        String enviado,
        List<String> tags,
        String origem
) {
}
