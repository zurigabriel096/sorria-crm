package br.com.sorria.crm.contact;

import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;

public interface ContatoRepository extends JpaRepository<Contato, Long> {

    Optional<Contato> findByTelefone(String telefone);

    List<Contato> findBySegmento(String segmento);

    List<Contato> findByTagsContaining(String tag);

    List<Contato> findByElegivelTrueAndEnviado(String enviado);

    List<Contato> findByElegivelTrue();

    long countByElegivelTrue();

    long countByEnviado(String enviado);

    long countBySegmento(String segmento);
}
