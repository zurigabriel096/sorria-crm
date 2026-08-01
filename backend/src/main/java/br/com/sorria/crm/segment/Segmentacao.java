package br.com.sorria.crm.segment;

import jakarta.persistence.*;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.time.LocalDateTime;

@Entity
@Table(name = "segmentacoes")
@Getter
@Setter
@NoArgsConstructor
public class Segmentacao {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false)
    private String nome;

    // Serializado como JSON: lista de grupos "E", combinados entre si por "OU".
    // Ex.: [[{field,op,value}], [{field,op,value},{field,op,value}]]
    @Column(columnDefinition = "TEXT", nullable = false)
    private String groupsJson;

    private Boolean arquivado = false;

    private LocalDateTime atualizadoEm;

    @PrePersist
    @PreUpdate
    protected void aoSalvar() {
        this.atualizadoEm = LocalDateTime.now();
    }
}
