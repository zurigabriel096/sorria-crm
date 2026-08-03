package br.com.sorria.crm.contact.dto;

import java.util.List;

// Distribui contatoIds entre colaboradorIds - ver ContatoController.atribuirResponsavelEmLote
// (embaralha os contatos e distribui em rodizio pelos colaboradores, pra ficar
// aleatorio E equilibrado ao mesmo tempo).
public record AtribuirResponsavelLoteRequest(List<Long> contatoIds, List<Long> colaboradorIds) {
}
