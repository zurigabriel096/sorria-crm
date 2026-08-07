package br.com.sorria.crm.common;

import br.com.sorria.crm.automacao.ExecucaoFluxoRepository;
import br.com.sorria.crm.automacao.FluxoAutomacaoRepository;
import br.com.sorria.crm.campaign.CampanhaRepository;
import br.com.sorria.crm.segment.SegmentacaoRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.boot.CommandLineRunner;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

// Limpeza pontual (pedido do Samuel, 06/08/2026, pivo do orquestrador
// interdepartamental): apaga todas as Segmentacao, FluxoAutomacao (+
// ExecucaoFluxo, que so faz sentido presa a um fluxo) e Campanha existentes -
// eram rascunhos/fluxos-modelo de exploracao, nunca ativados de verdade. As
// telas continuam existindo pra criar do zero. deleteAllInBatch() em vez de
// deleteAll()/findAll(): um DELETE em lote por tabela, sem carregar as
// entidades pra memoria (mesmo cuidado do fix de OOM desta sessao). Guardado
// por LimpezaDadosMarcador (nao por count()==0 das proprias tabelas) - assim
// nao apaga de novo o que o usuario criar depois da limpeza, no proximo
// restart do Render.
@Component
@RequiredArgsConstructor
@Slf4j
@Transactional
public class LimpezaSegmentacaoAutomacaoCampanhaInitializer implements CommandLineRunner {

    private final LimpezaDadosMarcadorRepository marcadorRepository;
    private final ExecucaoFluxoRepository execucaoFluxoRepository;
    private final FluxoAutomacaoRepository fluxoAutomacaoRepository;
    private final CampanhaRepository campanhaRepository;
    private final SegmentacaoRepository segmentacaoRepository;

    @Override
    public void run(String... args) {
        if (marcadorRepository.count() > 0) return;

        execucaoFluxoRepository.deleteAllInBatch();
        fluxoAutomacaoRepository.deleteAllInBatch();
        campanhaRepository.deleteAllInBatch();
        segmentacaoRepository.deleteAllInBatch();
        marcadorRepository.save(new LimpezaDadosMarcador());

        log.info("Limpeza aplicada: todas as Segmentacao/FluxoAutomacao/Campanha existentes foram removidas.");
    }
}
