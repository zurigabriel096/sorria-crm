package br.com.sorria.crm.campo;

import br.com.sorria.crm.campo.dto.CampoCustomizadoDTO;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import java.util.ArrayList;
import java.util.List;
import java.util.NoSuchElementException;

@Service
@RequiredArgsConstructor
public class CampoCustomizadoService {

    private final CampoCustomizadoRepository repository;

    public List<CampoCustomizadoDTO> listar() {
        return repository.findAllByOrderByOrdemAsc().stream().map(this::toDTO).toList();
    }

    public CampoCustomizadoDTO criar(CampoCustomizadoDTO dto) {
        int proximaOrdem = repository.findAllByOrderByOrdemAsc().stream()
                .mapToInt(CampoCustomizado::getOrdem).max().orElse(-1) + 1;
        CampoCustomizado campo = new CampoCustomizado();
        aplicar(dto, campo);
        campo.setOrdem(proximaOrdem);
        return toDTO(repository.save(campo));
    }

    public CampoCustomizadoDTO atualizar(Long id, CampoCustomizadoDTO dto) {
        CampoCustomizado campo = buscar(id);
        aplicar(dto, campo);
        return toDTO(repository.save(campo));
    }

    // So remove a definicao do campo - valores ja salvos em
    // Contato.camposCustomizados (chave = nome do campo) permanecem intactos,
    // mesmo padrao ja usado na remocao de EtapaKanban (nao apaga dado do lead).
    public void remover(Long id) {
        if (!repository.existsById(id)) {
            throw new NoSuchElementException("Campo customizado nao encontrado: " + id);
        }
        repository.deleteById(id);
    }

    private void aplicar(CampoCustomizadoDTO dto, CampoCustomizado campo) {
        campo.setNome(dto.nome());
        campo.setTipo(dto.tipo());
        campo.setOpcoes(dto.opcoes() != null ? new ArrayList<>(dto.opcoes()) : new ArrayList<>());
    }

    private CampoCustomizado buscar(Long id) {
        return repository.findById(id)
                .orElseThrow(() -> new NoSuchElementException("Campo customizado nao encontrado: " + id));
    }

    private CampoCustomizadoDTO toDTO(CampoCustomizado c) {
        return new CampoCustomizadoDTO(c.getId(), c.getNome(), c.getTipo(), c.getOpcoes(), c.getOrdem());
    }
}
