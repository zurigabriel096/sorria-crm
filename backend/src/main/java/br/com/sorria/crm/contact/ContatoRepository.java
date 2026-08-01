package br.com.sorria.crm.contact;

import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface ContatoRepository extends JpaRepository<Contato, Long> {

    List<Contato> findBySegmento(String segmento);

    List<Contato> findByTagsContaining(String tag);

    List<Contato> findByElegivelTrueAndEnviado(String enviado);

    long countByElegivelTrue();

    long countByEnviado(String enviado);

    long countBySegmento(String segmento);
}
