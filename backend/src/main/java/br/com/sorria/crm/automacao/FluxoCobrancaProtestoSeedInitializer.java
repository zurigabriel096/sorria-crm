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

// 5a condicional da lista aprovada pelo Samuel (05/08/2026): sinal de
// cobranca MAIS forte que os 3 estagios por dias (ver FluxoCobrancaSuave/
// Firme/UltimaChamadaSeedInitializer) - usa o Campo Personalizado real
// "Situação", que na planilha de inadimplentes vem como "PROTESTO" ou "A
// PROTESTAR" (achado ao ler a planilha original a pedido do Samuel). Os dois
// valores contem a substring "protest" (case-insensitive), entao uma unica
// condicao "contem" cobre ambos sem precisar de grupo OR.
//
// Suposicao documentada (nao confirmada por acesso a base): o campo
// "Situação" foi tratado aqui como Campo Personalizado tipo TEXTO (livre),
// nao LISTA - pareceu mais provavel porque o mesmo campo recebe valores
// diferentes vindos de planilhas diferentes ("TRATAMENTO" vs "PROTESTO"/"A
// PROTESTAR"), o que e' atipico pra uma LISTA de opcoes fixas. Se na
// realidade o campo foi cadastrado como LISTA, o unico ajuste necessario e'
// trocar "TEXTO" por "LISTA" na chave da condicao (tela de Segmentacoes),
// sem precisar de codigo novo.
@Component
@RequiredArgsConstructor
@Slf4j
public class FluxoCobrancaProtestoSeedInitializer implements CommandLineRunner {

    private static final String NOME_SEGMENTACAO = "Inadimplente em protesto";
    private static final String NOME_FLUXO = "Cobrança urgente (protesto) - modelo";
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
        nodes.add(no("inicio", "start", 60, 220, dataInicio));

        nodes.add(mensagem("msg1", 420, 220,
                "Oi {nome}, seu débito com a Orthodontic já está em processo de cobrança formal — {Atrasadas} parcela(s) em atraso, totalizando R$ {Tot. Atraso}. "
                        + "Ainda dá tempo de regularizar antes que isso avance. Responda RENEGOCIAR agora e resolvemos juntos."));
        nodes.add(acao("wait1", 780, 220, "aguardar_mensagem", "Aguardar mensagens do contato", Map.of("prazoDias", 1)));
        nodes.add(condicao("cond1", 1140, 220, List.of(
                Map.of("id", "sim1", "operador", "contem", "valor", "renegociar")
        )));
        nodes.add(acao("tagRenegociou", 1500, 140, "adicionar_tag", "Adicionar tag", Map.of("tag", "Renegociação solicitada")));
        nodes.add(acao("tagSemResposta", 1500, 320, "adicionar_tag", "Adicionar tag", Map.of("tag", "Cobrança urgente: sem resposta")));

        ligar(edges, "inicio", "msg1");
        ligar(edges, "msg1", "wait1");
        ligar(edges, "wait1", "cond1");
        ligarComHandle(edges, "cond1", "tagRenegociou", "sim1");
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
        s.setGroupsJson("[[{\"field\":\"financ\",\"op\":\"é\",\"value\":\"Inadimplente\"},{\"field\":\"custom:TEXTO:Situação\",\"op\":\"contém\",\"value\":\"protest\"}]]");
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
