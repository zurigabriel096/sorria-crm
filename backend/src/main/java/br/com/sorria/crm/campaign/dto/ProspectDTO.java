package br.com.sorria.crm.campaign.dto;

// Uma linha da lista de prospects (fora do CRM) enviada na hora do disparo -
// nao vira Contato, nao mescla com nada (ver CampanhaService.dispararProspects).
public record ProspectDTO(String telefone, String nome) {
}
