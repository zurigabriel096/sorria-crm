package br.com.sorria.crm.dashboard;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.boot.CommandLineRunner;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Component;

// Limpeza de uma coluna orfa: "valor" (NOT NULL) existia enquanto PainelCard
// exigia 1 valor especifico cadastrado na mao por card (ver PainelCardService,
// virou quebra automatica por todos os valores distintos do campo). Sem essa
// limpeza, o INSERT do Hibernate pra um PainelCard novo violaria a constraint
// NOT NULL da coluna que sumiu do Java - ddl-auto=update nunca remove coluna
// que deixou de existir na entidade (mesmo padrao do cleanup de template_botoes
// e usuarios_papel_check). DROP COLUMN IF EXISTS e' idempotente.
@Component
@RequiredArgsConstructor
@Slf4j
public class PainelCardValorCleanupInitializer implements CommandLineRunner {

    private final JdbcTemplate jdbcTemplate;

    @Override
    public void run(String... args) {
        jdbcTemplate.execute("ALTER TABLE painel_cards DROP COLUMN IF EXISTS valor");
        log.info("Limpeza de schema: coluna orfa painel_cards.valor removida (se existia).");
    }
}
