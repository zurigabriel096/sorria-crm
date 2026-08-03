package br.com.sorria.crm.contact.dto;

import java.util.List;

public record ExcluirLoteRequest(List<Long> contatoIds) {
}
