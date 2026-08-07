package br.com.sorria.crm.campaign;

import br.com.sorria.crm.campaign.dto.DisparoAbJobDTO;
import br.com.sorria.crm.campaign.dto.DisparoAbJobDTO.GrupoNumeroDTO;
import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.List;

// Executa o Disparo A/B/C um grupo (= um numero de WhatsApp) por vez, com o
// espacamento configurado - substitui o loop "await setTimeout" que rodava
// inteiro no navegador (Campanhas.jsx original), que parava de vez se a aba
// fosse fechada. Tick a cada 60s, mesmo espirito do AutomacaoEngineService
// (nao precisa ser fino - o espacamento minimo real e' minutos).
@Service
@RequiredArgsConstructor
@Slf4j
public class DisparoAbJobService {

    private final DisparoAbJobRepository repository;
    private final CampanhaService campanhaService;
    private final ObjectMapper objectMapper;

    public DisparoAbJobDTO criar(DisparoAbJobDTO dto) {
        if (dto.grupos() == null || dto.grupos().isEmpty()) {
            throw new IllegalArgumentException("Disparo A/B sem nenhum grupo pra disparar.");
        }
        try {
            DisparoAbJob job = new DisparoAbJob();
            job.setLetras(dto.letras());
            job.setMinutosEscalonamento(dto.minutosEscalonamento() != null ? dto.minutosEscalonamento() : 0);
            job.setProximoIndice(0);
            job.setProximaExecucaoEm(LocalDateTime.now());
            job.setGruposJson(objectMapper.writeValueAsString(dto.grupos()));
            job.setStatus("ativo");
            return toDTO(repository.save(job), dto.grupos().size());
        } catch (Exception e) {
            throw new RuntimeException("Erro ao preparar o disparo A/B: " + e.getMessage(), e);
        }
    }

    public List<DisparoAbJobDTO> listar() {
        return repository.findAllByOrderByCriadoEmDesc().stream().map((j) -> toDTO(j, contarGrupos(j))).toList();
    }

    @Scheduled(fixedDelay = 60_000)
    @Transactional
    public void executarPendentes() {
        List<DisparoAbJob> pendentes = repository.findByStatusAndProximaExecucaoEmLessThanEqual("ativo", LocalDateTime.now());
        for (DisparoAbJob job : pendentes) {
            try {
                executarProximoGrupo(job);
            } catch (Exception e) {
                // Nao-fatal de proposito: um erro num grupo (ex.: numero removido) nao
                // pode travar os outros jobs, e tenta de novo no proximo tick em vez
                // de perder o restante do escalonamento.
                log.error("Falha ao executar grupo do Disparo A/B/C (job {}), tentando de novo no proximo tick: {}", job.getId(), e.getMessage(), e);
            }
        }
    }

    private void executarProximoGrupo(DisparoAbJob job) throws Exception {
        List<GrupoNumeroDTO> grupos = ler(job.getGruposJson());
        int indice = job.getProximoIndice();
        if (indice >= grupos.size()) {
            job.setStatus("concluido");
            repository.save(job);
            return;
        }
        GrupoNumeroDTO grupo = grupos.get(indice);
        for (DisparoAbJobDTO.ItemDispatchDTO item : grupo.itens()) {
            campanhaService.disparar(item.campanhaId(), null, item.contatoIds(), grupo.numeroId());
        }
        log.info("Disparo A/B/C (job {}, '{}'): grupo {}/{} disparado (numero {}).",
                job.getId(), job.getLetras(), indice + 1, grupos.size(), grupo.numeroId());
        int proximo = indice + 1;
        job.setProximoIndice(proximo);
        if (proximo >= grupos.size()) {
            job.setStatus("concluido");
        } else {
            job.setProximaExecucaoEm(LocalDateTime.now().plusMinutes(job.getMinutosEscalonamento()));
        }
        repository.save(job);
    }

    private List<GrupoNumeroDTO> ler(String json) throws Exception {
        return objectMapper.readValue(json, new TypeReference<List<GrupoNumeroDTO>>() {
        });
    }

    private int contarGrupos(DisparoAbJob job) {
        try {
            return ler(job.getGruposJson()).size();
        } catch (Exception e) {
            return 0;
        }
    }

    private DisparoAbJobDTO toDTO(DisparoAbJob j, int totalGrupos) {
        return new DisparoAbJobDTO(j.getId(), j.getStatus(), j.getLetras(), j.getMinutosEscalonamento(),
                j.getProximoIndice(), totalGrupos, j.getProximaExecucaoEm(), j.getCriadoEm(), null);
    }
}
