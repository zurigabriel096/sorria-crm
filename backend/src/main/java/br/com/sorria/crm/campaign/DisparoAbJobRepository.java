package br.com.sorria.crm.campaign;

import org.springframework.data.jpa.repository.JpaRepository;

import java.time.LocalDateTime;
import java.util.List;

public interface DisparoAbJobRepository extends JpaRepository<DisparoAbJob, Long> {
    List<DisparoAbJob> findByStatusAndProximaExecucaoEmLessThanEqual(String status, LocalDateTime agora);
    List<DisparoAbJob> findAllByOrderByCriadoEmDesc();
}
