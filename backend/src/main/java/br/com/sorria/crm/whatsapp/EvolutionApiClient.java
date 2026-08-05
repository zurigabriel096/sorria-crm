package br.com.sorria.crm.whatsapp;

import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpEntity;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpMethod;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.http.client.SimpleClientHttpRequestFactory;
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

    // SimpleClientHttpRequestFactory sem timeout configurado espera PRA SEMPRE
    // (connect/read timeout = -1 por padrao) - se qualquer servidor Evolution
    // (principal ou um secundario, ex.: sorria-evolution-saudavel) ficar
    // inalcancavel/lento, toda chamada trava sem nunca lancar exception,
    // travando "Carregando..."/"Verificando..." pra sempre na tela (ninguem dos
    // try/catch(RestClientException) espalhados por esta classe chega a rodar,
    // porque nunca ha exception - so silencio). Com timeout, um servidor fora
    // do ar vira ResourceAccessException (subclasse de RestClientException) em
    // poucos segundos, e cai nos mesmos catches que ja existem.
    private final RestTemplate restTemplate = criarRestTemplateComTimeout();
    private final Random random = new Random();

    private static RestTemplate criarRestTemplateComTimeout() {
        SimpleClientHttpRequestFactory factory = new SimpleClientHttpRequestFactory();
        factory.setConnectTimeout(8_000);
        factory.setReadTimeout(15_000);
        return new RestTemplate(factory);
    }

    @Value("${evolution.base-url}")
    private String baseUrl;

    @Value("${evolution.api-key}")
    private String apiKey;

    @Value("${evolution.global-api-key:}")
    private String globalApiKey;

    // null/vazio = servidor principal (baseUrl) - ver WhatsAppNumero.servidorUrl.
    // Existe pra suportar mais de um servidor Evolution GO (infra separada por
    // "frente" de disparo, ver sorria-evolution-saudavel).
    private String resolverUrl(String servidorUrlOverride) {
        return servidorUrlOverride != null && !servidorUrlOverride.isBlank() ? servidorUrlOverride : baseUrl;
    }

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
        return enviarMensagem(telefone, mensagem, tokenInstancia, null);
    }

    /** Mesmo envio, mas de um servidor Evolution GO especifico (ver WhatsAppNumero.servidorUrl). */
    public String enviarMensagem(String telefone, String mensagem, String tokenInstancia, String servidorUrl) {
        String urlServidor = resolverUrl(servidorUrl);
        if (urlServidor == null || urlServidor.isBlank()) {
            log.info("[Evolution API simulada] Envio para {}: {}", telefone, mensagem);
            return statusAleatorio();
        }

        try {
            // Evolution GO (evolution-foundation/evolution-go): POST /send/text, autenticado
            // pelo header "apikey" com o TOKEN DA INSTANCIA (nao o GLOBAL_API_KEY) - o token
            // de instancia e obtido em GET /instance/all com o GLOBAL_API_KEY.
            String url = urlServidor + "/send/text";

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
    public Map<String, Object> obterStatus(String tokenInstancia) {
        return obterStatus(tokenInstancia, null);
    }

    /** Mesma consulta, mas de um servidor Evolution GO especifico (ver WhatsAppNumero.servidorUrl). */
    @SuppressWarnings("unchecked")
    public Map<String, Object> obterStatus(String tokenInstancia, String servidorUrl) {
        String urlServidor = resolverUrl(servidorUrl);
        if (urlServidor == null || urlServidor.isBlank()) {
            return Map.of("connected", false, "loggedIn", false, "nome", "");
        }
        try {
            HttpHeaders headers = new HttpHeaders();
            headers.set("apikey", tokenInstancia);
            ResponseEntity<Map> resp = restTemplate.exchange(
                    urlServidor + "/instance/status", HttpMethod.GET, new HttpEntity<>(headers), Map.class);
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

    /**
     * Lista todas as instancias da Evolution (GET /instance/all, GLOBAL_API_KEY) -
     * cada item traz "token" e "jid" (numero conectado). Usado pelo Sorr.ia
     * Protect (AquecimentoService) pra descobrir o telefone real de cada
     * numero de aquecimento a partir do token guardado no banco, sem precisar
     * duplicar esse dado em WhatsAppNumero (o numero muda se reconectar).
     */
    @SuppressWarnings("unchecked")
    public List<Map<String, Object>> listarInstancias() {
        if (baseUrl == null || baseUrl.isBlank() || globalApiKey == null || globalApiKey.isBlank()) return List.of();
        try {
            HttpHeaders headers = new HttpHeaders();
            headers.set("apikey", globalApiKey);
            ResponseEntity<Map> resp = restTemplate.exchange(
                    baseUrl + "/instance/all", HttpMethod.GET, new HttpEntity<>(headers), Map.class);
            List<Map<String, Object>> lista = (List<Map<String, Object>>) resp.getBody().get("data");
            return lista != null ? lista : List.of();
        } catch (RestClientException ex) {
            log.warn("Falha ao listar instancias (instance/all): {}", ex.getMessage());
            return List.of();
        }
    }

    /** Extrai so os digitos do telefone a partir de um JID ("55129...:13@s.whatsapp.net"). */
    public static String jidParaTelefone(String jid) {
        if (jid == null || jid.isBlank() || "null".equals(jid)) return null;
        String numero = jid.split("[:@]")[0].replaceAll("\\D", "");
        return numero.isBlank() ? null : numero;
    }

    /**
     * Simula o indicador "digitando..." antes de mandar mensagem (POST
     * /instance/presence) - so estetico/comportamental, usado pelo Sorr.ia
     * Protect pra não mandar mensagem "seca" demais entre os proprios
     * numeros. Melhor esforco: falha aqui nunca deve impedir o envio real.
     * tokenInstancia nulo/vazio cai pro apiKey da instancia principal - mesmo
     * fallback de enviarMensagem(2 args), usado pela Automacao (que nao tem
     * campo de numero alternativo, sempre manda pelo numero principal).
     */
    public void simularDigitando(String tokenInstancia, String telefoneDestino, int delayMs) {
        simularDigitando(tokenInstancia, telefoneDestino, delayMs, null);
    }

    /** Mesma simulacao, mas de um servidor Evolution GO especifico (ver WhatsAppNumero.servidorUrl). */
    public void simularDigitando(String tokenInstancia, String telefoneDestino, int delayMs, String servidorUrl) {
        String urlServidor = resolverUrl(servidorUrl);
        if (urlServidor == null || urlServidor.isBlank()) return;
        try {
            HttpHeaders headers = new HttpHeaders();
            headers.setContentType(MediaType.APPLICATION_JSON);
            headers.set("apikey", tokenInstancia != null && !tokenInstancia.isBlank() ? tokenInstancia : apiKey);
            Map<String, Object> body = Map.of("number", telefoneDestino, "state", "composing", "delay", delayMs);
            restTemplate.postForEntity(urlServidor + "/instance/presence", new HttpEntity<>(body, headers), String.class);
        } catch (RestClientException ex) {
            log.warn("Falha ao simular 'digitando' pra {}: {}", telefoneDestino, ex.getMessage());
        }
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
        desconectarInstancia(apiKey);
    }

    /** Mesma desconexao, mas de uma instancia qualquer (por token) - ver enviarMensagem(3 args). */
    public void desconectarInstancia(String tokenInstancia) {
        desconectarInstancia(tokenInstancia, null);
    }

    /** Mesma desconexao, mas de um servidor Evolution GO especifico (ver WhatsAppNumero.servidorUrl). */
    public void desconectarInstancia(String tokenInstancia, String servidorUrl) {
        String urlServidor = resolverUrl(servidorUrl);
        if (urlServidor == null || urlServidor.isBlank()) {
            throw new ResponseStatusException(HttpStatus.NOT_IMPLEMENTED, "Evolution API nao configurada neste ambiente.");
        }
        try {
            HttpHeaders headers = new HttpHeaders();
            headers.set("apikey", tokenInstancia);
            restTemplate.exchange(urlServidor + "/instance/logout", HttpMethod.DELETE, new HttpEntity<>(headers), String.class);
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
    public String obterQrCode() {
        return obterQrCode(apiKey, null);
    }

    /**
     * Mesma geracao de QR, mas de uma instancia qualquer (por token) - usada pra
     * conectar numeros secundarios (WhatsAppNumero) direto pelo app, sem precisar
     * de nenhuma chamada manual fora do Sorr.ia. webhookUrl (opcional) registra
     * pra qual endpoint essa instancia deve mandar eventos de mensagem recebida -
     * ver WhatsAppWebhookController "numeroId" na query string.
     */
    public String obterQrCode(String tokenInstancia, String webhookUrl) {
        return obterQrCode(tokenInstancia, webhookUrl, null);
    }

    /** Mesma geracao de QR, mas de um servidor Evolution GO especifico (ver WhatsAppNumero.servidorUrl). */
    @SuppressWarnings("unchecked")
    public String obterQrCode(String tokenInstancia, String webhookUrl, String servidorUrl) {
        String urlServidor = resolverUrl(servidorUrl);
        if (urlServidor == null || urlServidor.isBlank()) {
            throw new ResponseStatusException(HttpStatus.NOT_IMPLEMENTED, "Evolution API nao configurada neste ambiente.");
        }
        HttpHeaders headers = new HttpHeaders();
        headers.set("apikey", tokenInstancia);
        try {
            HttpHeaders headersConnect = new HttpHeaders();
            headersConnect.setContentType(MediaType.APPLICATION_JSON);
            headersConnect.set("apikey", tokenInstancia);
            Map<String, Object> body = new java.util.HashMap<>(Map.of("immediate", true, "subscribe", List.of("QRCODE")));
            if (webhookUrl != null && !webhookUrl.isBlank()) body.put("webhookUrl", webhookUrl);
            restTemplate.postForEntity(urlServidor + "/instance/connect", new HttpEntity<>(body, headersConnect), String.class);
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
                        urlServidor + "/instance/qr", HttpMethod.GET, new HttpEntity<>(headers), Map.class);
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
    public String solicitarPareamento(String telefone) {
        return solicitarPareamento(apiKey, telefone);
    }

    /** Mesmo pareamento, mas de uma instancia qualquer (por token) - ver obterQrCode(2 args). */
    public String solicitarPareamento(String tokenInstancia, String telefone) {
        return solicitarPareamento(tokenInstancia, telefone, null);
    }

    /** Mesmo pareamento, mas de um servidor Evolution GO especifico (ver WhatsAppNumero.servidorUrl). */
    @SuppressWarnings("unchecked")
    public String solicitarPareamento(String tokenInstancia, String telefone, String servidorUrl) {
        String urlServidor = resolverUrl(servidorUrl);
        if (urlServidor == null || urlServidor.isBlank()) {
            throw new ResponseStatusException(HttpStatus.NOT_IMPLEMENTED, "Evolution API nao configurada neste ambiente.");
        }
        String numero = telefone == null ? "" : telefone.replaceAll("\\D", "");
        if (numero.isBlank()) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Informe um numero de telefone valido.");
        }
        try {
            HttpHeaders headers = new HttpHeaders();
            headers.setContentType(MediaType.APPLICATION_JSON);
            headers.set("apikey", tokenInstancia);
            Map<String, Object> body = Map.of("phone", numero, "subscribe", List.of());
            ResponseEntity<Map> resp = restTemplate.postForEntity(
                    urlServidor + "/instance/pair", new HttpEntity<>(body, headers), Map.class);
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

    /**
     * So registra/atualiza o webhook de uma instancia JA conectada (POST
     * /instance/connect com webhookUrl, sem esperar/consultar QR) - diferente
     * de obterQrCode(3 args), que assume que ainda vai escanear algo e tenta
     * ler o QR por ~15s (falharia aqui, a instancia ja esta logada). Mesmo
     * endpoint que WhatsAppNumeroService.gerarQrCode usa, so sem a parte de QR.
     */
    public void registrarWebhook(String tokenInstancia, String webhookUrl, String servidorUrl) {
        String urlServidor = resolverUrl(servidorUrl);
        if (urlServidor == null || urlServidor.isBlank()) return;
        try {
            HttpHeaders headers = new HttpHeaders();
            headers.setContentType(MediaType.APPLICATION_JSON);
            headers.set("apikey", tokenInstancia);
            Map<String, Object> body = Map.of("immediate", true, "subscribe", List.of(), "webhookUrl", webhookUrl);
            restTemplate.postForEntity(urlServidor + "/instance/connect", new HttpEntity<>(body, headers), String.class);
        } catch (RestClientException ex) {
            log.warn("Falha ao registrar webhook pra instancia (token {}...): {}",
                    tokenInstancia != null && tokenInstancia.length() > 6 ? tokenInstancia.substring(0, 6) : tokenInstancia, ex.getMessage());
        }
    }

    /**
     * Cria uma instancia nova na Evolution (POST /instance/create, autenticado
     * pelo GLOBAL_API_KEY - unico endpoint de gerenciamento usado por este app
     * que exige essa chave em vez do token da propria instancia). Usado ao
     * cadastrar um numero secundario novo (WhatsAppNumero) - antes disso so era
     * possivel registrar uma instancia ja criada por fora, manualmente.
     */
    public void criarInstancia(String nome, String tokenInstancia) {
        if (baseUrl == null || baseUrl.isBlank()) {
            throw new ResponseStatusException(HttpStatus.NOT_IMPLEMENTED, "Evolution API nao configurada neste ambiente.");
        }
        if (globalApiKey == null || globalApiKey.isBlank()) {
            throw new ResponseStatusException(HttpStatus.NOT_IMPLEMENTED, "GLOBAL_API_KEY nao configurada - nao e possivel criar instancia nova.");
        }
        try {
            HttpHeaders headers = new HttpHeaders();
            headers.setContentType(MediaType.APPLICATION_JSON);
            headers.set("apikey", globalApiKey);
            Map<String, Object> body = Map.of("name", nome, "token", tokenInstancia);
            restTemplate.postForEntity(baseUrl + "/instance/create", new HttpEntity<>(body, headers), String.class);
        } catch (RestClientException ex) {
            log.warn("Falha ao criar instancia Evolution '{}': {}", nome, ex.getMessage());
            throw new ResponseStatusException(HttpStatus.BAD_GATEWAY, "Nao foi possivel criar a instancia na Evolution. Tente novamente.");
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
