package br.com.sorria.crm.dashboard;

import br.com.sorria.crm.contact.Contato;
import br.com.sorria.crm.contact.ContatoRepository;
import br.com.sorria.crm.dashboard.dto.PainelCardDTO;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import java.util.List;
import java.util.NoSuchElementException;

@Service
@RequiredArgsConstructor
public class PainelCardService {

    private final PainelCardRepository repository;
    private final ContatoRepository contatoRepository;

    public List<PainelCardDTO> listar() {
        List<Contato> contatos = contatoRepository.findAll();
        return repository.findAllByOrderByOrdemAsc().stream().map(c -> toDTO(c, contatos)).toList();
    }

    public PainelCardDTO criar(PainelCardDTO dto) {
        PainelCard card = new PainelCard();
        aplicar(dto, card);
        int proximaOrdem = repository.findAll().stream().mapToInt(PainelCard::getOrdem).max().orElse(-1) + 1;
        card.setOrdem(proximaOrdem);
        return toDTO(repository.save(card), contatoRepository.findAll());
    }

    public PainelCardDTO atualizar(Long id, PainelCardDTO dto) {
        PainelCard card = buscar(id);
        aplicar(dto, card);
        return toDTO(repository.save(card), contatoRepository.findAll());
    }

    public void remover(Long id) {
        if (!repository.existsById(id)) {
            throw new NoSuchElementException("Card do painel nao encontrado: " + id);
        }
        repository.deleteById(id);
    }

    private PainelCard buscar(Long id) {
        return repository.findById(id)
                .orElseThrow(() -> new NoSuchElementException("Card do painel nao encontrado: " + id));
    }

    private void aplicar(PainelCardDTO dto, PainelCard card) {
        card.setCampoNome(dto.campoNome());
        card.setValor(dto.valor());
        card.setRotulo(dto.rotulo() != null && !dto.rotulo().isBlank() ? dto.rotulo() : dto.valor());
    }

    private PainelCardDTO toDTO(PainelCard c, List<Contato> contatos) {
        long contagem = contatos.stream()
                .filter(ct -> ct.getCamposCustomizados() != null && c.getValor().equals(ct.getCamposCustomizados().get(c.getCampoNome())))
                .count();
        return new PainelCardDTO(c.getId(), c.getCampoNome(), c.getValor(), c.getRotulo(), c.getOrdem(), contagem);
    }
}
