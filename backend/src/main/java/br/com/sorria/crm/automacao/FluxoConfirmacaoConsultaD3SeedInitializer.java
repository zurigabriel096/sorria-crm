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

// Segundo toque de confirmacao de consulta - D-3, mais leve/informativo (o D-1,
// ver FluxoConfirmacaoConsultaSeedInitializer, e' quem pede confirmacao de
// verdade). Pedido do Samuel (05/08/2026): "seria interessante que essa
// abordagem acontecesse umas duas vezes, faltando tres dias e faltando um
// dia". Fluxo SEPARADO do D-1 de proposito (mesmo motivo dos 3 fluxos de
// cobranca): o motor dedupa por (fluxo, contato) pra sempre, entao so um
// fluxo por marco de dias garante que o lead recebe os dois toques.
//
// Usa os Campos Personalizados reais "Próx. Atend." (DATA) e
// "Hora Próx. Atend." que ja existem na base (confirmado por print do
// Samuel, 05/08/2026).
@Component
@RequiredArgsConstructor
@Slf4j
public class FluxoConfirmacaoConsultaD3SeedInitializer implements CommandLineRunner {

    private static final String NOME_CAMPO_DATA = "Próx. Atend.";
    private static final String NOME_CAMPO_HORA = "Hora Próx. Atend.";
    private static final String NOME_SEGMENTACAO = "Consulta em 3 dias (D-3)";
    private static final String NOME_FLUXO = "Confirmação de consulta (D-3) - modelo";
    private static final String HANDLE_FALLBACK = "__fallback__";

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
        nodes.add(no("inicio", "start", 60, 260, dataInicio));

        nodes.add(mensagem("msg1", 420, 260,
                "Oi {nome}! Passando pra avisar: sua consulta na Orthodontic está marcada pra daqui a {diasPara:" + NOME_CAMPO_DATA
                        + "} dias, às {" + NOME_CAMPO_HORA + "}. Já anota na agenda 📅 Se precisar remarcar, é só responder REMARCAR."));
        nodes.add(acao("wait1", 780, 260, "aguardar_mensagem", "Aguardar mensagens do contato", Map.of("prazoDias", 1)));
        nodes.add(condicao("cond1", 1140, 260, List.of(
                Map.of("id", "remarcar1", "operador", "contem", "valor", "remarcar")
        )));
        nodes.add(acao("estagioRemarcar", 1500, 140, "alterar_estagio", "Alterar Estágio dos Leads", Map.of("estagio", "Solicitação")));
        nodes.add(acao("tagRemarcar", 1860, 140, "adicionar_tag", "Adicionar tag", Map.of("tag", "Pediu remarcar")));
        nodes.add(acao("semAcao", 1500, 320, "adicionar_tag", "Adicionar tag", Map.of("tag", "Aviso D-3 enviado")));

        ligar(edges, "inicio", "msg1");
        ligar(edges, "msg1", "wait1");
        ligar(edges, "wait1", "cond1");
        ligarComHandle(edges, "cond1", "estagioRemarcar", "remarcar1");
        ligar(edges, "estagioRemarcar", "tagRemarcar");
        ligarComHandle(edges, "cond1", "semAcao", HANDLE_FALLBACK);

        FluxoAutomacao fluxo = new FluxoAutomacao();
        fluxo.setNome(NOME_FLUXO);
        fluxo.setAtivo(false);
        fluxo.setNodesJson(objectMapper.writeValueAsString(nodes));
        fluxo.setEdgesJson(objectMapper.writeValueAsString(edges));
        fluxoAutomacaoRepository.save(fluxo);

        log.info("Seed: fluxo-modelo '{}' criado (inativo, precisa revisao antes de ativar).", NOME_FLUXO);
    }

    private Segmentacao criarSegmentacao() {
        Segmentacao s = new Segmentacao();
        s.setNome(NOME_SEGMENTACAO);
        s.setGroupsJson("[[{\"field\":\"custom:DATA:" + NOME_CAMPO_DATA + "\",\"op\":\"faltam\",\"value\":3}]]");
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

    private Map<String, Object> acao(String id, int x, int y, String tipo, String nome, Map<String, Object> extras) {
        Map<String, Object> data = new LinkedHashMap<>();
        data.put("tipo", tipo);
        data.put("nome", nome);
        data.putAll(extras);
        return no(id, "action", x, y, data);
    }

    private Map<String, Object> condicao(String id, int x, int y, List<Map<String, Object>> condicoes) {
        Map<String, Object> data = new LinkedHashMap<>();
        data.put("condicoes", condicoes);
        return no(id, "condicao", x, y, data);
    }

    private void ligar(List<Map<String, Object>> edges, String source, String target) {
        edges.add(Map.of("id", "edge-" + source + "-" + target, "source", source, "target", target));
    }

    private void ligarComHandle(List<Map<String, Object>> edges, String source, String target, String handle) {
        Map<String, Object> e = new LinkedHashMap<>();
        e.put("id", "edge-" + source + "-" + target + "-" + handle);
        e.put("source", source);
        e.put("target", target);
        e.put("sourceHandle", handle);
        edges.add(e);
    }
}
