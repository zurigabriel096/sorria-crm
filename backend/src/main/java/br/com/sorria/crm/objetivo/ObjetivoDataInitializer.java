package br.com.sorria.crm.objetivo;

import lombok.RequiredArgsConstructor;
import org.springframework.boot.CommandLineRunner;
import org.springframework.stereotype.Component;

// Semeia os objetivos que ate aqui eram um array fixo no estado local do
// frontend (App.jsx useState, se perdia a cada reload) - pra virarem cadastro
// de verdade. So semeia UMA VEZ NA VIDA (marcador, nao repository.count()==0)
// - ver EtapaKanbanDataInitializer pro mesmo raciocinio.
@Component
@RequiredArgsConstructor
public class ObjetivoDataInitializer implements CommandLineRunner {

    private final ObjetivoRepository repository;
    private final ObjetivoSeedMarcadorRepository marcadorRepository;

    @Override
    public void run(String... args) {
        if (marcadorRepository.count() > 0) {
            return;
        }
        if (repository.count() == 0) {
            String[] padrao = {"Reativação", "Anti no-show", "Cobrança", "Upsell", "Relacionamento", "Aquisição"};
            for (String nome : padrao) {
                Objetivo objetivo = new Objetivo();
                objetivo.setNome(nome);
                repository.save(objetivo);
            }
        }
        marcadorRepository.save(new ObjetivoSeedMarcador());
    }
}
