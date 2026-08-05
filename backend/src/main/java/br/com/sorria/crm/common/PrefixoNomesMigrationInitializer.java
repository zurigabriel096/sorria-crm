package br.com.sorria.crm.common;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.boot.CommandLineRunner;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Component;

// Migracao pontual (05/08/2026): pedido do Samuel pra padronizar o nome de
// Fluxo/Campanha/Segmentacao/Template com o prefixo do tipo (ex.: "Fluxo •
// Leads Frios"), igual referencia visual que ele mandou. Renomeia quem ja
// existe (idempotente - so quem ainda NAO tem o prefixo); as telas de "criar
// novo" (NomeFluxoModal.jsx/Campanhas.jsx/Segmentacoes.jsx/Templates.jsx) ja
// pre-preenchem o prefixo pra quem for criado dali pra frente. Nao-fatal.
@Component
@RequiredArgsConstructor
@Slf4j
public class PrefixoNomesMigrationInitializer implements CommandLineRunner {

    private final JdbcTemplate jdbcTemplate;

    @Override
    public void run(String... args) {
        try {
            renomear("fluxos_automacao", "Fluxo • ");
            renomear("campanhas", "Campanha • ");
            renomear("segmentacoes", "Segmentação • ");
            renomear("templates", "Template • ");
        } catch (Exception e) {
            log.error("Falha na migracao de prefixo de nomes (nao-fatal): {}", e.getMessage(), e);
        }
    }

    private void renomear(String tabela, String prefixo) {
        int linhas = jdbcTemplate.update(
                "UPDATE " + tabela + " SET nome = ? || nome WHERE nome NOT LIKE ?",
                prefixo, prefixo + "%");
        if (linhas > 0) {
            log.info("Migracao de prefixo: {} linha(s) de '{}' renomeada(s) com prefixo '{}'.", linhas, tabela, prefixo);
        }
    }
}
