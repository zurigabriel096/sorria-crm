package br.com.sorria.crm.user;

import br.com.sorria.crm.user.dto.PapelCargoDTO;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.List;

// Catalogo de funcoes/cargos de colaborador (nome + cor) - qualquer
// autenticado ve a lista (precisa pro badge colorido e pro select de "Funcao"
// em Colaboradores.jsx), so ADMIN cria/edita/remove.
@RestController
@RequestMapping("/api/papeis-cargo")
@RequiredArgsConstructor
public class PapelCargoController {

    private final PapelCargoService service;

    @GetMapping
    public List<PapelCargoDTO> listar() {
        return service.listar();
    }

    @PostMapping
    @PreAuthorize("hasRole('ADMIN')")
    @ResponseStatus(HttpStatus.CREATED)
    public PapelCargoDTO criar(@Valid @RequestBody PapelCargoDTO dto) {
        return service.criar(dto.rotulo(), dto.cor());
    }

    @PutMapping("/{id}")
    @PreAuthorize("hasRole('ADMIN')")
    public PapelCargoDTO atualizar(@PathVariable Long id, @Valid @RequestBody PapelCargoDTO dto) {
        return service.atualizar(id, dto.rotulo(), dto.cor());
    }

    @DeleteMapping("/{id}")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<Void> remover(@PathVariable Long id) {
        service.remover(id);
        return ResponseEntity.noContent().build();
    }
}
