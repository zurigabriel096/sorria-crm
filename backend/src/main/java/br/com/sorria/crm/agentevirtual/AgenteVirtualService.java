package br.com.sorria.crm.agentevirtual;

import br.com.sorria.crm.agentevirtual.dto.AgenteVirtualConfigDTO;
import br.com.sorria.crm.agentevirtual.dto.PerguntaFrequenteDTO;
import br.com.sorria.crm.contact.Contato;
import br.com.sorria.crm.contact.ContatoRepository;
import br.com.sorria.crm.contact.ContatoService;
import br.com.sorria.crm.conversa.Mensagem;
import br.com.sorria.crm.conversa.MensagemRepository;
import br.com.sorria.crm.conversa.MensagemService;
import br.com.sorria.crm.whatsapp.EvolutionApiClient;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.NoSuchElementException;
import java.util.concurrent.ThreadLocalRandom;

// Triagem simples sem IA (decisao do Samuel, 04/08/2026): se a PRIMEIRA
// mensagem do dia de um contato fica 1 minuto sem nenhuma SAIDA depois dela
// (nem humano, nem o proprio agente ja respondeu), o agente responde por
// palavra-chave cadastrada em PerguntaFrequente, ou a mensagemPadrao se
// nenhuma bater. A resposta do agente E' uma SAIDA de verdade (registrada via
// MensagemService), entao a proxima varredura ja para de considerar esse
// contato pendente sozinha - nao precisa de flag extra de "ja respondido".
@Service
@RequiredArgsConstructor
@Slf4j
public class AgenteVirtualService {

    private static final String ENTRADA = "ENTRADA";
    private static final String SAIDA = "SAIDA";
    private static final int ESPERA_SEGUNDOS = 60;
    private static final String TAG_RESPONDEU = "Agente Virtual: respondeu";
    private static final String TAG_SEM_CORRESPONDENCIA = "Agente Virtual: sem correspondência";

    private final AgenteVirtualConfigRepository configRepository;
    private final PerguntaFrequenteRepository perguntaRepository;
    private final MensagemRepository mensagemRepository;
    private final ContatoRepository contatoRepository;
    private final ContatoService contatoService;
    private final MensagemService mensagemService;
    private final EvolutionApiClient evolutionApiClient;

    public AgenteVirtualConfigDTO obterConfig() {
        return toDTO(buscarOuCriarConfig());
    }

    public AgenteVirtualConfigDTO atualizarConfig(AgenteVirtualConfigDTO dto) {
        AgenteVirtualConfig config = buscarOuCriarConfig();
        config.setAtivo(dto.ativo());
        if (dto.mensagemPadrao() != null && !dto.mensagemPadrao().isBlank()) {
            config.setMensagemPadrao(dto.mensagemPadrao());
        }
        return toDTO(configRepository.save(config));
    }

    public List<PerguntaFrequenteDTO> listarPerguntas() {
        return perguntaRepository.findAllByOrderByIdAsc().stream().map(this::toDTO).toList();
    }

    public PerguntaFrequenteDTO criarPergunta(PerguntaFrequenteDTO dto) {
        PerguntaFrequente pergunta = new PerguntaFrequente();
        aplicar(dto, pergunta);
        return toDTO(perguntaRepository.save(pergunta));
    }

    public PerguntaFrequenteDTO atualizarPergunta(Long id, PerguntaFrequenteDTO dto) {
        PerguntaFrequente pergunta = perguntaRepository.findById(id)
                .orElseThrow(() -> new NoSuchElementException("Pergunta não encontrada: " + id));
        aplicar(dto, pergunta);
        return toDTO(perguntaRepository.save(pergunta));
    }

    public void excluirPergunta(Long id) {
        perguntaRepository.deleteById(id);
    }

    private void aplicar(PerguntaFrequenteDTO dto, PerguntaFrequente pergunta) {
        pergunta.setPalavrasChave(dto.palavrasChave());
        pergunta.setResposta(dto.resposta());
    }

    // Chamado pelo AgenteVirtualScheduler - varre as mensagens de hoje, agrupa
    // por contato e resolve quem se qualifica pra resposta automatica.
    public void processarPendentes() {
        AgenteVirtualConfig config = buscarOuCriarConfig();
        if (!config.isAtivo()) return;

        LocalDateTime inicioDoDia = LocalDate.now().atStartOfDay();
        LocalDateTime agora = LocalDateTime.now();
        List<Mensagem> mensagensHoje = mensagemRepository.findByCriadoEmGreaterThanEqualOrderByContatoIdAscCriadoEmAsc(inicioDoDia);

        Map<Long, List<Mensagem>> porContato = new LinkedHashMap<>();
        for (Mensagem m : mensagensHoje) {
            porContato.computeIfAbsent(m.getContatoId(), k -> new ArrayList<>()).add(m);
        }

        List<PerguntaFrequente> perguntas = perguntaRepository.findAllByOrderByIdAsc();

        for (Map.Entry<Long, List<Mensagem>> entry : porContato.entrySet()) {
            try {
                processarContato(entry.getKey(), entry.getValue(), config, perguntas, agora);
            } catch (Exception e) {
                log.error("Falha ao processar Agente Virtual pro contato {}: {}", entry.getKey(), e.getMessage(), e);
            }
        }
    }

    private void processarContato(Long contatoId, List<Mensagem> mensagensDeHoje, AgenteVirtualConfig config,
                                   List<PerguntaFrequente> perguntas, LocalDateTime agora) {
        Mensagem primeira = mensagensDeHoje.get(0);
        if (!ENTRADA.equals(primeira.getDirecao())) return; // dia comecou com SAIDA (ex.: campanha) - nao e' caso do agente
        if (agora.isBefore(primeira.getCriadoEm().plusSeconds(ESPERA_SEGUNDOS))) return; // ainda dentro da janela de espera

        boolean jaRespondida = mensagensDeHoje.stream()
                .anyMatch(m -> SAIDA.equals(m.getDirecao()) && m.getCriadoEm().isAfter(primeira.getCriadoEm()));
        if (jaRespondida) return; // humano ou o proprio agente ja respondeu

        Contato contato = contatoRepository.findById(contatoId).orElse(null);
        if (contato == null || contato.getTelefone() == null) return;

        String textoConcatenado = mensagensDeHoje.stream()
                .filter(m -> ENTRADA.equals(m.getDirecao()) && m.getTexto() != null)
                .map(Mensagem::getTexto)
                .reduce("", (a, b) -> a + " " + b);

        String resposta = encontrarResposta(textoConcatenado, perguntas);
        boolean encontrou = resposta != null;
        if (!encontrou) resposta = config.getMensagemPadrao();

        int digitandoMs = 1500 + ThreadLocalRandom.current().nextInt(2000);
        evolutionApiClient.simularDigitando(null, contato.getTelefone(), digitandoMs);
        String status = evolutionApiClient.enviarMensagem(contato.getTelefone(), resposta);
        if ("Entregue".equals(status)) {
            mensagemService.registrarSaidaExterna(contatoId, null, resposta);
            contatoService.adicionarTag(contatoId, encontrou ? TAG_RESPONDEU : TAG_SEM_CORRESPONDENCIA);
        }
    }

    private String encontrarResposta(String textoRecebido, List<PerguntaFrequente> perguntas) {
        String textoLower = textoRecebido.toLowerCase();
        for (PerguntaFrequente pergunta : perguntas) {
            for (String palavra : pergunta.getPalavrasChave().split(",")) {
                String chave = palavra.trim().toLowerCase();
                if (!chave.isEmpty() && textoLower.contains(chave)) return pergunta.getResposta();
            }
        }
        return null;
    }

    private AgenteVirtualConfig buscarOuCriarConfig() {
        return configRepository.findAll().stream().findFirst().orElseGet(() -> configRepository.save(new AgenteVirtualConfig()));
    }

    private AgenteVirtualConfigDTO toDTO(AgenteVirtualConfig c) {
        return new AgenteVirtualConfigDTO(c.getId(), c.isAtivo(), c.getMensagemPadrao());
    }

    private PerguntaFrequenteDTO toDTO(PerguntaFrequente p) {
        return new PerguntaFrequenteDTO(p.getId(), p.getPalavrasChave(), p.getResposta());
    }
}
