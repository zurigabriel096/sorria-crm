package br.com.sorria.crm.whatsapp;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.boot.CommandLineRunner;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Component;

// Causa raiz real do erro "column wan1_0.finalidade does not exist" que
// perseguiu o registro de numeros novos o dia todo (05/08/2026): quando
// WhatsAppNumero.finalidade foi criada (nullable=false, so com default do
// lado Java), a tabela whatsapp_numeros JA TINHA linhas (Joao, Sarah...) - o
// Postgres recusa "ADD COLUMN ... NOT NULL" sem DEFAULT numa tabela com dado
// existente. O Hibernate (ddl-auto=update) tentou, falhou em silencio (so
// loga aviso, nao trava o boot) e a coluna nunca foi criada de verdade -
// toda consulta na tabela vinha falhando desde entao, mascarado no frontend
// por um catch que mostra "nenhum numero cadastrado" em qualquer erro.
//
// ALTER TABLE com DEFAULT (via SQL nativa, fora do Hibernate) preenche as
// linhas existentes automaticamente e nao trava com tabela populada.
// IF NOT EXISTS torna seguro rodar em todo boot, sem precisar de marcador.
@Component
@RequiredArgsConstructor
@Slf4j
public class WhatsAppNumeroSchemaFixInitializer implements CommandLineRunner {

    private final JdbcTemplate jdbcTemplate;

    @Override
    public void run(String... args) {
        try {
            jdbcTemplate.execute(
                    "ALTER TABLE whatsapp_numeros ADD COLUMN IF NOT EXISTS finalidade VARCHAR(255) NOT NULL DEFAULT 'DISPARO'");
            log.info("Schema fix: coluna 'finalidade' de whatsapp_numeros confirmada/criada.");
        } catch (Exception ex) {
            log.error("Falha ao corrigir schema de whatsapp_numeros.finalidade - nao trava o boot.", ex);
        }
    }
}
