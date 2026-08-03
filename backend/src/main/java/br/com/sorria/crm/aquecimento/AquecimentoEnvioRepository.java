package br.com.sorria.crm.aquecimento;

import org.springframework.data.jpa.repository.JpaRepository;

import java.time.LocalDateTime;

public interface AquecimentoEnvioRepository extends JpaRepository<AquecimentoEnvio, Long> {
    long countByNumeroOrigemIdAndCriadoEmAfter(Long numeroOrigemId, LocalDateTime desde);
}
