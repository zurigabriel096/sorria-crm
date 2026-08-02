package br.com.sorria.crm.contact;

import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface ContatoRepository extends JpaRepository<Contato, Long> {

    // List (nao Optional) de proposito: telefone nao tem unicidade garantida na
    // base (ex.: um contato de teste duplicado com o mesmo numero de outro real)
    // - um Optional aqui quebraria com IncorrectResultSizeDataAccessException.
    List<Contato> findByTelefone(String telefone);

    List<Contato> findBySegmento(String segmento);

    List<Contato> findByTagsContaining(String tag);

    List<Contato> findByElegivelTrueAndEnviado(String enviado);

    List<Contato> findByElegivelTrue();

    long countByElegivelTrue();

    long countByEnviado(String enviado);

    long countBySegmento(String segmento);
}
