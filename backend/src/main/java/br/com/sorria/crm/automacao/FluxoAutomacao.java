package br.com.sorria.crm.automacao;

import jakarta.persistence.*;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.time.LocalDateTime;

// Grafo do construtor visual (nos + arestas do @xyflow/react) guardado como JSON
// bruto em TEXT - mesmo padrao ja usado em Segmentacao.groupsJson: serializar
// a estrutura inteira em vez de modelar cada tipo de no como tabela relacional
// (mais simples, e o schema dos nos ainda muda com frequencia nesta fase).
@Entity
@Table(name = "fluxos_automacao")
@Getter
@Setter
@NoArgsConstructor
public class FluxoAutomacao {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false)
    private String nome;

    // So roda de verdade (motor de execucao) quando ativo=true - ver AutomacaoEngineService.
    private Boolean ativo = false;

    @Column(columnDefinition = "TEXT", nullable = false)
    private String nodesJson;

    @Column(columnDefinition = "TEXT", nullable = false)
    private String edgesJson;

    private LocalDateTime atualizadoEm;

    @PrePersist
    @PreUpdate
    protected void aoSalvar() {
        this.atualizadoEm = LocalDateTime.now();
    }
}
