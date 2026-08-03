package br.com.sorria.crm.common.lote;

import lombok.extern.slf4j.Slf4j;
import org.springframework.scheduling.annotation.Async;
import org.springframework.stereotype.Service;

import java.util.List;
import java.util.NoSuchElementException;
import java.util.function.Consumer;

// Bean separado de LoteJobService de proposito: @Async so funciona em chamada
// externa (via proxy do Spring) - se o metodo estivesse na mesma classe que o
// chama, a auto-chamada ignoraria o proxy e rodaria sincrono.
@Service
@Slf4j
public class LoteJobWorker {

    @Async
    public void processar(LoteJobStatus status, List<Long> ids, Consumer<Long> acaoPorItem) {
        int afetados = 0;
        for (Long id : ids) {
            try {
                acaoPorItem.accept(id);
                afetados++;
            } catch (NoSuchElementException e) {
                log.warn("Acao em lote: item {} nao encontrado, pulando", id);
            } catch (Exception e) {
                log.error("Acao em lote: falha ao processar item {}: {}", id, e.getMessage(), e);
            }
            status.incrementarProcessados();
        }
        status.setAfetados(afetados);
        status.marcarConcluido();
    }
}
