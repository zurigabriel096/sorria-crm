package br.com.sorria.crm.agentevirtual;

import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface PerguntaFrequenteRepository extends JpaRepository<PerguntaFrequente, Long> {
    List<PerguntaFrequente> findAllByOrderByIdAsc();
}
