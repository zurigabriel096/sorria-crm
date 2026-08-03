package br.com.sorria.crm.campaign;

import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Optional;

public interface CampanhaRepository extends JpaRepository<Campanha, Long> {
    Optional<Campanha> findByNome(String nome);
}
