package br.com.sorria.crm.tag;

import br.com.sorria.crm.tag.dto.TagDTO;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.web.server.ResponseStatusException;

import java.util.List;
import java.util.NoSuchElementException;

@Service
@RequiredArgsConstructor
public class TagService {

    private static final String COR_PADRAO = "#0FA895";

    private final TagRepository repository;

    public List<TagDTO> listar() {
        return repository.findAll().stream().map(this::toDTO).toList();
    }

    public TagDTO criar(String nome, String cor) {
        garantirNomeUnico(nome, null);
        Tag tag = new Tag();
        tag.setNome(nome);
        tag.setCor(cor != null && !cor.isBlank() ? cor : COR_PADRAO);
        return toDTO(repository.save(tag));
    }

    public TagDTO atualizar(Long id, TagDTO dto) {
        Tag tag = buscar(id);
        garantirNomeUnico(dto.nome(), id);
        tag.setNome(dto.nome());
        if (dto.cor() != null && !dto.cor().isBlank()) tag.setCor(dto.cor());
        return toDTO(repository.save(tag));
    }

    // Comparacao sem diferenciar maiuscula/minuscula de proposito - "Cliente" e
    // "cliente" sao a mesma tag pra quem esta filtrando/segmentando por nome,
    // duas linhas diferentes so confundiriam. idAtual exclui a propria tag da
    // checagem quando e' uma edicao (renomear pro mesmo nome que ja tem, sem mudar nada).
    private void garantirNomeUnico(String nome, Long idAtual) {
        repository.findByNomeIgnoreCase(nome).ifPresent(existente -> {
            if (!existente.getId().equals(idAtual)) {
                throw new ResponseStatusException(HttpStatus.CONFLICT, "Já existe uma tag com esse nome.");
            }
        });
    }

    public void remover(Long id) {
        if (!repository.existsById(id)) {
            throw new NoSuchElementException("Tag nao encontrada: " + id);
        }
        repository.deleteById(id);
    }

    private Tag buscar(Long id) {
        return repository.findById(id)
                .orElseThrow(() -> new NoSuchElementException("Tag nao encontrada: " + id));
    }

    private TagDTO toDTO(Tag t) {
        return new TagDTO(t.getId(), t.getNome(), t.getCor());
    }
}
