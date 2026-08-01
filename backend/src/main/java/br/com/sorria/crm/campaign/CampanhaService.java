package br.com.sorria.crm.campaign;

import br.com.sorria.crm.campaign.dto.CampanhaDTO;
import br.com.sorria.crm.campaign.dto.DispatchResultDTO;
import br.com.sorria.crm.contact.Contato;
import br.com.sorria.crm.contact.ContatoRepository;
import br.com.sorria.crm.dispatch.DisparoHistorico;
import br.com.sorria.crm.dispatch.DisparoRepository;
import br.com.sorria.crm.whatsapp.EvolutionApiClient;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.List;
import java.util.NoSuchElementException;

@Service
@RequiredArgsConstructor
public class CampanhaService {

    private static final String STATUS_PENDENTE = "Pendente";
    private static final String CANAL_EMAIL = "Email";

    private final CampanhaRepository campanhaRepository;
    private final TemplateRepository templateRepository;
    private final ContatoRepository contatoRepository;
    private final DisparoRepository disparoRepository;
    private final EvolutionApiClient evolutionApiClient;

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

    @Transactional
    public DispatchResultDTO disparar(Long id, Long templateIdEscolhido) {
        Campanha campanha = buscarEntidade(id);
        if (templateIdEscolhido != null && !templateIdEscolhido.equals(campanha.getTemplateId())) {
            campanha.setTemplateId(templateIdEscolhido);
        }
        List<Contato> elegiveis = contatoRepository.findByElegivelTrueAndEnviado(STATUS_PENDENTE);

        String corpoTemplate = resolverCorpoMensagem(campanha);

        int entregues = 0;
        int falhas = 0;

        for (Contato contato : elegiveis) {
            String mensagem = corpoTemplate.replace("{nome}", primeiroNome(contato.getNome()));
            String status = evolutionApiClient.enviarMensagem(contato.getTelefone(), mensagem);

            contato.setEnviado(status);
            contatoRepository.save(contato);

            DisparoHistorico historico = new DisparoHistorico();
            historico.setContatoId(contato.getId());
            historico.setContatoNome(contato.getNome());
            historico.setCampanhaNome(campanha.getNome());
            historico.setStatus(status);
            historico.setHora(LocalDateTime.now());
            disparoRepository.save(historico);

            if ("Entregue".equals(status)) {
                entregues++;
            } else if ("Falhou".equals(status)) {
                falhas++;
            }
        }

        campanha.setStatus("Concluída");
        campanhaRepository.save(campanha);

        return new DispatchResultDTO(elegiveis.size(), entregues, falhas);
    }

    private String resolverCorpoMensagem(Campanha campanha) {
        if (CANAL_EMAIL.equalsIgnoreCase(campanha.getCanal()) && campanha.getEmailMsg() != null) {
            return campanha.getEmailMsg();
        }
        if (campanha.getTemplateId() != null) {
            return templateRepository.findById(campanha.getTemplateId())
                    .map(t -> t.getCorpo() != null ? t.getCorpo() : "")
                    .orElse("");
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
    }

    private CampanhaDTO toDTO(Campanha c) {
        return new CampanhaDTO(c.getId(), c.getNome(), c.getObjetivo(), c.getCanal(), c.getResponsavel(),
                c.getStatus(), c.getInicio(), c.getEmailMsg(), c.getTemplateId());
    }
}
