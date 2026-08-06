package br.com.sorria.crm.config;

import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.scheduling.concurrent.ThreadPoolTaskScheduler;

// Sem um TaskScheduler proprio, o Spring Boot usa o default (pool de 1 thread)
// pra TODOS os @Scheduled do app - eles ficavam na fila um atras do outro
// (AutomacaoEngineService.executar, AquecimentoScheduler.tick). Pool pequeno
// e' suficiente: cada @Scheduled agora e' rapido de verdade, porque o pacing
// de envio de WhatsApp saiu pra FilaEnvioWhatsApp (classe propria, nao Bean
// aqui) em vez de travar a thread do tick com Thread.sleep (causa raiz do
// atraso de minutos visto no teste do fluxo "teste", 05/08/2026).
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
public class SchedulingConfig {

    @Bean
    public ThreadPoolTaskScheduler taskScheduler() {
        ThreadPoolTaskScheduler scheduler = new ThreadPoolTaskScheduler();
        scheduler.setPoolSize(2);
        scheduler.setThreadNamePrefix("scheduler-");
        return scheduler;
    }
}
