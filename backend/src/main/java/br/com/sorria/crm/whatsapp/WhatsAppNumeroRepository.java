package br.com.sorria.crm.whatsapp;

import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface WhatsAppNumeroRepository extends JpaRepository<WhatsAppNumero, Long> {
    List<WhatsAppNumero> findByFinalidade(String finalidade);
    boolean existsByToken(String token);
}
