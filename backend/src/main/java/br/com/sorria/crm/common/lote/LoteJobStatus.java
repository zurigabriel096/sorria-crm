package br.com.sorria.crm.common.lote;

import java.util.Collections;
import java.util.List;
import java.util.concurrent.atomic.AtomicInteger;

// Progresso de UMA acao em massa (tag em lote, excluir lead em lote, etc.) -
// so em memoria de proposito, nao precisa sobreviver a um restart do backend,
// e' so feedback visual enquanto a acao roda (ver LoteJobService/LoteJobWorker).
// R: o que cada item processado devolve (ex.: Long = id do Contato resultante
// de uma linha de importacao) - usado quando quem chamou precisa saber DE
// VERDADE quais itens foram afetados, nao so a contagem (ver "Importacoes"
// em Segmentacoes.jsx, que precisa dos ids pra criar a segmentacao da leva).
public class LoteJobStatus<R> {

    private final int total;
    private final AtomicInteger processados = new AtomicInteger(0);
    private volatile int afetados = 0;
    private volatile boolean concluido = false;
    private final List<R> resultados = Collections.synchronizedList(new java.util.ArrayList<>());

    public LoteJobStatus(int total) {
        this.total = total;
    }

    public int getTotal() {
        return total;
    }

    public int getProcessados() {
        return processados.get();
    }

    void incrementarProcessados() {
        processados.incrementAndGet();
    }

    public int getAfetados() {
        return afetados;
    }

    void setAfetados(int afetados) {
        this.afetados = afetados;
    }

    public boolean isConcluido() {
        return concluido;
    }

    void marcarConcluido() {
        this.concluido = true;
    }

    void adicionarResultado(R resultado) {
        if (resultado != null) resultados.add(resultado);
    }

    public List<R> getResultados() {
        return resultados;
    }
}
