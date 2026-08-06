package br.com.sorria.crm.automacao;

import br.com.sorria.crm.segment.Segmentacao;
import br.com.sorria.crm.segment.SegmentacaoRepository;
import com.fasterxml.jackson.databind.ObjectMapper;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.boot.CommandLineRunner;
import org.springframework.stereotype.Component;

import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

// Terceiro e ultimo passo da jornada preventiva (D0, dia do vencimento) - ver
// FluxoVencimentoD5SeedInitializer pro contexto completo. Mensagem curta de
// proposito, sem tom de cobranca (briefing do Samuel, SESSAO_2026-08-05.md) -
// a cobranca de verdade so comeca nos fluxos de recuperacao (D+, ja
// existentes: FluxoCobrancaSuave/Firme/UltimaChamada).
@Component
@RequiredArgsConstructor
@Slf4j
public class FluxoVencimentoD0SeedInitializer implements CommandLineRunner {

    private static final String NOME_SEGMENTACAO = "Fatura vence hoje";
    private static final String NOME_FLUXO = "Preventivo: vence hoje (D0) - modelo";
    private static final String NOME_CAMPO_VENCIMENTO = "Data de Vencimento";

    private final SegmentacaoRepository segmentacaoRepository;
    private final FluxoAutomacaoRepository fluxoAutomacaoRepository;
    private final ObjectMapper objectMapper;

    @Override
    public void run(String... args) {
        try {
            criarSeNaoExiste();
        } catch (Exception e) {
            log.error("Falha ao criar o fluxo-modelo '{}' (seed nao-fatal, sistema continua no ar): {}", NOME_FLUXO, e.getMessage(), e);
        }
    }

    private void criarSeNaoExiste() throws Exception {
        if (fluxoAutomacaoRepository.findAll().stream().anyMatch(f -> NOME_FLUXO.equals(f.getNome()))) return;

        Segmentacao segmentacao = segmentacaoRepository.findByNome(NOME_SEGMENTACAO)
                .orElseGet(this::criarSegmentacao);

        List<Map<String, Object>> nodes = new ArrayList<>();
        List<Map<String, Object>> edges = new ArrayList<>();

        Map<String, Object> entrada = new LinkedHashMap<>();
        entrada.put("modoEntrada", "futurosEExistentes");
        entrada.put("tipoCondicao", "segmentacao");
        entrada.put("segmentacao", Map.of("id", segmentacao.getId(), "nome", segmentacao.getNome()));
        entrada.put("automacaoMarketing", null);
        Map<String, Object> dataInicio = new LinkedHashMap<>();
        dataInicio.put("entrada", entrada);
        nodes.add(no("inicio", "start", 60, 220, dataInicio));

        nodes.add(mensagem("msg1", 420, 220, "Oi {nome}, hoje é o vencimento da sua mensalidade 🙂"));

        ligar(edges, "inicio", "msg1");

        FluxoAutomacao fluxo = new FluxoAutomacao();
        fluxo.setNome(NOME_FLUXO);
        fluxo.setAtivo(false);
        fluxo.setNodesJson(objectMapper.writeValueAsString(nodes));
        fluxo.setEdgesJson(objectMapper.writeValueAsString(edges));
        fluxoAutomacaoRepository.save(fluxo);

        log.info("Seed: fluxo-modelo '{}' criado (inativo, precisa revisao - confira se o Campo Personalizado '{}' já existe e está preenchido antes de ativar).",
                NOME_FLUXO, NOME_CAMPO_VENCIMENTO);
    }

    private Segmentacao criarSegmentacao() {
        Segmentacao s = new Segmentacao();
        s.setNome(NOME_SEGMENTACAO);
        s.setGroupsJson("[[{\"field\":\"custom:DATA:" + NOME_CAMPO_VENCIMENTO + "\",\"op\":\"faltam\",\"value\":0}]]");
        return segmentacaoRepository.save(s);
    }

    private Map<String, Object> no(String id, String type, int x, int y, Map<String, Object> data) {
        Map<String, Object> n = new LinkedHashMap<>();
        n.put("id", id);
        n.put("type", type);
        n.put("position", Map.of("x", x, "y", y));
        n.put("data", data);
        return n;
    }

    private Map<String, Object> mensagem(String id, int x, int y, String texto) {
        Map<String, Object> data = new LinkedHashMap<>();
        data.put("texto", texto);
        data.put("imagem", null);
        data.put("respostasRapidas", List.of());
        data.put("blocosConteudo", List.of());
        data.put("atraso", Map.of("dias", 0, "horas", 0, "minutos", 0, "segundos", 0));
        return no(id, "mensagem", x, y, data);
    }

    private void ligar(List<Map<String, Object>> edges, String source, String target) {
        edges.add(Map.of("id", "edge-" + source + "-" + target, "source", source, "target", target));
    }
}
