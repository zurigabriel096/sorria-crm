package br.com.sorria.crm.objetivo;

import br.com.sorria.crm.objetivo.dto.ObjetivoDTO;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.web.server.ResponseStatusException;

import java.util.List;
import java.util.NoSuchElementException;

@Service
@RequiredArgsConstructor
public class ObjetivoService {

    private final ObjetivoRepository repository;

    public List<ObjetivoDTO> listar() {
        return repository.findAll().stream().map(this::toDTO).toList();
    }

    // Comparacao sem diferenciar maiuscula/minuscula de proposito - mesmo
    // criterio usado em Tag, pra "Cobrança" e "cobrança" nao virarem duas
    // opcoes diferentes no mesmo <select>.
    public ObjetivoDTO criar(String nome) {
        repository.findByNomeIgnoreCase(nome).ifPresent(existente -> {
            throw new ResponseStatusException(HttpStatus.CONFLICT, "Já existe um objetivo com esse nome.");
        });
        Objetivo objetivo = new Objetivo();
        objetivo.setNome(nome);
        return toDTO(repository.save(objetivo));
    }

    public void remover(Long id) {
        if (!repository.existsById(id)) {
            throw new NoSuchElementException("Objetivo nao encontrado: " + id);
        }
        repository.deleteById(id);
    }

    private ObjetivoDTO toDTO(Objetivo o) {
        return new ObjetivoDTO(o.getId(), o.getNome());
    }
}
