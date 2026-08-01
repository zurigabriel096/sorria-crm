package br.com.sorria.crm.contact;

import br.com.sorria.crm.contact.dto.ContatoDTO;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/contacts")
@RequiredArgsConstructor
public class ContatoController {

    private final ContatoService contatoService;

    @GetMapping
    public List<ContatoDTO> listar() {
        return contatoService.listar();
    }

    @GetMapping("/{id}")
    public ContatoDTO buscar(@PathVariable Long id) {
        return contatoService.buscar(id);
    }

    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    public ContatoDTO criar(@Valid @RequestBody ContatoDTO dto) {
        return contatoService.criar(dto);
    }

    @PutMapping("/{id}")
    public ContatoDTO atualizar(@PathVariable Long id, @Valid @RequestBody ContatoDTO dto) {
        return contatoService.atualizar(id, dto);
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> remover(@PathVariable Long id) {
        contatoService.remover(id);
        return ResponseEntity.noContent().build();
    }
}
