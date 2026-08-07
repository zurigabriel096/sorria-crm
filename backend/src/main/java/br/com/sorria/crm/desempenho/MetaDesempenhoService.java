package br.com.sorria.crm.desempenho;

import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import java.util.List;

@Service
@RequiredArgsConstructor
public class MetaDesempenhoService {

    private static final String EMPRESA = "EMPRESA";
    private static final String EQUIPE = "EQUIPE";
    private static final String INDIVIDUAL = "INDIVIDUAL";

    private final MetaDesempenhoRepository repository;

    public List<MetaDesempenhoDTO> listar() {
        return repository.findAll().stream().map(this::toDTO).toList();
    }

    public MetaDesempenhoDTO salvarEmpresa(Integer valor) {
        return toDTO(salvar(EMPRESA, null, valor));
    }

    public MetaDesempenhoDTO salvarEquipe(Integer valor) {
        return toDTO(salvar(EQUIPE, null, valor));
    }

    public MetaDesempenhoDTO salvarIndividual(Long colaboradorId, Integer valor) {
        return toDTO(salvar(INDIVIDUAL, colaboradorId, valor));
    }

    private MetaDesempenho salvar(String tipo, Long colaboradorId, Integer valor) {
        MetaDesempenho meta = repository.findByTipoAndColaboradorId(tipo, colaboradorId).orElseGet(MetaDesempenho::new);
        meta.setTipo(tipo);
        meta.setColaboradorId(colaboradorId);
        meta.setValor(valor);
        return repository.save(meta);
    }

    private MetaDesempenhoDTO toDTO(MetaDesempenho m) {
        return new MetaDesempenhoDTO(m.getTipo(), m.getColaboradorId(), m.getValor());
    }
}
