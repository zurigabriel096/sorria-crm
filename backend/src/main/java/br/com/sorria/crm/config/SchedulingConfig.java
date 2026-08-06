package br.com.sorria.crm.config;

import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.scheduling.concurrent.ThreadPoolTaskScheduler;

import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;

// Sem um TaskScheduler proprio, o Spring Boot usa o default (pool de 1 thread)
// pra TODOS os @Scheduled do app - eles ficavam na fila um atras do outro
// (AutomacaoEngineService.executar, AquecimentoScheduler.tick). Pool pequeno
// e' suficiente: cada @Scheduled agora e' rapido de verdade, porque o pacing
// de envio de WhatsApp saiu pra envioWhatsAppExecutor (abaixo) em vez de travar
// a thread do tick com Thread.sleep (causa raiz do atraso de minutos visto no
// teste do fluxo "teste", 05/08/2026).
@Configuration
public class SchedulingConfig {

    @Bean
    public ThreadPoolTaskScheduler taskScheduler() {
        ThreadPoolTaskScheduler scheduler = new ThreadPoolTaskScheduler();
        scheduler.setPoolSize(4);
        scheduler.setThreadNamePrefix("scheduler-");
        return scheduler;
    }

    // Fila de envio de WhatsApp da Automacao: 1 thread so, de proposito - o
    // pacing (Thread.sleep) entre mensagens continua serializado (nao manda
    // rajada pro mesmo numero), mas roda FORA da thread do @Scheduled. Antes,
    // um tick com varias execucoes pendentes ficava preso ~50-90s POR MENSAGEM
    // antes de conseguir avancar a proxima, e o proximo tick nem comecava
    // enquanto o anterior nao terminasse.
    @Bean
    public ExecutorService envioWhatsAppExecutor() {
        return Executors.newSingleThreadExecutor(r -> {
            Thread t = new Thread(r, "envio-whatsapp-automacao");
            t.setDaemon(true);
            return t;
        });
    }
}
