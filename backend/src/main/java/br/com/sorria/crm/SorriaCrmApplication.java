package br.com.sorria.crm;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.scheduling.annotation.EnableScheduling;

// @EnableScheduling liga o AutomacaoEngineService (@Scheduled) - motor de
// execucao real dos fluxos de automacao (Fase 3).
@SpringBootApplication
@EnableScheduling
public class SorriaCrmApplication {

    public static void main(String[] args) {
        SpringApplication.run(SorriaCrmApplication.class, args);
    }
}
