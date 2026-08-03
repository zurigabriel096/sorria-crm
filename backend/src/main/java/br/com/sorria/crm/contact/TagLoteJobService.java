package br.com.sorria.crm.contact;

import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import java.util.List;
import java.util.Map;
import java.util.NoSuchElementException;
import java.util.UUID;
import java.util.concurrent.ConcurrentHashMap;

// Cada linha (contato) de uma acao de tag em massa pode ser um round-trip
// lento pro banco (Render free tier + Postgres remoto) - pra nao prender a
// requisicao HTTP nem a tela do ADMIN por dezenas de segundos numa base
// grande, o disparo real roda em background (TagLoteWorker.@Async) e o
// frontend consulta o progresso por aqui (barra no canto da tela).
@Service
@RequiredArgsConstructor
public class TagLoteJobService {

    private final Map<String, TagLoteJobStatus> jobs = new ConcurrentHashMap<>();
    private final TagLoteWorker worker;

    public String iniciar(List<Long> contatoIds, String tag, boolean remover) {
        int total = contatoIds != null ? contatoIds.size() : 0;
        String jobId = UUID.randomUUID().toString();
        TagLoteJobStatus status = new TagLoteJobStatus(total);
        jobs.put(jobId, status);
        if (total > 0) {
            worker.processar(status, contatoIds, tag, remover);
        } else {
            status.marcarConcluido();
        }
        return jobId;
    }

    public TagLoteJobStatus status(String jobId) {
        TagLoteJobStatus status = jobs.get(jobId);
        if (status == null) {
            throw new NoSuchElementException("Job de tag em lote nao encontrado: " + jobId);
        }
        return status;
    }
}
