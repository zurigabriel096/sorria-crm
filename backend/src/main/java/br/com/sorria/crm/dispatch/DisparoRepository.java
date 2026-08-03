package br.com.sorria.crm.dispatch;

import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface DisparoRepository extends JpaRepository<DisparoHistorico, Long> {

    List<DisparoHistorico> findAllByOrderByHoraDesc();

    long countByStatus(String status);

    boolean existsByCampanhaIdAndContatoId(Long campanhaId, Long contatoId);

    // Usado pra calcular performance de uma campanha (ver CampanhaService.calcularPerformance).
    List<DisparoHistorico> findByCampanhaId(Long campanhaId);
}
