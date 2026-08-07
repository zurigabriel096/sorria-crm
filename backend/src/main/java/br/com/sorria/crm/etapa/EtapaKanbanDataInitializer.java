package br.com.sorria.crm.etapa;

import lombok.RequiredArgsConstructor;
import org.springframework.boot.CommandLineRunner;
import org.springframework.core.annotation.Order;
import org.springframework.stereotype.Component;

// Semeia as 3 etapas que ate aqui eram um array fixo no frontend
// (ESTAGIOS_LEAD), pra virarem colunas de verdade editaveis - sem isso os 9
// leads existentes com Contato.estagio="Lead"/"Lead Qualificado"/"Cliente"
// ficariam sem nenhuma coluna correspondente na primeira carga.
// So semeia UMA VEZ NA VIDA (marcador em EtapaSeedMarcador, nao
// repository.count()==0) - a versao antiga checava so a contagem, e isso
// recriava as 3 colunas padrao TODA VEZ que o ADMIN excluia todas as etapas e
// o backend reiniciava depois (cold start do Render conta como reinicio) - a
// exclusao deliberada nunca deveria voltar sozinha.
@Component
@Order(1)
@RequiredArgsConstructor
public class EtapaKanbanDataInitializer implements CommandLineRunner {

    private final EtapaKanbanRepository repository;
    private final EtapaSeedMarcadorRepository marcadorRepository;

    @Override
    public void run(String... args) {
        if (marcadorRepository.count() > 0) {
            return;
        }
        if (repository.count() == 0) {
            String[] padrao = {"Lead", "Lead Qualificado", "Cliente"};
            for (int i = 0; i < padrao.length; i++) {
                EtapaKanban etapa = new EtapaKanban();
                etapa.setNome(padrao[i]);
                etapa.setOrdem(i);
                repository.save(etapa);
            }
        }
        marcadorRepository.save(new EtapaSeedMarcador());
    }
}
