package br.com.sorria.crm.conversa;

import br.com.sorria.crm.automacao.ExecucaoFluxo;
import br.com.sorria.crm.automacao.ExecucaoFluxoRepository;
import br.com.sorria.crm.contact.Contato;
import br.com.sorria.crm.contact.ContatoRepository;
import br.com.sorria.crm.contact.ContatoService;
import br.com.sorria.crm.contact.ResultadoImportacaoLinha;
import br.com.sorria.crm.contact.dto.ContatoDTO;
import br.com.sorria.crm.conversa.dto.EnviarMensagemRequest;
import br.com.sorria.crm.conversa.dto.MensagemDTO;
import br.com.sorria.crm.user.Usuario;
import br.com.sorria.crm.user.UsuarioRepository;
import br.com.sorria.crm.whatsapp.EvolutionApiClient;
import br.com.sorria.crm.whatsapp.WhatsAppNumero;
import br.com.sorria.crm.whatsapp.WhatsAppNumeroRepository;
import com.fasterxml.jackson.databind.ObjectMapper;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.web.server.ResponseStatusException;

import java.time.Duration;
import java.time.LocalDateTime;
import java.util.List;
import java.util.Map;
import java.util.NoSuchElementException;
import java.util.Optional;

@Service
@RequiredArgsConstructor
@Slf4j
public class MensagemService {

    private static final String ENTRADA = "ENTRADA";
    private static final String SAIDA = "SAIDA";
    // Mesmo texto usado em Conversas.jsx (LEAD_SEM_NOME) pro card mostrar
    // "de: <telefone>" em vez do nome - aqui e' o sinal de que o proximo
    // ENTRADA desse contato deve ser interpretado como resposta a
    // PERGUNTA_NOME, nao como uma mensagem qualquer (ver registrarEntrada).
    private static final String LEAD_SEM_NOME = "Novo contato (WhatsApp)";
    private static final String PERGUNTA_NOME = "Oi! 🙂 Antes de continuar, qual é o seu nome?";
    // Aplicada sempre que o nome vem da captacao automatica (sem confirmacao
    // humana) - permite campanha pontual depois pra confirmar/completar o
    // cadastro de verdade (pedido do Samuel, 05/08/2026).
    private static final String TAG_CADASTRO_INCOMPLETO = "Cadastro incompleto (nome via WhatsApp)";
    // Janela de tolerancia pra tratar um ENTRADA como reentrega duplicada do
    // mesmo webhook (mesmo contato + mesmo texto ha pouco tempo) - rede de
    // seguranca pro caso do payload nao trazer id de mensagem reconhecido
    // (ver idDoPayload). Instancia oscilando/reconectando e' o cenario tipico
    // de reentrega (05/08/2026 - "ola" duplicado virou nome do contato).
    private static final Duration JANELA_DEDUP_WEBHOOK = Duration.ofSeconds(90);

    private final MensagemRepository mensagemRepository;
    private final ContatoRepository contatoRepository;
    private final ContatoService contatoService;
    private final UsuarioRepository usuarioRepository;
    private final WhatsAppNumeroRepository whatsAppNumeroRepository;
    private final EvolutionApiClient evolutionApiClient;
    private final ObjectMapper objectMapper;
    private final ExecucaoFluxoRepository execucaoFluxoRepository;

    // Rotulo amigavel pra cada tipo de midia que a Evolution manda no lugar de
    // "conversation" - so mostra um aviso por enquanto (visualizacao de verdade
    // depende de ver o formato real do payload, ainda nao confirmado).
    private static final Map<String, String> TIPOS_MIDIA = Map.of(
            "imageMessage", "📷 Imagem",
            "videoMessage", "🎥 Vídeo",
            "audioMessage", "🎤 Áudio",
            "documentMessage", "📄 Documento",
            "stickerMessage", "🩹 Figurinha"
    );

    public List<MensagemDTO> listar(Long contatoId, String emailUsuarioLogado) {
        exigirVisibilidade(contatoId, emailUsuarioLogado);
        return mensagemRepository.findByContatoIdOrderByCriadoEmAsc(contatoId).stream().map(this::toDTO).toList();
    }

    private void exigirVisibilidade(Long contatoId, String emailUsuarioLogado) {
        Contato contato = contatoRepository.findById(contatoId)
                .orElseThrow(() -> new NoSuchElementException("Contato nao encontrado: " + contatoId));
        if (!contatoService.podeVer(contato, emailUsuarioLogado)) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "Voce nao tem acesso a este lead.");
        }
    }

    // Envio avulso (fora do fluxo de campanha) - o "responder direto pelo Kanban".
    // numeroAlternativo fica marcado sempre que o envio usa um numero que NAO e
    // o principal (dono padrao da conversa) - so um registro pra auditoria,
    // nao impede o envio.
    public MensagemDTO enviar(Long contatoId, EnviarMensagemRequest req, String emailUsuarioLogado) {
        Contato contato = contatoRepository.findById(contatoId)
                .orElseThrow(() -> new NoSuchElementException("Contato nao encontrado: " + contatoId));
        if (!contatoService.podeVer(contato, emailUsuarioLogado)) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "Voce nao tem acesso a este lead.");
        }
        Usuario usuario = usuarioRepository.findByEmail(emailUsuarioLogado)
                .orElseThrow(() -> new NoSuchElementException("Usuario nao encontrado"));

        String token = null;
        String servidorUrl = null;
        if (req.whatsappNumeroId() != null) {
            WhatsAppNumero numero = whatsAppNumeroRepository.findById(req.whatsappNumeroId())
                    .orElseThrow(() -> new NoSuchElementException("Numero nao encontrado: " + req.whatsappNumeroId()));
            token = numero.getToken();
            servidorUrl = numero.getServidorUrl();
        }
        evolutionApiClient.enviarMensagem(contato.getTelefone(), req.texto(), token, servidorUrl);

        Mensagem mensagem = new Mensagem();
        mensagem.setContatoId(contatoId);
        mensagem.setWhatsappNumeroId(req.whatsappNumeroId());
        mensagem.setDirecao(SAIDA);
        mensagem.setTexto(req.texto());
        mensagem.setEnviadoPorUsuarioId(usuario.getId());
        mensagem.setNumeroAlternativo(req.whatsappNumeroId() != null);
        Mensagem salva = mensagemRepository.save(mensagem);
        atualizarUltimaMensagem(contato, salva);
        return toDTO(salva);
    }

    // Usado por CampanhaService/AutomacaoEngineService pra registrar no historico
    // real de conversa uma mensagem de WhatsApp que ja foi enviada de verdade fora
    // do reply avulso - sem isso, disparo de campanha/fluxo nao aparecia no Kanban
    // nem atualizava Contato.ultimaMensagemEm (Fila de Trabalho nao sabia que uma
    // mensagem tinha saido). enviadoPorUsuarioId fica null (nao foi um humano
    // respondendo, ver comentario de Mensagem.enviadoPorUsuarioId).
    public void registrarSaidaExterna(Long contatoId, Long whatsappNumeroId, String texto) {
        Contato contato = contatoRepository.findById(contatoId).orElse(null);
        if (contato == null) return;
        Mensagem mensagem = new Mensagem();
        mensagem.setContatoId(contatoId);
        mensagem.setWhatsappNumeroId(whatsappNumeroId);
        mensagem.setDirecao(SAIDA);
        mensagem.setTexto(texto);
        Mensagem salva = mensagemRepository.save(mensagem);
        atualizarUltimaMensagem(contato, salva);
    }

    // Denormalizado pra a futura Fila de Trabalho ordenar/filtrar por "tempo
    // sem resposta" sem consultar Mensagem por contato toda vez - essencial
    // em escala (ver analise "Kanban nao escala").
    private void atualizarUltimaMensagem(Contato contato, Mensagem mensagem) {
        contato.setUltimaMensagemEm(mensagem.getCriadoEm());
        contato.setUltimaMensagemDirecao(mensagem.getDirecao());
        contato.setUltimaMensagemTexto(mensagem.getTexto());
        contatoRepository.save(contato);
    }

    // Recebe o payload cru do webhook da Evolution (POST /api/whatsapp/webhook)
    // e grava como ENTRADA se o remetente bater com um contato conhecido. Falha
    // silenciosa de proposito (payload inesperado, contato desconhecido, evento
    // que nao e mensagem de texto) - webhook nao pode derrubar a conexao por causa
    // de um evento que nao sabemos processar.
    @SuppressWarnings("unchecked")
    public void registrarEntrada(Map<String, Object> payload, Long whatsappNumeroId) {
        Object dataObj = payload.get("data");
        if (!(dataObj instanceof Map)) return;
        Map<String, Object> data = (Map<String, Object>) dataObj;

        Object infoObj = data.get("Info");
        Object msgObj = data.get("Message");
        if (!(infoObj instanceof Map) || !(msgObj instanceof Map)) return;
        Map<String, Object> info = (Map<String, Object>) infoObj;
        Map<String, Object> msg = (Map<String, Object>) msgObj;

        String sender = String.valueOf(info.getOrDefault("Sender", ""));
        String[] extraido = extrairTexto(msg);
        String texto = extraido[0];
        String payloadBrutoMidia = extraido[1];
        if (sender.isBlank() || texto == null || texto.isBlank()) {
            log.info("Webhook Evolution ignorado (tipo de mensagem nao reconhecido ou sem remetente): {}", payload);
            return;
        }

        // Dedup por id de mensagem do provedor - reentrega exata do MESMO evento
        // (mesmo id) e' descartada aqui, antes de qualquer efeito (criar contato,
        // capturar nome, etc.).
        String mensagemExternaId = idDoPayload(info);
        if (!mensagemExternaId.isBlank() && mensagemRepository.existsByMensagemExternaId(mensagemExternaId)) {
            log.info("Webhook Evolution ignorado (reentrega duplicada, id={})", mensagemExternaId);
            return;
        }

        String telefone = sender.split("[:@]")[0].replaceAll("\\D", "");
        List<Contato> encontrados = contatoRepository.findByTelefone(telefone);
        Contato contato;
        boolean contatoRecemCriado = false;
        if (encontrados.isEmpty()) {
            contatoRecemCriado = true;
            // Numero desconhecido manda mensagem espontanea - cria lead novo em vez
            // de descartar (antes a mensagem nem era gravada, so um log). Nome fica
            // generico ate a proxima resposta ser capturada como nome (ou um humano
            // preencher direto). Volume real de mensagem espontanea e' baixo (poucas por dia,
            // transacional) - risco de "spam virar lead" e' aceitavel nesse volume
            // (decisao explicita do Samuel, 04/08/2026).
            ResultadoImportacaoLinha resultado = contatoService.importarLinha(new ContatoDTO(
                    null, null, LEAD_SEM_NOME, telefone, null, null, null, null, null, null,
                    null, null, true, null, null, "WhatsApp (mensagem espontânea)", null, null,
                    null, null, null, null, null));
            Long novoId = resultado != null ? resultado.id() : null;
            contato = novoId != null ? contatoRepository.findById(novoId).orElse(null) : null;
            if (contato == null) {
                log.warn("Webhook Evolution: falha ao criar lead novo pro numero {}", telefone);
                return;
            }
            log.info("Webhook Evolution: numero {} nao era conhecido - criado como novo lead (id={})", telefone, novoId);
        } else {
            if (encontrados.size() > 1) {
                log.warn("Webhook Evolution: numero {} bate com {} contatos - usando o primeiro (id={})",
                        telefone, encontrados.size(), encontrados.get(0).getId());
            }
            contato = encontrados.get(0);
        }

        // Rede de seguranca pro caso o payload nao trazer id de mensagem
        // reconhecido (idDoPayload vazio): se o MESMO texto ja chegou como
        // ENTRADA pra esse contato ha pouco tempo, e' quase certo reentrega do
        // mesmo webhook (nao uma segunda mensagem de verdade) - ignora antes de
        // interpretar como resposta ao nome.
        if (!contatoRecemCriado) {
            boolean duplicadoRecente = mensagemRepository
                    .findFirstByContatoIdAndDirecaoOrderByCriadoEmDesc(contato.getId(), ENTRADA)
                    .filter(m -> texto.equals(m.getTexto()))
                    .filter(m -> m.getCriadoEm().isAfter(LocalDateTime.now().minus(JANELA_DEDUP_WEBHOOK)))
                    .isPresent();
            if (duplicadoRecente) {
                log.info("Webhook Evolution ignorado (mesmo texto \"{}\" recebido ha menos de {}s pro contato {} - provavel reentrega)",
                        texto, JANELA_DEDUP_WEBHOOK.toSeconds(), contato.getId());
                return;
            }
        }

        // Captacao de nome (sem IA, so estado): a ENTRADA que CRIA o contato
        // nunca vira nome (ainda nao perguntamos nada) - so a proxima ENTRADA de
        // um contato que segue com LEAD_SEM_NOME e' tratada como resposta a
        // PERGUNTA_NOME. Guarda de tamanho evita "capturar" um paragrafo longo
        // por engano.
        boolean eraLeadSemNome = LEAD_SEM_NOME.equals(contato.getNome());
        boolean nomeCapturadoAgora = false;
        if (eraLeadSemNome && !contatoRecemCriado && texto.trim().length() <= 60) {
            contato.setNome(capitalizarNome(texto));
            nomeCapturadoAgora = true;
        }

        Mensagem mensagem = new Mensagem();
        mensagem.setContatoId(contato.getId());
        mensagem.setWhatsappNumeroId(whatsappNumeroId);
        mensagem.setDirecao(ENTRADA);
        mensagem.setTexto(texto);
        mensagem.setPayloadBrutoMidia(payloadBrutoMidia);
        mensagem.setMensagemExternaId(mensagemExternaId.isBlank() ? null : mensagemExternaId);
        Mensagem salva = mensagemRepository.save(mensagem);
        atualizarUltimaMensagem(contato, salva);
        retomarExecucoesAguardandoResposta(contato.getId());

        if (nomeCapturadoAgora) {
            log.info("Webhook Evolution: nome capturado via resposta espontanea pro contato {}: \"{}\"", contato.getId(), contato.getNome());
            contatoService.adicionarTag(contato.getId(), TAG_CADASTRO_INCOMPLETO);
            enviarMensagemDeSistema(contato, "Prazer, " + primeiroNome(contato.getNome()) + "! 😊");
        } else if (eraLeadSemNome) {
            // Ainda sem nome (resposta rejeitada pela guarda de tamanho, ou essa
            // ENTRADA e' a que criou o contato agora mesmo) - so pergunta na
            // primeira vez pra nao repetir a cada mensagem enquanto ele nao responde.
            boolean jaPerguntou = mensagemRepository.findByContatoIdOrderByCriadoEmAsc(contato.getId()).stream()
                    .anyMatch(m -> SAIDA.equals(m.getDirecao()) && PERGUNTA_NOME.equals(m.getTexto()));
            if (!jaPerguntou) enviarMensagemDeSistema(contato, PERGUNTA_NOME);
        }
    }

    // Resposta automatica (fora do fluxo de campanha/automacao) - mesmo padrao
    // de "digitando" antes de mandar usado no resto do projeto, pra nao soar
    // instantaneo/robotico demais.
    private void enviarMensagemDeSistema(Contato contato, String texto) {
        try {
            evolutionApiClient.simularDigitando(null, contato.getTelefone(), 1500);
            evolutionApiClient.enviarMensagem(contato.getTelefone(), texto);
            registrarSaidaExterna(contato.getId(), null, texto);
        } catch (Exception e) {
            log.warn("Falha ao mandar mensagem automatica pro contato {}: {}", contato.getId(), e.getMessage());
        }
    }

    private static String capitalizarNome(String bruto) {
        StringBuilder sb = new StringBuilder();
        for (String parte : bruto.trim().toLowerCase().split("\\s+")) {
            if (parte.isBlank()) continue;
            if (sb.length() > 0) sb.append(" ");
            sb.append(Character.toUpperCase(parte.charAt(0))).append(parte.substring(1));
        }
        return sb.length() > 0 ? sb.toString() : bruto.trim();
    }

    private static String primeiroNome(String nomeCompleto) {
        if (nomeCompleto == null || nomeCompleto.isBlank()) return "";
        return nomeCompleto.trim().split("\\s+")[0];
    }

    // Tenta achar o id da mensagem dentro de "Info" (nome exato do campo nao
    // confirmado - variantes conhecidas do formato whatsmeow/Evolution Go
    // testadas em ordem). Retorna "" quando nenhuma bate - a dedup por
    // conteudo (JANELA_DEDUP_WEBHOOK) cobre esse caso.
    private static String idDoPayload(Map<String, Object> info) {
        for (String chave : new String[]{"ID", "Id", "id"}) {
            Object valor = info.get(chave);
            if (valor != null && !String.valueOf(valor).isBlank()) return String.valueOf(valor);
        }
        return "";
    }

    // Fase 4 do motor de automacao: uma resposta de verdade do lead retoma
    // qualquer ExecucaoFluxo parada no no "aguardar_mensagem" - so muda o
    // status/proximaExecucaoEm aqui, quem realmente avanca o no e' o proximo
    // tick do AutomacaoEngineService.executar() (@Scheduled a cada 10s).
    private void retomarExecucoesAguardandoResposta(Long contatoId) {
        List<ExecucaoFluxo> paradas = execucaoFluxoRepository.findByContatoIdAndStatus(contatoId, "aguardando_resposta");
        if (paradas.isEmpty()) return;
        // Percepcao de resposta: marca que essa resposta chegou dentro do prazo
        // (contraste com "Automação: sem resposta" no timeout, ver
        // AutomacaoEngineService) - da pra filtrar/comparar depois em Segmentacoes.
        contatoService.adicionarTag(contatoId, "Automação: respondeu");
        for (ExecucaoFluxo execucao : paradas) {
            execucao.setStatus("ativo");
            execucao.setProximaExecucaoEm(LocalDateTime.now());
            execucaoFluxoRepository.save(execucao);
        }
    }

    // Devolve [texto, payloadBrutoDaMidiaOuNull]. Mensagem de texto simples (o
    // caso comum) so preenche o texto. Midia (imagem/video/audio/documento/
    // figurinha) vira um rotulo amigavel + o payload bruto guardado (nao
    // exibido no chat) pra investigar o formato real depois e exibir a midia
    // de verdade - hoje so avisa que chegou, sem mostrar a midia em si.
    @SuppressWarnings("unchecked")
    private String[] extrairTexto(Map<String, Object> msg) {
        Object conversation = msg.get("conversation");
        if (conversation != null) return new String[]{String.valueOf(conversation), null};

        Object extended = msg.get("extendedTextMessage");
        if (extended instanceof Map) {
            Object texto = ((Map<String, Object>) extended).get("text");
            if (texto != null) return new String[]{String.valueOf(texto), null};
        }

        for (Map.Entry<String, String> tipo : TIPOS_MIDIA.entrySet()) {
            Object midia = msg.get(tipo.getKey());
            if (midia instanceof Map) {
                Object caption = ((Map<String, Object>) midia).get("caption");
                String rotulo = tipo.getValue() + (caption != null ? ": " + caption : " (visualização ainda não suportada)");
                String bruto = serializar(midia);
                log.info("Webhook Evolution: mensagem de midia recebida ({}): {}", tipo.getKey(), bruto);
                return new String[]{rotulo, bruto};
            }
        }
        return new String[]{null, null};
    }

    // Truncado de proposito: midia costuma vir com thumbnail em base64 embutido
    // (bem maior que a coluna de 4000 chars) - aqui e so diagnostico, nao
    // precisa do payload inteiro pra descobrir o formato.
    private String serializar(Object o) {
        String json;
        try {
            json = objectMapper.writeValueAsString(o);
        } catch (Exception ex) {
            json = String.valueOf(o);
        }
        return json.length() > 3900 ? json.substring(0, 3900) : json;
    }

    private MensagemDTO toDTO(Mensagem m) {
        String enviadoPorNome = Optional.ofNullable(m.getEnviadoPorUsuarioId())
                .flatMap(usuarioRepository::findById)
                .map(Usuario::getNome)
                .orElse(null);
        return new MensagemDTO(m.getId(), m.getContatoId(), m.getWhatsappNumeroId(), m.getDirecao(), m.getTexto(),
                m.getEnviadoPorUsuarioId(), enviadoPorNome, m.isNumeroAlternativo(), m.getCriadoEm(), m.getPayloadBrutoMidia());
    }
}
