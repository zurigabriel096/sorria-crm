package br.com.sorria.crm.agentevirtual;

import lombok.RequiredArgsConstructor;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;

// A cada 20s (janela de espera e' de 60s - precisa de granularidade fina o
// bastante pra nao atrasar demais a resposta). AgenteVirtualService.
// processarPendentes() ja checa a chave-mestra (AgenteVirtualConfig.ativo) e
// nao faz nada se desligada - por padrao esta DESLIGADA.
@Component
@RequiredArgsConstructor
public class AgenteVirtualScheduler {

    private final AgenteVirtualService agenteVirtualService;

    @Scheduled(fixedDelay = 20_000)
    public void tick() {
        agenteVirtualService.processarPendentes();
    }
}
