package br.com.sorria.crm.dashboard;

import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface PainelCardRepository extends JpaRepository<PainelCard, Long> {
    List<PainelCard> findAllByOrderByOrdemAsc();
}
