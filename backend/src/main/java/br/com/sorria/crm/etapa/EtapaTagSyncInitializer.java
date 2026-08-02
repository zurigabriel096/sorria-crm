package br.com.sorria.crm.etapa;

import br.com.sorria.crm.contact.Contato;
import br.com.sorria.crm.contact.ContatoRepository;
import br.com.sorria.crm.tag.Tag;
import br.com.sorria.crm.tag.TagRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.boot.CommandLineRunner;
import org.springframework.core.annotation.Order;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

import java.util.ArrayList;
import java.util.List;

// Backfill de duas coisas que a regra de "tag automatica por etapa" (ver
// ContatoService.sincronizarTagDeEtapa) so cobre dali pra frente:
// 1. As 3 etapas seedadas pelo EtapaKanbanDataInitializer (Lead/Lead
//    Qualificado/Cliente) nao tinham tag vinculada ainda quando foram criadas
//    - sem isso elas nunca ganhariam a tag automatica.
// 2. Leads que ja existiam antes dessa regra existir nunca tiveram a tag da
//    propria etapa aplicada (so passa a acontecer quando o estagio MUDA).
// Roda a cada boot, mas e' idempotente (so cria/adiciona o que falta) - ao
// contrario dos outros initializers, nao pode checar "count() > 0" pra
// decidir se ja rodou, porque tags/contatos sempre vao ter linhas depois do
// primeiro boot por outros motivos.
@Component
@Order(2)
@RequiredArgsConstructor
@Transactional
public class EtapaTagSyncInitializer implements CommandLineRunner {

    private static final String COR_PADRAO_TAG_ETAPA = "#5A7089";

    private final EtapaKanbanRepository etapaKanbanRepository;
    private final TagRepository tagRepository;
    private final ContatoRepository contatoRepository;

    @Override
    public void run(String... args) {
        for (EtapaKanban etapa : etapaKanbanRepository.findAll()) {
            if (tagRepository.findByEtapaId(etapa.getId()).isEmpty()) {
                Tag tag = new Tag();
                tag.setNome(etapa.getNome());
                tag.setCor(COR_PADRAO_TAG_ETAPA);
                tag.setEtapaId(etapa.getId());
                tagRepository.save(tag);
            }
        }

        for (Contato contato : contatoRepository.findAll()) {
            String estagio = contato.getEstagio();
            if (estagio == null || estagio.isBlank()) continue;
            if (!contato.getTags().contains(estagio)) {
                List<String> tags = new ArrayList<>(contato.getTags());
                tags.add(estagio);
                contato.setTags(tags);
                contatoRepository.save(contato);
            }
        }
    }
}
