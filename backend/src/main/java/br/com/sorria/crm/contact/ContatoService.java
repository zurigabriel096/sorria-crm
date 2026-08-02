package br.com.sorria.crm.contact;

import br.com.sorria.crm.contact.dto.ContatoDTO;
import br.com.sorria.crm.user.Papel;
import br.com.sorria.crm.user.Usuario;
import br.com.sorria.crm.user.UsuarioRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.ArrayList;
import java.util.List;
import java.util.NoSuchElementException;
import java.util.Set;

// @Transactional na classe: sem isso, a colecao lazy `tags` (@ElementCollection) e
// acessada em toDTO() depois que a sessao do Hibernate ja fechou (open-in-view=false),
// e a serializacao para JSON falha com LazyInitializationException.
@Service
@RequiredArgsConstructor
@Transactional
public class ContatoService {

    // Quem enxerga a operacao inteira, sem filtro por responsavel.
    private static final Set<Papel> PAPEIS_VISAO_TOTAL = Set.of(Papel.ADMIN, Papel.GESTOR);

    private final ContatoRepository contatoRepository;
    private final UsuarioRepository usuarioRepository;

    // Visibilidade por colaborador: ADMIN/GESTOR veem tudo; os demais papeis so
    // veem os proprios leads (responsavelId = eles mesmos) + a fila
    // compartilhada (responsavelId nulo, ninguem assumiu ainda).
    public List<ContatoDTO> listarVisiveisPara(String emailUsuarioLogado) {
        Usuario usuario = usuarioRepository.findByEmail(emailUsuarioLogado)
                .orElseThrow(() -> new NoSuchElementException("Usuario nao encontrado"));
        List<Contato> contatos = PAPEIS_VISAO_TOTAL.contains(usuario.getPapel())
                ? contatoRepository.findAll()
                : contatoRepository.findByResponsavelIdOrResponsavelIdIsNull(usuario.getId());
        return contatos.stream().map(this::toDTO).toList();
    }

    public boolean podeVer(Contato contato, String emailUsuarioLogado) {
        Usuario usuario = usuarioRepository.findByEmail(emailUsuarioLogado)
                .orElseThrow(() -> new NoSuchElementException("Usuario nao encontrado"));
        return PAPEIS_VISAO_TOTAL.contains(usuario.getPapel())
                || contato.getResponsavelId() == null
                || contato.getResponsavelId().equals(usuario.getId());
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

    // Importacao de planilha: 1 unica escrita em lote (saveAll) em vez de N
    // INSERTs isolados - o que o frontend fazia antes (uma requisicao HTTP por
    // linha, todas em paralelo) sobrecarregava o backend em planilhas grandes
    // (milhares de linhas = milhares de conexoes simultaneas).
    public List<ContatoDTO> criarEmLote(List<ContatoDTO> dtos) {
        List<Contato> contatos = dtos.stream()
                .filter(dto -> dto.nome() != null && !dto.nome().isBlank())
                .map(dto -> {
                    Contato contato = new Contato();
                    aplicar(dto, contato);
                    return contato;
                })
                .toList();
        return contatoRepository.saveAll(contatos).stream().map(this::toDTO).toList();
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
        contato.setEstagio(dto.estagio());
        contato.setResponsavelId(dto.responsavelId());
        contato.setElegivel(dto.elegivel());
        contato.setEnviado(dto.enviado() != null ? dto.enviado() : "Pendente");
        contato.setTags(dto.tags() != null ? new ArrayList<>(dto.tags()) : new ArrayList<>());
        contato.setOrigem(dto.origem());
    }

    private ContatoDTO toDTO(Contato c) {
        return new ContatoDTO(
                c.getId(), c.getCod(), c.getNome(), c.getTelefone(), c.getEmail(), c.getFinanc(),
                c.getDentista(), c.getUltAtendimento(), c.getRecencia(), c.getSegmento(), c.getEstagio(),
                c.getResponsavelId(), c.isElegivel(), c.getEnviado(), c.getTags(), c.getOrigem()
        );
    }
}
