package br.com.sorria.crm.dashboard.dto;

import jakarta.validation.constraints.NotBlank;

import java.util.List;

public record PainelCardDTO(
        Long id,
        @NotBlank String campoNome,
        String rotulo,
        String tipoVisualizacao,
        Integer ordem,
        // Somente leitura - calculado na hora de listar, ignorado se vier num POST/PUT.
        List<ValorContagemDTO> valores,
        // So' preenchido quando tipoVisualizacao="soma" (soma numerica do campo,
        // ex.: "Valor em Atraso (R$)" de todos os leads) - valores fica vazio
        // nesse modo, e' um numero unico, nao uma quebra por valor distinto.
        Double soma
) {
    // 1 valor distinto encontrado no campo + quantos Contato tem exatamente esse valor.
    public record ValorContagemDTO(String valor, long contagem) {
    }
}
