package br.com.sorria.crm.common.lote;

import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import java.util.List;
import java.util.Map;
import java.util.NoSuchElementException;
import java.util.UUID;
import java.util.concurrent.ConcurrentHashMap;
import java.util.function.Function;

// Infraestrutura generica pra qualquer acao em massa (tag em lote, excluir
// lead em lote, importacao de planilha, etc.) que precisa processar uma lista
// de itens sem prender a requisicao HTTP - cada item pode ser um round-trip
// lento pro banco (Render free tier), uma base grande levaria minutos presos
// numa unica chamada. Generico em T (Long pra ids, ContatoDTO pra importacao,
// etc.) - roda em background (LoteJobWorker.@Async), quem chama consulta o
// progresso pelo jobId devolvido (ver ContatoController).
//
// acaoPorItem e' Function (nao Consumer) pra dar pra coletar o que cada item
// devolveu (ex.: id do Contato criado/mesclado numa importacao) - quem nao
// precisa do resultado so retorna o proprio id/null, sem custo nenhum.
@Service
@RequiredArgsConstructor
public class LoteJobService {

    // 10 min de retencao depois de concluido - o frontend so consulta um job
    // ATE a primeira vez que ve concluido=true (App.jsx para de fazer GET
    // depois disso), entao e' seguro liberar a memoria bem antes disso viver
    // pra sempre. Sem essa limpeza, cada import/tag-em-lote/exclusao-em-lote
    // feito na sessao inteira ficava acumulado no heap ate o proximo restart -
    // contribuiu pro OOM (exit 137) que o backend teve rodando essa sessao.
    private static final long RETENCAO_MS = 10 * 60 * 1000;

    private final Map<String, LoteJobStatus<?>> jobs = new ConcurrentHashMap<>();
    private final LoteJobWorker worker;

    public <T, R> String iniciar(List<T> itens, Function<T, R> acaoPorItem) {
        limparAntigos();
        int total = itens != null ? itens.size() : 0;
        String jobId = UUID.randomUUID().toString();
        LoteJobStatus<R> status = new LoteJobStatus<>(total);
        jobs.put(jobId, status);
        if (total > 0) {
            worker.processar(status, itens, acaoPorItem);
        } else {
            status.marcarConcluido();
        }
        return jobId;
    }

    public LoteJobStatus<?> status(String jobId) {
        LoteJobStatus<?> status = jobs.get(jobId);
        if (status == null) {
            throw new NoSuchElementException("Job em lote nao encontrado: " + jobId);
        }
        return status;
    }

    private void limparAntigos() {
        jobs.entrySet().removeIf(e -> e.getValue().concluidoHaMaisDe(RETENCAO_MS));
    }
}
