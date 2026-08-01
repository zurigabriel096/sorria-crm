package br.com.sorria.crm.whatsapp;

import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpEntity;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestClientException;
import org.springframework.web.client.RestTemplate;

import java.util.Map;
import java.util.Random;

@Service
@Slf4j
public class EvolutionApiClient {

    private final RestTemplate restTemplate = new RestTemplate();
    private final Random random = new Random();

    @Value("${evolution.base-url}")
    private String baseUrl;

    @Value("${evolution.instance}")
    private String instance;

    @Value("${evolution.api-key}")
    private String apiKey;

    /**
     * Envia uma mensagem via Evolution API. Quando evolution.base-url nao esta configurado
     * (ambiente demo/dev sem instancia de WhatsApp real), simula o envio e devolve um status
     * aleatorio ponderado, para que o restante do fluxo (dashboard, historico) funcione sem
     * depender de infraestrutura externa.
     */
    public String enviarMensagem(String telefone, String mensagem) {
        if (baseUrl == null || baseUrl.isBlank()) {
            log.info("[Evolution API simulada] Envio para {}: {}", telefone, mensagem);
            return statusAleatorio();
        }

        try {
            // Estrutura aproximada da Evolution API v2 (POST /message/sendText/{instance}).
            // Ajuste o corpo/headers conforme a versao da Evolution API efetivamente instalada.
            String url = baseUrl + "/message/sendText/" + instance;

            HttpHeaders headers = new HttpHeaders();
            headers.setContentType(MediaType.APPLICATION_JSON);
            headers.set("apikey", apiKey);

            Map<String, Object> body = Map.of(
                    "number", telefone,
                    "textMessage", Map.of("text", mensagem)
            );

            restTemplate.postForEntity(url, new HttpEntity<>(body, headers), String.class);
            return "Entregue";
        } catch (RestClientException ex) {
            log.warn("Falha ao enviar mensagem via Evolution API para {}: {}", telefone, ex.getMessage());
            return "Falhou";
        }
    }

    private String statusAleatorio() {
        double sorteio = random.nextDouble();
        if (sorteio < 0.80) return "Entregue";
        if (sorteio < 0.92) return "Disparado";
        if (sorteio < 0.97) return "Falhou";
        return "Bloqueado";
    }
}
