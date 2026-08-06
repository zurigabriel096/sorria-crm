package br.com.sorria.crm.config;

import lombok.extern.slf4j.Slf4j;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.scheduling.concurrent.ThreadPoolTaskScheduler;

import java.util.concurrent.ExecutorService;
import java.util.concurrent.LinkedBlockingQueue;
import java.util.concurrent.ThreadPoolExecutor;
import java.util.concurrent.TimeUnit;

// Sem um TaskScheduler proprio, o Spring Boot usa o default (pool de 1 thread)
// pra TODOS os @Scheduled do app - eles ficavam na fila um atras do outro
// (AutomacaoEngineService.executar, AquecimentoScheduler.tick). Pool pequeno
// e' suficiente: cada @Scheduled agora e' rapido de verdade, porque o pacing
// de envio de WhatsApp saiu pra envioWhatsAppExecutor (abaixo) em vez de travar
// a thread do tick com Thread.sleep (causa raiz do atraso de minutos visto no
// teste do fluxo "teste", 05/08/2026).
//
// Pool size 2 (nao 4) DE PROPOSITO - o Dockerfile ja tinha -Xmx288m/-Xss256k/
// MaxMetaspaceSize=160m com um comentario documentando um OOM anterior nesta
// mesma instancia Render free (512MB): a JVM ja rodava no limite ANTES desta
// sessao. So 2 @Scheduled existem hoje (AutomacaoEngineService,
// AquecimentoScheduler) - pool de 4 so multiplicava quanto trabalho roda AO
// MESMO TEMPO (consulta+parse+HTTP simultaneos) sem nenhum @Scheduled extra
// pra justificar, empurrando o pico de memoria pra cima numa instancia que so
// tinha ~64MB de sobra. Reduzido depois de outro "Exited with status 137"
// (OOM/SIGKILL) 12min apos o deploy anterior (06/08/2026).
@Configuration
@Slf4j
public class SchedulingConfig {

    @Bean
    public ThreadPoolTaskScheduler taskScheduler() {
        ThreadPoolTaskScheduler scheduler = new ThreadPoolTaskScheduler();
        scheduler.setPoolSize(2);
        scheduler.setThreadNamePrefix("scheduler-");
        return scheduler;
    }

    // Fila de envio de WhatsApp da Automacao: 1 thread so, de proposito - o
    // pacing (Thread.sleep) entre mensagens continua serializado (nao manda
    // rajada pro mesmo numero), mas roda FORA da thread do @Scheduled. Antes,
    // um tick com varias execucoes pendentes ficava preso ~50-90s POR MENSAGEM
    // antes de conseguir avancar a proxima, e o proximo tick nem comecava
    // enquanto o anterior nao terminasse.
    //
    // Fila LIMITADA (300) de proposito - Executors.newSingleThreadExecutor()
    // usa fila SEM LIMITE por padrao, e cada item enfileirado retem um Contato
    // + FluxoAutomacao inteiros na memoria ate ser processado (~50-90s cada).
    // Causou "Ran out of memory (used over 512MB)" em producao (06/08/2026) -
    // se muitos contatos ficassem elegiveis de uma vez (ex.: fluxo por
    // segmentacao ativado contra uma base grande), a fila crescia sem
    // controle. CallerRunsPolicy: se a fila enche (nunca deveria, 300 vagas
    // ja' e' horas de fila no ritmo de 50-90s/mensagem), o proprio tick do
    // scheduler manda a mensagem na hora em vez de descartar - degrada pra
    // mais lento em vez de crashar, e nunca perde uma mensagem.
    @Bean
    public ExecutorService envioWhatsAppExecutor() {
        return new ThreadPoolExecutor(
                1, 1, 0L, TimeUnit.MILLISECONDS,
                new LinkedBlockingQueue<>(300),
                r -> {
                    Thread t = new Thread(r, "envio-whatsapp-automacao");
                    t.setDaemon(true);
                    return t;
                },
                (r, executor) -> {
                    log.warn("Fila de envio de WhatsApp da Automacao cheia (300) - mandando na thread do tick pra nao perder a mensagem.");
                    r.run();
                }
        );
    }
}
