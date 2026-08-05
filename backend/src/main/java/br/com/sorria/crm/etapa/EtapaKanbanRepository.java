package br.com.sorria.crm.etapa;

import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;

public interface EtapaKanbanRepository extends JpaRepository<EtapaKanban, Long> {
    List<EtapaKanban> findAllByOrderByOrdemAsc();
    Optional<EtapaKanban> findByNome(String nome);
}
