package br.com.sorria.crm.colunas;

import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import java.util.ArrayList;
import java.util.List;

@Service
@RequiredArgsConstructor
public class ConfigColunasService {

    // Colunas que a tabela de Base de Leads sempre mostrou ate aqui - vira o
    // padrao na primeira vez que essa configuracao e' lida (linha ainda nao
    // existe). Chaves de campo customizado usam o prefixo "custom:<nome>".
    private static final List<String> PADRAO = List.of("estagio", "financ", "dentista", "recencia", "elegivel");

    private final ConfigColunasRepository repository;

    public List<String> obter() {
        return buscarOuCriar().getColunasVisiveis();
    }

    public List<String> atualizar(List<String> colunas) {
        ConfigColunas config = buscarOuCriar();
        config.setColunasVisiveis(colunas != null ? new ArrayList<>(colunas) : new ArrayList<>());
        return repository.save(config).getColunasVisiveis();
    }

    private ConfigColunas buscarOuCriar() {
        return repository.findAll().stream().findFirst().orElseGet(() -> {
            ConfigColunas config = new ConfigColunas();
            config.setColunasVisiveis(new ArrayList<>(PADRAO));
            return repository.save(config);
        });
    }
}
