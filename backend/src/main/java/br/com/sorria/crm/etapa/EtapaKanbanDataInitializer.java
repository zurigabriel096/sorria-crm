package br.com.sorria.crm.etapa;

import lombok.RequiredArgsConstructor;
import org.springframework.boot.CommandLineRunner;
import org.springframework.stereotype.Component;

// Semeia as 3 etapas que ate aqui eram um array fixo no frontend
// (ESTAGIOS_LEAD), pra virarem colunas de verdade editaveis - sem isso os 9
// leads existentes com Contato.estagio="Lead"/"Lead Qualificado"/"Cliente"
// ficariam sem nenhuma coluna correspondente na primeira carga.
@Component
@RequiredArgsConstructor
public class EtapaKanbanDataInitializer implements CommandLineRunner {

    private final EtapaKanbanRepository repository;

    @Override
    public void run(String... args) {
        if (repository.count() > 0) {
            return;
        }
        String[] padrao = {"Lead", "Lead Qualificado", "Cliente"};
        for (int i = 0; i < padrao.length; i++) {
            EtapaKanban etapa = new EtapaKanban();
            etapa.setNome(padrao[i]);
            etapa.setOrdem(i);
            repository.save(etapa);
        }
    }
}
