package br.com.sorria.crm.conversa;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;

public interface MensagemRepository extends JpaRepository<Mensagem, Long> {
    List<Mensagem> findByContatoIdOrderByCriadoEmAsc(Long contatoId);

    // Base do no "condicao" (AutomacaoEngineService.resolverHandleCondicao): avalia
    // as condicoes contra o TEXTO da ultima mensagem que o lead mandou de verdade.
    Optional<Mensagem> findFirstByContatoIdAndDirecaoOrderByCriadoEmDesc(Long contatoId, String direcao);

    // Base do Agente Virtual (AgenteVirtualService.processarPendentes): pega
    // todas as mensagens de hoje pra agrupar por contato em memoria e achar
    // quem mandou a primeira mensagem do dia e ainda nao teve nenhuma SAIDA
    // depois dela.
    List<Mensagem> findByCriadoEmGreaterThanEqualOrderByContatoIdAscCriadoEmAsc(LocalDateTime desde);

    // "Respondeu" pra fins de performance de campanha (ver CampanhaService.calcularPerformance):
    // existe alguma mensagem ENTRADA desse contato depois da hora do disparo.
    boolean existsByContatoIdAndDirecaoAndCriadoEmAfter(Long contatoId, String direcao, LocalDateTime apos);

    // Quais leads ja trocaram mensagem por um numero especifico - base do
    // filtro "kanban por numero" (cada numero mostra so os leads que ja
    // conversaram por ele).
    List<Long> findDistinctContatoIdByWhatsappNumeroId(Long whatsappNumeroId);
    List<Long> findDistinctContatoIdByWhatsappNumeroIdIsNull();

    // Usado ao unificar contatos duplicados (mesmo telefone): move o
    // historico de mensagens do duplicado pro cadastro principal antes de
    // excluir o duplicado, pra nao perder a conversa.
    @Modifying
    @Query("UPDATE Mensagem m SET m.contatoId = :novoContatoId WHERE m.contatoId = :antigoContatoId")
    void reatribuirContato(@Param("antigoContatoId") Long antigoContatoId, @Param("novoContatoId") Long novoContatoId);
}
