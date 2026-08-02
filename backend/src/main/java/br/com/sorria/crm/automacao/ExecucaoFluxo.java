package br.com.sorria.crm.automacao;

import jakarta.persistence.*;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.time.LocalDateTime;

// Progresso de UM contato dentro de UM FluxoAutomacao - o AutomacaoEngineService
// avanca essas linhas no @Scheduled, um no do grafo por vez. Tabela nova (sem
// linhas existentes no primeiro deploy), entao os NOT NULL abaixo nao tem o
// mesmo risco de migracao que ja vimos em EtapaKanban/coluna adicionada depois.
@Entity
@Table(name = "execucoes_fluxo")
@Getter
@Setter
@NoArgsConstructor
public class ExecucaoFluxo {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false)
    private Long fluxoId;

    @Column(nullable = false)
    private Long contatoId;

    // Id do no atual no grafo (FluxoAutomacao.nodesJson) - null enquanto a
    // execucao ainda nao avancou nenhuma vez (comeca a partir do no "inicio").
    private String noAtualId;

    // "ativo" (aguardando o proximo tick avancar) | "aguardando_resposta" (parada
    // no no "aguardar_mensagem", so a Fase 4/webhook retoma) | "concluido"
    // (chegou ao fim do grafo, fluxo foi desativado, ou contato/fluxo sumiu).
    @Column(nullable = false)
    private String status = "ativo";

    private LocalDateTime proximaExecucaoEm;

    private LocalDateTime criadoEm;

    @PrePersist
    protected void aoCriar() {
        this.criadoEm = LocalDateTime.now();
        if (this.proximaExecucaoEm == null) this.proximaExecucaoEm = this.criadoEm;
    }
}
