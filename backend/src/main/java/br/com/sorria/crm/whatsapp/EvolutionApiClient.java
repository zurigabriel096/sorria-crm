package br.com.sorria.crm.whatsapp;

import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpEntity;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpMethod;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestClientException;
import org.springframework.web.client.RestTemplate;
import org.springframework.web.server.ResponseStatusException;

import java.util.List;
import java.util.Map;
import java.util.Random;

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
     * Envia uma mensagem via Evolution API. Quando evolution.base-url nao esta configurado
     * (ambiente demo/dev sem instancia de WhatsApp real), simula o envio e devolve um status
     * aleatorio ponderado, para que o restante do fluxo (dashboard, historico) funcione sem
     * depender de infraestrutura externa.
     *
     * So mensagem de texto: o WhatsApp bloqueia mensagens com botao interativo em conexoes
     * fora da API Business oficial (erro 473), entao nao ha suporte a botoes aqui.
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
            String url = baseUrl + "/send/text";

            HttpHeaders headers = new HttpHeaders();
            headers.setContentType(MediaType.APPLICATION_JSON);
            headers.set("apikey", apiKey);

            Map<String, Object> body = Map.of(
                    "number", telefone,
                    "text", mensagem
            );

            restTemplate.postForEntity(url, new HttpEntity<>(body, headers), String.class);
            return "Entregue";
        } catch (RestClientException ex) {
            log.warn("Falha ao enviar mensagem via Evolution API para {}: {}", telefone, ex.getMessage());
            return "Falhou";
        }
    }

    /**
     * Consulta o estado real da conexao (GET /instance/status). Leitura pura,
     * sem efeito colateral algum na sessao do WhatsApp.
     */
    @SuppressWarnings("unchecked")
    public Map<String, Object> obterStatus() {
        if (baseUrl == null || baseUrl.isBlank()) {
            return Map.of("connected", true, "loggedIn", true, "nome", "Simulado (modo demo)");
        }
        try {
            HttpHeaders headers = new HttpHeaders();
            headers.set("apikey", apiKey);
            ResponseEntity<Map> resp = restTemplate.exchange(
                    baseUrl + "/instance/status", HttpMethod.GET, new HttpEntity<>(headers), Map.class);
            Map<String, Object> data = (Map<String, Object>) resp.getBody().get("data");
            return Map.of(
                    "connected", Boolean.TRUE.equals(data.get("Connected")),
                    "loggedIn", Boolean.TRUE.equals(data.get("LoggedIn")),
                    "nome", String.valueOf(data.getOrDefault("Name", "")));
        } catch (RestClientException ex) {
            log.warn("Falha ao consultar status da Evolution API: {}", ex.getMessage());
            return Map.of("connected", false, "loggedIn", false, "nome", "");
        }
    }

    /**
     * Solicita um codigo de pareamento (POST /instance/pair) para trocar o numero
     * conectado a esta instancia, sem precisar escanear QR code. ATENCAO: isso
     * substitui o numero atualmente pareado - so deve ser chamado deliberadamente.
     */
    @SuppressWarnings("unchecked")
    public String solicitarPareamento(String telefone) {
        if (baseUrl == null || baseUrl.isBlank()) {
            throw new ResponseStatusException(HttpStatus.NOT_IMPLEMENTED, "Evolution API nao configurada neste ambiente.");
        }
        String numero = telefone == null ? "" : telefone.replaceAll("\\D", "");
        if (numero.isBlank()) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Informe um numero de telefone valido.");
        }
        try {
            HttpHeaders headers = new HttpHeaders();
            headers.setContentType(MediaType.APPLICATION_JSON);
            headers.set("apikey", apiKey);
            Map<String, Object> body = Map.of("phone", numero, "subscribe", List.of());
            ResponseEntity<Map> resp = restTemplate.postForEntity(
                    baseUrl + "/instance/pair", new HttpEntity<>(body, headers), Map.class);
            Map<String, Object> data = (Map<String, Object>) resp.getBody().get("data");
            Object codigo = data.get("PairingCode");
            if (codigo == null) {
                throw new ResponseStatusException(HttpStatus.BAD_GATEWAY, "A Evolution API nao retornou um codigo de pareamento.");
            }
            return String.valueOf(codigo);
        } catch (RestClientException ex) {
            log.warn("Falha ao solicitar pairing code para {}: {}", numero, ex.getMessage());
            throw new ResponseStatusException(HttpStatus.BAD_GATEWAY, "Nao foi possivel gerar o codigo de pareamento. Tente novamente.");
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
