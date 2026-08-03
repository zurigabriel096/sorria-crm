package br.com.sorria.crm.dashboard;

import br.com.sorria.crm.contact.ContatoRepository;
import br.com.sorria.crm.dispatch.DisparoRepository;
import br.com.sorria.crm.etapa.EtapaKanbanRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/dashboard")
@RequiredArgsConstructor
public class DashboardController {

    private final ContatoRepository contatoRepository;
    private final DisparoRepository disparoRepository;
    private final EtapaKanbanRepository etapaKanbanRepository;
    private final JdbcTemplate jdbcTemplate;

    @GetMapping("/kpis")
    public Map<String, Object> kpis() {
        long totalContatos = contatoRepository.count();
        long elegiveis = contatoRepository.countByElegivelTrue();
        long disparados = contatoRepository.countByEnviado("Disparado") + contatoRepository.countByEnviado("Entregue");
        long entregues = disparoRepository.countByStatus("Entregue");
        // Taxa de entrega precisa comparar a MESMA base - "disparados" acima e' um
        // snapshot (contato.enviado = so o status do ULTIMO disparo de cada um,
        // uma linha por contato), enquanto "entregues" e' cumulativo (uma linha de
        // DisparoHistorico por envio, contato pode aparecer varias vezes). Usar
        // disparados como denominador dava taxa > 100% assim que algum contato
        // recebia mais de uma campanha. Aqui os dois lados vem do mesmo historico.
        long totalHistorico = disparoRepository.count();
        long taxaEntregaPct = totalHistorico > 0 ? Math.round(entregues * 100.0 / totalHistorico) : 0;

        // Base por estagio do Kanban - substitui o antigo agrupamento por
        // Segmento (VIP/Fidelizado/Risco/Inativo), removido do produto.
        Map<String, Long> porEstagio = new LinkedHashMap<>();
        etapaKanbanRepository.findAllByOrderByOrdemAsc()
                .forEach(etapa -> porEstagio.put(etapa.getNome(), contatoRepository.countByEstagio(etapa.getNome())));

        Map<String, Object> kpis = new LinkedHashMap<>();
        kpis.put("totalContatos", totalContatos);
        kpis.put("elegiveis", elegiveis);
        kpis.put("disparados", disparados);
        kpis.put("entregues", entregues);
        kpis.put("taxaEntregaPct", taxaEntregaPct);
        kpis.put("porEstagio", porEstagio);
        return kpis;
    }

    // Volumetria de disparo por categoria de template (Marketing/Utilidade/
    // Autenticação) - usado na tela "Meu Plano" (fatura ilustrativa, ver
    // Plano.jsx) pra mostrar consumo real em vez de numero fixo. Cada linha
    // de disparo_historico = 1 mensagem enviada; resolve a categoria pelo
    // template ATUAL da campanha (nao ha snapshot de qual template foi usado
    // no momento do disparo - mesma limitacao de campanhaNome ja ser
    // snapshot mas templateId nao).
    //
    // Inclui tambem disparo_prospect_historico (campanhas "modoProspects",
    // pra gente fora do CRM) - sem isso, esses envios (normalmente Marketing,
    // ver DisparoProspectController) consumiam WhatsApp de verdade mas
    // ficavam invisiveis na volumetria/excedente do plano.
    @GetMapping("/disparos-por-categoria")
    public Map<String, Long> disparosPorCategoria() {
        Map<String, Long> resultado = new LinkedHashMap<>();
        resultado.put("Marketing", 0L);
        resultado.put("Utilidade", 0L);
        resultado.put("Autenticação", 0L);
        List<Map<String, Object>> linhas = jdbcTemplate.queryForList(
                "SELECT t.categoria AS categoria, COUNT(*) AS total "
                        + "FROM disparo_historico dh "
                        + "JOIN campanhas c ON c.id = dh.campanha_id "
                        + "JOIN templates t ON t.id = c.template_id "
                        + "WHERE t.categoria IS NOT NULL "
                        + "GROUP BY t.categoria"
        );
        for (Map<String, Object> linha : linhas) {
            String categoria = String.valueOf(linha.get("categoria"));
            if (resultado.containsKey(categoria)) {
                resultado.put(categoria, ((Number) linha.get("total")).longValue());
            }
        }
        List<Map<String, Object>> linhasProspects = jdbcTemplate.queryForList(
                "SELECT t.categoria AS categoria, SUM(dph.total_prospects) AS total "
                        + "FROM disparo_prospect_historico dph "
                        + "JOIN templates t ON t.id = dph.template_id "
                        + "WHERE t.categoria IS NOT NULL "
                        + "GROUP BY t.categoria"
        );
        for (Map<String, Object> linha : linhasProspects) {
            String categoria = String.valueOf(linha.get("categoria"));
            if (resultado.containsKey(categoria)) {
                long atual = resultado.get(categoria);
                resultado.put(categoria, atual + ((Number) linha.get("total")).longValue());
            }
        }
        return resultado;
    }
}
