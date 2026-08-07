package br.com.sorria.crm.desempenho;

import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Optional;

public interface MetaDesempenhoRepository extends JpaRepository<MetaDesempenho, Long> {
    Optional<MetaDesempenho> findByTipoAndColaboradorId(String tipo, Long colaboradorId);
}
