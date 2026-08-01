package br.com.sorria.crm.campaign;

import br.com.sorria.crm.campaign.dto.TemplateDTO;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/templates")
@RequiredArgsConstructor
public class TemplateController {

    private final TemplateService templateService;

    @GetMapping
    public List<TemplateDTO> listar() {
        return templateService.listar();
    }

    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    public TemplateDTO criar(@Valid @RequestBody TemplateDTO dto) {
        return templateService.criar(dto);
    }

    @PutMapping("/{id}")
    public TemplateDTO atualizar(@PathVariable Long id, @Valid @RequestBody TemplateDTO dto) {
        return templateService.atualizar(id, dto);
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> remover(@PathVariable Long id) {
        templateService.remover(id);
        return ResponseEntity.noContent().build();
    }
}
