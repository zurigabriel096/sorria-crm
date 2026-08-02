package br.com.sorria.crm.conversa;

import com.fasterxml.jackson.databind.ObjectMapper;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.client.RestTemplate;
import org.springframework.web.server.ResponseStatusException;

import java.util.Base64;
import java.util.Map;
import java.util.NoSuchElementException;

// Baixa e descriptografa a midia de uma mensagem ENTRADA (foto/video/audio/
// documento) sob demanda - nao fica guardada decodificada em lugar nenhum, so
// serve os bytes pro navegador quando o Kanban pede. Exige JWT (nao e publico
// como o webhook), mesma regra do resto da API.
@RestController
@RequestMapping("/api/mensagens")
@RequiredArgsConstructor
@Slf4j
public class MensagemMidiaController {

    private final MensagemRepository mensagemRepository;
    private final ObjectMapper objectMapper;
    private final RestTemplate restTemplate = new RestTemplate();

    @GetMapping("/{id}/midia")
    @SuppressWarnings("unchecked")
    public ResponseEntity<byte[]> midia(@PathVariable Long id) {
        Mensagem mensagem = mensagemRepository.findById(id)
                .orElseThrow(() -> new NoSuchElementException("Mensagem nao encontrada: " + id));
        if (mensagem.getPayloadBrutoMidia() == null) {
            throw new ResponseStatusException(HttpStatus.NOT_FOUND, "Esta mensagem nao tem midia associada.");
        }

        try {
            Map<String, Object> midia = objectMapper.readValue(mensagem.getPayloadBrutoMidia(), Map.class);
            String url = String.valueOf(midia.get("URL"));
            String mediaKeyB64 = String.valueOf(midia.get("mediaKey"));
            String mimetype = String.valueOf(midia.getOrDefault("mimetype", "application/octet-stream"));

            byte[] mediaKey = Base64.getDecoder().decode(mediaKeyB64);
            byte[] cifrado = restTemplate.getForObject(url, byte[].class);
            String info = WhatsAppMediaDecryptor.infoParaMimetype(mimetype);
            byte[] decodificado = WhatsAppMediaDecryptor.decrypt(cifrado, mediaKey, info);

            return ResponseEntity.ok().contentType(MediaType.parseMediaType(mimetype)).body(decodificado);
        } catch (Exception ex) {
            log.warn("Falha ao descriptografar midia da mensagem {}: {}", id, ex.getMessage());
            throw new ResponseStatusException(HttpStatus.BAD_GATEWAY,
                    "Não consegui abrir essa mídia agora — o link pode ter expirado.");
        }
    }
}
