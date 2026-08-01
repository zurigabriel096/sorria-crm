package br.com.sorria.crm.whatsapp;

import lombok.RequiredArgsConstructor;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.Map;

@RestController
@RequestMapping("/api/whatsapp")
@RequiredArgsConstructor
public class WhatsAppController {

    private final EvolutionApiClient evolutionApiClient;

    @GetMapping("/status")
    public Map<String, Object> status() {
        return evolutionApiClient.obterStatus();
    }

    // Troca de numero e uma acao sensivel (derruba o numero atualmente conectado)
    // - restrita a ADMIN de proposito.
    @PostMapping("/pareamento")
    @PreAuthorize("hasRole('ADMIN')")
    public Map<String, String> solicitarPareamento(@RequestBody Map<String, String> body) {
        return Map.of("pairingCode", evolutionApiClient.solicitarPareamento(body.get("telefone")));
    }
}
