package br.com.sorria.crm.segment;

import br.com.sorria.crm.common.dto.ArquivarRequest;
import br.com.sorria.crm.segment.dto.SegmentacaoDTO;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/segmentacoes")
@RequiredArgsConstructor
public class SegmentacaoController {

    private final SegmentacaoService service;

    @GetMapping
    public List<SegmentacaoDTO> listar() {
        return service.listar();
    }

    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    public SegmentacaoDTO criar(@Valid @RequestBody SegmentacaoDTO dto) {
        return service.criar(dto);
    }

    @PutMapping("/{id}")
    public SegmentacaoDTO atualizar(@PathVariable Long id, @Valid @RequestBody SegmentacaoDTO dto) {
        return service.atualizar(id, dto);
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> remover(@PathVariable Long id) {
        service.remover(id);
        return ResponseEntity.noContent().build();
    }

    @PatchMapping("/{id}/arquivar")
    public SegmentacaoDTO arquivar(@PathVariable Long id, @RequestBody ArquivarRequest req) {
        return service.arquivar(id, req.arquivado());
    }
}
