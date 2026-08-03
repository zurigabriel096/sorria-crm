package br.com.sorria.crm.user;

import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;

public interface PapelCargoRepository extends JpaRepository<PapelCargo, Long> {
    List<PapelCargo> findAllByOrderByRotuloAsc();
    Optional<PapelCargo> findByChave(String chave);
    boolean existsByChave(String chave);
}
