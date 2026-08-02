package br.com.sorria.crm.conversa;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.util.Map;

// Endpoint PUBLICO (sem JWT) - a Evolution API chama isso direto, nao um
// usuario logado do Sorria. Cada instancia (numero) aponta pra cá com um
// "numeroId" proprio na query string (omitido = numero principal), assim nao
// precisamos adivinhar qual instancia mandou o evento a partir do payload.
@RestController
@RequestMapping("/api/whatsapp/webhook")
@RequiredArgsConstructor
@Slf4j
public class WhatsAppWebhookController {

    private final MensagemService mensagemService;

    @PostMapping
    public Map<String, Boolean> receber(@RequestParam(required = false) Long numeroId, @RequestBody Map<String, Object> payload) {
        try {
            mensagemService.registrarEntrada(payload, numeroId);
        } catch (Exception ex) {
            log.warn("Falha ao processar webhook Evolution (numeroId={}): {}", numeroId, ex.getMessage());
        }
        return Map.of("ok", true);
    }
}
