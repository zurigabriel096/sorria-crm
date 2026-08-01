package br.com.sorria.crm.dashboard;

import br.com.sorria.crm.contact.ContatoRepository;
import br.com.sorria.crm.dispatch.DisparoRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/dashboard")
@RequiredArgsConstructor
public class DashboardController {

    private static final List<String> SEGMENTOS = List.of("VIP", "Fidelizado", "Regular", "Risco", "Inativo");

    private final ContatoRepository contatoRepository;
    private final DisparoRepository disparoRepository;

    @GetMapping("/kpis")
    public Map<String, Object> kpis() {
        long totalContatos = contatoRepository.count();
        long elegiveis = contatoRepository.countByElegivelTrue();
        long disparados = contatoRepository.countByEnviado("Disparado") + contatoRepository.countByEnviado("Entregue");
        long entregues = disparoRepository.countByStatus("Entregue");

        Map<String, Long> porSegmento = new LinkedHashMap<>();
        for (String segmento : SEGMENTOS) {
            porSegmento.put(segmento, contatoRepository.countBySegmento(segmento));
        }

        Map<String, Object> kpis = new LinkedHashMap<>();
        kpis.put("totalContatos", totalContatos);
        kpis.put("elegiveis", elegiveis);
        kpis.put("disparados", disparados);
        kpis.put("entregues", entregues);
        kpis.put("porSegmento", porSegmento);
        return kpis;
    }
}
