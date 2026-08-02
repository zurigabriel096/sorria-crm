package br.com.sorria.crm.conversa;

import br.com.sorria.crm.contact.Contato;
import br.com.sorria.crm.contact.ContatoRepository;
import br.com.sorria.crm.conversa.dto.EnviarMensagemRequest;
import br.com.sorria.crm.conversa.dto.MensagemDTO;
import br.com.sorria.crm.user.Usuario;
import br.com.sorria.crm.user.UsuarioRepository;
import br.com.sorria.crm.whatsapp.EvolutionApiClient;
import br.com.sorria.crm.whatsapp.WhatsAppNumero;
import br.com.sorria.crm.whatsapp.WhatsAppNumeroRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;

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
    private final UsuarioRepository usuarioRepository;
    private final WhatsAppNumeroRepository whatsAppNumeroRepository;
    private final EvolutionApiClient evolutionApiClient;

    public List<MensagemDTO> listar(Long contatoId) {
        return mensagemRepository.findByContatoIdOrderByCriadoEmAsc(contatoId).stream().map(this::toDTO).toList();
    }

    // Envio avulso (fora do fluxo de campanha) - o "responder direto pelo Kanban".
    // numeroAlternativo fica marcado sempre que o envio usa um numero que NAO e
    // o principal (dono padrao da conversa) - so um registro pra auditoria,
    // nao impede o envio.
    public MensagemDTO enviar(Long contatoId, EnviarMensagemRequest req, String emailUsuarioLogado) {
        Contato contato = contatoRepository.findById(contatoId)
                .orElseThrow(() -> new NoSuchElementException("Contato nao encontrado: " + contatoId));
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
        Object textoObj = msg.get("conversation");
        String texto = textoObj == null ? "" : String.valueOf(textoObj);
        if (sender.isBlank() || texto.isBlank()) {
            log.info("Webhook Evolution ignorado (sem texto simples ou sem remetente): {}", payload);
            return;
        }

        String telefone = sender.split("[:@]")[0].replaceAll("\\D", "");
        Contato contato = contatoRepository.findByTelefone(telefone).orElse(null);
        if (contato == null) {
            log.info("Webhook Evolution: numero {} nao corresponde a nenhum lead conhecido", telefone);
            return;
        }

        Mensagem mensagem = new Mensagem();
        mensagem.setContatoId(contato.getId());
        mensagem.setWhatsappNumeroId(whatsappNumeroId);
        mensagem.setDirecao(ENTRADA);
        mensagem.setTexto(texto);
        mensagemRepository.save(mensagem);
    }

    private MensagemDTO toDTO(Mensagem m) {
        String enviadoPorNome = Optional.ofNullable(m.getEnviadoPorUsuarioId())
                .flatMap(usuarioRepository::findById)
                .map(Usuario::getNome)
                .orElse(null);
        return new MensagemDTO(m.getId(), m.getContatoId(), m.getWhatsappNumeroId(), m.getDirecao(), m.getTexto(),
                m.getEnviadoPorUsuarioId(), enviadoPorNome, m.isNumeroAlternativo(), m.getCriadoEm());
    }
}
