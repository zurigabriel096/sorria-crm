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

// Fluxo-modelo pedido pelo Samuel (05/08/2026): confirmacao de consulta D-1,
// pronto pra equipe SO AJUSTAR (nao criar do zero) - ver SESSAO_2026-08-05.md.
// Criado JA INATIVO de proposito (mesmo cuidado do FluxoAutomacaoSeedInitializer):
// precisa de revisao manual antes de ativar. Tambem serve de EXEMPLO de verdade
// do no "condicao" (ramificacao real, adicionado na mesma sessao).
//
// Depende do operador "faltam" (SegmentacaoMatcher/Segmentacoes.jsx, tambem
// adicionado nesta sessao) pra disparar so quando faltar exatamente 1 dia pra
// consulta - usa um Campo Personalizado tipo DATA chamado "Data da consulta"
// como PLACEHOLDER: se a base do Samuel ja tiver um campo com nome diferente
// pra isso, so trocar o nome na condicao da Segmentacao (tela de Segmentacoes)
// ou renomear o campo pra bater - nao precisa mexer em codigo nenhum.
@Component
@RequiredArgsConstructor
@Slf4j
public class FluxoConfirmacaoConsultaSeedInitializer implements CommandLineRunner {

    private static final String NOME_CAMPO_DATA = "Data da consulta";
    private static final String NOME_SEGMENTACAO = "Consulta amanhã (D-1)";
    private static final String NOME_FLUXO = "Confirmação de consulta (D-1) - modelo";
    private static final String HANDLE_FALLBACK = "__fallback__";

    private final SegmentacaoRepository segmentacaoRepository;
    private final FluxoAutomacaoRepository fluxoAutomacaoRepository;
    private final ObjectMapper objectMapper;

    // Nao-fatal de proposito: um CommandLineRunner que lanca exception derruba
    // o boot inteiro (ja causou crash-loop de verdade neste projeto - ver
    // incidente WhatsAppNumero.finalidade em 05/08/2026). Falhar aqui so
    // significa que o fluxo-modelo nao foi criado ainda, nunca deve tirar o
    // sistema do ar.
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
                "Oi {nome}! Passando pra confirmar: sua consulta na Orthodontic é amanhã ({diasPara:" + NOME_CAMPO_DATA
                        + "} dia). Posso confirmar sua presença? Responda SIM pra confirmar ou REMARCAR se precisar mudar 🙂"));
        nodes.add(acao("wait1", 780, 260, "aguardar_mensagem", "Aguardar mensagens do contato", Map.of("prazoDias", 1)));
        nodes.add(condicao("cond1", 1140, 260, List.of(
                Map.of("id", "sim1", "operador", "contem", "valor", "sim"),
                Map.of("id", "remarcar1", "operador", "contem", "valor", "remarcar")
        )));
        nodes.add(acao("tagConfirmado", 1500, 140, "adicionar_tag", "Adicionar tag", Map.of("tag", "Consulta confirmada")));
        nodes.add(acao("estagioRemarcar", 1500, 300, "alterar_estagio", "Alterar Estágio dos Leads", Map.of("estagio", "Solicitação")));
        nodes.add(acao("tagRemarcar", 1860, 300, "adicionar_tag", "Adicionar tag", Map.of("tag", "Pediu remarcar")));
        nodes.add(acao("tagSemResposta", 1500, 440, "adicionar_tag", "Adicionar tag", Map.of("tag", "Sem resposta - confirmação consulta")));

        ligar(edges, "inicio", "msg1");
        ligar(edges, "msg1", "wait1");
        ligar(edges, "wait1", "cond1");
        ligarComHandle(edges, "cond1", "tagConfirmado", "sim1");
        ligarComHandle(edges, "cond1", "estagioRemarcar", "remarcar1");
        ligar(edges, "estagioRemarcar", "tagRemarcar");
        ligarComHandle(edges, "cond1", "tagSemResposta", HANDLE_FALLBACK);

        FluxoAutomacao fluxo = new FluxoAutomacao();
        fluxo.setNome(NOME_FLUXO);
        fluxo.setAtivo(false);
        fluxo.setNodesJson(objectMapper.writeValueAsString(nodes));
        fluxo.setEdgesJson(objectMapper.writeValueAsString(edges));
        fluxoAutomacaoRepository.save(fluxo);

        log.info("Seed: fluxo-modelo '{}' criado (inativo, precisa revisao - confira o nome do Campo Personalizado de data antes de ativar).", NOME_FLUXO);
    }

    private Segmentacao criarSegmentacao() {
        Segmentacao s = new Segmentacao();
        s.setNome(NOME_SEGMENTACAO);
        s.setGroupsJson("[[{\"field\":\"custom:DATA:" + NOME_CAMPO_DATA + "\",\"op\":\"faltam\",\"value\":1}]]");
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
