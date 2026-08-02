package br.com.sorria.crm.conversa;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;

public interface MensagemRepository extends JpaRepository<Mensagem, Long> {
    List<Mensagem> findByContatoIdOrderByCriadoEmAsc(Long contatoId);

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
