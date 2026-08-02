package br.com.sorria.crm.contact;

import br.com.sorria.crm.contact.dto.ContatoDTO;
import br.com.sorria.crm.conversa.MensagemRepository;
import br.com.sorria.crm.user.Papel;
import br.com.sorria.crm.user.Usuario;
import br.com.sorria.crm.user.UsuarioRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.ArrayList;
import java.util.Comparator;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Map;
import java.util.NoSuchElementException;
import java.util.Optional;
import java.util.Set;
import java.util.stream.Collectors;

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
    private final MensagemRepository mensagemRepository;

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

    // Telefone e' o identificador de verdade do lead (a base nao usa CPF nem
    // exige email unico) - se ja existe um contato com esse telefone, os dados
    // novos ENRIQUECEM o cadastro existente (preenchem so o que estava vazio)
    // em vez de criar um segundo cadastro pra mesma pessoa.
    public ContatoDTO criar(ContatoDTO dto) {
        return toDTO(criarOuMesclarEntidade(dto));
    }

    // Importacao de planilha: continua 1 unica requisicao/transacao (nao volta
    // a ser N chamadas HTTP), mas agora cada linha passa pela mesma checagem
    // de telefone duplicado - linhas repetidas na propria planilha, ou que
    // batem com um lead ja existente, se fundem em vez de duplicar.
    public List<ContatoDTO> criarEmLote(List<ContatoDTO> dtos) {
        List<Contato> resultado = new ArrayList<>();
        for (ContatoDTO dto : dtos) {
            if (dto.nome() == null || dto.nome().isBlank()) continue;
            resultado.add(criarOuMesclarEntidade(dto));
        }
        return resultado.stream().map(this::toDTO).toList();
    }

    private Contato criarOuMesclarEntidade(ContatoDTO dto) {
        String telefone = normalizarTelefone(dto.telefone());
        if (telefone != null) {
            Optional<Contato> existente = contatoRepository.findByTelefone(telefone).stream().findFirst();
            if (existente.isPresent()) {
                Contato principal = existente.get();
                mesclarNoExistente(principal, dto);
                return contatoRepository.save(principal);
            }
        }
        Contato contato = new Contato();
        aplicar(dto, contato);
        return contatoRepository.save(contato);
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

    // Limpeza dos duplicados que ja existem na base (ex.: dois cadastros pro
    // mesmo lead, criados antes desta trava existir). Agrupa por telefone; de
    // cada grupo, o cadastro mais antigo (menor id) vira o "principal" e
    // absorve os dados dos outros - o historico de mensagens dos duplicados e'
    // reatribuido ao principal antes de excluir, pra nao perder conversa.
    public int unificarDuplicados() {
        Map<String, List<Contato>> porTelefone = contatoRepository.findAll().stream()
                .filter(c -> c.getTelefone() != null && !c.getTelefone().isBlank())
                .collect(Collectors.groupingBy(Contato::getTelefone));

        int unificados = 0;
        for (List<Contato> grupo : porTelefone.values()) {
            if (grupo.size() < 2) continue;
            grupo.sort(Comparator.comparing(Contato::getId));
            Contato principal = grupo.get(0);
            for (Contato duplicado : grupo.subList(1, grupo.size())) {
                mesclarEntidades(principal, duplicado);
                mensagemRepository.reatribuirContato(duplicado.getId(), principal.getId());
                contatoRepository.delete(duplicado);
                unificados++;
            }
            contatoRepository.save(principal);
        }
        return unificados;
    }

    // "55" + DDD + numero, so digitos - mesma convencao usada na importacao
    // de planilha e no webhook do WhatsApp, pra garantir que o mesmo numero
    // sempre bata como igual, nao importa por onde entrou (cadastro manual,
    // importacao, ou resposta recebida).
    private static String normalizarTelefone(String bruto) {
        if (bruto == null) return null;
        String digitos = bruto.replaceAll("\\D", "");
        if (digitos.isBlank()) return null;
        if (digitos.length() <= 11 && !digitos.startsWith("55")) digitos = "55" + digitos;
        return digitos;
    }

    private void mesclarNoExistente(Contato existente, ContatoDTO novo) {
        if (vazio(existente.getCod())) existente.setCod(novo.cod());
        if (vazio(existente.getEmail())) existente.setEmail(novo.email());
        if (vazio(existente.getFinanc()) || "—".equals(existente.getFinanc())) existente.setFinanc(novo.financ());
        if (vazio(existente.getDentista())) existente.setDentista(novo.dentista());
        if (vazio(existente.getUltAtendimento())) existente.setUltAtendimento(novo.ultAtendimento());
        if (existente.getRecencia() == null) existente.setRecencia(novo.recencia());
        if (vazio(existente.getEstagio())) existente.setEstagio(novo.estagio());
        if (existente.getResponsavelId() == null) existente.setResponsavelId(novo.responsavelId());
        if (vazio(existente.getOrigem())) existente.setOrigem(novo.origem());
        if (novo.tags() != null && !novo.tags().isEmpty()) {
            Set<String> uniao = new LinkedHashSet<>(existente.getTags());
            uniao.addAll(novo.tags());
            existente.setTags(new ArrayList<>(uniao));
        }
    }

    private void mesclarEntidades(Contato principal, Contato duplicado) {
        if (vazio(principal.getCod())) principal.setCod(duplicado.getCod());
        if (vazio(principal.getEmail())) principal.setEmail(duplicado.getEmail());
        if (vazio(principal.getFinanc()) || "—".equals(principal.getFinanc())) principal.setFinanc(duplicado.getFinanc());
        if (vazio(principal.getDentista())) principal.setDentista(duplicado.getDentista());
        if (vazio(principal.getUltAtendimento())) principal.setUltAtendimento(duplicado.getUltAtendimento());
        if (principal.getRecencia() == null) principal.setRecencia(duplicado.getRecencia());
        if (vazio(principal.getEstagio())) principal.setEstagio(duplicado.getEstagio());
        if (principal.getResponsavelId() == null) principal.setResponsavelId(duplicado.getResponsavelId());
        if (vazio(principal.getOrigem())) principal.setOrigem(duplicado.getOrigem());
        Set<String> uniao = new LinkedHashSet<>(principal.getTags());
        uniao.addAll(duplicado.getTags());
        principal.setTags(new ArrayList<>(uniao));
    }

    private static boolean vazio(String s) {
        return s == null || s.isBlank();
    }

    private void aplicar(ContatoDTO dto, Contato contato) {
        contato.setCod(dto.cod());
        contato.setNome(dto.nome());
        contato.setTelefone(normalizarTelefone(dto.telefone()));
        contato.setEmail(dto.email());
        contato.setFinanc(dto.financ());
        contato.setDentista(dto.dentista());
        contato.setUltAtendimento(dto.ultAtendimento());
        contato.setRecencia(dto.recencia());
        contato.setEstagio(dto.estagio());
        contato.setResponsavelId(dto.responsavelId());
        contato.setElegivel(dto.elegivel());
        contato.setEnviado(dto.enviado() != null ? dto.enviado() : "Pendente");
        contato.setTags(dto.tags() != null ? new ArrayList<>(dto.tags()) : new ArrayList<>());
        contato.setOrigem(dto.origem());
        if (dto.ordemKanban() != null) contato.setOrdemKanban(dto.ordemKanban());
    }

    private ContatoDTO toDTO(Contato c) {
        return new ContatoDTO(
                c.getId(), c.getCod(), c.getNome(), c.getTelefone(), c.getEmail(), c.getFinanc(),
                c.getDentista(), c.getUltAtendimento(), c.getRecencia(), c.getEstagio(),
                c.getResponsavelId(), c.isElegivel(), c.getEnviado(), c.getTags(), c.getOrigem(), c.getOrdemKanban()
        );
    }
}
