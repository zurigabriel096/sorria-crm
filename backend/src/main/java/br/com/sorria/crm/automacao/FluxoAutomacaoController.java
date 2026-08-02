package br.com.sorria.crm.automacao;

import br.com.sorria.crm.automacao.dto.AtivarRequest;
import br.com.sorria.crm.automacao.dto.FluxoAutomacaoDTO;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/automacoes")
@RequiredArgsConstructor
public class FluxoAutomacaoController {

    private final FluxoAutomacaoService service;

    @GetMapping
    public List<FluxoAutomacaoDTO> listar() {
        return service.listar();
    }

    @GetMapping("/{id}")
    public FluxoAutomacaoDTO buscar(@PathVariable Long id) {
        return service.buscar(id);
    }

    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    public FluxoAutomacaoDTO criar(@Valid @RequestBody FluxoAutomacaoDTO dto) {
        return service.criar(dto);
    }

    @PutMapping("/{id}")
    public FluxoAutomacaoDTO atualizar(@PathVariable Long id, @Valid @RequestBody FluxoAutomacaoDTO dto) {
        return service.atualizar(id, dto);
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> remover(@PathVariable Long id) {
        service.remover(id);
        return ResponseEntity.noContent().build();
    }

    // Ativar um fluxo e uma acao sensivel (o motor de execucao passa a mexer em
    // leads de verdade) - restrito a ADMIN de proposito, mesmo padrao das outras
    // acoes sensiveis desta sessao (WhatsApp connect/desconectar).
    @PatchMapping("/{id}/ativar")
    @PreAuthorize("hasRole('ADMIN')")
    public FluxoAutomacaoDTO ativar(@PathVariable Long id, @RequestBody AtivarRequest req) {
        return service.ativar(id, req.ativo());
    }
}
