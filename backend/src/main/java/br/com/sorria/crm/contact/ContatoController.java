package br.com.sorria.crm.contact;

import br.com.sorria.crm.contact.dto.AplicarTagLoteRequest;
import br.com.sorria.crm.contact.dto.ContatoDTO;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.server.ResponseStatusException;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/contacts")
@RequiredArgsConstructor
public class ContatoController {

    private final ContatoService contatoService;
    private final TagLoteJobService tagLoteJobService;

    @GetMapping
    public List<ContatoDTO> listar(Authentication auth) {
        return contatoService.listarVisiveisPara(auth.getName());
    }

    @GetMapping("/{id}")
    public ContatoDTO buscar(@PathVariable Long id, Authentication auth) {
        if (!contatoService.podeVer(contatoService.buscarEntidade(id), auth.getName())) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "Voce nao tem acesso a este lead.");
        }
        return contatoService.buscar(id);
    }

    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    public ContatoDTO criar(@Valid @RequestBody ContatoDTO dto) {
        return contatoService.criar(dto);
    }

    // Importacao de planilha: 1 requisicao com todas as linhas, em vez do
    // frontend disparar centenas/milhares de POSTs simultaneos (isso chegava a
    // sobrecarregar o backend em bases grandes - ver criarEmLote).
    @PostMapping("/lote")
    @ResponseStatus(HttpStatus.CREATED)
    public List<ContatoDTO> criarEmLote(@RequestBody List<ContatoDTO> dtos) {
        return contatoService.criarEmLote(dtos);
    }

    @PutMapping("/{id}")
    public ContatoDTO atualizar(@PathVariable Long id, @Valid @RequestBody ContatoDTO dto) {
        return contatoService.atualizar(id, dto);
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> remover(@PathVariable Long id) {
        contatoService.remover(id);
        return ResponseEntity.noContent().build();
    }

    // Limpeza de duplicados (mesmo telefone) que ja existiam antes da trava de
    // criacao existir - mescla os cadastros e move o historico de mensagens,
    // nao apaga dado nenhum. Restrito a ADMIN por mexer na base inteira de uma vez.
    @PostMapping("/unificar-duplicados")
    @PreAuthorize("hasRole('ADMIN')")
    public Map<String, Integer> unificarDuplicados() {
        return Map.of("unificados", contatoService.unificarDuplicados());
    }

    // Adiciona/remove uma tag em varios leads de uma vez (ex.: todo mundo que
    // uma Segmentacao captura hoje) - restrito a ADMIN por mexer em varios
    // cadastros de uma vez, mesmo raciocinio do unificar-duplicados acima.
    // Roda em background (TagLoteJobService/TagLoteWorker) - responde na hora
    // com um jobId, sem prender a requisicao ate processar todo mundo (cada
    // linha e' um round-trip pro banco, uma base grande levaria minutos).
    @PostMapping("/tags/lote")
    @PreAuthorize("hasRole('ADMIN')")
    @ResponseStatus(HttpStatus.ACCEPTED)
    public Map<String, Object> aplicarTagEmLote(@RequestBody AplicarTagLoteRequest req) {
        String jobId = tagLoteJobService.iniciar(req.contatoIds(), req.tag(), req.remover());
        int total = req.contatoIds() != null ? req.contatoIds().size() : 0;
        return Map.of("jobId", jobId, "total", total);
    }

    @GetMapping("/tags/lote/{jobId}")
    @PreAuthorize("hasRole('ADMIN')")
    public Map<String, Object> statusTagEmLote(@PathVariable String jobId) {
        TagLoteJobStatus status = tagLoteJobService.status(jobId);
        return Map.of(
                "total", status.getTotal(),
                "processados", status.getProcessados(),
                "afetados", status.getAfetados(),
                "concluido", status.isConcluido()
        );
    }
}
