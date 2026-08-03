package br.com.sorria.crm.dispatch;

import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;
import java.util.Map;
import java.util.NoSuchElementException;

// Historico agregado de disparo pra prospects (fora do CRM) - alimenta o
// Painel Executivo ("template X enviou pra Y prospects").
@RestController
@RequestMapping("/api/dispatch-prospect-history")
@RequiredArgsConstructor
public class DisparoProspectController {

    private final DisparoProspectHistoricoRepository repository;

    @GetMapping
    public List<DisparoProspectHistorico> listar() {
        return repository.findAllByOrderByCriadoEmDesc();
    }

    // Mesmo raciocinio de limpeza manual do DisparoController - os dois juntos
    // cobrem "todo historico de disparo" (CRM + prospects fora do CRM).
    @DeleteMapping
    @PreAuthorize("hasRole('ADMIN')")
    @ResponseStatus(HttpStatus.OK)
    public Map<String, Long> limpar() {
        long total = repository.count();
        repository.deleteAll();
        return Map.of("removidos", total);
    }

    // Remover so UM registro (ex.: disparo de teste que inflou o total do
    // Painel/Meu Plano por engano) - antes so dava pra zerar tudo de uma vez.
    @DeleteMapping("/{id}")
    @PreAuthorize("hasRole('ADMIN')")
    public Map<String, Boolean> removerUm(@PathVariable Long id) {
        if (!repository.existsById(id)) {
            throw new NoSuchElementException("Registro nao encontrado: " + id);
        }
        repository.deleteById(id);
        return Map.of("ok", true);
    }
}
