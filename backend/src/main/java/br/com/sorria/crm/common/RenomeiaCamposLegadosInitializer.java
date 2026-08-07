package br.com.sorria.crm.common;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.boot.CommandLineRunner;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Component;

// Renomeia Campo Personalizado pra nome mais claro pro operador (pedido do
// Samuel, 06/08/2026, pivo do orquestrador de recuperacao de receita) -
// idempotente por nome (so troca quem ainda esta com o nome antigo, mesmo
// padrao do PrefixoNomesMigrationInitializer), sem marcador dedicado: rodar
// de novo depois que o nome ja mudou e' inofensivo (WHERE nao acha nada).
// Precisa trocar em 2 tabelas - o catalogo (campos_customizados.nome) E o
// valor ja salvo de cada lead (contato_campos_customizados.campo_nome, e' o
// MapKey do Contato.camposCustomizados) - senao o rotulo muda mas o valor
// antigo fica "invisivel" (gravado sob a chave velha). Momento seguro pra
// isso: Segmentacao/FluxoAutomacao foram zeradas ontem, entao nao existe
// groups_json/nodes_json com variavel {NomeAntigo} pra quebrar.
@Component
@RequiredArgsConstructor
@Slf4j
public class RenomeiaCamposLegadosInitializer implements CommandLineRunner {

    private static final String[][] RENOMEIOS = {
            {"Atrasadas", "Parcelas em Atraso"},
            {"Total de atraso", "Valor em Atraso (R$)"},
            {"Situação", "Situação de Cobrança"},
            {"Próx. Atend.", "Próxima Consulta"},
            {"Hora Próx. Atend.", "Horário da Próxima Consulta"},
            {"Status Últ. Agendam.", "Compareceu na Última Consulta?"},
            {"Valor do procedimento", "Valor do Orçamento (R$)"},
            {"Data do fechamento do orto", "Previsão de Término do Tratamento"},
    };

    private final JdbcTemplate jdbcTemplate;

    @Override
    public void run(String... args) {
        for (String[] par : RENOMEIOS) {
            renomear(par[0], par[1]);
        }
    }

    private void renomear(String antigo, String novo) {
        try {
            int catalogo = jdbcTemplate.update("UPDATE campos_customizados SET nome = ? WHERE nome = ?", novo, antigo);
            int valores = jdbcTemplate.update("UPDATE contato_campos_customizados SET campo_nome = ? WHERE campo_nome = ?", novo, antigo);
            if (catalogo > 0 || valores > 0) {
                log.info("Renomeado campo personalizado '{}' -> '{}' ({} catalogo, {} valores de lead).", antigo, novo, catalogo, valores);
            }
        } catch (Exception e) {
            log.error("Falha ao renomear campo personalizado '{}' -> '{}' (nao-fatal): {}", antigo, novo, e.getMessage(), e);
        }
    }
}
