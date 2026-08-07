package br.com.sorria.crm.desempenho;

import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.PositiveOrZero;

public record MetaValorRequest(@NotNull @PositiveOrZero Integer valor) {
}
