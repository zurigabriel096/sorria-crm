package br.com.sorria.crm.conversa;

import br.com.sorria.crm.contact.Contato;
import br.com.sorria.crm.contact.ContatoRepository;
import br.com.sorria.crm.contact.ContatoService;
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

    private final MensagemRepository mensagemRepository;
    private final ContatoRepository contatoRepository;
    private final ContatoService contatoService;
    private final UsuarioRepository usuarioRepository;
    private final WhatsAppNumeroRepository whatsAppNumeroRepository;
    private final EvolutionApiClient evolutionApiClient;
    private final ObjectMapper objectMapper;

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
        if (req.whatsappNumeroId() != null) {
            token = whatsAppNumeroRepository.findById(req.whatsappNumeroId())
                    .map(WhatsAppNumero::getToken)
                    .orElseThrow(() -> new NoSuchElementException("Numero nao encontrado: " + req.whatsappNumeroId()));
        }
        evolutionApiClient.enviarMensagem(contato.getTelefone(), req.texto(), token);

        Mensagem mensagem = new Mensagem();
        mensagem.setContatoId(contatoId);
        mensagem.setWhatsappNumeroId(req.whatsappNumeroId());
        mensagem.setDirecao(SAIDA);
        mensagem.setTexto(req.texto());
        mensagem.setEnviadoPorUsuarioId(usuario.getId());
        mensagem.setNumeroAlternativo(req.whatsappNumeroId() != null);
        return toDTO(mensagemRepository.save(mensagem));
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

        String telefone = sender.split("[:@]")[0].replaceAll("\\D", "");
        List<Contato> encontrados = contatoRepository.findByTelefone(telefone);
        if (encontrados.isEmpty()) {
            log.info("Webhook Evolution: numero {} nao corresponde a nenhum lead conhecido", telefone);
            return;
        }
        if (encontrados.size() > 1) {
            log.warn("Webhook Evolution: numero {} bate com {} contatos - usando o primeiro (id={})",
                    telefone, encontrados.size(), encontrados.get(0).getId());
        }
        Contato contato = encontrados.get(0);

        Mensagem mensagem = new Mensagem();
        mensagem.setContatoId(contato.getId());
        mensagem.setWhatsappNumeroId(whatsappNumeroId);
        mensagem.setDirecao(ENTRADA);
        mensagem.setTexto(texto);
        mensagem.setPayloadBrutoMidia(payloadBrutoMidia);
        mensagemRepository.save(mensagem);
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
