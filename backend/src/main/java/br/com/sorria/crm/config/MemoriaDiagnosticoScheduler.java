package br.com.sorria.crm.config;

import lombok.extern.slf4j.Slf4j;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;

import java.io.BufferedReader;
import java.io.FileReader;

// Diagnostico pros OOM ("Exited with status 137"/SIGKILL) em producao
// (06/08/2026) - o plano free do Render so mostra grafico de Network, nao de
// Memoria, entao a unica forma de ver a TENDENCIA de memoria antes de um
// crash e' pelos Logs (esses sim, acessiveis no free).
//
// VmRSS (memoria residente real do processo, o que o OOM-killer do Linux
// mede contra o limite de 512MB do container) em vez de
// Runtime.getRuntime() - aquele so mede o HEAP, que ja esta travado em
// -Xmx288m (Dockerfile) e daria um OutOfMemoryError catchavel/logavel, nao
// um SIGKILL. O overflow real que estamos cacando esta em memoria FORA do
// heap (metaspace, buffers diretos, thread stacks, JIT code cache) - so
// VmRSS ve isso tudo junto.
@Component
@Slf4j
public class MemoriaDiagnosticoScheduler {

    @Scheduled(fixedRate = 5 * 60 * 1000)
    public void logar() {
        try (BufferedReader r = new BufferedReader(new FileReader("/proc/self/status"))) {
            String linha;
            while ((linha = r.readLine()) != null) {
                if (linha.startsWith("VmRSS:") || linha.startsWith("VmSize:") || linha.startsWith("VmHWM:")) {
                    log.info("Memoria do processo - {}", linha.trim());
                }
            }
        } catch (Exception e) {
            log.warn("Nao consegui ler /proc/self/status pro diagnostico de memoria: {}", e.getMessage());
        }
    }
}
