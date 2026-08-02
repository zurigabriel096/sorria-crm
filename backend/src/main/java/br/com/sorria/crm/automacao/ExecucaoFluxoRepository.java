package br.com.sorria.crm.automacao;

import org.springframework.data.jpa.repository.JpaRepository;

import java.time.LocalDateTime;
import java.util.List;

public interface ExecucaoFluxoRepository extends JpaRepository<ExecucaoFluxo, Long> {

    // Dedup de entrada: nao cria uma segunda execucao pro mesmo par fluxo+contato
    // (ver AutomacaoEngineService.processarEntradas), mesmo que o contato continue
    // batendo com a segmentacao em ticks seguintes.
    boolean existsByFluxoIdAndContatoId(Long fluxoId, Long contatoId);

    List<ExecucaoFluxo> findByStatusAndProximaExecucaoEmLessThanEqual(String status, LocalDateTime agora);
}
