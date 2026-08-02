package br.com.sorria.crm.etapa;

import br.com.sorria.crm.etapa.dto.EtapaKanbanDTO;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import java.util.List;
import java.util.NoSuchElementException;

@Service
@RequiredArgsConstructor
public class EtapaKanbanService {

    private final EtapaKanbanRepository repository;

    public List<EtapaKanbanDTO> listar() {
        return repository.findAllByOrderByOrdemAsc().stream().map(this::toDTO).toList();
    }

    public EtapaKanbanDTO criar(String nome) {
        int proximaOrdem = repository.findAllByOrderByOrdemAsc().stream()
                .mapToInt(EtapaKanban::getOrdem).max().orElse(-1) + 1;
        EtapaKanban etapa = new EtapaKanban();
        etapa.setNome(nome);
        etapa.setOrdem(proximaOrdem);
        return toDTO(repository.save(etapa));
    }

    public EtapaKanbanDTO renomear(Long id, String novoNome) {
        EtapaKanban etapa = buscar(id);
        etapa.setNome(novoNome);
        return toDTO(repository.save(etapa));
    }

    // So remove a coluna - leads que estavam nela mantem o texto salvo em
    // Contato.estagio (nao apaga/edita leads), so deixam de aparecer numa
    // coluna do Kanban ate serem movidos pra outra.
    public void remover(Long id) {
        if (!repository.existsById(id)) {
            throw new NoSuchElementException("Etapa nao encontrada: " + id);
        }
        repository.deleteById(id);
    }

    public List<EtapaKanbanDTO> reordenar(List<Long> idsEmOrdem) {
        for (int i = 0; i < idsEmOrdem.size(); i++) {
            EtapaKanban etapa = buscar(idsEmOrdem.get(i));
            etapa.setOrdem(i);
            repository.save(etapa);
        }
        return listar();
    }

    private EtapaKanban buscar(Long id) {
        return repository.findById(id)
                .orElseThrow(() -> new NoSuchElementException("Etapa nao encontrada: " + id));
    }

    private EtapaKanbanDTO toDTO(EtapaKanban e) {
        return new EtapaKanbanDTO(e.getId(), e.getNome(), e.getOrdem());
    }
}
