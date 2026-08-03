package br.com.sorria.crm.automacao;

import br.com.sorria.crm.contact.Contato;
import br.com.sorria.crm.contact.ContatoRepository;
import br.com.sorria.crm.contact.ContatoService;
import br.com.sorria.crm.conversa.MensagemService;
import br.com.sorria.crm.segment.Segmentacao;
import br.com.sorria.crm.segment.SegmentacaoRepository;
import br.com.sorria.crm.whatsapp.EvolutionApiClient;
import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Map;
import java.util.concurrent.ThreadLocalRandom;
import java.util.stream.Collectors;

// Motor de execucao de verdade dos fluxos visuais (frontend/src/components/automacao/*):
// enquanto isso era so um construtor persistido (Fases 1-2), aqui e' onde FluxoAutomacao.ativo=true
// passa a mexer em leads reais - grava tag/estagio, manda WhatsApp de verdade via
// EvolutionApiClient. Ver plano completo em glowing-strolling-spring.md (Fases 3-5) e o aviso de
// seguranca no CONTEXTO_PROJETO.md: uma vez deployado, qualquer fluxo ja ativo no banco comeca a
// rodar assim que o Render sobe essa versao. Fase 5 (corte de seguranca): FluxoAutomacao.contatoTesteId,
// quando preenchido, restringe o fluxo a rodar so pra esse contato - ver processarEntradaDeUmFluxo.
//
// Desenho: um "tick" a cada 30s (nao @Transactional na classe de proposito - o pacing entre envios
// de mensagem usa Thread.sleep, igual ao CampanhaService.disparar, e uma transacao segurando
// conexao de banco durante o sleep e' exatamente o problema que aquele comentario evita) avanca no
// MAXIMO um no do grafo por execucao por tick. Isso da uma cadencia natural (~30s entre passos de
// um mesmo contato) sem precisar de fila/thread pool proprio - simples o bastante pra uma primeira
// versao, mais lento que um motor "de verdade" mas seguro por padrao.
//
// Simplificacoes conscientes (documentadas, nao esquecidas):
// - "entrada.modoEntrada" ("futuros" vs "futurosEExistentes") nao e' diferenciado - Contato nao tem
//   um campo de data de criacao pra saber quem e' "novo desde que o fluxo ligou", entao todo contato
//   que bate com a segmentacao entra (dedup por ExecucaoFluxo existente evita reentrada).
// - "entrada.tipoCondicao === automacaoMarketing" ainda nao tem gatilho real (so texto livre no
//   editor, ver CONTEXTO_PROJETO.md) - fluxos configurados assim nunca ganham execucao nova.
// - No de mensagem: so o campo "texto" e' enviado de verdade - "imagem"/"blocosConteudo" (anexos)
//   nao tem suporte no EvolutionApiClient hoje (so /send/text, sem endpoint de midia).
// - No "aguardar_mensagem": so marca a execucao como parada (status "aguardando_resposta") - quem
//   retoma e' MensagemService.retomarExecucoesAguardandoResposta (Fase 4), chamado toda vez que o
//   webhook do Evolution recebe uma resposta de verdade do contato.
@Service
@RequiredArgsConstructor
@Slf4j
public class AutomacaoEngineService {

    // Mesmo padrao de pacing do CampanhaService.disparar: pausa base + jitter de ate 40% entre
    // cada mensagem de WhatsApp enviada no mesmo tick, pra nao mandar uma rajada de mensagens
    // identicas em sequencia perfeita (padrao que servicos anti-spam do WhatsApp podem flagar).
    private static final int INTERVALO_PACING_SEGUNDOS = 3;

    private final FluxoAutomacaoRepository fluxoAutomacaoRepository;
    private final ExecucaoFluxoRepository execucaoFluxoRepository;
    private final SegmentacaoRepository segmentacaoRepository;
    private final ContatoRepository contatoRepository;
    private final ContatoService contatoService;
    private final SegmentacaoMatcher segmentacaoMatcher;
    private final EvolutionApiClient evolutionApiClient;
    private final MensagemService mensagemService;
    private final ObjectMapper objectMapper;

    @Scheduled(fixedDelay = 30_000)
    public void executar() {
        processarEntradas();
        processarAvancos();
    }

    // Pra cada fluxo ativo, resolve quem bate com a segmentacao de entrada e cria uma
    // ExecucaoFluxo nova pros que ainda nao tem uma (evita duplicar, mesmo padrao de dedup
    // do CampanhaService via existsBy...).
    private void processarEntradas() {
        for (FluxoAutomacao fluxo : fluxoAutomacaoRepository.findByAtivoTrue()) {
            try {
                processarEntradaDeUmFluxo(fluxo);
            } catch (Exception e) {
                log.error("Falha ao processar entrada do fluxo de automacao {}: {}", fluxo.getId(), e.getMessage(), e);
            }
        }
    }

    private void processarEntradaDeUmFluxo(FluxoAutomacao fluxo) throws JsonProcessingException {
        // Corte de seguranca (Fase 5): com contato de teste configurado, ignora a
        // segmentacao de entrada por completo - o fluxo so roda pra esse contato,
        // mesmo que ele nao bata com o publico real. Deixa o ADMIN validar o ciclo
        // inteiro (mensagem, tag, aguardar resposta) num numero real e controlado
        // antes de tirar o campo e liberar pra quem realmente bate com a segmentacao.
        if (fluxo.getContatoTesteId() != null) {
            criarExecucaoSeNaoExiste(fluxo, fluxo.getContatoTesteId());
            return;
        }

        NoFluxo inicio = parseNodes(fluxo.getNodesJson()).stream()
                .filter(n -> "start".equals(n.type()))
                .findFirst().orElse(null);
        if (inicio == null || inicio.data() == null) return;

        Map<String, Object> entrada = comoMapa(inicio.data().get("entrada"));
        if (!"segmentacao".equals(entrada.get("tipoCondicao"))) return; // automacaoMarketing: sem gatilho real ainda

        Map<String, Object> segmentacaoRef = comoMapa(entrada.get("segmentacao"));
        Long segmentacaoId = comoLong(segmentacaoRef.get("id"));
        if (segmentacaoId == null) return;

        Segmentacao segmentacao = segmentacaoRepository.findById(segmentacaoId).orElse(null);
        if (segmentacao == null || Boolean.TRUE.equals(segmentacao.getArquivado())) return;

        for (Contato contato : contatoRepository.findAll()) {
            if (!segmentacaoMatcher.bate(contato, segmentacao)) continue;
            criarExecucaoSeNaoExiste(fluxo, contato.getId());
        }
    }

    private void criarExecucaoSeNaoExiste(FluxoAutomacao fluxo, Long contatoId) {
        if (execucaoFluxoRepository.existsByFluxoIdAndContatoId(fluxo.getId(), contatoId)) return;
        ExecucaoFluxo execucao = new ExecucaoFluxo();
        execucao.setFluxoId(fluxo.getId());
        execucao.setContatoId(contatoId);
        execucaoFluxoRepository.save(execucao);
    }

    // Avanca UM no do grafo pra cada execucao cuja hora ja chegou. Uma execucao por vez, uma
    // exception numa nao derruba as outras (mesmo padrao de isolamento de processarEntradas).
    private void processarAvancos() {
        LocalDateTime agora = LocalDateTime.now();
        List<ExecucaoFluxo> pendentes = execucaoFluxoRepository.findByStatusAndProximaExecucaoEmLessThanEqual("ativo", agora);
        for (ExecucaoFluxo execucao : pendentes) {
            try {
                avancarUmPasso(execucao);
            } catch (Exception e) {
                log.error("Falha ao avancar execucao {} (fluxo {}, contato {}): {}",
                        execucao.getId(), execucao.getFluxoId(), execucao.getContatoId(), e.getMessage(), e);
            }
        }
    }

    private void avancarUmPasso(ExecucaoFluxo execucao) throws JsonProcessingException {
        FluxoAutomacao fluxo = fluxoAutomacaoRepository.findById(execucao.getFluxoId()).orElse(null);
        if (fluxo == null || !Boolean.TRUE.equals(fluxo.getAtivo())) {
            concluir(execucao);
            return;
        }
        Contato contato = contatoRepository.findById(execucao.getContatoId()).orElse(null);
        if (contato == null) {
            concluir(execucao);
            return;
        }

        List<NoFluxo> nos = parseNodes(fluxo.getNodesJson());
        List<ArestaFluxo> arestas = parseEdges(fluxo.getEdgesJson());
        Map<String, NoFluxo> nosPorId = nos.stream().collect(Collectors.toMap(NoFluxo::id, n -> n, (a, b) -> a));

        String noAtualId = execucao.getNoAtualId() != null ? execucao.getNoAtualId() : "inicio";
        String proximoId = arestas.stream()
                .filter(a -> noAtualId.equals(a.source()))
                .map(ArestaFluxo::target)
                .findFirst().orElse(null);
        if (proximoId == null) {
            concluir(execucao);
            return;
        }

        NoFluxo proximo = nosPorId.get(proximoId);
        if (proximo == null || "placeholder".equals(proximo.type())) {
            concluir(execucao);
            return;
        }

        Map<String, Object> data = proximo.data() != null ? proximo.data() : Map.of();
        ResultadoNo resultado = switch (proximo.type()) {
            case "mensagem" -> executarNoMensagem(contato, data);
            case "action" -> executarNoAcao(fluxo, proximo, contato, data);
            default -> {
                log.warn("Tipo de no desconhecido \"{}\" no fluxo {}, no {}", proximo.type(), fluxo.getId(), proximo.id());
                yield new ResultadoNo("ativo", LocalDateTime.now());
            }
        };

        execucao.setNoAtualId(proximo.id());
        execucao.setStatus(resultado.status());
        execucao.setProximaExecucaoEm("aguardando_resposta".equals(resultado.status()) ? null : resultado.proximaExecucaoEm());
        execucaoFluxoRepository.save(execucao);
    }

    private ResultadoNo executarNoMensagem(Contato contato, Map<String, Object> data) {
        Object textoBruto = data.get("texto");
        String texto = textoBruto != null ? String.valueOf(textoBruto) : null;
        if (texto != null && !texto.isBlank()) {
            enviarMensagemComPacing(contato, texto.replace("{nome}", primeiroNome(contato.getNome())));
        }
        Map<String, Object> atraso = comoMapa(data.get("atraso"));
        long segundosAtraso = comoInteiro(atraso.get("dias"), 0) * 86400L
                + comoInteiro(atraso.get("horas"), 0) * 3600L
                + comoInteiro(atraso.get("minutos"), 0) * 60L
                + comoInteiro(atraso.get("segundos"), 0);
        return new ResultadoNo("ativo", LocalDateTime.now().plusSeconds(segundosAtraso));
    }

    private ResultadoNo executarNoAcao(FluxoAutomacao fluxo, NoFluxo no, Contato contato, Map<String, Object> data) {
        Object tipoBruto = data.get("tipo");
        String tipo = tipoBruto != null ? String.valueOf(tipoBruto) : "";
        switch (tipo) {
            case "adicionar_tag" -> contatoService.adicionarTag(contato.getId(), textoOuNull(data.get("tag")));
            case "remover_tag" -> contatoService.removerTag(contato.getId(), textoOuNull(data.get("tag")));
            case "alterar_estagio" -> contatoService.alterarEstagio(contato.getId(), textoOuNull(data.get("estagio")));
            case "esperar_segundos" -> {
                int segundos = comoInteiro(data.get("segundos"), 30);
                return new ResultadoNo("ativo", LocalDateTime.now().plusSeconds(segundos));
            }
            case "aguardar_mensagem" -> {
                return new ResultadoNo("aguardando_resposta", null);
            }
            default -> log.warn("Tipo de acao desconhecido \"{}\" no fluxo {}, no {}", tipo, fluxo.getId(), no.id());
        }
        return new ResultadoNo("ativo", LocalDateTime.now());
    }

    // Par (status, proximo horario) que uma execucao de no devolve - status "aguardando_resposta"
    // ignora proximaExecucaoEm (fica null, so a Fase 4/webhook retoma).
    private record ResultadoNo(String status, LocalDateTime proximaExecucaoEm) {
    }

    private String primeiroNome(String nomeCompleto) {
        if (nomeCompleto == null || nomeCompleto.isBlank()) return "";
        return nomeCompleto.trim().split("\\s+")[0];
    }

    private void enviarMensagemComPacing(Contato contato, String texto) {
        String status = evolutionApiClient.enviarMensagem(contato.getTelefone(), texto);
        // Sem isso, mensagem de fluxo nao aparecia no Kanban (Conversas.jsx) nem
        // atualizava Contato.ultimaMensagemEm - a Fila de Trabalho nao sabia que a
        // automacao tinha acabado de falar com o lead. Numero principal sempre
        // (FluxoAutomacao nao tem campo de numero alternativo).
        if ("Entregue".equals(status)) {
            mensagemService.registrarSaidaExterna(contato.getId(), null, texto);
        }
        try {
            int jitterMs = ThreadLocalRandom.current().nextInt(0, (int) (INTERVALO_PACING_SEGUNDOS * 1000 * 0.4) + 1);
            Thread.sleep(INTERVALO_PACING_SEGUNDOS * 1000L + jitterMs);
        } catch (InterruptedException e) {
            Thread.currentThread().interrupt();
        }
    }

    private void concluir(ExecucaoFluxo execucao) {
        execucao.setStatus("concluido");
        execucao.setProximaExecucaoEm(null);
        execucaoFluxoRepository.save(execucao);
    }

    private List<NoFluxo> parseNodes(String nodesJson) throws JsonProcessingException {
        return objectMapper.readValue(nodesJson, new TypeReference<List<NoFluxo>>() {});
    }

    private List<ArestaFluxo> parseEdges(String edgesJson) throws JsonProcessingException {
        return objectMapper.readValue(edgesJson, new TypeReference<List<ArestaFluxo>>() {});
    }

    @SuppressWarnings("unchecked")
    private static Map<String, Object> comoMapa(Object valor) {
        return valor instanceof Map ? (Map<String, Object>) valor : Map.of();
    }

    private static Long comoLong(Object valor) {
        return valor instanceof Number n ? n.longValue() : null;
    }

    private static int comoInteiro(Object valor, int padrao) {
        return valor instanceof Number n ? n.intValue() : padrao;
    }

    private static String textoOuNull(Object valor) {
        return valor != null ? String.valueOf(valor) : null;
    }
}
