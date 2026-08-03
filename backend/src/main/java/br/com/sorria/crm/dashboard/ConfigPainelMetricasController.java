package br.com.sorria.crm.dashboard;

import lombok.RequiredArgsConstructor;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/config-painel-metricas")
@RequiredArgsConstructor
public class ConfigPainelMetricasController {

    private final ConfigPainelMetricasService service;

    @GetMapping
    public Map<String, List<String>> obter() {
        return Map.of("metricas", service.obter());
    }

    @PutMapping
    @PreAuthorize("hasRole('ADMIN')")
    public Map<String, List<String>> atualizar(@RequestBody Map<String, List<String>> body) {
        return Map.of("metricas", service.atualizar(body.get("metricas")));
    }
}
