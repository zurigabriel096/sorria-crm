package br.com.sorria.crm.campaign.dto;

import java.util.List;

public record DispatchProspectRequest(List<ProspectDTO> prospects, Long templateId) {
}
