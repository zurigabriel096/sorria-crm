package br.com.sorria.crm.whatsapp;

import br.com.sorria.crm.whatsapp.dto.WhatsAppNumeroDTO;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.CommandLineRunner;
import org.springframework.stereotype.Component;

// Registra no CRM o numero da Rithieli (supervisora da clinica) - instancia
// JA criada manualmente no servidor Evolution GO dedicado a numeros
// "saudaveis" (sorria-evolution-saudavel, 04/08/2026), separado do servidor
// principal (sorria-evolution) que fica pros numeros de disparo em massa.
// Registra tambem o webhook (a instancia foi conectada manualmente por fora,
// sem passar pelo fluxo normal de Config, entao nunca teve webhook configurado -
// sem isso, mensagem recebida por esse numero nunca chegaria no CRM).
// So roda UMA VEZ NA VIDA (marcador) - depois disso o numero e' gerenciado
// normal pela tela de Config, esse initializer nao toca mais nele.
@Component
@RequiredArgsConstructor
@Slf4j
public class RithieliRegistroInitializer implements CommandLineRunner {

    private static final String SERVIDOR_SAUDAVEL = "https://sorria-evolution-saudavel.fly.dev";
    private static final String TOKEN_RITHIELI = "3951694e-bb2e-40c3-a27d-33b77e8717fe";

    private final WhatsAppNumeroService whatsAppNumeroService;
    private final WhatsAppNumeroRepository whatsAppNumeroRepository;
    private final RithieliRegistroMarcadorRepository marcadorRepository;
    private final EvolutionApiClient evolutionApiClient;

    @Value("${app.backend-url}")
    private String backendUrl;

    @Override
    public void run(String... args) {
        if (marcadorRepository.count() > 0) return;
        if (whatsAppNumeroRepository.findAll().stream().noneMatch(n -> TOKEN_RITHIELI.equals(n.getToken()))) {
            WhatsAppNumeroDTO salvo = whatsAppNumeroService.registrarExistente("Rithieli", "Rithieli", TOKEN_RITHIELI, SERVIDOR_SAUDAVEL);
            String webhookUrl = backendUrl + "/api/whatsapp/webhook?numeroId=" + salvo.id();
            evolutionApiClient.registrarWebhook(TOKEN_RITHIELI, webhookUrl, SERVIDOR_SAUDAVEL);
            log.info("Numero da Rithieli registrado no CRM (servidor saudavel), webhook apontado pra numeroId={}.", salvo.id());
        }
        marcadorRepository.save(new RithieliRegistroMarcador());
    }
}
