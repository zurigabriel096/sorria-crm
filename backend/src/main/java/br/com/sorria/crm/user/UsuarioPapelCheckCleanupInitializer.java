package br.com.sorria.crm.user;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.boot.CommandLineRunner;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Component;

// Limpeza de uma constraint orfa: "usuarios_papel_check" foi gerada pelo
// Hibernate quando Usuario.papel ainda era @Enumerated(EnumType.STRING) sobre
// o enum fixo Papel (ADMIN/GESTOR/MARKETING/RECEPCAO/TELEMARKETING). Depois
// que papel virou String livre (catalogo dinamico PapelCargo, ver Usuario.java),
// ddl-auto=update nunca remove uma CHECK constraint que sumiu do Java - ela
// ficou pra tras barrando qualquer funcao nova que o ADMIN criasse (ex.:
// "Financeiro"), com "violates check constraint usuarios_papel_check".
// DROP CONSTRAINT IF EXISTS e' idempotente - roda a cada boot sem problema.
@Component
@RequiredArgsConstructor
@Slf4j
public class UsuarioPapelCheckCleanupInitializer implements CommandLineRunner {

    private final JdbcTemplate jdbcTemplate;

    @Override
    public void run(String... args) {
        jdbcTemplate.execute("ALTER TABLE usuarios DROP CONSTRAINT IF EXISTS usuarios_papel_check");
        log.info("Limpeza de schema: constraint orfa usuarios_papel_check removida (se existia).");
    }
}
