package br.com.sorria.crm.automacao;

import br.com.sorria.crm.contact.Contato;
import br.com.sorria.crm.contact.ContatoRepository;
import br.com.sorria.crm.contact.ContatoService;
import br.com.sorria.crm.contact.SubstituicaoVariaveis;
import br.com.sorria.crm.conversa.Mensagem;
import br.com.sorria.crm.conversa.MensagemRepository;
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

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.LocalTime;
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
// - No "aguardar_mensagem": marca a execucao como parada (status "aguardando_resposta"). Quem
//   retoma de verdade e' MensagemService.retomarExecucoesAguardandoResposta (Fase 4), chamado toda
//   vez que o webhook do Evolution recebe uma resposta real do contato (tag "Automação: respondeu").
//   Com um prazo configurado no no (FlowNode.jsx), processarAvancos tambem retoma sozinho quando o
//   prazo estoura sem resposta (tag "Automação: sem resposta") - ainda sem ramificacao de verdade no
//   grafo (o motor so segue a primeira aresta de cada no), entao os dois casos seguem o MESMO
//   caminho depois - a diferenca fica registrada so pela tag, pra filtrar/comparar em Segmentacoes.
@Service
@RequiredArgsConstructor
@Slf4j
public class AutomacaoEngineService {

    // Mesmo PISO do CampanhaService.disparar (elevado de 3s pra 50s em 04/08/2026, apos a
    // automacao virar canal principal e reduzir volume/velocidade de disparo em massa) -
    // sem campo de "intervaloSegundos" configuravel por fluxo ainda (diferente de Campanha),
    // entao fica fixo no piso, com jitter de ate 40% entre cada mensagem de WhatsApp
    // enviada no mesmo tick, pra nao mandar uma rajada de mensagens identicas em sequencia.
    private static final int INTERVALO_PACING_SEGUNDOS = 50;
    // "Digitando" antes de cada mensagem - mesma faixa (1.5-3.5s) do CampanhaService/
    // Sorr.ia Protect. Aqui soma ao intervalo (nao "come" o final da pausa como no
    // CampanhaService) - a estrutura em tick nao conhece o proximo contato com antecedencia,
    // entao e' mais simples digitar pro MESMO contato antes de mandar pra ele.
    private static final int DIGITANDO_MIN_MS = 1500;
    private static final int DIGITANDO_VARIACAO_MS = 2000;

    private final FluxoAutomacaoRepository fluxoAutomacaoRepository;
    private final ExecucaoFluxoRepository execucaoFluxoRepository;
    private final SegmentacaoRepository segmentacaoRepository;
    private final ContatoRepository contatoRepository;
    private final ContatoService contatoService;
    private final SegmentacaoMatcher segmentacaoMatcher;
    private final EvolutionApiClient evolutionApiClient;
    private final MensagemService mensagemService;
    private final MensagemRepository mensagemRepository;
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
    // Tambem pega execucoes "aguardando_resposta" cujo PRAZO configurado no no (ver
    // executarNoAcao/"aguardar_mensagem") ja passou - sem prazo configurado, proximaExecucaoEm
    // fica null e a linha nunca cai aqui (continua esperando pra sempre, comportamento antigo).
    private void processarAvancos() {
        LocalDateTime agora = LocalDateTime.now();
        List<ExecucaoFluxo> pendentes = execucaoFluxoRepository.findByStatusAndProximaExecucaoEmLessThanEqual("ativo", agora);
        List<ExecucaoFluxo> expiradas = execucaoFluxoRepository.findByStatusAndProximaExecucaoEmLessThanEqual("aguardando_resposta", agora);
        for (ExecucaoFluxo execucao : pendentes) {
            try {
                avancarUmPasso(execucao, false);
            } catch (Exception e) {
                log.error("Falha ao avancar execucao {} (fluxo {}, contato {}): {}",
                        execucao.getId(), execucao.getFluxoId(), execucao.getContatoId(), e.getMessage(), e);
            }
        }
        for (ExecucaoFluxo execucao : expiradas) {
            try {
                avancarUmPasso(execucao, true);
            } catch (Exception e) {
                log.error("Falha ao avancar execucao {} apos prazo esgotado (fluxo {}, contato {}): {}",
                        execucao.getId(), execucao.getFluxoId(), execucao.getContatoId(), e.getMessage(), e);
            }
        }
    }

    private static final String TAG_SEM_RESPOSTA = "Automação: sem resposta";
    private static final String TAG_RESPONDEU = "Automação: respondeu";

    private void avancarUmPasso(ExecucaoFluxo execucao, boolean prazoEsgotado) throws JsonProcessingException {
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
        // Percepcao de resposta: marca o desfecho do "aguardar_mensagem" antes de
        // seguir pro proximo no - nao muda o caminho do grafo (o motor ainda nao
        // suporta ramificacao de verdade), mas deixa o resultado rastreavel/
        // filtravel em Segmentacoes (contem "Automação: sem resposta" etc.).
        if (prazoEsgotado) {
            contatoService.adicionarTag(contato.getId(), TAG_SEM_RESPOSTA);
        }

        List<NoFluxo> nos = parseNodes(fluxo.getNodesJson());
        List<ArestaFluxo> arestas = parseEdges(fluxo.getEdgesJson());
        Map<String, NoFluxo> nosPorId = nos.stream().collect(Collectors.toMap(NoFluxo::id, n -> n, (a, b) -> a));

        String noAtualId = execucao.getNoAtualId() != null ? execucao.getNoAtualId() : "inicio";
        // No "condicao" e' transparente: nao e' um passo visivel (nao manda mensagem, nao
        // demora), so decide qual aresta seguir - por isso o loop resolve quantos nos de
        // condicao encadeados forem precisos DENTRO do mesmo tick, e so para quando acha
        // um no de verdade (ou esgota o grafo). Guarda de seguranca contra loop configurado
        // errado no editor (condicao apontando pra condicao apontando pra ela mesma etc.).
        NoFluxo proximo = null;
        for (int saltos = 0; saltos < 20; saltos++) {
            String proximoId = resolverProximoId(noAtualId, arestas, nosPorId, contato);
            if (proximoId == null) {
                concluir(execucao);
                return;
            }
            NoFluxo candidato = nosPorId.get(proximoId);
            if (candidato == null || "placeholder".equals(candidato.type())) {
                concluir(execucao);
                return;
            }
            if (!"condicao".equals(candidato.type())) {
                proximo = candidato;
                break;
            }
            noAtualId = candidato.id();
        }
        if (proximo == null) {
            log.warn("Fluxo {} com nos de condicao encadeados demais (ou em loop) a partir da execucao {}",
                    fluxo.getId(), execucao.getId());
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
        // proximaExecucaoEm serve pros dois propositos aqui: pro tick normal ("ativo"),
        // quando avancar de novo; pro "aguardando_resposta", o PRAZO (se configurado) -
        // null significa espera pra sempre, um valor real vira o timeout que processarAvancos
        // usa pra pegar essa linha de volta mesmo sem resposta nenhuma do lead.
        execucao.setProximaExecucaoEm(resultado.proximaExecucaoEm());
        execucaoFluxoRepository.save(execucao);
    }

    private ResultadoNo executarNoMensagem(Contato contato, Map<String, Object> data) {
        Object textoBruto = data.get("texto");
        String texto = textoBruto != null ? String.valueOf(textoBruto) : null;
        if (texto != null && !texto.isBlank()) {
            enviarMensagemComPacing(contato, SubstituicaoVariaveis.aplicar(texto, contato));
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
            case "pausar_horario_comercial" -> {
                // Segunda peca do Bot Matriz (Kommo) que faltava: prende a execucao ate
                // o proximo horario permitido em vez de mandar mensagem de madrugada/fim
                // de semana. Transparente pro fluxo (so atrasa proximaExecucaoEm) - nao
                // muda status nem consome um "passo visivel" alem desse.
                LocalDateTime proximo = proximoHorarioComercial(
                        textoOuNull(data.get("horaInicio")), textoOuNull(data.get("horaFim")),
                        !Boolean.FALSE.equals(data.get("diasUteis")));
                return new ResultadoNo("ativo", proximo != null ? proximo : LocalDateTime.now());
            }
            case "aguardar_mensagem" -> {
                // prazoDias=0 (ou ausente) mantem o comportamento antigo: espera pra
                // sempre, sem timeout (ver FlowNode.jsx). Com prazo > 0, processarAvancos
                // pega essa linha de volta mesmo sem resposta - ver TAG_SEM_RESPOSTA.
                int prazoDias = comoInteiro(data.get("prazoDias"), 0);
                LocalDateTime prazo = prazoDias > 0 ? LocalDateTime.now().plusDays(prazoDias) : null;
                return new ResultadoNo("aguardando_resposta", prazo);
            }
            default -> log.warn("Tipo de acao desconhecido \"{}\" no fluxo {}, no {}", tipo, fluxo.getId(), no.id());
        }
        return new ResultadoNo("ativo", LocalDateTime.now());
    }

    // null quando AGORA ja esta dentro do horario permitido (segue direto,
    // sem atraso nenhum); senao, o proximo instante valido (hoje mais tarde,
    // ou o "horaInicio" de um proximo dia valido) - guarda de 8 dias e' so
    // seguranca (nunca deveria precisar de mais que 1 semana pra achar um
    // dia util, mesmo com feriados nao considerados aqui).
    private LocalDateTime proximoHorarioComercial(String horaInicioStr, String horaFimStr, boolean apenasDiasUteis) {
        LocalTime inicio = parseHora(horaInicioStr, LocalTime.of(8, 0));
        LocalTime fim = parseHora(horaFimStr, LocalTime.of(19, 0));
        LocalDateTime agora = LocalDateTime.now();
        if (dentroDoHorarioComercial(agora, inicio, fim, apenasDiasUteis)) return null;

        LocalDate dia = agora.toLocalDate();
        for (int i = 0; i < 8; i++) {
            boolean diaValido = !apenasDiasUteis || dia.getDayOfWeek().getValue() <= 5; // 1=segunda .. 5=sexta
            if (diaValido) {
                LocalDateTime candidato = LocalDateTime.of(dia, inicio);
                if (candidato.isAfter(agora)) return candidato;
            }
            dia = dia.plusDays(1);
        }
        return LocalDateTime.of(dia, inicio);
    }

    private static boolean dentroDoHorarioComercial(LocalDateTime momento, LocalTime inicio, LocalTime fim, boolean apenasDiasUteis) {
        if (apenasDiasUteis && momento.getDayOfWeek().getValue() > 5) return false;
        LocalTime hora = momento.toLocalTime();
        return !hora.isBefore(inicio) && hora.isBefore(fim);
    }

    private static LocalTime parseHora(String valor, LocalTime padrao) {
        if (valor == null || valor.isBlank()) return padrao;
        try {
            return LocalTime.parse(valor.length() > 5 ? valor.substring(0, 5) : valor);
        } catch (Exception e) {
            return padrao;
        }
    }

    // Par (status, proximo horario) que uma execucao de no devolve - com status
    // "aguardando_resposta", proximaExecucaoEm null = espera pra sempre (so a Fase
    // 4/webhook retoma), um valor real = prazo/timeout (ver processarAvancos).
    private record ResultadoNo(String status, LocalDateTime proximaExecucaoEm) {
    }

    private void enviarMensagemComPacing(Contato contato, String texto) {
        // "Digitando" pro mesmo contato antes de mandar (mesmo padrao do
        // AquecimentoService) - tokenInstancia nulo cai pro numero principal
        // dentro de simularDigitando (ver EvolutionApiClient).
        int digitandoMs = DIGITANDO_MIN_MS + ThreadLocalRandom.current().nextInt(DIGITANDO_VARIACAO_MS);
        evolutionApiClient.simularDigitando(null, contato.getTelefone(), digitandoMs);

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

    // Qual aresta seguir a partir de "noAtualId". Pra qualquer no normal, e' sempre a
    // primeira aresta que sai dele (comportamento antigo, sem ramificacao). Quando
    // "noAtualId" e' um no "condicao", em vez disso resolve o HANDLE certo (qual
    // condicao bateu, ou o fallback) e segue so a aresta que sai desse handle.
    private String resolverProximoId(String noAtualId, List<ArestaFluxo> arestas, Map<String, NoFluxo> nosPorId, Contato contato) {
        NoFluxo noAtual = nosPorId.get(noAtualId);
        if (noAtual != null && "condicao".equals(noAtual.type())) {
            String handle = resolverHandleCondicao(noAtual, contato);
            return arestas.stream()
                    .filter(a -> noAtualId.equals(a.source()) && handle.equals(a.sourceHandle()))
                    .map(ArestaFluxo::target)
                    .findFirst().orElse(null);
        }
        return arestas.stream()
                .filter(a -> noAtualId.equals(a.source()))
                .map(ArestaFluxo::target)
                .findFirst().orElse(null);
    }

    // ID do handle de saida do no "condicao" que deve ser seguido: o id da primeira
    // condicao (na ordem configurada no editor) cujo operador bate com o TEXTO da
    // ultima mensagem ENTRADA do contato, ou HANDLE_FALLBACK_CONDICAO quando nenhuma
    // bate (ou o lead nunca mandou mensagem nenhuma) - espelha o "Nenhuma das
    // condicoes" da referencia Kommo (Bot Matriz).
    private static final String HANDLE_FALLBACK_CONDICAO = "__fallback__";

    private String resolverHandleCondicao(NoFluxo no, Contato contato) {
        Map<String, Object> data = no.data() != null ? no.data() : Map.of();
        List<Map<String, Object>> condicoes = comoLista(data.get("condicoes"));
        String texto = mensagemRepository.findFirstByContatoIdAndDirecaoOrderByCriadoEmDesc(contato.getId(), "ENTRADA")
                .map(Mensagem::getTexto).orElse("");
        for (Map<String, Object> condicao : condicoes) {
            String operador = textoOuNull(condicao.get("operador"));
            String valor = textoOuNull(condicao.get("valor"));
            String handleId = textoOuNull(condicao.get("id"));
            if (handleId == null) continue;
            if (condicaoBate(operador, valor, texto)) return handleId;
        }
        return HANDLE_FALLBACK_CONDICAO;
    }

    private static boolean condicaoBate(String operador, String valorCondicao, String textoRecebido) {
        String texto = textoRecebido == null ? "" : textoRecebido.toLowerCase().trim();
        String valor = valorCondicao == null ? "" : valorCondicao.toLowerCase().trim();
        return switch (operador == null ? "" : operador) {
            case "nao_contem" -> !texto.contains(valor);
            case "igual" -> texto.equals(valor);
            case "diferente" -> !texto.equals(valor);
            default -> !valor.isBlank() && texto.contains(valor); // "contem" (padrao)
        };
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

    @SuppressWarnings("unchecked")
    private static List<Map<String, Object>> comoLista(Object valor) {
        return valor instanceof List ? (List<Map<String, Object>>) valor : List.of();
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
