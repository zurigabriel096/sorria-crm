package br.com.sorria.crm.contact;

import br.com.sorria.crm.contact.dto.ContatoDTO;
import br.com.sorria.crm.conversa.MensagemRepository;
import br.com.sorria.crm.user.Usuario;
import br.com.sorria.crm.user.UsuarioRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.HashMap;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Map;
import java.util.NoSuchElementException;
import java.util.Objects;
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

    // Quem enxerga a operacao inteira, sem filtro por responsavel. Papel virou
    // String dinamica (PapelCargo), mas esses dois nomes continuam especiais.
    private static final Set<String> PAPEIS_VISAO_TOTAL = Set.of("ADMIN", "GESTOR");

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

    // Importacao de planilha: cada linha roda como um item de LoteJobService
    // (mesma infraestrutura de tag/excluir em lote, ver ContatoController) -
    // a requisicao HTTP so inicia o job e devolve na hora, sem prender a
    // conexao ate processar a planilha inteira. Antes era 1 unica transacao
    // bloqueante com todas as linhas juntas - numa base grande, no Render free
    // tier, isso podia levar minutos presos numa unica chamada sem timeout no
    // fetch do frontend, dando a impressao de tela travada. Mesma checagem de
    // telefone duplicado de sempre: linha repetida na propria planilha, ou que
    // bate com lead ja existente, se funde em vez de duplicar.
    // Retorna o id do Contato resultante (criado ou mesclado) - usado pra
    // "Importações" em Segmentacoes.jsx criar uma segmentacao com exatamente
    // os leads dessa leva, sem precisar adivinhar por telefone/nome depois.
    public Long importarLinha(ContatoDTO dto) {
        if (dto.nome() == null || dto.nome().isBlank()) return null;
        return criarOuMesclarEntidade(dto).getId();
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

    // Usado pelo AutomacaoEngineService (no "alterar_estagio") - passa pela
    // mesma sincronizarTagDeEtapa que os outros caminhos (Kanban, importacao,
    // merge de duplicado), senao a automacao move o lead sem atualizar a tag.
    public void alterarEstagio(Long contatoId, String novoEstagio) {
        Contato contato = buscarEntidade(contatoId);
        String estagioAntigo = contato.getEstagio();
        contato.setEstagio(novoEstagio);
        sincronizarTagDeEtapa(contato, estagioAntigo, novoEstagio);
        contatoRepository.save(contato);
    }

    // Usado pelo ContatoController.atribuirResponsavelEmLote (distribuicao em
    // massa de leads entre colaboradores, ver LoteJobService) - so troca o
    // dono, nao mexe em mais nada do cadastro.
    public void atribuirResponsavel(Long contatoId, Long colaboradorId) {
        Contato contato = buscarEntidade(contatoId);
        contato.setResponsavelId(colaboradorId);
        contatoRepository.save(contato);
    }

    // Usado pelo AutomacaoEngineService (nos "adicionar_tag"/"remover_tag").
    public void adicionarTag(Long contatoId, String tag) {
        if (vazio(tag)) return;
        Contato contato = buscarEntidade(contatoId);
        if (contato.getTags().contains(tag)) return;
        List<String> tags = new ArrayList<>(contato.getTags());
        tags.add(tag);
        contato.setTags(tags);
        contatoRepository.save(contato);
    }

    public void removerTag(Long contatoId, String tag) {
        if (vazio(tag)) return;
        Contato contato = buscarEntidade(contatoId);
        if (!contato.getTags().contains(tag)) return;
        List<String> tags = new ArrayList<>(contato.getTags());
        tags.remove(tag);
        contato.setTags(tags);
        contatoRepository.save(contato);
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
        String estagioAntigo = existente.getEstagio();
        String financAntigo = existente.getFinanc();
        if (vazio(existente.getCod())) existente.setCod(novo.cod());
        if (vazio(existente.getEmail())) existente.setEmail(novo.email());
        if (vazio(existente.getFinanc()) || "—".equals(existente.getFinanc())) existente.setFinanc(novo.financ());
        sincronizarInadimplenciaDesde(existente, financAntigo, existente.getFinanc());
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
        if (novo.camposCustomizados() != null) {
            novo.camposCustomizados().forEach((chave, valor) -> {
                if (vazio(existente.getCamposCustomizados().get(chave)) && !vazio(valor)) {
                    existente.getCamposCustomizados().put(chave, valor);
                }
            });
        }
        sincronizarTagDeEtapa(existente, estagioAntigo, existente.getEstagio());
    }

    private void mesclarEntidades(Contato principal, Contato duplicado) {
        String estagioAntigo = principal.getEstagio();
        if (vazio(principal.getCod())) principal.setCod(duplicado.getCod());
        if (vazio(principal.getEmail())) principal.setEmail(duplicado.getEmail());
        // duplicado e' uma entidade real (nao um DTO de import) - se ja tinha
        // inadimplenteDesde de verdade, herda a data original em vez de
        // resetar pra hoje (sincronizarInadimplenciaDesde e' pra transicao de
        // valor vinda de fora, nao pra fundir historico de duplicado).
        if (vazio(principal.getFinanc()) || "—".equals(principal.getFinanc())) {
            principal.setFinanc(duplicado.getFinanc());
            principal.setInadimplenteDesde(duplicado.getInadimplenteDesde());
        }
        if (vazio(principal.getDentista())) principal.setDentista(duplicado.getDentista());
        if (vazio(principal.getUltAtendimento())) principal.setUltAtendimento(duplicado.getUltAtendimento());
        if (principal.getRecencia() == null) principal.setRecencia(duplicado.getRecencia());
        if (vazio(principal.getEstagio())) principal.setEstagio(duplicado.getEstagio());
        if (principal.getResponsavelId() == null) principal.setResponsavelId(duplicado.getResponsavelId());
        if (vazio(principal.getOrigem())) principal.setOrigem(duplicado.getOrigem());
        Set<String> uniao = new LinkedHashSet<>(principal.getTags());
        uniao.addAll(duplicado.getTags());
        principal.setTags(new ArrayList<>(uniao));
        duplicado.getCamposCustomizados().forEach((chave, valor) -> {
            if (vazio(principal.getCamposCustomizados().get(chave)) && !vazio(valor)) {
                principal.getCamposCustomizados().put(chave, valor);
            }
        });
        sincronizarTagDeEtapa(principal, estagioAntigo, principal.getEstagio());
    }

    private static boolean vazio(String s) {
        return s == null || s.isBlank();
    }

    // Regra de automacao das etapas: toda vez que o estagio de um lead muda,
    // a tag da etapa anterior sai e a tag da nova etapa entra - garante
    // consistencia entre Kanban, Segmentacoes e Campanhas sem depender de
    // ninguem lembrar de mexer na tag manualmente. Fica aqui (nao no
    // frontend) de proposito: e' o unico jeito de cobrir TODOS os caminhos
    // que mudam estagio (arrastar no Kanban, editar o cadastro, importacao,
    // futuro motor de automacao) com uma regra so.
    private void sincronizarTagDeEtapa(Contato contato, String estagioAntigo, String estagioNovo) {
        if (Objects.equals(estagioAntigo, estagioNovo)) return;
        List<String> tags = new ArrayList<>(contato.getTags());
        if (!vazio(estagioAntigo)) tags.remove(estagioAntigo);
        if (!vazio(estagioNovo) && !tags.contains(estagioNovo)) tags.add(estagioNovo);
        contato.setTags(tags);
    }

    // Rastreia desde quando o financ atual e' "Inadimplente" (base do filtro
    // "inadimplente ha mais de X dias" em Segmentacoes). So grava a data na
    // TRANSICAO pra Inadimplente (nao reseta toda vez que aplicar() roda com o
    // mesmo valor) e limpa quando sai desse estado - mesmo raciocinio de
    // sincronizarTagDeEtapa, uma regra so cobrindo cadastro manual e importacao.
    private void sincronizarInadimplenciaDesde(Contato contato, String financAntigo, String financNovo) {
        boolean eraInadimplente = "Inadimplente".equals(financAntigo);
        boolean ehInadimplente = "Inadimplente".equals(financNovo);
        if (ehInadimplente && !eraInadimplente) {
            contato.setInadimplenteDesde(LocalDate.now());
        } else if (!ehInadimplente) {
            contato.setInadimplenteDesde(null);
        }
    }

    private void aplicar(ContatoDTO dto, Contato contato) {
        String estagioAntigo = contato.getEstagio();
        String financAntigo = contato.getFinanc();
        contato.setCod(dto.cod());
        contato.setNome(dto.nome());
        contato.setTelefone(normalizarTelefone(dto.telefone()));
        contato.setEmail(dto.email());
        contato.setFinanc(dto.financ());
        sincronizarInadimplenciaDesde(contato, financAntigo, dto.financ());
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
        if (dto.camposCustomizados() != null) contato.setCamposCustomizados(new HashMap<>(dto.camposCustomizados()));
        contato.setProximaAcaoEm(dto.proximaAcaoEm());
        sincronizarTagDeEtapa(contato, estagioAntigo, dto.estagio());
    }

    private ContatoDTO toDTO(Contato c) {
        return new ContatoDTO(
                c.getId(), c.getCod(), c.getNome(), c.getTelefone(), c.getEmail(), c.getFinanc(), c.getInadimplenteDesde(),
                c.getDentista(), c.getUltAtendimento(), c.getRecencia(), c.getEstagio(),
                c.getResponsavelId(), c.isElegivel(), c.getEnviado(), c.getTags(), c.getOrigem(), c.getOrdemKanban(),
                c.getCamposCustomizados(), c.getUltimaMensagemEm(), c.getUltimaMensagemDirecao(), c.getProximaAcaoEm()
        );
    }
}
