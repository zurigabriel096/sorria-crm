package br.com.sorria.crm.campaign;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.boot.CommandLineRunner;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Component;

// Limpeza de uma tabela orfa: "template_botoes" era a tabela de colecao do
// campo TemplateBotao (@ElementCollection em Template), removido no commit
// 3a2bd9b ("Remove recurso de botao de WhatsApp interativo - nao suportado
// fora da API Business oficial"). Com ddl-auto=update, apagar o campo/entidade
// no Java nunca apaga a tabela nem a FK correspondente no Postgres - ela ficou
// pra tras bloqueando a exclusao de qualquer Template que ainda tivesse uma
// linha la (violacao da FK "fk2i5lthfav979c0xib7gq8gyq4": "delete from
// templates where id=?" falhava com "still referenced from table
// template_botoes"). DROP TABLE IF EXISTS e' idempotente - roda a cada boot
// sem problema, e nao ha nenhuma entidade/feature que precise dessa tabela.
@Component
@RequiredArgsConstructor
@Slf4j
public class TemplateBotaoLegadoCleanupInitializer implements CommandLineRunner {

    private final JdbcTemplate jdbcTemplate;

    @Override
    public void run(String... args) {
        jdbcTemplate.execute("DROP TABLE IF EXISTS template_botoes");
        log.info("Limpeza de schema: tabela orfa template_botoes removida (se existia).");
    }
}
