package br.com.sorria.crm.objetivo;

import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Optional;

public interface ObjetivoRepository extends JpaRepository<Objetivo, Long> {
    Optional<Objetivo> findByNomeIgnoreCase(String nome);
}
