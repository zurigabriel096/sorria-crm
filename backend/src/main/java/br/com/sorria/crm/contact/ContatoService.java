package br.com.sorria.crm.contact;

import br.com.sorria.crm.contact.dto.ContatoDTO;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import java.util.ArrayList;
import java.util.List;
import java.util.NoSuchElementException;

@Service
@RequiredArgsConstructor
public class ContatoService {

    private final ContatoRepository contatoRepository;

    public List<ContatoDTO> listar() {
        return contatoRepository.findAll().stream().map(this::toDTO).toList();
    }

    public ContatoDTO buscar(Long id) {
        return toDTO(buscarEntidade(id));
    }

    public Contato buscarEntidade(Long id) {
        return contatoRepository.findById(id)
                .orElseThrow(() -> new NoSuchElementException("Contato nao encontrado: " + id));
    }

    public ContatoDTO criar(ContatoDTO dto) {
        Contato contato = new Contato();
        aplicar(dto, contato);
        return toDTO(contatoRepository.save(contato));
    }

    public ContatoDTO atualizar(Long id, ContatoDTO dto) {
        Contato contato = buscarEntidade(id);
        aplicar(dto, contato);
        return toDTO(contatoRepository.save(contato));
    }

    public void remover(Long id) {
        if (!contatoRepository.existsById(id)) {
            throw new NoSuchElementException("Contato nao encontrado: " + id);
        }
        contatoRepository.deleteById(id);
    }

    private void aplicar(ContatoDTO dto, Contato contato) {
        contato.setCod(dto.cod());
        contato.setNome(dto.nome());
        contato.setTelefone(dto.telefone());
        contato.setEmail(dto.email());
        contato.setFinanc(dto.financ());
        contato.setDentista(dto.dentista());
        contato.setUltAtendimento(dto.ultAtendimento());
        contato.setRecencia(dto.recencia());
        contato.setSegmento(dto.segmento());
        contato.setElegivel(dto.elegivel());
        contato.setEnviado(dto.enviado() != null ? dto.enviado() : "Pendente");
        contato.setTags(dto.tags() != null ? new ArrayList<>(dto.tags()) : new ArrayList<>());
        contato.setOrigem(dto.origem());
    }

    private ContatoDTO toDTO(Contato c) {
        return new ContatoDTO(
                c.getId(), c.getCod(), c.getNome(), c.getTelefone(), c.getEmail(), c.getFinanc(),
                c.getDentista(), c.getUltAtendimento(), c.getRecencia(), c.getSegmento(), c.isElegivel(),
                c.getEnviado(), c.getTags(), c.getOrigem()
        );
    }
}
