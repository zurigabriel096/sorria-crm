package br.com.sorria.crm.campaign.dto;

public record DispatchResultDTO(
        int total,
        int entregues,
        int falhas
) {
}
