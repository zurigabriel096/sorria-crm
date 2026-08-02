package br.com.sorria.crm.etapa;

import br.com.sorria.crm.etapa.dto.EtapaKanbanDTO;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/etapas")
@RequiredArgsConstructor
public class EtapaKanbanController {

    private final EtapaKanbanService service;

    @GetMapping
    public List<EtapaKanbanDTO> listar() {
        return service.listar();
    }

    @PostMapping
    @PreAuthorize("hasRole('ADMIN')")
    public EtapaKanbanDTO criar(@Valid @RequestBody EtapaKanbanDTO dto) {
        return service.criar(dto.nome());
    }

    @PatchMapping("/{id}")
    @PreAuthorize("hasRole('ADMIN')")
    public EtapaKanbanDTO renomear(@PathVariable Long id, @Valid @RequestBody EtapaKanbanDTO dto) {
        return service.renomear(id, dto.nome());
    }

    @DeleteMapping("/{id}")
    @PreAuthorize("hasRole('ADMIN')")
    public Map<String, Boolean> remover(@PathVariable Long id) {
        service.remover(id);
        return Map.of("ok", true);
    }

    @PutMapping("/reordenar")
    @PreAuthorize("hasRole('ADMIN')")
    public List<EtapaKanbanDTO> reordenar(@RequestBody List<Long> idsEmOrdem) {
        return service.reordenar(idsEmOrdem);
    }
}
