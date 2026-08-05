package br.com.sorria.crm.whatsapp;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;

public interface WhatsAppNumeroRepository extends JpaRepository<WhatsAppNumero, Long> {
    List<WhatsAppNumero> findByFinalidade(String finalidade);
    boolean existsByToken(String token);

    // SQL nativa (sem passar pelo tradutor JPQL/Hibernate) - diagnostico do
    // erro real "column wan1_0.finalidade does not exist" (04/08/2026), que so
    // acontecia no findAll()/existsByToken via Hibernate, nunca via SQL direta.
    @Query(value = "SELECT COUNT(*) FROM whatsapp_numeros WHERE token = :token", nativeQuery = true)
    long contarPorTokenNativo(@Param("token") String token);
}
