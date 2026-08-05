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

// Fluxo-modelo pedido pelo Samuel (05/08/2026): reengajar quem nao compareceu
// na consulta, pronto pra equipe SO AJUSTAR - ver SESSAO_2026-08-05.md. Criado
// JA INATIVO de proposito, mesmo cuidado dos outros seeds desta pasta.
//
// Gatilho: reaproveita a coluna "Não compareceu" que ja existe no Kanban
// (KanbanReestruturacaoInitializer) - NAO precisa de nenhuma acao manual extra,
// porque ContatoService.sincronizarTagDeEtapa ja aplica automaticamente uma tag
// com o MESMO NOME da etapa atual em todo caminho que muda estagio (arrastar no
// Kanban, editar cadastro, importacao, automacao). Ou seja: assim que um card
// e' arrastado pra essa coluna, a tag "Não compareceu" e' adicionada de verdade
// e a Segmentacao abaixo (por tag) bate sozinha.
@Component
@RequiredArgsConstructor
@Slf4j
public class FluxoNaoCompareceuSeedInitializer implements CommandLineRunner {

    private static final String NOME_ETAPA_NAO_COMPARECEU = "Não compareceu";
    private static final String NOME_SEGMENTACAO = "Não compareceu à consulta";
    private static final String NOME_FLUXO = "Não compareceu à consulta - modelo";
    private static final String HANDLE_FALLBACK = "__fallback__";

    private final SegmentacaoRepository segmentacaoRepository;
    private final FluxoAutomacaoRepository fluxoAutomacaoRepository;
    private final ObjectMapper objectMapper;

    @Override
    public void run(String... args) throws Exception {
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

        nodes.add(mensagem("msg1", 420, 220,
                "Oi {nome}! Vimos que não deu pra comparecer na sua consulta na Orthodontic. Sem problemas! Quer remarcar pra um novo horário? Responda SIM pra reagendar 🙂"));
        nodes.add(acao("wait1", 780, 220, "aguardar_mensagem", "Aguardar mensagens do contato", Map.of("prazoDias", 2)));
        nodes.add(condicao("cond1", 1140, 220, List.of(
                Map.of("id", "sim1", "operador", "contem", "valor", "sim")
        )));
        nodes.add(acao("estagioSolicitacao", 1500, 140, "alterar_estagio", "Alterar Estágio dos Leads", Map.of("estagio", "Solicitação")));
        nodes.add(acao("tagRemarcou", 1860, 140, "adicionar_tag", "Adicionar tag", Map.of("tag", "Reagendamento solicitado")));
        nodes.add(acao("tagSemResposta", 1500, 320, "adicionar_tag", "Adicionar tag", Map.of("tag", "Não respondeu remarcação")));

        ligar(edges, "inicio", "msg1");
        ligar(edges, "msg1", "wait1");
        ligar(edges, "wait1", "cond1");
        ligarComHandle(edges, "cond1", "estagioSolicitacao", "sim1");
        ligar(edges, "estagioSolicitacao", "tagRemarcou");
        ligarComHandle(edges, "cond1", "tagSemResposta", HANDLE_FALLBACK);

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
        s.setGroupsJson("[[{\"field\":\"tag\",\"op\":\"contém\",\"value\":\"" + NOME_ETAPA_NAO_COMPARECEU + "\"}]]");
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
