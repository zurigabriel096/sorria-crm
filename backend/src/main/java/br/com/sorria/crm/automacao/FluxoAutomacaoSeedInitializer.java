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

// Esboco de automacao pedido pelo Samuel (03/08/2026): jornada de reengajamento
// de ~15 dias pra leads frios, criado JA INATIVO de proposito (ativo=false) -
// precisa de revisao/ajuste manual antes de rodar de verdade (ver aviso de
// seguranca em AutomacaoEngineService/EditorFluxo.jsx: ativar sem contato de
// teste manda mensagem real pra todo mundo que bater com a segmentacao).
//
// Desenho: 3 mensagens espacadas por "aguardar resposta" com prazo de 5 dias
// cada (15 dias no total se o lead nunca responder) - usa o timeout real do
// motor (ver AutomacaoEngineService.executarNoAcao/"aguardar_mensagem"), que
// tageia "Automação: respondeu" ou "Automação: sem resposta" a cada checkpoint.
// Limitacao HONESTA, documentada: o motor ainda nao suporta ramificacao de
// verdade no grafo (uma aresta so por no) - responder ou nao responder NAO
// muda o caminho da jornada, so fica registrado via tag pra filtrar/comparar
// depois em Segmentacoes. Se quiser textos DIFERENTES por desfecho, precisa
// de um fluxo separado por enquanto.
@Component
@RequiredArgsConstructor
@Slf4j
public class FluxoAutomacaoSeedInitializer implements CommandLineRunner {

    private static final String NOME_SEGMENTACAO = "Leads Frios";
    private static final String NOME_FLUXO = "Leads Frios - Reengajamento 15 dias";

    private final SegmentacaoRepository segmentacaoRepository;
    private final FluxoAutomacaoRepository fluxoAutomacaoRepository;
    private final ObjectMapper objectMapper;

    @Override
    public void run(String... args) throws Exception {
        if (fluxoAutomacaoRepository.findAll().stream().anyMatch(f -> NOME_FLUXO.equals(f.getNome()))) return;

        Segmentacao segmentacao = segmentacaoRepository.findByNome(NOME_SEGMENTACAO)
                .orElseGet(this::criarSegmentacaoLeadsFrios);

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

        nodes.add(mensagem("msg1", 420, 60,
                "Oi {nome}! 🦷✨ Faz um tempo que a gente não se vê por aqui na Orthodontic. Bora colocar o sorriso em dia? Responda 1 (quero agendar) ou 2 (só olhando)."));
        nodes.add(aguardar("wait1", 780, 60, 5));
        nodes.add(mensagem("msg2", 1140, 60,
                "Oi {nome}! 🤍✨ Ainda dá tempo de cuidar do seu sorriso com a gente. Que tal uma avaliação sem compromisso? Responda 1 (sim) ou 2 (não agora)."));
        nodes.add(aguardar("wait2", 1500, 60, 5));
        nodes.add(mensagem("msg3", 1860, 60,
                "Oi {nome}! 💛✨ Última lembrança: temos uma condição especial esperando por você na Orthodontic. Responda 1 (quero saber mais) ou 2 (não, obrigado)."));
        nodes.add(aguardar("wait3", 2220, 60, 5));

        ligar(edges, "inicio", "msg1");
        ligar(edges, "msg1", "wait1");
        ligar(edges, "wait1", "msg2");
        ligar(edges, "msg2", "wait2");
        ligar(edges, "wait2", "msg3");
        ligar(edges, "msg3", "wait3");

        FluxoAutomacao fluxo = new FluxoAutomacao();
        fluxo.setNome(NOME_FLUXO);
        fluxo.setAtivo(false);
        fluxo.setNodesJson(objectMapper.writeValueAsString(nodes));
        fluxo.setEdgesJson(objectMapper.writeValueAsString(edges));
        fluxoAutomacaoRepository.save(fluxo);

        log.info("Seed: fluxo de automacao '{}' criado (inativo, precisa revisao antes de ativar).", NOME_FLUXO);
    }

    private Segmentacao criarSegmentacaoLeadsFrios() {
        Segmentacao s = new Segmentacao();
        s.setNome(NOME_SEGMENTACAO);
        // Recencia > 90 dias E elegivel (telefone valido) - mesmo raciocinio da
        // seed "Reativação +120D" ja existente, so com corte mais cedo (90 em
        // vez de 120) pra pegar quem esfriou antes de virar caso perdido.
        s.setGroupsJson("[[{\"field\":\"recencia\",\"op\":\"maior\",\"value\":90},{\"field\":\"elegivel\",\"op\":\"é\",\"value\":\"Sim\"}]]");
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

    private Map<String, Object> aguardar(String id, int x, int y, int prazoDias) {
        Map<String, Object> data = new LinkedHashMap<>();
        data.put("tipo", "aguardar_mensagem");
        data.put("nome", "Aguardar mensagens do contato");
        data.put("prazoDias", prazoDias);
        return no(id, "action", x, y, data);
    }

    private void ligar(List<Map<String, Object>> edges, String source, String target) {
        edges.add(Map.of("id", "edge-" + source + "-" + target, "source", source, "target", target));
    }
}
