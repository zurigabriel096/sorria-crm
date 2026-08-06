package br.com.sorria.crm.automacao;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

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

    // "Resetar teste" (FluxoAutomacaoService.resetarTeste): a dedup acima
    // (existsByFluxoIdAndContatoId) e' permanente de proposito pro publico real,
    // mas trava re-teste do MESMO fluxo+contato pra sempre (mesmo com o fluxo
    // reconfigurado) - isso apaga a(s) execucao(oes) antiga(s) pra abrir espaco
    // pra uma nova entrada no proximo tick. Query bulk explicita (nao o
    // deleteBy... derivado, que tentou dar remove() sem transacao de verdade em
    // producao - "No EntityManager with actual transaction available" - ver
    // FluxoAutomacaoService.resetarTeste, agora @Transactional).
    @Modifying
    @Query("DELETE FROM ExecucaoFluxo e WHERE e.fluxoId = :fluxoId AND e.contatoId = :contatoId")
    void deletarExecucoesDoTeste(@Param("fluxoId") Long fluxoId, @Param("contatoId") Long contatoId);
}
