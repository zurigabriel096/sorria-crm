package br.com.sorria.crm.tag;

import br.com.sorria.crm.tag.dto.TagDTO;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/tags")
@RequiredArgsConstructor
public class TagController {

    private final TagService service;

    @GetMapping
    public List<TagDTO> listar() {
        return service.listar();
    }

    @PostMapping
    public TagDTO criar(@Valid @RequestBody TagDTO dto) {
        return service.criar(dto.nome(), dto.cor());
    }

    @PutMapping("/{id}")
    public TagDTO atualizar(@PathVariable Long id, @Valid @RequestBody TagDTO dto) {
        return service.atualizar(id, dto);
    }

    @DeleteMapping("/{id}")
    public Map<String, Boolean> remover(@PathVariable Long id) {
        service.remover(id);
        return Map.of("ok", true);
    }
}
