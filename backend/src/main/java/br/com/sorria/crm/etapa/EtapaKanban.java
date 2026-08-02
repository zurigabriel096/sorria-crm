package br.com.sorria.crm.etapa;

import jakarta.persistence.*;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.time.LocalDateTime;

// Coluna do Kanban de conversas / estagio do funil do Lead. Substitui o
// antigo array fixo ESTAGIOS_LEAD (["Lead","Lead Qualificado","Cliente"]) por
// um cadastro de verdade, editavel pelo ADMIN (nome, ordem). O DataInitializer
// semeia esses 3 valores originais na primeira vez que a tabela roda vazia,
// pra nao quebrar leads que ja tem esse texto salvo em Contato.estagio.
@Entity
@Table(name = "etapas_kanban")
@Getter
@Setter
@NoArgsConstructor
public class EtapaKanban {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false)
    private String nome;

    @Column(nullable = false)
    private Integer ordem;

    private LocalDateTime criadoEm;

    @PrePersist
    protected void aoCriar() {
        this.criadoEm = LocalDateTime.now();
    }
}
