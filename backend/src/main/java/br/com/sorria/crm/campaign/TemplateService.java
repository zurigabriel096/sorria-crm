package br.com.sorria.crm.campaign;

import br.com.sorria.crm.campaign.dto.TemplateDTO;
import br.com.sorria.crm.whatsapp.EvolutionApiClient;
import br.com.sorria.crm.whatsapp.WhatsAppNumero;
import br.com.sorria.crm.whatsapp.WhatsAppNumeroRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

import java.util.List;
import java.util.NoSuchElementException;

@Service
@RequiredArgsConstructor
@Transactional
public class TemplateService {

    private final TemplateRepository templateRepository;
    private final WhatsAppNumeroRepository whatsAppNumeroRepository;
    private final EvolutionApiClient evolutionApiClient;

    public List<TemplateDTO> listar() {
        return templateRepository.findAll().stream().map(this::toDTO).toList();
    }

    public TemplateDTO buscar(Long id) {
        return toDTO(buscarEntidade(id));
    }

    public Template buscarEntidade(Long id) {
        return templateRepository.findById(id)
                .orElseThrow(() -> new NoSuchElementException("Template nao encontrado: " + id));
    }

    public TemplateDTO criar(TemplateDTO dto) {
        Template template = new Template();
        aplicar(dto, template);
        return toDTO(templateRepository.save(template));
    }

    public TemplateDTO atualizar(Long id, TemplateDTO dto) {
        Template template = buscarEntidade(id);
        aplicar(dto, template);
        return toDTO(templateRepository.save(template));
    }

    public void remover(Long id) {
        if (!templateRepository.existsById(id)) {
            throw new NoSuchElementException("Template nao encontrado: " + id);
        }
        templateRepository.deleteById(id);
    }

    public TemplateDTO arquivar(Long id, boolean arquivado) {
        Template template = buscarEntidade(id);
        template.setArquivado(arquivado);
        return toDTO(templateRepository.save(template));
    }

    private void aplicar(TemplateDTO dto, Template template) {
        template.setNome(dto.nome());
        template.setCategoria(dto.categoria());
        template.setCampanhaObjetivo(dto.campanhaObjetivo());
        template.setCorpo(dto.corpo());
        template.setImagemUrl(dto.imagemUrl());
        template.setAtivo(dto.ativo());
    }

    // Disparo isolado, sem Contato nenhum envolvido - so pra conferir como o
    // template chega de verdade no WhatsApp antes de usar numa campanha. "{nome}"
    // no corpo vira "Teste" (nao ha lead nenhum pra pegar o nome de verdade).
    public String testarDisparo(Long id, String telefone, Long whatsappNumeroId) {
        Template template = buscarEntidade(id);
        String numero = normalizarTelefone(telefone);
        if (numero == null) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Informe um numero de telefone valido.");
        }
        String tokenInstancia = null;
        if (whatsappNumeroId != null) {
            tokenInstancia = whatsAppNumeroRepository.findById(whatsappNumeroId)
                    .map(WhatsAppNumero::getToken)
                    .orElseThrow(() -> new NoSuchElementException("Numero de disparo nao encontrado: " + whatsappNumeroId));
        }
        String mensagem = (template.getCorpo() != null ? template.getCorpo() : "").replace("{nome}", "Teste");
        return evolutionApiClient.enviarMensagem(numero, mensagem, tokenInstancia);
    }

    private static String normalizarTelefone(String bruto) {
        if (bruto == null) return null;
        String digitos = bruto.replaceAll("\\D", "");
        if (digitos.isBlank()) return null;
        if (digitos.length() <= 11 && !digitos.startsWith("55")) digitos = "55" + digitos;
        return digitos;
    }

    private TemplateDTO toDTO(Template t) {
        return new TemplateDTO(t.getId(), t.getNome(), t.getCategoria(), t.getCampanhaObjetivo(),
                t.getCorpo(), t.getImagemUrl(), t.isAtivo(),
                Boolean.TRUE.equals(t.getArquivado()), t.getAtualizadoEm());
    }
}
