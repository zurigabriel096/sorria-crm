package br.com.sorria.crm.campaign;

import jakarta.persistence.*;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.time.LocalDateTime;

@Entity
@Table(name = "campanhas")
@Getter
@Setter
@NoArgsConstructor
public class Campanha {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false)
    private String nome;

    private String objetivo;

    private String canal;

    private String responsavel;

    private String status;

    private String inicio;

    @Column(length = 2000)
    private String emailMsg;

    private Long templateId;

    // Pausa entre cada mensagem no disparo (anti-spam do WhatsApp detecta rajada
    // sem intervalo como comportamento automatizado). Null/coluna nova em linha
    // antiga = usa o default de 3s no service, nao trava a leitura.
    private Integer intervaloSegundos;

    // Wrapper (nao primitivo) de proposito: coluna nova numa tabela que ja tem
    // linhas, ddl-auto:update nao faz backfill, entao registros antigos ficam
    // com null aqui — e null != false pra um boolean primitivo (quebraria a leitura).
    private Boolean arquivado = false;

    private LocalDateTime atualizadoEm;

    @PrePersist
    @PreUpdate
    protected void aoSalvar() {
        this.atualizadoEm = LocalDateTime.now();
    }
}
