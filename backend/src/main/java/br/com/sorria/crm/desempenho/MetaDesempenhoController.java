package br.com.sorria.crm.desempenho;

import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.List;

// Leitura liberada pra qualquer autenticado (precisa aparecer na aba "Equipe"
// de quem tem ela liberada, mesmo nao sendo ADMIN/GESTOR) - so' a EDICAO das
// metas e' exclusiva de ADMIN/GESTOR, pedido explicito do Samuel (07/08/2026).
@RestController
@RequestMapping("/api/metas")
@RequiredArgsConstructor
public class MetaDesempenhoController {

    private final MetaDesempenhoService service;

    @GetMapping
    public List<MetaDesempenhoDTO> listar() {
        return service.listar();
    }

    @PutMapping("/empresa")
    @PreAuthorize("hasAnyRole('ADMIN','GESTOR')")
    public MetaDesempenhoDTO salvarEmpresa(@Valid @RequestBody MetaValorRequest req) {
        return service.salvarEmpresa(req.valor());
    }

    @PutMapping("/equipe")
    @PreAuthorize("hasAnyRole('ADMIN','GESTOR')")
    public MetaDesempenhoDTO salvarEquipe(@Valid @RequestBody MetaValorRequest req) {
        return service.salvarEquipe(req.valor());
    }

    @PutMapping("/individual/{colaboradorId}")
    @PreAuthorize("hasAnyRole('ADMIN','GESTOR')")
    public MetaDesempenhoDTO salvarIndividual(@PathVariable Long colaboradorId, @Valid @RequestBody MetaValorRequest req) {
        return service.salvarIndividual(colaboradorId, req.valor());
    }
}
