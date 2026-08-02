package br.com.sorria.crm.campo;

import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface CampoCustomizadoRepository extends JpaRepository<CampoCustomizado, Long> {
    List<CampoCustomizado> findAllByOrderByOrdemAsc();
}
