package br.com.sorria.crm.campo;

import br.com.sorria.crm.campo.dto.CampoCustomizadoDTO;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

// So ADMIN/GESTOR cria/edita/remove campos customizados - e' uma decisao
// estrutural (o que passa a existir no cadastro de todo lead), igual criar
// coluna do Kanban. Qualquer colaborador autenticado pode listar (precisa
// pra preencher o valor no cadastro do lead e montar segmentacoes).
@RestController
@RequestMapping("/api/campos-customizados")
@RequiredArgsConstructor
public class CampoCustomizadoController {

    private final CampoCustomizadoService service;

    @GetMapping
    public List<CampoCustomizadoDTO> listar() {
        return service.listar();
    }

    @PostMapping
    @PreAuthorize("hasAnyRole('ADMIN','GESTOR')")
    public CampoCustomizadoDTO criar(@Valid @RequestBody CampoCustomizadoDTO dto) {
        return service.criar(dto);
    }

    @PutMapping("/{id}")
    @PreAuthorize("hasAnyRole('ADMIN','GESTOR')")
    public CampoCustomizadoDTO atualizar(@PathVariable Long id, @Valid @RequestBody CampoCustomizadoDTO dto) {
        return service.atualizar(id, dto);
    }

    @DeleteMapping("/{id}")
    @PreAuthorize("hasAnyRole('ADMIN','GESTOR')")
    public Map<String, Boolean> remover(@PathVariable Long id) {
        service.remover(id);
        return Map.of("ok", true);
    }
}
