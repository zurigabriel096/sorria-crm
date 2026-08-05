package br.com.sorria.crm.automacao;

import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.boot.CommandLineRunner;
import org.springframework.stereotype.Component;

import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

// Migracao pontual (05/08/2026): o fluxo "Não compareceu à consulta - modelo"
// ja foi seedado (ver FluxoNaoCompareceuSeedInitializer) ANTES do Samuel pedir
// a reativacao inicial pra quem nao respondeu a primeira tentativa. Como o
// seed so roda uma vez (guarda por nome), so editar o arquivo-fonte nao
// alcanca quem ja foi salvo - precisa de UPDATE estrutural de verdade
// (adicionar nos/arestas no JSON ja salvo, nao so REPLACE de texto). Idempotente
// (checa se "wait2" ja existe antes de adicionar de novo). Nao-fatal.
@Component
@RequiredArgsConstructor
@Slf4j
public class ReativacaoNaoCompareceuMigrationInitializer implements CommandLineRunner {

    private static final String NOME_FLUXO = "Não compareceu à consulta - modelo";
    private static final String HANDLE_FALLBACK = "__fallback__";

    private final FluxoAutomacaoRepository fluxoAutomacaoRepository;
    private final ObjectMapper objectMapper;

    @Override
    public void run(String... args) {
        try {
            migrar();
        } catch (Exception e) {
            log.error("Falha na migracao de reativacao do fluxo '{}' (nao-fatal): {}", NOME_FLUXO, e.getMessage(), e);
        }
    }

    private void migrar() throws Exception {
        FluxoAutomacao fluxo = fluxoAutomacaoRepository.findAll().stream()
                .filter(f -> NOME_FLUXO.equals(f.getNome()))
                .findFirst().orElse(null);
        if (fluxo == null) return; // seed ainda nao rodou - a versao nova do seed ja nasce com a reativacao

        List<Map<String, Object>> nodes = objectMapper.readValue(fluxo.getNodesJson(), new TypeReference<List<Map<String, Object>>>() {});
        List<Map<String, Object>> edges = objectMapper.readValue(fluxo.getEdgesJson(), new TypeReference<List<Map<String, Object>>>() {});

        if (nodes.stream().anyMatch(n -> "wait2".equals(n.get("id")))) return; // ja migrado

        nodes.add(acao("wait2", 1860, 320, "aguardar_mensagem", "Aguardar mensagens do contato", Map.of("prazoDias", 2)));
        nodes.add(mensagem("msg2", 2220, 320,
                "Oi {nome}! Ainda dá tempo de remarcar sua consulta na Orthodontic 😊 Me diga um dia que funcione melhor pra você, ou responda SIM que eu já te ajudo a encontrar um horário."));
        nodes.add(condicao("cond2", 2580, 320, List.of(
                Map.of("id", "sim2", "operador", "contem", "valor", "sim")
        )));
        nodes.add(acao("tagFrio", 2940, 480, "adicionar_tag", "Adicionar tag", Map.of("tag", "Sem resposta - reativação inicial")));

        ligar(edges, "tagSemResposta", "wait2");
        ligar(edges, "wait2", "msg2");
        ligar(edges, "msg2", "cond2");
        ligarComHandle(edges, "cond2", "estagioSolicitacao", "sim2");
        ligarComHandle(edges, "cond2", "tagFrio", HANDLE_FALLBACK);

        fluxo.setNodesJson(objectMapper.writeValueAsString(nodes));
        fluxo.setEdgesJson(objectMapper.writeValueAsString(edges));
        fluxoAutomacaoRepository.save(fluxo);

        log.info("Migracao aplicada: fluxo '{}' ganhou a reativacao inicial (wait2/msg2/cond2/tagFrio).", NOME_FLUXO);
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
