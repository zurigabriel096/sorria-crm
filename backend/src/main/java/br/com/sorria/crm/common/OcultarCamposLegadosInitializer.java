package br.com.sorria.crm.common;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.boot.CommandLineRunner;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Component;

import java.util.List;

// Ocultacao pontual (pedido do Samuel, 06/08/2026, pivo do orquestrador de
// recuperacao de receita): tira da Base de Leads os campos que nao decidem
// nenhuma acao pra funcao primaria nova (inadimplencia/orcamento parado/
// agenda vazia) - viraram ruido de "CRM generico". So' remove da lista de
// colunas VISIVEIS (config_colunas_visiveis) - o Campo Personalizado e o
// valor de cada lead continuam intactos (contato_campos_customizados), o
// Samuel pediu EXPLICITAMENTE pra nao apagar, so ocultar. Reversivel a
// qualquer momento pelo checkbox "Colunas visiveis" (ADMIN/GESTOR).
// Guardado por OcultarCamposLegadosMarcador - roda uma unica vez, senao
// re-ocultaria de novo qualquer campo que o ADMIN reative manualmente depois.
@Component
@RequiredArgsConstructor
@Slf4j
public class OcultarCamposLegadosInitializer implements CommandLineRunner {

    private static final List<String> CHAVES_A_OCULTAR = List.of(
            "custom:Especialidade",
            "custom:Primeiro vencimento",
            "custom:Vencimentos",
            "custom:Parcelas pagas",
            "custom:Último pagamento",
            "custom:Telefone 3"
    );

    private final OcultarCamposLegadosMarcadorRepository marcadorRepository;
    private final JdbcTemplate jdbcTemplate;

    @Override
    public void run(String... args) {
        if (marcadorRepository.count() > 0) return;

        try {
            String placeholders = String.join(",", CHAVES_A_OCULTAR.stream().map(c -> "?").toList());
            int removidas = jdbcTemplate.update(
                    "DELETE FROM config_colunas_visiveis WHERE coluna IN (" + placeholders + ")",
                    CHAVES_A_OCULTAR.toArray()
            );
            log.info("Ocultacao de campos legados aplicada: {} chave(s) removida(s) de config_colunas_visiveis.", removidas);
        } catch (Exception e) {
            log.error("Falha ao ocultar campos legados (nao-fatal): {}", e.getMessage(), e);
        }

        marcadorRepository.save(new OcultarCamposLegadosMarcador());
    }
}
