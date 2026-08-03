package br.com.sorria.crm.dashboard;

import br.com.sorria.crm.dashboard.dto.PainelCardDTO;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.List;

// "Big numbers" configuraveis do Painel Executivo (campo personalizado +
// valor -> contagem) - so ADMIN cria/edita/remove, mas qualquer um que ve o
// painel enxerga os cards ja configurados (GET sem restricao de papel).
@RestController
@RequestMapping("/api/painel-cards")
@RequiredArgsConstructor
public class PainelCardController {

    private final PainelCardService service;

    @GetMapping
    public List<PainelCardDTO> listar() {
        return service.listar();
    }

    @PostMapping
    @PreAuthorize("hasRole('ADMIN')")
    @ResponseStatus(HttpStatus.CREATED)
    public PainelCardDTO criar(@Valid @RequestBody PainelCardDTO dto) {
        return service.criar(dto);
    }

    @PutMapping("/{id}")
    @PreAuthorize("hasRole('ADMIN')")
    public PainelCardDTO atualizar(@PathVariable Long id, @Valid @RequestBody PainelCardDTO dto) {
        return service.atualizar(id, dto);
    }

    @DeleteMapping("/{id}")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<Void> remover(@PathVariable Long id) {
        service.remover(id);
        return ResponseEntity.noContent().build();
    }
}
