package br.com.sorria.crm.dashboard;

import br.com.sorria.crm.contact.ContatoRepository;
import br.com.sorria.crm.dispatch.DisparoRepository;
import br.com.sorria.crm.etapa.EtapaKanbanRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.LinkedHashMap;
import java.util.Map;

@RestController
@RequestMapping("/api/dashboard")
@RequiredArgsConstructor
public class DashboardController {

    private final ContatoRepository contatoRepository;
    private final DisparoRepository disparoRepository;
    private final EtapaKanbanRepository etapaKanbanRepository;

    @GetMapping("/kpis")
    public Map<String, Object> kpis() {
        long totalContatos = contatoRepository.count();
        long elegiveis = contatoRepository.countByElegivelTrue();
        long disparados = contatoRepository.countByEnviado("Disparado") + contatoRepository.countByEnviado("Entregue");
        long entregues = disparoRepository.countByStatus("Entregue");

        // Base por estagio do Kanban - substitui o antigo agrupamento por
        // Segmento (VIP/Fidelizado/Risco/Inativo), removido do produto.
        Map<String, Long> porEstagio = new LinkedHashMap<>();
        etapaKanbanRepository.findAllByOrderByOrdemAsc()
                .forEach(etapa -> porEstagio.put(etapa.getNome(), contatoRepository.countByEstagio(etapa.getNome())));

        Map<String, Object> kpis = new LinkedHashMap<>();
        kpis.put("totalContatos", totalContatos);
        kpis.put("elegiveis", elegiveis);
        kpis.put("disparados", disparados);
        kpis.put("entregues", entregues);
        kpis.put("porEstagio", porEstagio);
        return kpis;
    }
}
