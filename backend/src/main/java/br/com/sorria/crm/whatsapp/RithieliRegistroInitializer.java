package br.com.sorria.crm.whatsapp;

import br.com.sorria.crm.whatsapp.dto.WhatsAppNumeroDTO;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.context.event.ApplicationReadyEvent;
import org.springframework.context.event.EventListener;
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
//
// ApplicationReadyEvent (nao CommandLineRunner): incidente real 04/08/2026 -
// como CommandLineRunner, a consulta a whatsapp_numeros falhava com "coluna
// finalidade nao existe" so na inicializacao (a MESMA consulta funcionava
// normal via tela de Config depois) - sinal de corrida com a atualizacao de
// schema do Hibernate (coluna nova servidor_url) ainda nao 100% assentada.
// ApplicationReadyEvent dispara depois de todos os CommandLineRunners e da
// app inteira pronta, evitando essa corrida.
@Component
@RequiredArgsConstructor
@Slf4j
public class RithieliRegistroInitializer {

    private static final String SERVIDOR_SAUDAVEL = "https://sorria-evolution-saudavel.fly.dev";
    private static final String TOKEN_RITHIELI = "3951694e-bb2e-40c3-a27d-33b77e8717fe";

    private final WhatsAppNumeroService whatsAppNumeroService;
    private final WhatsAppNumeroRepository whatsAppNumeroRepository;
    private final RithieliRegistroMarcadorRepository marcadorRepository;
    private final EvolutionApiClient evolutionApiClient;

    @Value("${app.backend-url}")
    private String backendUrl;

    // Falha aqui NUNCA pode derrubar o boot inteiro (incidente real, 04/08/2026:
    // sem esse try/catch, um erro numa consulta travou o app em loop de reinicio
    // continuo) - so loga e tenta de novo no proximo restart (marcador so e'
    // salvo se der certo).
    @EventListener(ApplicationReadyEvent.class)
    public void run() {
        if (marcadorRepository.count() > 0) return;
        try {
            if (whatsAppNumeroRepository.contarPorTokenNativo(TOKEN_RITHIELI) == 0) {
                WhatsAppNumeroDTO salvo = whatsAppNumeroService.registrarExistente("Rithieli", "Rithieli", TOKEN_RITHIELI, SERVIDOR_SAUDAVEL);
                String webhookUrl = backendUrl + "/api/whatsapp/webhook?numeroId=" + salvo.id();
                evolutionApiClient.registrarWebhook(TOKEN_RITHIELI, webhookUrl, SERVIDOR_SAUDAVEL);
                log.info("Numero da Rithieli registrado no CRM (servidor saudavel), webhook apontado pra numeroId={}.", salvo.id());
            }
            marcadorRepository.save(new RithieliRegistroMarcador());
        } catch (Exception ex) {
            log.error("Falha ao registrar numero da Rithieli - nao trava o boot, tenta de novo no proximo restart.", ex);
        }
    }
}
