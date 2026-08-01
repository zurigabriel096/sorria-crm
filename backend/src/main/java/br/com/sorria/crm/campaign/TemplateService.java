package br.com.sorria.crm.campaign;

import br.com.sorria.crm.campaign.dto.TemplateDTO;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.ArrayList;
import java.util.List;
import java.util.NoSuchElementException;

@Service
@RequiredArgsConstructor
@Transactional
public class TemplateService {

    private final TemplateRepository templateRepository;

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

    private void aplicar(TemplateDTO dto, Template template) {
        template.setNome(dto.nome());
        template.setCategoria(dto.categoria());
        template.setCampanhaObjetivo(dto.campanhaObjetivo());
        template.setCorpo(dto.corpo());
        template.setImagemUrl(dto.imagemUrl());
        template.setAtivo(dto.ativo());
        List<TemplateBotao> botoes = new ArrayList<>();
        if (dto.botoes() != null) {
            for (TemplateDTO.BotaoDTO b : dto.botoes()) {
                if (b.texto() != null && !b.texto().isBlank()) {
                    botoes.add(new TemplateBotao(b.texto(), b.link()));
                }
            }
        }
        template.setBotoes(botoes);
    }

    private TemplateDTO toDTO(Template t) {
        List<TemplateDTO.BotaoDTO> botoes = t.getBotoes().stream()
                .map(b -> new TemplateDTO.BotaoDTO(b.getTexto(), b.getLink()))
                .toList();
        return new TemplateDTO(t.getId(), t.getNome(), t.getCategoria(), t.getCampanhaObjetivo(),
                t.getCorpo(), t.getImagemUrl(), t.isAtivo(), botoes);
    }
}
