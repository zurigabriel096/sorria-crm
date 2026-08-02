package br.com.sorria.crm.etapa;

import br.com.sorria.crm.contact.Contato;
import br.com.sorria.crm.contact.ContatoRepository;
import br.com.sorria.crm.etapa.dto.EtapaKanbanDTO;
import br.com.sorria.crm.tag.Tag;
import br.com.sorria.crm.tag.TagRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.ArrayList;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.NoSuchElementException;
import java.util.Set;

@Service
@RequiredArgsConstructor
@Transactional
public class EtapaKanbanService {

    private static final String COR_PADRAO_TAG_ETAPA = "#5A7089";

    private final EtapaKanbanRepository repository;
    private final TagRepository tagRepository;
    private final ContatoRepository contatoRepository;

    public List<EtapaKanbanDTO> listar() {
        return repository.findAllByOrderByOrdemAsc().stream().map(this::toDTO).toList();
    }

    // Toda coluna nova ganha uma tag automatica vinculada (Tag.etapaId) - e'
    // ela que os leads recebem/perdem sozinhos ao mudar de etapa (ver
    // ContatoService.sincronizarTagDeEtapa).
    public EtapaKanbanDTO criar(String nome) {
        int proximaOrdem = repository.findAllByOrderByOrdemAsc().stream()
                .mapToInt(EtapaKanban::getOrdem).max().orElse(-1) + 1;
        EtapaKanban etapa = new EtapaKanban();
        etapa.setNome(nome);
        etapa.setOrdem(proximaOrdem);
        EtapaKanban salva = repository.save(etapa);
        criarTagVinculada(salva);
        return toDTO(salva);
    }

    // Renomear a coluna precisa propagar pra tres lugares, senao a base
    // existente fica inconsistente: a tag vinculada, o texto ja salvo em
    // Contato.estagio de quem esta nessa coluna, e a tag automatica ja
    // aplicada nesses mesmos leads.
    public EtapaKanbanDTO renomear(Long id, String novoNome) {
        EtapaKanban etapa = buscar(id);
        String nomeAntigo = etapa.getNome();
        etapa.setNome(novoNome);
        EtapaKanban salva = repository.save(etapa);
        if (!nomeAntigo.equals(novoNome)) {
            Tag tag = tagRepository.findByEtapaId(id).orElse(null);
            if (tag != null) {
                tag.setNome(novoNome);
                tagRepository.save(tag);
            } else {
                criarTagVinculada(salva);
            }
            renomearReferenciasNosContatos(nomeAntigo, novoNome);
        }
        return toDTO(salva);
    }

    // So remove a coluna - leads que estavam nela mantem o texto salvo em
    // Contato.estagio (nao apaga/edita leads), so deixam de aparecer numa
    // coluna do Kanban ate serem movidos pra outra. A tag vinculada tambem
    // fica (historico do lead nao deve sumir so porque a coluna foi excluida).
    public void remover(Long id) {
        if (!repository.existsById(id)) {
            throw new NoSuchElementException("Etapa nao encontrada: " + id);
        }
        repository.deleteById(id);
    }

    public List<EtapaKanbanDTO> reordenar(List<Long> idsEmOrdem) {
        for (int i = 0; i < idsEmOrdem.size(); i++) {
            EtapaKanban etapa = buscar(idsEmOrdem.get(i));
            etapa.setOrdem(i);
            repository.save(etapa);
        }
        return listar();
    }

    private void criarTagVinculada(EtapaKanban etapa) {
        if (tagRepository.findByEtapaId(etapa.getId()).isPresent()) return;
        Tag tag = new Tag();
        tag.setNome(etapa.getNome());
        tag.setCor(COR_PADRAO_TAG_ETAPA);
        tag.setEtapaId(etapa.getId());
        tagRepository.save(tag);
    }

    private void renomearReferenciasNosContatos(String nomeAntigo, String novoNome) {
        Set<Contato> afetados = new LinkedHashSet<>();
        afetados.addAll(contatoRepository.findByEstagio(nomeAntigo));
        afetados.addAll(contatoRepository.findByTagsContaining(nomeAntigo));
        for (Contato c : afetados) {
            if (nomeAntigo.equals(c.getEstagio())) c.setEstagio(novoNome);
            if (c.getTags().contains(nomeAntigo)) {
                List<String> tags = new ArrayList<>(c.getTags());
                tags.remove(nomeAntigo);
                if (!tags.contains(novoNome)) tags.add(novoNome);
                c.setTags(tags);
            }
        }
        contatoRepository.saveAll(afetados);
    }

    private EtapaKanban buscar(Long id) {
        return repository.findById(id)
                .orElseThrow(() -> new NoSuchElementException("Etapa nao encontrada: " + id));
    }

    private EtapaKanbanDTO toDTO(EtapaKanban e) {
        return new EtapaKanbanDTO(e.getId(), e.getNome(), e.getOrdem());
    }
}
