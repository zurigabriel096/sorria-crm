package br.com.sorria.crm.contact;

import br.com.sorria.crm.common.lote.LoteJobService;
import br.com.sorria.crm.common.lote.LoteJobStatus;
import br.com.sorria.crm.contact.dto.AplicarTagLoteRequest;
import br.com.sorria.crm.contact.dto.AtribuirResponsavelLoteRequest;
import br.com.sorria.crm.contact.dto.ContatoDTO;
import br.com.sorria.crm.contact.dto.ExcluirLoteRequest;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.server.ResponseStatusException;

import java.util.ArrayList;
import java.util.Collections;
import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/contacts")
@RequiredArgsConstructor
public class ContatoController {

    private final ContatoService contatoService;
    private final LoteJobService loteJobService;

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

    // Importacao de planilha: roda em background, mesma infraestrutura de
    // tag/excluir em lote (ver LoteJobService) - responde na hora com um
    // jobId, em vez de prender a requisicao ate processar a planilha inteira
    // (uma base grande no Render free tier levaria minutos presos numa unica
    // chamada, sem timeout no fetch do frontend - dava a impressao de tela
    // travada). O frontend acompanha o progresso pelo GET abaixo.
    @PostMapping("/lote")
    @ResponseStatus(HttpStatus.ACCEPTED)
    public Map<String, Object> criarEmLote(@RequestBody List<ContatoDTO> dtos) {
        String jobId = loteJobService.iniciar(dtos, contatoService::importarLinha);
        int total = dtos != null ? dtos.size() : 0;
        return Map.of("jobId", jobId, "total", total);
    }

    @GetMapping("/lote/{jobId}")
    public Map<String, Object> statusImportacaoLote(@PathVariable String jobId) {
        return statusDTO(loteJobService.status(jobId));
    }

    @PutMapping("/{id}")
    public ContatoDTO atualizar(@PathVariable Long id, @Valid @RequestBody ContatoDTO dto) {
        return contatoService.atualizar(id, dto);
    }

    // Restrito a ADMIN - excluir lead e' irreversivel, e o frontend so mostra
    // esse botao pra ADMIN (essa anotacao evita que outro papel chame a rota
    // direto, sem passar pela tela).
    @DeleteMapping("/{id}")
    @PreAuthorize("hasRole('ADMIN')")
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
    // Roda em background (LoteJobService) - responde na hora com um jobId,
    // sem prender a requisicao ate processar todo mundo (cada linha e' um
    // round-trip pro banco, uma base grande levaria minutos).
    @PostMapping("/tags/lote")
    @PreAuthorize("hasRole('ADMIN')")
    @ResponseStatus(HttpStatus.ACCEPTED)
    public Map<String, Object> aplicarTagEmLote(@RequestBody AplicarTagLoteRequest req) {
        String jobId = loteJobService.iniciar(req.contatoIds(), id -> {
            aplicarTagNoContato(id, req.tag(), req.remover());
            return id;
        });
        int total = req.contatoIds() != null ? req.contatoIds().size() : 0;
        return Map.of("jobId", jobId, "total", total);
    }

    @GetMapping("/tags/lote/{jobId}")
    @PreAuthorize("hasRole('ADMIN')")
    public Map<String, Object> statusTagEmLote(@PathVariable String jobId) {
        return statusDTO(loteJobService.status(jobId));
    }

    // Exclui varios leads de uma vez (ex.: todo mundo capturado por uma
    // Segmentacao) - mesma infraestrutura de background da tag em lote.
    // Irreversivel: o frontend exige digitar uma frase de confirmacao antes
    // de chamar isso (ver Segmentacoes.jsx).
    @PostMapping("/excluir-lote")
    @PreAuthorize("hasRole('ADMIN')")
    @ResponseStatus(HttpStatus.ACCEPTED)
    public Map<String, Object> excluirEmLote(@RequestBody ExcluirLoteRequest req) {
        String jobId = loteJobService.iniciar(req.contatoIds(), id -> {
            contatoService.remover(id);
            return id;
        });
        int total = req.contatoIds() != null ? req.contatoIds().size() : 0;
        return Map.of("jobId", jobId, "total", total);
    }

    @GetMapping("/excluir-lote/{jobId}")
    @PreAuthorize("hasRole('ADMIN')")
    public Map<String, Object> statusExcluirEmLote(@PathVariable String jobId) {
        return statusDTO(loteJobService.status(jobId));
    }

    // Distribui os leads entre os colaboradores escolhidos - aleatorio E
    // equilibrado ao mesmo tempo: embaralha a ordem dos contatos e depois
    // distribui em rodizio pelos colaboradores (contato N vai pro colaborador
    // N % total). O embaralhamento garante que QUAL contato cai com QUAL
    // colaborador seja aleatorio; o rodizio garante que a contagem final fique
    // igual (diferenca de no maximo 1) entre eles. Roda em background, mesma
    // infraestrutura de tag/excluir em lote.
    @PostMapping("/responsavel/lote")
    @PreAuthorize("hasRole('ADMIN')")
    @ResponseStatus(HttpStatus.ACCEPTED)
    public Map<String, Object> atribuirResponsavelEmLote(@RequestBody AtribuirResponsavelLoteRequest req) {
        List<Long> colaboradorIds = req.colaboradorIds() != null ? req.colaboradorIds() : List.of();
        if (colaboradorIds.isEmpty()) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Escolha pelo menos 1 colaborador.");
        }
        List<Long> embaralhados = new ArrayList<>(req.contatoIds() != null ? req.contatoIds() : List.of());
        Collections.shuffle(embaralhados);

        List<ParContatoColaborador> pares = new ArrayList<>();
        for (int i = 0; i < embaralhados.size(); i++) {
            pares.add(new ParContatoColaborador(embaralhados.get(i), colaboradorIds.get(i % colaboradorIds.size())));
        }

        String jobId = loteJobService.iniciar(pares, par -> {
            contatoService.atribuirResponsavel(par.contatoId(), par.colaboradorId());
            return par.contatoId();
        });
        return Map.of("jobId", jobId, "total", pares.size());
    }

    @GetMapping("/responsavel/lote/{jobId}")
    @PreAuthorize("hasRole('ADMIN')")
    public Map<String, Object> statusResponsavelEmLote(@PathVariable String jobId) {
        return statusDTO(loteJobService.status(jobId));
    }

    private record ParContatoColaborador(Long contatoId, Long colaboradorId) {
    }

    private void aplicarTagNoContato(Long contatoId, String tag, boolean remover) {
        if (remover) contatoService.removerTag(contatoId, tag);
        else contatoService.adicionarTag(contatoId, tag);
    }

    // "resultados": ids devolvidos por cada item processado (ex.: contato
    // criado/mesclado numa importacao) - usado por "Importações" em
    // Segmentacoes.jsx pra criar a segmentacao da leva com os ids certos,
    // sem precisar recarregar a base inteira e adivinhar quem entrou agora.
    private Map<String, Object> statusDTO(LoteJobStatus<?> status) {
        Map<String, Object> dto = new java.util.HashMap<>();
        dto.put("total", status.getTotal());
        dto.put("processados", status.getProcessados());
        dto.put("afetados", status.getAfetados());
        dto.put("concluido", status.isConcluido());
        dto.put("resultados", status.getResultados());
        return dto;
    }
}
