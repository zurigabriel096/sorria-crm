package br.com.sorria.crm.common.lote;

import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import java.util.List;
import java.util.Map;
import java.util.NoSuchElementException;
import java.util.UUID;
import java.util.concurrent.ConcurrentHashMap;
import java.util.function.Consumer;

// Infraestrutura generica pra qualquer acao em massa (tag em lote, excluir
// lead em lote, etc.) que precisa processar uma lista de ids sem prender a
// requisicao HTTP - cada item pode ser um round-trip lento pro banco (Render
// free tier), uma base grande levaria minutos presos numa unica chamada.
// Roda em background (LoteJobWorker.@Async), quem chama consulta o progresso
// pelo jobId devolvido (ver ContatoController).
@Service
@RequiredArgsConstructor
public class LoteJobService {

    private final Map<String, LoteJobStatus> jobs = new ConcurrentHashMap<>();
    private final LoteJobWorker worker;

    public String iniciar(List<Long> ids, Consumer<Long> acaoPorItem) {
        int total = ids != null ? ids.size() : 0;
        String jobId = UUID.randomUUID().toString();
        LoteJobStatus status = new LoteJobStatus(total);
        jobs.put(jobId, status);
        if (total > 0) {
            worker.processar(status, ids, acaoPorItem);
        } else {
            status.marcarConcluido();
        }
        return jobId;
    }

    public LoteJobStatus status(String jobId) {
        LoteJobStatus status = jobs.get(jobId);
        if (status == null) {
            throw new NoSuchElementException("Job em lote nao encontrado: " + jobId);
        }
        return status;
    }
}
