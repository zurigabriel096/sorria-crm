package br.com.sorria.crm.aquecimento;

import br.com.sorria.crm.aquecimento.dto.AquecimentoConfigDTO;
import br.com.sorria.crm.aquecimento.dto.AquecimentoStatusDTO;
import lombok.RequiredArgsConstructor;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.List;

// "Sorr.ia Protect" - so ADMIN ve/edita, mexe em infraestrutura de WhatsApp
// (mesmo padrao de restricao das outras acoes sensiveis de numero).
@RestController
@RequestMapping("/api/aquecimento")
@RequiredArgsConstructor
public class AquecimentoController {

    private final AquecimentoService service;

    @GetMapping("/config")
    @PreAuthorize("hasRole('ADMIN')")
    public AquecimentoConfigDTO obterConfig() {
        return service.obterConfig();
    }

    @PutMapping("/config")
    @PreAuthorize("hasRole('ADMIN')")
    public AquecimentoConfigDTO atualizarConfig(@RequestBody AquecimentoConfigDTO dto) {
        return service.atualizarConfig(dto);
    }

    @GetMapping("/status")
    @PreAuthorize("hasRole('ADMIN')")
    public List<AquecimentoStatusDTO> status() {
        return service.obterStatus();
    }
}
