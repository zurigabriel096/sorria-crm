package br.com.sorria.crm.dispatch;

import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface DisparoProspectHistoricoRepository extends JpaRepository<DisparoProspectHistorico, Long> {
    List<DisparoProspectHistorico> findAllByOrderByCriadoEmDesc();
}
