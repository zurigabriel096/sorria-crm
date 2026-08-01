package br.com.sorria.crm.whatsapp;

import br.com.sorria.crm.campaign.TemplateBotao;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpEntity;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestClientException;
import org.springframework.web.client.RestTemplate;

import java.util.List;
import java.util.Map;
import java.util.Random;
import java.util.UUID;

@Service
@Slf4j
public class EvolutionApiClient {

    private final RestTemplate restTemplate = new RestTemplate();
    private final Random random = new Random();

    @Value("${evolution.base-url}")
    private String baseUrl;

    @Value("${evolution.api-key}")
    private String apiKey;

    /**
     * Envia uma mensagem de texto simples via Evolution API. Quando evolution.base-url nao esta
     * configurado (ambiente demo/dev sem instancia de WhatsApp real), simula o envio e devolve um
     * status aleatorio ponderado, para que o restante do fluxo (dashboard, historico) funcione sem
     * depender de infraestrutura externa.
     */
    public String enviarMensagem(String telefone, String mensagem) {
        if (baseUrl == null || baseUrl.isBlank()) {
            log.info("[Evolution API simulada] Envio para {}: {}", telefone, mensagem);
            return statusAleatorio();
        }

        try {
            // Evolution GO (evolution-foundation/evolution-go): POST /send/text, autenticado
            // pelo header "apikey" com o TOKEN DA INSTANCIA (nao o GLOBAL_API_KEY) - o token
            // de instancia e obtido em GET /instance/all com o GLOBAL_API_KEY.
            Map<String, Object> body = Map.of(
                    "number", telefone,
                    "text", mensagem
            );
            postJson("/send/text", body);
            return "Entregue";
        } catch (RestClientException ex) {
            log.warn("Falha ao enviar mensagem via Evolution API para {}: {}", telefone, ex.getMessage());
            return "Falhou";
        }
    }

    /**
     * Envia uma mensagem com botoes interativos (POST /send/button da Evolution GO).
     * Botoes com link viram tipo "url"; botoes sem link viram "reply" (quick reply).
     * Atencao: misturar reply com url/copy/call na mesma mensagem faz ela nao aparecer no
     * WhatsApp Web (funciona normalmente no celular) - limitacao da propria Evolution GO.
     */
    public String enviarMensagemComBotoes(String telefone, String titulo, String descricao, String rodape, List<TemplateBotao> botoes) {
        if (baseUrl == null || baseUrl.isBlank()) {
            log.info("[Evolution API simulada] Envio com botoes para {}: {}", telefone, descricao);
            return statusAleatorio();
        }

        try {
            List<Map<String, Object>> botoesPayload = botoes.stream().map(b -> {
                boolean temLink = b.getLink() != null && !b.getLink().isBlank();
                if (temLink) {
                    return Map.<String, Object>of("type", "url", "displayText", b.getTexto(), "id", "btn_" + UUID.randomUUID(), "url", b.getLink());
                }
                return Map.<String, Object>of("type", "reply", "displayText", b.getTexto(), "id", "btn_" + UUID.randomUUID());
            }).toList();

            Map<String, Object> body = Map.of(
                    "number", telefone,
                    "title", titulo,
                    "description", descricao,
                    "footer", rodape,
                    "buttons", botoesPayload
            );
            postJson("/send/button", body);
            return "Entregue";
        } catch (RestClientException ex) {
            log.warn("Falha ao enviar mensagem com botoes via Evolution API para {}: {}", telefone, ex.getMessage());
            return "Falhou";
        }
    }

    private void postJson(String path, Object body) {
        HttpHeaders headers = new HttpHeaders();
        headers.setContentType(MediaType.APPLICATION_JSON);
        headers.set("apikey", apiKey);
        restTemplate.postForEntity(baseUrl + path, new HttpEntity<>(body, headers), String.class);
    }

    private String statusAleatorio() {
        double sorteio = random.nextDouble();
        if (sorteio < 0.80) return "Entregue";
        if (sorteio < 0.92) return "Disparado";
        if (sorteio < 0.97) return "Falhou";
        return "Bloqueado";
    }
}
