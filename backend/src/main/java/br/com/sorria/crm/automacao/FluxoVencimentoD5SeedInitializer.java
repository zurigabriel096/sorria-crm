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

// Fluxo-modelo pedido pelo Samuel (05/08/2026): primeiro passo da jornada
// PREVENTIVA de inadimplencia (lembrete antes do vencimento, D-5) - briefing
// completo em SESSAO_2026-08-05.md. Pra equipe SO AJUSTAR, criado JA INATIVO,
// mesmo cuidado dos outros seeds (CommandLineRunner nao-fatal de proposito).
//
// Depende do Campo Personalizado "Data de Vencimento" (tipo DATA) - AINDA NAO
// EXISTE na base nesta data, precisa ser criado na tela de importacao (opcao
// "+ Criar campo novo") quando a planilha com a proxima data de vencimento for
// importada. Sem esse campo preenchido, a Segmentacao nunca bate com ninguem -
// nao e' um bug, e' so falta de dado ainda.
//
// Por que um fluxo SEPARADO por dia (D-5/D-1/D0) em vez de 1 fluxo so com
// "atraso" entre mensagens: o operador "faltam" exige igualdade EXATA
// (diasRestantes == N, ver SegmentacaoMatcher) - um contato cuja data de
// vencimento so entra no sistema DEPOIS do D-5 (ex.: importado no D-3) ainda
// bate certinho no fluxo D-1 se for fluxo independente, mas jamais dispararia
// um D-1 encadeado dentro de uma execucao que nunca comecou no D-5. Mesmo
// padrao ja usado nos 3 fluxos de cobranca (suave/firme/ultima chamada).
@Component
@RequiredArgsConstructor
@Slf4j
public class FluxoVencimentoD5SeedInitializer implements CommandLineRunner {

    private static final String NOME_CAMPO_VENCIMENTO = "Data de Vencimento";
    private static final String NOME_SEGMENTACAO = "Fatura vence em 5 dias";
    private static final String NOME_FLUXO = "Preventivo: vence em 5 dias (D-5) - modelo";

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
                "Oi {nome}! Passando pra lembrar que sua mensalidade vence dia {" + NOME_CAMPO_VENCIMENTO
                        + "}. Qualquer dúvida, é só responder por aqui 🙂"));

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
        s.setGroupsJson("[[{\"field\":\"custom:DATA:" + NOME_CAMPO_VENCIMENTO + "\",\"op\":\"faltam\",\"value\":5}]]");
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
