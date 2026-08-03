package br.com.sorria.crm.aquecimento;

import lombok.RequiredArgsConstructor;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;

import java.time.LocalTime;

// A cada 1 min, so dentro de um horario "comercial" (08h-21h, timezone do
// JVM ja fixado em America/Sao_Paulo no Dockerfile) - o ritmo real entre
// mensagens do MESMO numero (3-4min por padrao) e' controlado por
// WhatsAppNumero.proximoEnvioAquecimentoEm dentro de AquecimentoService, nao
// por esse intervalo do scheduler; 1 min so garante granularidade suficiente
// pra nao perder a janela. AquecimentoService.executarCiclo() ja checa a
// chave-mestra (AquecimentoConfig.ativo) e nao faz nada se desligada - por
// padrao esta DESLIGADA, nao dispara nada so por existir.
@Component
@RequiredArgsConstructor
public class AquecimentoScheduler {

    private static final LocalTime INICIO = LocalTime.of(8, 0);
    private static final LocalTime FIM = LocalTime.of(21, 0);

    private final AquecimentoService aquecimentoService;

    @Scheduled(fixedDelay = 60_000)
    public void tick() {
        LocalTime agora = LocalTime.now();
        if (agora.isBefore(INICIO) || agora.isAfter(FIM)) return;
        aquecimentoService.executarCiclo();
    }
}
