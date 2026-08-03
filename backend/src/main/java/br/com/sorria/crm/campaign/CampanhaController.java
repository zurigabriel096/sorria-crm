package br.com.sorria.crm.campaign;

import br.com.sorria.crm.campaign.dto.CampanhaDTO;
import br.com.sorria.crm.campaign.dto.DispatchProspectRequest;
import br.com.sorria.crm.campaign.dto.DispatchResultDTO;
import br.com.sorria.crm.common.dto.ArquivarRequest;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/campaigns")
@RequiredArgsConstructor
public class CampanhaController {

    private final CampanhaService campanhaService;

    @GetMapping
    public List<CampanhaDTO> listar() {
        return campanhaService.listar();
    }

    @GetMapping("/{id}")
    public CampanhaDTO buscar(@PathVariable Long id) {
        return campanhaService.buscar(id);
    }

    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    public CampanhaDTO criar(@Valid @RequestBody CampanhaDTO dto) {
        return campanhaService.criar(dto);
    }

    @PutMapping("/{id}")
    public CampanhaDTO atualizar(@PathVariable Long id, @Valid @RequestBody CampanhaDTO dto) {
        return campanhaService.atualizar(id, dto);
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> remover(@PathVariable Long id) {
        campanhaService.remover(id);
        return ResponseEntity.noContent().build();
    }

    @PatchMapping("/{id}/arquivar")
    public CampanhaDTO arquivar(@PathVariable Long id, @RequestBody ArquivarRequest req) {
        return campanhaService.arquivar(id, req.arquivado());
    }

    // contatoIds (opcional): quando o disparo é restrito a uma segmentação escolhida no
    // frontend, ele manda aqui os ids dos contatos daquele grupo; sem isso, dispara pra
    // toda a base elegivel/pendente, como antes.
    @PostMapping("/{id}/dispatch")
    public DispatchResultDTO disparar(@PathVariable Long id,
                                       @RequestParam(required = false) Long templateId,
                                       @RequestParam(required = false) List<Long> contatoIds) {
        return campanhaService.disparar(id, templateId, contatoIds);
    }

    // Disparo pra prospects (fora do CRM) - so campanhas com modoProspects=true.
    // A lista de telefones/nomes vem inteira no corpo (upload de planilha feito
    // no frontend), nao cria/mescla Contato nenhum - ver CampanhaService.dispararProspects.
    @PostMapping("/{id}/dispatch-prospects")
    public DispatchResultDTO dispararProspects(@PathVariable Long id, @RequestBody DispatchProspectRequest req) {
        return campanhaService.dispararProspects(id, req.templateId(), req.prospects());
    }
}
