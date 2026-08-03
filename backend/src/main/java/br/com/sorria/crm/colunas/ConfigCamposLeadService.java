package br.com.sorria.crm.colunas;

import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import java.util.ArrayList;
import java.util.List;

@Service
@RequiredArgsConstructor
public class ConfigCamposLeadService {

    // Ordem que a aba "Dados" do cadastro do lead sempre mostrou ate aqui -
    // vira o padrao na primeira vez que essa configuracao e' lida (linha
    // ainda nao existe).
    private static final List<String> PADRAO = List.of(
            "nome", "cod", "tel", "email", "estagio", "responsavelId", "financ", "dentista", "elegivel"
    );

    private final ConfigCamposLeadRepository repository;

    public List<String> obter() {
        return buscarOuCriar().getOrdemCampos();
    }

    public List<String> atualizar(List<String> ordem) {
        ConfigCamposLead config = buscarOuCriar();
        config.setOrdemCampos(ordem != null ? new ArrayList<>(ordem) : new ArrayList<>());
        return repository.save(config).getOrdemCampos();
    }

    private ConfigCamposLead buscarOuCriar() {
        return repository.findAll().stream().findFirst().orElseGet(() -> {
            ConfigCamposLead config = new ConfigCamposLead();
            config.setOrdemCampos(new ArrayList<>(PADRAO));
            return repository.save(config);
        });
    }
}
