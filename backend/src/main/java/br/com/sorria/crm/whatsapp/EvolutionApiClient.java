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
import org.springframework.web.client.HttpStatusCodeException;
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

    @Value("${evolution.global-api-key:}")
    private String globalApiKey;

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
        return enviarMensagem(telefone, mensagem, apiKey);
    }

    /**
     * Mesmo envio, mas permitindo escolher OUTRA instancia (token) que nao a
     * configurada por padrao - usado quando a campanha aponta pra um numero
     * secundario cadastrado em WhatsAppNumero.
     */
    public String enviarMensagem(String telefone, String mensagem, String tokenInstancia) {
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
            headers.set("apikey", tokenInstancia != null && !tokenInstancia.isBlank() ? tokenInstancia : apiKey);

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
    public Map<String, Object> obterStatus() {
        if (baseUrl == null || baseUrl.isBlank()) {
            return Map.of("connected", true, "loggedIn", true, "nome", "Simulado (modo demo)", "telefone", "");
        }
        Map<String, Object> status = obterStatus(apiKey);
        return Map.of(
                "connected", status.get("connected"),
                "loggedIn", status.get("loggedIn"),
                "nome", status.get("nome"),
                "telefone", obterNumeroConectado());
    }

    /**
     * Mesma consulta de status, mas de uma instancia qualquer (por token) -
     * usada pra mostrar o status ao vivo de numeros secundarios cadastrados.
     */
    @SuppressWarnings("unchecked")
    public Map<String, Object> obterStatus(String tokenInstancia) {
        if (baseUrl == null || baseUrl.isBlank()) {
            return Map.of("connected", false, "loggedIn", false, "nome", "");
        }
        try {
            HttpHeaders headers = new HttpHeaders();
            headers.set("apikey", tokenInstancia);
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
     * Descobre o numero (JID) do WhatsApp conectado via GET /instance/all - o unico
     * endpoint que expoe isso, mas so aceita a GLOBAL_API_KEY (nao o token de instancia).
     * Sem essa chave configurada, devolve "" e o campo Telefone so fica vazio - nao quebra nada.
     */
    @SuppressWarnings("unchecked")
    private String obterNumeroConectado() {
        if (globalApiKey == null || globalApiKey.isBlank()) return "";
        try {
            HttpHeaders headers = new HttpHeaders();
            headers.set("apikey", globalApiKey);
            ResponseEntity<Map> resp = restTemplate.exchange(
                    baseUrl + "/instance/all", HttpMethod.GET, new HttpEntity<>(headers), Map.class);
            List<Map<String, Object>> lista = (List<Map<String, Object>>) resp.getBody().get("data");
            if (lista == null) return "";
            for (Map<String, Object> instancia : lista) {
                String jid = String.valueOf(instancia.getOrDefault("jid", ""));
                if (!jid.isBlank() && !"null".equals(jid)) {
                    String numero = jid.split("[:@]")[0];
                    return formatarTelefoneBr(numero);
                }
            }
        } catch (RestClientException ex) {
            log.warn("Falha ao consultar numero conectado (instance/all): {}", ex.getMessage());
        }
        return "";
    }

    private static String formatarTelefoneBr(String numero) {
        String digitos = numero.replaceAll("\\D", "");
        if (digitos.length() == 13 && digitos.startsWith("55")) {
            return "+55 (" + digitos.substring(2, 4) + ") " + digitos.substring(4, 9) + "-" + digitos.substring(9);
        }
        return digitos.isBlank() ? "" : "+" + digitos;
    }

    /**
     * Desconecta o numero atualmente pareado (DELETE /instance/logout). A Evolution
     * Go recusa gerar codigo de pareamento enquanto ha um numero logado ("instance is
     * already authenticated") - esse passo e obrigatorio antes de trocar de numero.
     */
    public void desconectarInstancia() {
        if (baseUrl == null || baseUrl.isBlank()) {
            throw new ResponseStatusException(HttpStatus.NOT_IMPLEMENTED, "Evolution API nao configurada neste ambiente.");
        }
        try {
            HttpHeaders headers = new HttpHeaders();
            headers.set("apikey", apiKey);
            restTemplate.exchange(baseUrl + "/instance/logout", HttpMethod.DELETE, new HttpEntity<>(headers), String.class);
        } catch (RestClientException ex) {
            log.warn("Falha ao desconectar instancia Evolution: {}", ex.getMessage());
            throw new ResponseStatusException(HttpStatus.BAD_GATEWAY, "Nao foi possivel desconectar o numero atual. Tente novamente.");
        }
    }

    /**
     * Inicia a conexao e devolve o QR code (data URI base64) para escanear. Mais
     * confiavel que o pairing code por texto, que tem bug conhecido na Evolution/Baileys
     * (a WhatsApp as vezes recusa o codigo como invalido). So funciona com a instancia
     * ja desconectada - ver desconectarInstancia().
     */
    @SuppressWarnings("unchecked")
    public String obterQrCode() {
        if (baseUrl == null || baseUrl.isBlank()) {
            throw new ResponseStatusException(HttpStatus.NOT_IMPLEMENTED, "Evolution API nao configurada neste ambiente.");
        }
        HttpHeaders headers = new HttpHeaders();
        headers.set("apikey", apiKey);
        try {
            HttpHeaders headersConnect = new HttpHeaders();
            headersConnect.setContentType(MediaType.APPLICATION_JSON);
            headersConnect.set("apikey", apiKey);
            Map<String, Object> body = Map.of("immediate", true, "subscribe", List.of("QRCODE"));
            restTemplate.postForEntity(baseUrl + "/instance/connect", new HttpEntity<>(body, headersConnect), String.class);
        } catch (RestClientException ex) {
            log.warn("Falha ao iniciar conexao para gerar QR code: {}", ex.getMessage());
            throw new ResponseStatusException(HttpStatus.BAD_GATEWAY, "Nao foi possivel iniciar a conexao. Tente novamente.");
        }

        // O QR so fica pronto alguns segundos depois do /instance/connect - tenta
        // por ate ~15s antes de desistir.
        for (int tentativa = 0; tentativa < 7; tentativa++) {
            try {
                Thread.sleep(2000);
                ResponseEntity<Map> resp = restTemplate.exchange(
                        baseUrl + "/instance/qr", HttpMethod.GET, new HttpEntity<>(headers), Map.class);
                Map<String, Object> data = (Map<String, Object>) resp.getBody().get("data");
                Object qrcode = data != null ? data.get("qrcode") : null;
                if (qrcode != null) return String.valueOf(qrcode);
            } catch (HttpStatusCodeException ex) {
                // "no QR code available" enquanto o handshake nao termina - tenta de novo.
            } catch (RestClientException ex) {
                log.warn("Falha ao consultar QR code: {}", ex.getMessage());
            } catch (InterruptedException ex) {
                Thread.currentThread().interrupt();
                break;
            }
        }
        throw new ResponseStatusException(HttpStatus.BAD_GATEWAY, "O QR code demorou demais para ficar pronto. Tente novamente.");
    }

    /**
     * Solicita um codigo de pareamento (POST /instance/pair) para o numero informado.
     * So funciona se a instancia ja estiver desconectada - ver desconectarInstancia().
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
        } catch (HttpStatusCodeException ex) {
            String corpo = ex.getResponseBodyAsString();
            log.warn("Falha ao solicitar pairing code para {}: {}", numero, corpo);
            if (corpo != null && corpo.contains("already authenticated")) {
                throw new ResponseStatusException(HttpStatus.CONFLICT, "O numero atual ainda esta conectado. Desconecte-o primeiro.");
            }
            throw new ResponseStatusException(HttpStatus.BAD_GATEWAY, "Nao foi possivel gerar o codigo de pareamento. Tente novamente.");
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
