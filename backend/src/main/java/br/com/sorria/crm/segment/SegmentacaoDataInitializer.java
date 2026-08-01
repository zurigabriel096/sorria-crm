package br.com.sorria.crm.segment;

import lombok.RequiredArgsConstructor;
import org.springframework.boot.CommandLineRunner;
import org.springframework.stereotype.Component;

// Espelha o SEG_SEED que existia só no frontend, pra quem já estava usando o
// protótipo em memória não perder as duas segmentações padrão na migração pra
// persistência real.
@Component
@RequiredArgsConstructor
public class SegmentacaoDataInitializer implements CommandLineRunner {

    private final SegmentacaoRepository repository;

    @Override
    public void run(String... args) {
        if (repository.count() > 0) {
            return;
        }

        Segmentacao reativacao = new Segmentacao();
        reativacao.setNome("Reativação +120D");
        reativacao.setGroupsJson("[[{\"field\":\"recencia\",\"op\":\"maior\",\"value\":120},{\"field\":\"elegivel\",\"op\":\"é\",\"value\":\"Sim\"}]]");
        repository.save(reativacao);

        Segmentacao inadimplentes = new Segmentacao();
        inadimplentes.setNome("Inadimplentes");
        inadimplentes.setGroupsJson("[[{\"field\":\"tag\",\"op\":\"contém\",\"value\":\"Inadimplente\"}]]");
        repository.save(inadimplentes);
    }
}
