package br.com.sorria.crm.campaign;

import br.com.sorria.crm.campaign.dto.TemplateDTO;
import br.com.sorria.crm.common.dto.ArquivarRequest;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/templates")
@RequiredArgsConstructor
public class TemplateController {

    private final TemplateService templateService;

    @GetMapping
    public List<TemplateDTO> listar() {
        return templateService.listar();
    }

    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    public TemplateDTO criar(@Valid @RequestBody TemplateDTO dto) {
        return templateService.criar(dto);
    }

    @PutMapping("/{id}")
    public TemplateDTO atualizar(@PathVariable Long id, @Valid @RequestBody TemplateDTO dto) {
        return templateService.atualizar(id, dto);
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> remover(@PathVariable Long id) {
        templateService.remover(id);
        return ResponseEntity.noContent().build();
    }

    @PatchMapping("/{id}/arquivar")
    public TemplateDTO arquivar(@PathVariable Long id, @RequestBody ArquivarRequest req) {
        return templateService.arquivar(id, req.arquivado());
    }

    // Disparo isolado de teste - manda o template pra um numero digitado na
    // hora, sem criar/precisar de Contato nenhum (ver TemplateService.testarDisparo).
    @PostMapping("/{id}/testar-disparo")
    public Map<String, String> testarDisparo(@PathVariable Long id, @RequestBody Map<String, Object> body) {
        String telefone = String.valueOf(body.get("telefone"));
        Object numeroIdBruto = body.get("whatsappNumeroId");
        Long whatsappNumeroId = numeroIdBruto == null ? null : Long.valueOf(String.valueOf(numeroIdBruto));
        String status = templateService.testarDisparo(id, telefone, whatsappNumeroId);
        return Map.of("status", status);
    }
}
