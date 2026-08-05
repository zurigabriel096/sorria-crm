package br.com.sorria.crm.campaign;

import br.com.sorria.crm.campaign.dto.CampanhaDTO;
import br.com.sorria.crm.campaign.dto.CampanhaPerformanceDTO;
import br.com.sorria.crm.campaign.dto.DispatchResultDTO;
import br.com.sorria.crm.campaign.dto.ProspectDTO;
import br.com.sorria.crm.contact.Contato;
import br.com.sorria.crm.contact.ContatoRepository;
import br.com.sorria.crm.contact.SubstituicaoVariaveis;
import br.com.sorria.crm.conversa.MensagemRepository;
import br.com.sorria.crm.conversa.MensagemService;
import br.com.sorria.crm.dispatch.DisparoHistorico;
import br.com.sorria.crm.dispatch.DisparoProspectHistorico;
import br.com.sorria.crm.dispatch.DisparoProspectHistoricoRepository;
import br.com.sorria.crm.dispatch.DisparoRepository;
import br.com.sorria.crm.whatsapp.EvolutionApiClient;
import br.com.sorria.crm.whatsapp.WhatsAppNumero;
import br.com.sorria.crm.whatsapp.WhatsAppNumeroRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.web.server.ResponseStatusException;

import java.time.LocalDateTime;
import java.util.List;
import java.util.NoSuchElementException;
import java.util.concurrent.ThreadLocalRandom;

@Service
@RequiredArgsConstructor
@Slf4j
public class CampanhaService {

    private static final String CANAL_EMAIL = "Email";
    private static final int INTERVALO_PADRAO_SEGUNDOS = 60;
    private static final int INTERVALO_MINIMO_SEGUNDOS = 50;
    private static final int INTERVALO_MAXIMO_SEGUNDOS = 300;
    // "Digitando" antes de cada mensagem real - mesma faixa (1.5-3.5s) do
    // Sorr.ia Protect (AquecimentoService), NAO a pausa inteira: o Evolution GO
    // trava internamente ate 60s mostrando o indicador (message_service.go,
    // ChatPresence), reenviando a cada 5s - nao faz sentido "digitar" pelos
    // 50-300s inteiros, so no fim da pausa, como uma pessoa de verdade.
    private static final int DIGITANDO_MIN_MS = 1500;
    private static final int DIGITANDO_VARIACAO_MS = 2000;

    private final CampanhaRepository campanhaRepository;
    private final TemplateRepository templateRepository;
    private final ContatoRepository contatoRepository;
    private final DisparoRepository disparoRepository;
    private final EvolutionApiClient evolutionApiClient;
    private final WhatsAppNumeroRepository whatsAppNumeroRepository;
    private final DisparoProspectHistoricoRepository disparoProspectHistoricoRepository;
    private final MensagemService mensagemService;
    private final MensagemRepository mensagemRepository;

    public List<CampanhaDTO> listar() {
        return campanhaRepository.findAll().stream().map(this::toDTO).toList();
    }

    public CampanhaDTO buscar(Long id) {
        return toDTO(buscarEntidade(id));
    }

    public Campanha buscarEntidade(Long id) {
        return campanhaRepository.findById(id)
                .orElseThrow(() -> new NoSuchElementException("Campanha nao encontrada: " + id));
    }

    public CampanhaDTO criar(CampanhaDTO dto) {
        Campanha campanha = new Campanha();
        aplicar(dto, campanha);
        return toDTO(campanhaRepository.save(campanha));
    }

    public CampanhaDTO atualizar(Long id, CampanhaDTO dto) {
        Campanha campanha = buscarEntidade(id);
        aplicar(dto, campanha);
        return toDTO(campanhaRepository.save(campanha));
    }

    public void remover(Long id) {
        if (!campanhaRepository.existsById(id)) {
            throw new NoSuchElementException("Campanha nao encontrada: " + id);
        }
        campanhaRepository.deleteById(id);
    }

    public CampanhaDTO arquivar(Long id, boolean arquivado) {
        Campanha campanha = buscarEntidade(id);
        campanha.setArquivado(arquivado);
        return toDTO(campanhaRepository.save(campanha));
    }

    // Performance sob demanda (nao fica salva em lugar nenhum, recalcula toda vez que
    // alguem pede) - pensado pra comparar 2 campanhas usadas como variantes de teste
    // A/B (ver Campanhas.jsx "Ver performance"), mas funciona pra qualquer campanha.
    // "Respondeu" = existe mensagem ENTRADA desse contato depois da hora do disparo -
    // aproximacao razoavel (nao sabemos se a resposta e' "sobre" aquele disparo
    // especifico, so que o lead voltou a falar depois dele).
    public CampanhaPerformanceDTO calcularPerformance(Long campanhaId) {
        List<DisparoHistorico> historico = disparoRepository.findByCampanhaId(campanhaId);
        int enviados = historico.size();
        int entregues = 0;
        int respondidos = 0;
        for (DisparoHistorico h : historico) {
            if ("Entregue".equals(h.getStatus())) entregues++;
            if (h.getHora() != null && mensagemRepository.existsByContatoIdAndDirecaoAndCriadoEmAfter(h.getContatoId(), "ENTRADA", h.getHora())) {
                respondidos++;
            }
        }
        double taxaEntrega = enviados > 0 ? (entregues * 100.0 / enviados) : 0;
        double taxaResposta = enviados > 0 ? (respondidos * 100.0 / enviados) : 0;
        return new CampanhaPerformanceDTO(enviados, entregues, respondidos, taxaEntrega, taxaResposta);
    }

    // Sem @Transactional de proposito: com a pausa entre mensagens (as vezes minutos
    // pra campanhas grandes), uma transacao unica ficaria com a conexao do banco presa
    // o tempo todo. Cada envio ja persiste (contato + historico) de forma independente.
    public DispatchResultDTO disparar(Long id, Long templateIdEscolhido, List<Long> contatoIdsEscolhidos) {
        return disparar(id, templateIdEscolhido, contatoIdsEscolhidos, null);
    }

    // whatsappNumeroIdOverride (opcional): usado pelo Disparo A/B/C com escolha
    // de numero (ver Campanhas.jsx) pra mandar ESSE disparo especifico por um
    // numero diferente do configurado na campanha, sem alterar o cadastro dela -
    // null continua usando o numero salvo na campanha (resolverNumero).
    public DispatchResultDTO disparar(Long id, Long templateIdEscolhido, List<Long> contatoIdsEscolhidos, Long whatsappNumeroIdOverride) {
        Campanha campanha = buscarEntidade(id);
        if (templateIdEscolhido != null && !templateIdEscolhido.equals(campanha.getTemplateId())) {
            campanha.setTemplateId(templateIdEscolhido);
        }
        // "enviado" no Contato e so o status do ULTIMO disparo (pra exibicao na tela de
        // Leads) — nao pode travar o contato pra sempre depois da primeira campanha.
        // A elegibilidade real e por campanha: um contato so fica de fora de UMA campanha
        // especifica se ja tiver um registro de disparo pra ELA (evita reenvio duplicado).
        List<Contato> elegiveis = contatoRepository.findByElegivelTrue().stream()
                .filter(c -> !disparoRepository.existsByCampanhaIdAndContatoId(campanha.getId(), c.getId()))
                .toList();
        if (contatoIdsEscolhidos != null && !contatoIdsEscolhidos.isEmpty()) {
            elegiveis = elegiveis.stream().filter(c -> contatoIdsEscolhidos.contains(c.getId())).toList();
        }

        boolean email = CANAL_EMAIL.equalsIgnoreCase(campanha.getCanal());
        Template template = (!email && campanha.getTemplateId() != null)
                ? templateRepository.findById(campanha.getTemplateId()).orElse(null)
                : null;
        String corpoTemplate = resolverCorpoMensagem(campanha, template, email);

        int entregues = 0;
        int falhas = 0;
        int intervaloBaseMs = 1000 * (campanha.getIntervaloSegundos() != null && campanha.getIntervaloSegundos() > 0
                ? campanha.getIntervaloSegundos() : INTERVALO_PADRAO_SEGUNDOS);
        WhatsAppNumero numeroResolvido = resolverNumero(whatsappNumeroIdOverride != null ? whatsappNumeroIdOverride : campanha.getWhatsappNumeroId());
        String tokenInstancia = numeroResolvido != null ? numeroResolvido.getToken() : null;
        String servidorUrl = numeroResolvido != null ? numeroResolvido.getServidorUrl() : null;

        for (int i = 0; i < elegiveis.size(); i++) {
            Contato contato = elegiveis.get(i);

            // Pausa + "digitando" ANTES de mandar (nao depois) - o indicador
            // precisa aparecer pro contato que vai receber a proxima mensagem,
            // nao pro que ja recebeu. So entre mensagens do WhatsApp (nao antes
            // da primeira, nao no canal Email).
            if (!email && i > 0) {
                try {
                    pausarComDigitando(intervaloBaseMs, tokenInstancia, servidorUrl, contato.getTelefone());
                } catch (InterruptedException ex) {
                    Thread.currentThread().interrupt();
                    log.warn("Disparo da campanha {} interrompido no meio do envio ({}/{})", campanha.getId(), i + 1, elegiveis.size());
                    break;
                }
            }

            String mensagem = SubstituicaoVariaveis.aplicar(corpoTemplate, contato);
            String status = !email ? evolutionApiClient.enviarMensagem(contato.getTelefone(), mensagem, tokenInstancia, servidorUrl) : "Entregue";

            contato.setEnviado(status);
            contatoRepository.save(contato);

            DisparoHistorico historico = new DisparoHistorico();
            historico.setContatoId(contato.getId());
            historico.setContatoNome(contato.getNome());
            historico.setCampanhaId(campanha.getId());
            historico.setCampanhaNome(campanha.getNome());
            historico.setStatus(status);
            historico.setHora(LocalDateTime.now());
            disparoRepository.save(historico);

            if ("Entregue".equals(status)) {
                entregues++;
                // So WhatsApp vira Mensagem/aparece no Kanban - email nao tem chat aqui.
                if (!email) mensagemService.registrarSaidaExterna(contato.getId(), campanha.getWhatsappNumeroId(), mensagem);
            } else if ("Falhou".equals(status)) {
                falhas++;
            }
        }

        campanha.setStatus("Concluída");
        campanhaRepository.save(campanha);

        return new DispatchResultDTO(elegiveis.size(), entregues, falhas);
    }

    // Disparo pra prospects (fora do CRM) - a lista vem inteira na hora (upload de
    // planilha no frontend), NUNCA cria/mescla Contato, NUNCA grava Mensagem/tag/
    // estagio. So fica um registro agregado (DisparoProspectHistorico, 1 linha pra
    // todo o disparo) pro Painel Executivo mostrar "template X enviou pra Y
    // prospects" - ver aviso de risco em Campanha.modoProspects. Sem @Transactional
    // pelo mesmo motivo de disparar(): a pausa entre envios nao pode segurar conexao.
    public DispatchResultDTO dispararProspects(Long campanhaId, Long templateIdEscolhido, List<ProspectDTO> prospects) {
        Campanha campanha = buscarEntidade(campanhaId);
        if (!Boolean.TRUE.equals(campanha.getModoProspects())) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Esta campanha nao esta em modo prospects.");
        }
        Long templateId = templateIdEscolhido != null ? templateIdEscolhido : campanha.getTemplateId();
        Template template = templateId != null ? templateRepository.findById(templateId).orElse(null) : null;
        String corpoTemplate = template != null && template.getCorpo() != null ? template.getCorpo() : "";

        List<ProspectDTO> validos = prospects == null ? List.of() : prospects.stream()
                .filter(p -> normalizarTelefoneProspect(p.telefone()) != null)
                .toList();

        int entregues = 0;
        int falhas = 0;
        int intervaloBaseMs = 1000 * (campanha.getIntervaloSegundos() != null && campanha.getIntervaloSegundos() > 0
                ? campanha.getIntervaloSegundos() : INTERVALO_PADRAO_SEGUNDOS);
        WhatsAppNumero numeroResolvido = resolverNumero(campanha.getWhatsappNumeroId());
        String tokenInstancia = numeroResolvido != null ? numeroResolvido.getToken() : null;
        String servidorUrl = numeroResolvido != null ? numeroResolvido.getServidorUrl() : null;

        for (int i = 0; i < validos.size(); i++) {
            ProspectDTO prospect = validos.get(i);
            String telefone = normalizarTelefoneProspect(prospect.telefone());

            if (i > 0) {
                try {
                    pausarComDigitando(intervaloBaseMs, tokenInstancia, servidorUrl, telefone);
                } catch (InterruptedException ex) {
                    Thread.currentThread().interrupt();
                    log.warn("Disparo pra prospects da campanha {} interrompido no meio do envio ({}/{})", campanha.getId(), i + 1, validos.size());
                    break;
                }
            }

            String mensagem = corpoTemplate.replace("{nome}", primeiroNome(prospect.nome()));
            String status = evolutionApiClient.enviarMensagem(telefone, mensagem, tokenInstancia, servidorUrl);

            if ("Entregue".equals(status)) entregues++;
            else if ("Falhou".equals(status)) falhas++;
        }

        DisparoProspectHistorico historico = new DisparoProspectHistorico();
        historico.setCampanhaId(campanha.getId());
        historico.setCampanhaNome(campanha.getNome());
        historico.setTemplateId(templateId);
        historico.setTemplateNome(template != null ? template.getNome() : null);
        historico.setTotalProspects(validos.size());
        historico.setQuantidadeEntregue(entregues);
        historico.setQuantidadeFalhou(falhas);
        disparoProspectHistoricoRepository.save(historico);

        return new DispatchResultDTO(validos.size(), entregues, falhas);
    }

    // Mesma convencao de normalizarTelefone do ContatoService (55+DDD+numero, so
    // digitos) - prospect nao passa por Contato, entao precisa da propria copia.
    private static String normalizarTelefoneProspect(String bruto) {
        if (bruto == null) return null;
        String digitos = bruto.replaceAll("\\D", "");
        if (digitos.isBlank()) return null;
        if (digitos.length() <= 11 && !digitos.startsWith("55")) digitos = "55" + digitos;
        return digitos;
    }

    // Pausa entre uma mensagem e a proxima, mostrando "digitando..." pro PROXIMO
    // contato so nos ultimos 1.5-3.5s (mesma faixa da AquecimentoService) - o
    // resto da pausa fica em silencio, sem nenhum sinal de presenca, igual uma
    // pessoa que nao esta olhando o WhatsApp o tempo todo entre uma mensagem e
    // outra. simularDigitando() ja bloqueia internamente pelo tempo do "digitando"
    // (o Evolution GO segura o indicador do lado dele) - por isso so damos
    // Thread.sleep no silencio, nunca duas vezes o mesmo tempo.
    private void pausarComDigitando(int intervaloBaseMs, String tokenInstancia, String servidorUrl, String telefoneProximoContato) throws InterruptedException {
        int jitterMs = ThreadLocalRandom.current().nextInt(0, (int) (intervaloBaseMs * 0.4) + 1);
        int pausaTotalMs = intervaloBaseMs + jitterMs;
        int digitandoMs = Math.min(pausaTotalMs, DIGITANDO_MIN_MS + ThreadLocalRandom.current().nextInt(DIGITANDO_VARIACAO_MS));
        int silencioMs = pausaTotalMs - digitandoMs;
        if (silencioMs > 0) Thread.sleep(silencioMs);
        if (tokenInstancia != null && telefoneProximoContato != null) {
            evolutionApiClient.simularDigitando(tokenInstancia, telefoneProximoContato, digitandoMs, servidorUrl);
        } else {
            Thread.sleep(digitandoMs);
        }
    }

    // null (nao escolheu numero) = usa sempre o numero principal, fixo na config
    // do EvolutionApiClient - preserva o comportamento de campanhas criadas antes
    // deste campo existir, sem depender de qual numero foi cadastrado por ultimo.
    // Devolve a entidade inteira (nao so o token) - servidorUrl mora nela tambem,
    // pra dispatch escolher o servidor Evolution GO certo (ver WhatsAppNumero.servidorUrl).
    private WhatsAppNumero resolverNumero(Long whatsappNumeroId) {
        if (whatsappNumeroId == null) return null;
        return whatsAppNumeroRepository.findById(whatsappNumeroId).orElse(null);
    }

    private String resolverCorpoMensagem(Campanha campanha, Template template, boolean email) {
        if (email && campanha.getEmailMsg() != null) {
            return campanha.getEmailMsg();
        }
        if (template != null) {
            return template.getCorpo() != null ? template.getCorpo() : "";
        }
        return campanha.getEmailMsg() != null ? campanha.getEmailMsg() : "";
    }

    private String primeiroNome(String nomeCompleto) {
        if (nomeCompleto == null || nomeCompleto.isBlank()) return "";
        return nomeCompleto.trim().split("\\s+")[0];
    }

    private void aplicar(CampanhaDTO dto, Campanha campanha) {
        campanha.setNome(dto.nome());
        campanha.setObjetivo(dto.objetivo());
        campanha.setCanal(dto.canal());
        campanha.setResponsavel(dto.responsavel());
        campanha.setStatus(dto.status() != null ? dto.status() : "Ativa");
        campanha.setInicio(dto.inicio());
        campanha.setEmailMsg(dto.emailMsg());
        campanha.setTemplateId(dto.templateId());
        // Piso/teto tambem no backend, nao so no input do frontend (min=50/max=300) -
        // rajada sem intervalo e' o que mais aumenta risco do numero ser
        // marcado como spam pelo WhatsApp, e o valor viria direto de quem
        // chamar a API sem passar pela tela se so validasse no frontend.
        // Elevado de 6s pra 40-180s, depois pra 50-300s (5min), apos suspensao
        // real de 3 numeros por excesso de volume/velocidade (04/08/2026).
        campanha.setIntervaloSegundos(dto.intervaloSegundos() != null
                ? Math.min(INTERVALO_MAXIMO_SEGUNDOS, Math.max(INTERVALO_MINIMO_SEGUNDOS, dto.intervaloSegundos()))
                : null);
        campanha.setWhatsappNumeroId(dto.whatsappNumeroId());
        campanha.setModoProspects(dto.modoProspects() != null && dto.modoProspects());
    }

    private CampanhaDTO toDTO(Campanha c) {
        return new CampanhaDTO(c.getId(), c.getNome(), c.getObjetivo(), c.getCanal(), c.getResponsavel(),
                c.getStatus(), c.getInicio(), c.getEmailMsg(), c.getTemplateId(),
                Boolean.TRUE.equals(c.getArquivado()), c.getAtualizadoEm(),
                c.getIntervaloSegundos() != null ? c.getIntervaloSegundos() : INTERVALO_PADRAO_SEGUNDOS,
                c.getWhatsappNumeroId(), Boolean.TRUE.equals(c.getModoProspects()));
    }
}
