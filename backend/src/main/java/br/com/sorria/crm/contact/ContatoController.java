package br.com.sorria.crm.contact;

import br.com.sorria.crm.contact.dto.ContatoDTO;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.server.ResponseStatusException;

import java.util.List;

@RestController
@RequestMapping("/api/contacts")
@RequiredArgsConstructor
public class ContatoController {

    private final ContatoService contatoService;

    @GetMapping
    public List<ContatoDTO> listar(Authentication auth) {
        return contatoService.listarVisiveisPara(auth.getName());
    }

    @GetMapping("/{id}")
    public ContatoDTO buscar(@PathVariable Long id, Authentication auth) {
        if (!contatoService.podeVer(contatoService.buscarEntidade(id), auth.getName())) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "Voce nao tem acesso a este lead.");
        }
        return contatoService.buscar(id);
    }

    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    public ContatoDTO criar(@Valid @RequestBody ContatoDTO dto) {
        return contatoService.criar(dto);
    }

    // Importacao de planilha: 1 requisicao com todas as linhas, em vez do
    // frontend disparar centenas/milhares de POSTs simultaneos (isso chegava a
    // sobrecarregar o backend em bases grandes - ver criarEmLote).
    @PostMapping("/lote")
    @ResponseStatus(HttpStatus.CREATED)
    public List<ContatoDTO> criarEmLote(@RequestBody List<ContatoDTO> dtos) {
        return contatoService.criarEmLote(dtos);
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
