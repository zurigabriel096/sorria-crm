package br.com.sorria.crm.segment;

import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Optional;

public interface SegmentacaoRepository extends JpaRepository<Segmentacao, Long> {
    Optional<Segmentacao> findByNome(String nome);
}
