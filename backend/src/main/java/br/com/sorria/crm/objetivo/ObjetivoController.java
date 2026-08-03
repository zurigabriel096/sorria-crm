package br.com.sorria.crm.objetivo;

import br.com.sorria.crm.objetivo.dto.ObjetivoDTO;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/objetivos")
@RequiredArgsConstructor
public class ObjetivoController {

    private final ObjetivoService service;

    @GetMapping
    public List<ObjetivoDTO> listar() {
        return service.listar();
    }

    @PostMapping
    public ObjetivoDTO criar(@Valid @RequestBody ObjetivoDTO dto) {
        return service.criar(dto.nome());
    }

    // Excluir e' restrito a ADMIN por pedido explicito - criar fica aberto
    // (qualquer papel pode precisar registrar um objetivo novo compondo
    // template/campanha), mas remover da lista principal so o ADMIN decide.
    @DeleteMapping("/{id}")
    @PreAuthorize("hasRole('ADMIN')")
    public Map<String, Boolean> remover(@PathVariable Long id) {
        service.remover(id);
        return Map.of("ok", true);
    }
}
