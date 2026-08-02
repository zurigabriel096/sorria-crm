package br.com.sorria.crm.etapa;

import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface EtapaKanbanRepository extends JpaRepository<EtapaKanban, Long> {
    List<EtapaKanban> findAllByOrderByOrdemAsc();
}
