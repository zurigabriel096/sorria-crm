package br.com.sorria.crm.aquecimento.dto;

public record AquecimentoConfigDTO(
        Long id,
        boolean ativo,
        int mensagensDiaInicial,
        int incrementoDiario,
        int mensagensDiaMaximo,
        int diasAquecimento,
        int intervaloMinSegundos,
        int intervaloMaxSegundos,
        boolean modoDinamico
) {
}
