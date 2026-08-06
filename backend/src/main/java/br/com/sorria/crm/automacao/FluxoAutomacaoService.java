package br.com.sorria.crm.automacao;

import br.com.sorria.crm.automacao.dto.FluxoAutomacaoDTO;
import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.ObjectMapper;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.web.server.ResponseStatusException;

import java.util.List;
import java.util.NoSuchElementException;

@Service
@RequiredArgsConstructor
public class FluxoAutomacaoService {

    private final FluxoAutomacaoRepository repository;
    private final ObjectMapper objectMapper;

    public List<FluxoAutomacaoDTO> listar() {
        return repository.findAll().stream().map(this::toDTO).toList();
    }

    public FluxoAutomacaoDTO buscar(Long id) {
        return toDTO(buscarEntidade(id));
    }

    public FluxoAutomacao buscarEntidade(Long id) {
        return repository.findById(id)
                .orElseThrow(() -> new NoSuchElementException("Fluxo de automacao nao encontrado: " + id));
    }

    public FluxoAutomacaoDTO criar(FluxoAutomacaoDTO dto) {
        FluxoAutomacao fluxo = new FluxoAutomacao();
        aplicar(dto, fluxo);
        return toDTO(repository.save(fluxo));
    }

    public FluxoAutomacaoDTO atualizar(Long id, FluxoAutomacaoDTO dto) {
        FluxoAutomacao fluxo = buscarEntidade(id);
        aplicar(dto, fluxo);
        return toDTO(repository.save(fluxo));
    }

    public void remover(Long id) {
        if (!repository.existsById(id)) {
            throw new NoSuchElementException("Fluxo de automacao nao encontrado: " + id);
        }
        repository.deleteById(id);
    }

    public FluxoAutomacaoDTO ativar(Long id, boolean ativo) {
        FluxoAutomacao fluxo = buscarEntidade(id);
        fluxo.setAtivo(ativo);
        return toDTO(repository.save(fluxo));
    }

    public FluxoAutomacaoDTO arquivar(Long id, boolean arquivado) {
        FluxoAutomacao fluxo = buscarEntidade(id);
        fluxo.setArquivado(arquivado);
        // Seguranca: um fluxo arquivado nunca deve continuar rodando escondido
        // da lista principal.
        if (arquivado) fluxo.setAtivo(false);
        return toDTO(repository.save(fluxo));
    }

    private void aplicar(FluxoAutomacaoDTO dto, FluxoAutomacao fluxo) {
        fluxo.setNome(dto.nome());
        fluxo.setAtivo(dto.ativo() != null && dto.ativo());
        fluxo.setContatoTesteId(dto.contatoTesteId());
        fluxo.setWhatsappNumeroId(dto.whatsappNumeroId());
        try {
            fluxo.setNodesJson(objectMapper.writeValueAsString(dto.nodes()));
            fluxo.setEdgesJson(objectMapper.writeValueAsString(dto.edges()));
        } catch (JsonProcessingException e) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "nodes/edges invalido");
        }
    }

    private FluxoAutomacaoDTO toDTO(FluxoAutomacao fluxo) {
        try {
            Object nodes = objectMapper.readValue(fluxo.getNodesJson(), Object.class);
            Object edges = objectMapper.readValue(fluxo.getEdgesJson(), Object.class);
            return new FluxoAutomacaoDTO(fluxo.getId(), fluxo.getNome(), Boolean.TRUE.equals(fluxo.getAtivo()),
                    nodes, edges, fluxo.getAtualizadoEm(), fluxo.getContatoTesteId(), fluxo.getWhatsappNumeroId(),
                    Boolean.TRUE.equals(fluxo.getArquivado()));
        } catch (JsonProcessingException e) {
            throw new IllegalStateException("nodesJson/edgesJson corrompido pro fluxo " + fluxo.getId(), e);
        }
    }
}
