package br.com.sorria.crm.automacao;

import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Component;

import java.util.concurrent.BlockingQueue;
import java.util.concurrent.LinkedBlockingQueue;
import java.util.concurrent.TimeUnit;

// Fila de envio de WhatsApp da Automacao - roda numa unica thread separada do
// @Scheduled (ver AutomacaoEngineService.enviarMensagemComPacing), pra um tick
// com varias execucoes pendentes nao ficar preso ~50-90s POR MENSAGEM antes de
// conseguir avancar a proxima (causa raiz do atraso de minutos visto no teste
// do fluxo "teste", 05/08/2026).
//
// DUAS filas internas (nao uma so com PriorityBlockingQueue) - "furar fila"
// (06/08/2026, pedido do Samuel: fluxo marcado como prioritario deve ser o
// PROXIMO a sair, na frente de fluxos normais que ja estavam esperando, sem
// pular o espacamento minimo entre envios) precisa de prioridade, mas
// PriorityBlockingQueue e' sempre ILIMITADA - reabriria o "Ran out of memory"
// de producao (06/08/2026) que a fila limitada (300) corrigiu. Aqui cada fila
// tem seu proprio limite, e o worker sempre espia a prioritaria primeiro.
@Component
@Slf4j
public class FilaEnvioWhatsApp {

    private static final int CAPACIDADE_PRIORITARIA = 50;
    private static final int CAPACIDADE_NORMAL = 300;

    private final BlockingQueue<Runnable> prioritaria = new LinkedBlockingQueue<>(CAPACIDADE_PRIORITARIA);
    private final BlockingQueue<Runnable> normal = new LinkedBlockingQueue<>(CAPACIDADE_NORMAL);

    // Inicia a thread no construtor (sem dependencia nenhuma pra injetar aqui,
    // nao precisa de @PostConstruct) - Spring so cria uma instancia desse Bean,
    // entao so uma thread worker sobe.
    public FilaEnvioWhatsApp() {
        Thread worker = new Thread(this::loop, "envio-whatsapp-automacao");
        worker.setDaemon(true);
        worker.start();
    }

    // Enfileira uma tarefa de envio (mensagem + pacing, ver
    // AutomacaoEngineService.enviarMensagemComPacing). Se a fila-alvo estiver
    // cheia (nunca deveria - 50/300 vagas ja' e' muita folga no ritmo de
    // 60-84s/mensagem), manda na hora em vez de descartar ou bloquear quem
    // esta chamando.
    public void enviar(Runnable tarefa, boolean prioritario) {
        BlockingQueue<Runnable> fila = prioritario ? prioritaria : normal;
        if (!fila.offer(tarefa)) {
            log.warn("Fila de envio da Automacao ({}) cheia - mandando na hora.", prioritario ? "prioritaria" : "normal");
            tarefa.run();
        }
    }

    // Sempre espia a fila prioritaria primeiro (sem esperar) - se tiver algo,
    // roda antes de qualquer item normal, mesmo que este ja estivesse
    // esperando ha mais tempo. So espera (com timeout curto, pra reavaliar a
    // prioritaria com frequencia) quando as duas estao vazias.
    private void loop() {
        while (!Thread.currentThread().isInterrupted()) {
            try {
                Runnable tarefa = prioritaria.poll();
                if (tarefa == null) {
                    tarefa = normal.poll(500, TimeUnit.MILLISECONDS);
                }
                if (tarefa == null) continue;
                try {
                    tarefa.run();
                } catch (Exception e) {
                    log.error("Falha ao rodar tarefa da fila de envio da Automacao: {}", e.getMessage(), e);
                }
            } catch (InterruptedException ie) {
                Thread.currentThread().interrupt();
                return;
            }
        }
    }
}
