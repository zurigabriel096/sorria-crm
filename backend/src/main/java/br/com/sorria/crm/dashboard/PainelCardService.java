package br.com.sorria.crm.dashboard;

import br.com.sorria.crm.contact.Contato;
import br.com.sorria.crm.contact.ContatoRepository;
import br.com.sorria.crm.dashboard.dto.PainelCardDTO;
import br.com.sorria.crm.dashboard.dto.PainelCardDTO.ValorContagemDTO;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import java.util.Comparator;
import java.util.List;
import java.util.Map;
import java.util.NoSuchElementException;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class PainelCardService {

    private final PainelCardRepository repository;
    private final ContatoRepository contatoRepository;

    public List<PainelCardDTO> listar() {
        List<PainelCard> cards = repository.findAllByOrderByOrdemAsc();
        // So busca a base inteira de contatos se existir pelo menos 1 card - sem
        // isso, toda carga do Painel pagava o custo de puxar TODOS os contatos
        // (agora bem mais de 1000) mesmo com 0 cards configurados.
        if (cards.isEmpty()) return List.of();
        List<Contato> contatos = contatoRepository.findAll();
        return cards.stream().map(c -> toDTO(c, contatos)).toList();
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
        card.setRotulo(dto.rotulo());
    }

    private static final String VAZIO = "(vazio)";

    // Quebra automatica: agrupa todo Contato pelo valor que ele tem nesse campo
    // e conta cada grupo - o card nao precisa mais de um valor cadastrado na
    // mao, ele descobre sozinho todos os valores que existem na base agora.
    // O balde "(vazio)" fica de fora do resultado de proposito (pedido do
    // usuario) - ele so existia pra nao perder contagem, mas poluia o card
    // (ex.: 4 valores obrigatorios quando so 3 tem sentido de negocio).
    private PainelCardDTO toDTO(PainelCard c, List<Contato> contatos) {
        Map<String, Long> contagemPorValor = contatos.stream()
                .collect(Collectors.groupingBy(ct -> valorDoCampo(ct, c.getCampoNome()), Collectors.counting()));
        List<ValorContagemDTO> valores = contagemPorValor.entrySet().stream()
                .filter(e -> !VAZIO.equals(e.getKey()))
                .map(e -> new ValorContagemDTO(e.getKey(), e.getValue()))
                .sorted(Comparator.comparing(ValorContagemDTO::contagem).reversed())
                .toList();
        return new PainelCardDTO(c.getId(), c.getCampoNome(), c.getRotulo(), c.getOrdem(), valores);
    }

    // campoNome com prefixo "fixo:" aponta pra um campo fixo do cadastro (ver
    // CAMPOS_FIXOS em Dashboard.jsx) em vez de um campo customizado de nome
    // livre - sem prefixo, continua o comportamento original (camposCustomizados).
    // Vazio vira "(vazio)" pra nao sumir da contagem (senao o total dos grupos
    // nunca bateria com o total de leads).
    private String valorDoCampo(Contato c, String campoNome) {
        String valor;
        if (campoNome.startsWith("fixo:")) {
            valor = switch (campoNome.substring("fixo:".length())) {
                case "financ" -> c.getFinanc();
                case "estagio" -> c.getEstagio();
                case "elegivel" -> c.isElegivel() ? "Sim" : "Não";
                case "dentista" -> c.getDentista();
                default -> null;
            };
        } else {
            valor = c.getCamposCustomizados() != null ? c.getCamposCustomizados().get(campoNome) : null;
        }
        return valor == null || valor.isBlank() ? VAZIO : valor;
    }
}
