package br.com.sorria.crm.tag;

import br.com.sorria.crm.tag.dto.TagDTO;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

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
        Tag tag = new Tag();
        tag.setNome(nome);
        tag.setCor(cor != null && !cor.isBlank() ? cor : COR_PADRAO);
        return toDTO(repository.save(tag));
    }

    public TagDTO atualizar(Long id, TagDTO dto) {
        Tag tag = buscar(id);
        tag.setNome(dto.nome());
        if (dto.cor() != null && !dto.cor().isBlank()) tag.setCor(dto.cor());
        return toDTO(repository.save(tag));
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
