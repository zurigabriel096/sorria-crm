package br.com.sorria.crm.desempenho;

import jakarta.persistence.*;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.time.LocalDateTime;

// Meta numerica de "convertidos" (leads que chegaram numa etapa final, ver
// DesempenhoEquipeService) definida manualmente pelo ADMIN/GESTOR na aba
// "Equipe" do Painel Executivo. tipo="EMPRESA"/"EQUIPE" tem 1 linha so
// (colaboradorId null); tipo="INDIVIDUAL" tem 1 linha por colaborador.
@Entity
@Table(name = "metas_desempenho", uniqueConstraints = @UniqueConstraint(columnNames = {"tipo", "colaborador_id"}))
@Getter
@Setter
@NoArgsConstructor
public class MetaDesempenho {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false)
    private String tipo; // "EMPRESA" | "EQUIPE" | "INDIVIDUAL"

    // Null pra EMPRESA/EQUIPE - so' INDIVIDUAL tem um colaborador associado.
    private Long colaboradorId;

    @Column(nullable = false)
    private Integer valor;

    private LocalDateTime atualizadoEm;

    @PrePersist
    @PreUpdate
    protected void aoSalvar() {
        this.atualizadoEm = LocalDateTime.now();
    }
}
