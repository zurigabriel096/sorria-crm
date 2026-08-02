package br.com.sorria.crm.colunas;

import lombok.RequiredArgsConstructor;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/config-colunas")
@RequiredArgsConstructor
public class ConfigColunasController {

    private final ConfigColunasService service;

    @GetMapping
    public Map<String, List<String>> obter() {
        return Map.of("colunas", service.obter());
    }

    @PutMapping
    @PreAuthorize("hasAnyRole('ADMIN','GESTOR')")
    public Map<String, List<String>> atualizar(@RequestBody Map<String, List<String>> body) {
        return Map.of("colunas", service.atualizar(body.get("colunas")));
    }
}
