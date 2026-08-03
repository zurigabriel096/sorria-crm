package br.com.sorria.crm.colunas;

import lombok.RequiredArgsConstructor;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/config-campos-lead")
@RequiredArgsConstructor
public class ConfigCamposLeadController {

    private final ConfigCamposLeadService service;

    @GetMapping
    public Map<String, List<String>> obter() {
        return Map.of("campos", service.obter());
    }

    @PutMapping
    @PreAuthorize("hasRole('ADMIN')")
    public Map<String, List<String>> atualizar(@RequestBody Map<String, List<String>> body) {
        return Map.of("campos", service.atualizar(body.get("campos")));
    }
}
