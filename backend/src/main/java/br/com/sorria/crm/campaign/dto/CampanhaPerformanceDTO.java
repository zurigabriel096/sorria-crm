package br.com.sorria.crm.campaign.dto;

// Performance de uma campanha ja disparada - calculado sob demanda (nao fica
// salvo em nenhum lugar, ver CampanhaService.calcularPerformance), pra poder
// comparar 2 campanhas (ex.: variantes A/B de teste) sem precisar de nenhum
// campo/mecanismo novo de "variante" - cada campanha ja e' o proprio grupo.
public record CampanhaPerformanceDTO(
        int enviados,
        int entregues,
        int respondidos,
        double taxaEntregaPct,
        double taxaRespostaPct
) {
}
