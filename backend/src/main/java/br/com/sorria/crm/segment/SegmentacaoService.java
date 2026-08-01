package br.com.sorria.crm.segment;

import br.com.sorria.crm.segment.dto.SegmentacaoDTO;
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
public class SegmentacaoService {

    private final SegmentacaoRepository repository;
    private final ObjectMapper objectMapper;

    public List<SegmentacaoDTO> listar() {
        return repository.findAll().stream().map(this::toDTO).toList();
    }

    public SegmentacaoDTO criar(SegmentacaoDTO dto) {
        Segmentacao seg = new Segmentacao();
        aplicar(dto, seg);
        return toDTO(repository.save(seg));
    }

    public SegmentacaoDTO atualizar(Long id, SegmentacaoDTO dto) {
        Segmentacao seg = buscarEntidade(id);
        aplicar(dto, seg);
        return toDTO(repository.save(seg));
    }

    public void remover(Long id) {
        if (!repository.existsById(id)) {
            throw new NoSuchElementException("Segmentacao nao encontrada: " + id);
        }
        repository.deleteById(id);
    }

    private Segmentacao buscarEntidade(Long id) {
        return repository.findById(id)
                .orElseThrow(() -> new NoSuchElementException("Segmentacao nao encontrada: " + id));
    }

    private void aplicar(SegmentacaoDTO dto, Segmentacao seg) {
        seg.setNome(dto.nome());
        try {
            seg.setGroupsJson(objectMapper.writeValueAsString(dto.groups()));
        } catch (JsonProcessingException e) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "groups invalido");
        }
    }

    private SegmentacaoDTO toDTO(Segmentacao seg) {
        try {
            Object groups = objectMapper.readValue(seg.getGroupsJson(), Object.class);
            return new SegmentacaoDTO(seg.getId(), seg.getNome(), groups);
        } catch (JsonProcessingException e) {
            throw new IllegalStateException("groupsJson corrompido pra segmentacao " + seg.getId(), e);
        }
    }
}
