package br.com.sorria.crm.contact;

import java.util.concurrent.atomic.AtomicInteger;

// Progresso de UM job de tag em massa - so em memoria de proposito (nao
// precisa sobreviver a um restart do backend, e' so feedback visual enquanto
// a acao roda). Ver TagLoteJobService/TagLoteWorker.
public class TagLoteJobStatus {

    private final int total;
    private final AtomicInteger processados = new AtomicInteger(0);
    private volatile int afetados = 0;
    private volatile boolean concluido = false;

    public TagLoteJobStatus(int total) {
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
}
