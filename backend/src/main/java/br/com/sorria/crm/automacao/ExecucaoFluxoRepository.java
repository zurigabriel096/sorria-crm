package br.com.sorria.crm.automacao;

import org.springframework.data.jpa.repository.JpaRepository;

import java.time.LocalDateTime;
import java.util.List;

public interface ExecucaoFluxoRepository extends JpaRepository<ExecucaoFluxo, Long> {

    // Dedup de entrada: nao cria uma segunda execucao pro mesmo par fluxo+contato
    // (ver AutomacaoEngineService.processarEntradas), mesmo que o contato continue
    // batendo com a segmentacao em ticks seguintes.
    boolean existsByFluxoIdAndContatoId(Long fluxoId, Long contatoId);

    // Dedup DIARIO (nao permanente) - usado pelo gatilho "mensagem recebida"
    // (precisa disparar de novo em dias diferentes pro mesmo contato) e pelo
    // corte de seguranca de contatoTesteId (pra dar pra retestar o mesmo
    // fluxo em dias diferentes sem precisar zerar nada no banco).
    boolean existsByFluxoIdAndContatoIdAndCriadoEmGreaterThanEqual(Long fluxoId, Long contatoId, LocalDateTime desde);

    List<ExecucaoFluxo> findByStatusAndProximaExecucaoEmLessThanEqual(String status, LocalDateTime agora);

    // Fase 4: quando o contato manda uma mensagem de verdade, MensagemService
    // usa isso pra achar execucoes paradas no no "aguardar_mensagem" e retomar.
    List<ExecucaoFluxo> findByContatoIdAndStatus(Long contatoId, String status);
}
