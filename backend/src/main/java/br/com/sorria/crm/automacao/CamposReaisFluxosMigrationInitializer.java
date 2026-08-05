package br.com.sorria.crm.automacao;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.boot.CommandLineRunner;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Component;

// Migracao pontual (05/08/2026): os fluxos-modelo de consulta/cobranca foram
// criados com nomes de Campo Personalizado PLACEHOLDER ("Data da consulta",
// "Parcelas em atraso") porque nao havia acesso pra confirmar os nomes reais
// na base do Samuel. Ele mandou print dos campos reais: "Próx. Atend."
// (data) e "Atrasadas" (numero de parcelas). Como os fluxos JA FORAM
// seedados (CommandLineRunner so roda uma vez, guarda por nome), editar o
// texto no FluxoConfirmacaoConsultaSeedInitializer/FluxoCobranca*SeedInitializer
// nao alcança quem ja foi salvo no banco - precisa de UPDATE de verdade.
// REPLACE e' idempotente (roda de novo sem efeito se o texto ja foi trocado).
// Nao-fatal (try/catch) pelo mesmo motivo de todo CommandLineRunner desta pasta.
@Component
@RequiredArgsConstructor
@Slf4j
public class CamposReaisFluxosMigrationInitializer implements CommandLineRunner {

    private final JdbcTemplate jdbcTemplate;

    @Override
    public void run(String... args) {
        try {
            migrar();
        } catch (Exception e) {
            log.error("Falha na migracao de campos reais dos fluxos-modelo (nao-fatal): {}", e.getMessage(), e);
        }
    }

    private void migrar() {
        // Segmentacao "Consulta amanhã (D-1)": troca o campo customizado
        // referenciado na condicao "faltam".
        jdbcTemplate.update(
                "UPDATE segmentacoes SET groups_json = REPLACE(groups_json, ?, ?) WHERE nome = ?",
                "custom:DATA:Data da consulta", "custom:DATA:Próx. Atend.", "Consulta amanhã (D-1)");

        // Fluxo "Confirmação de consulta (D-1) - modelo": troca a variavel
        // {diasPara:...} no texto da mensagem, e acrescenta a hora (campo
        // "Hora Próx. Atend." - existe na base, mesmo que hoje esteja vazio
        // pra a maioria dos leads).
        jdbcTemplate.update(
                "UPDATE fluxos_automacao SET nodes_json = REPLACE(nodes_json, ?, ?) WHERE nome = ?",
                "sua consulta na Orthodontic é amanhã ({diasPara:Data da consulta} dia). Posso confirmar sua presença?",
                "sua consulta na Orthodontic é amanhã ({diasPara:Próx. Atend.} dia), às {Hora Próx. Atend.}. Posso confirmar sua presença?",
                "Confirmação de consulta (D-1) - modelo");

        // Os 3 fluxos de cobranca: troca a variavel de parcelas em atraso.
        for (String nomeFluxo : new String[]{
                "Cobrança amigável (5+ dias) - modelo",
                "Cobrança firme (15+ dias) - modelo",
                "Cobrança última chamada (30+ dias) - modelo",
        }) {
            jdbcTemplate.update(
                    "UPDATE fluxos_automacao SET nodes_json = REPLACE(nodes_json, ?, ?) WHERE nome = ?",
                    "{Parcelas em atraso}", "{Atrasadas}", nomeFluxo);
        }

        log.info("Migracao de campos reais dos fluxos-modelo aplicada (placeholder -> nome real dos Campos Personalizados).");
    }
}
