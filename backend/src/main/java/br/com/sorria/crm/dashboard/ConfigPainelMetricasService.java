package br.com.sorria.crm.dashboard;

import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import java.util.ArrayList;
import java.util.List;

@Service
@RequiredArgsConstructor
public class ConfigPainelMetricasService {

    // Metricas que o painel sempre mostrou ate aqui - vira o padrao na
    // primeira vez que essa configuracao e' lida (linha ainda nao existe).
    private static final List<String> PADRAO = List.of("totalContatos", "elegiveis", "disparados", "entregues", "taxaEntrega");

    private final ConfigPainelMetricasRepository repository;

    public List<String> obter() {
        return buscarOuCriar().getMetricasVisiveis();
    }

    public List<String> atualizar(List<String> metricas) {
        ConfigPainelMetricas config = buscarOuCriar();
        config.setMetricasVisiveis(metricas != null ? new ArrayList<>(metricas) : new ArrayList<>());
        return repository.save(config).getMetricasVisiveis();
    }

    private ConfigPainelMetricas buscarOuCriar() {
        return repository.findAll().stream().findFirst().orElseGet(() -> {
            ConfigPainelMetricas config = new ConfigPainelMetricas();
            config.setMetricasVisiveis(new ArrayList<>(PADRAO));
            return repository.save(config);
        });
    }
}
