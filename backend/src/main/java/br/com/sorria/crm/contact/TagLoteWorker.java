package br.com.sorria.crm.contact;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.scheduling.annotation.Async;
import org.springframework.stereotype.Service;

import java.util.List;
import java.util.NoSuchElementException;

// Bean separado de TagLoteJobService de proposito: @Async so funciona em
// chamada externa (via proxy do Spring) - se o metodo estivesse na mesma
// classe que o chama, a auto-chamada ignoraria o proxy e rodaria sincrono.
@Service
@RequiredArgsConstructor
@Slf4j
public class TagLoteWorker {

    private final ContatoService contatoService;

    @Async
    public void processar(TagLoteJobStatus status, List<Long> contatoIds, String tag, boolean remover) {
        int afetados = 0;
        for (Long id : contatoIds) {
            try {
                if (remover) contatoService.removerTag(id, tag);
                else contatoService.adicionarTag(id, tag);
                afetados++;
            } catch (NoSuchElementException e) {
                log.warn("Tag em lote: contato {} nao encontrado, pulando", id);
            } catch (Exception e) {
                log.error("Tag em lote: falha ao processar contato {}: {}", id, e.getMessage(), e);
            }
            status.incrementarProcessados();
        }
        status.setAfetados(afetados);
        status.marcarConcluido();
    }
}
