package br.com.sorria.crm.user;

import br.com.sorria.crm.user.dto.AbasDashboardRequest;
import br.com.sorria.crm.user.dto.UsuarioDTO;
import br.com.sorria.crm.user.dto.UsuarioRequest;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

import java.util.List;

// Colaboradores = usuarios com login real. Criar/editar fica com Admin e Gestor;
// excluir e privilegio exclusivo do Admin (topo da hierarquia).
@RestController
@RequestMapping("/api/usuarios")
@RequiredArgsConstructor
public class UsuarioController {

    private final UsuarioService usuarioService;

    @GetMapping
    public List<UsuarioDTO> listar() {
        return usuarioService.listar();
    }

    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    @PreAuthorize("hasAnyRole('ADMIN','GESTOR')")
    public UsuarioDTO criar(@Valid @RequestBody UsuarioRequest req) {
        return usuarioService.criar(req);
    }

    @PutMapping("/{id}")
    @PreAuthorize("hasAnyRole('ADMIN','GESTOR')")
    public UsuarioDTO atualizar(@PathVariable Long id, @Valid @RequestBody UsuarioRequest req) {
        return usuarioService.atualizar(id, req);
    }

    @PutMapping("/{id}/abas-dashboard")
    @PreAuthorize("hasAnyRole('ADMIN','GESTOR')")
    public UsuarioDTO atualizarAbasDashboard(@PathVariable Long id, @RequestBody AbasDashboardRequest req) {
        return usuarioService.atualizarAbasDashboard(id, req.abas());
    }

    @DeleteMapping("/{id}")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<Void> remover(@PathVariable Long id, Authentication auth) {
        usuarioService.remover(id, auth.getName());
        return ResponseEntity.noContent().build();
    }
}
