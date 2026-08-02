package br.com.sorria.crm.automacao;

import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface FluxoAutomacaoRepository extends JpaRepository<FluxoAutomacao, Long> {
    List<FluxoAutomacao> findByAtivoTrue();
}
