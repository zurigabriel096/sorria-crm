package br.com.sorria.crm.agentevirtual;

import br.com.sorria.crm.agentevirtual.dto.AgenteVirtualConfigDTO;
import br.com.sorria.crm.agentevirtual.dto.PerguntaFrequenteDTO;
import lombok.RequiredArgsConstructor;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

// So ADMIN ve/edita - responde lead automaticamente em nome da clinica,
// mesmo padrao de restricao do Sorr.ia Protect.
@RestController
@RequestMapping("/api/agente-virtual")
@RequiredArgsConstructor
public class AgenteVirtualController {

    private final AgenteVirtualService service;

    @GetMapping("/config")
    @PreAuthorize("hasRole('ADMIN')")
    public AgenteVirtualConfigDTO obterConfig() {
        return service.obterConfig();
    }

    @PutMapping("/config")
    @PreAuthorize("hasRole('ADMIN')")
    public AgenteVirtualConfigDTO atualizarConfig(@RequestBody AgenteVirtualConfigDTO dto) {
        return service.atualizarConfig(dto);
    }

    @GetMapping("/perguntas")
    @PreAuthorize("hasRole('ADMIN')")
    public List<PerguntaFrequenteDTO> listarPerguntas() {
        return service.listarPerguntas();
    }

    @PostMapping("/perguntas")
    @PreAuthorize("hasRole('ADMIN')")
    public PerguntaFrequenteDTO criarPergunta(@RequestBody PerguntaFrequenteDTO dto) {
        return service.criarPergunta(dto);
    }

    @PutMapping("/perguntas/{id}")
    @PreAuthorize("hasRole('ADMIN')")
    public PerguntaFrequenteDTO atualizarPergunta(@PathVariable Long id, @RequestBody PerguntaFrequenteDTO dto) {
        return service.atualizarPergunta(id, dto);
    }

    @DeleteMapping("/perguntas/{id}")
    @PreAuthorize("hasRole('ADMIN')")
    public Map<String, Boolean> excluirPergunta(@PathVariable Long id) {
        service.excluirPergunta(id);
        return Map.of("ok", true);
    }
}
