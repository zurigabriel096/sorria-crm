package br.com.sorria.crm.conversa;

import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface MensagemRepository extends JpaRepository<Mensagem, Long> {
    List<Mensagem> findByContatoIdOrderByCriadoEmAsc(Long contatoId);

    // Quais leads ja trocaram mensagem por um numero especifico - base do
    // filtro "kanban por numero" (cada numero mostra so os leads que ja
    // conversaram por ele).
    List<Long> findDistinctContatoIdByWhatsappNumeroId(Long whatsappNumeroId);
    List<Long> findDistinctContatoIdByWhatsappNumeroIdIsNull();
}
