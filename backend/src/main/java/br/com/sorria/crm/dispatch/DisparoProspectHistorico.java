package br.com.sorria.crm.dispatch;

import jakarta.persistence.*;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.time.LocalDateTime;

// Um disparo pra prospects (fora do CRM) = UMA linha aqui, com o total
// agregado - ao contrario de DisparoHistorico (1 linha por contato), aqui nao
// existe Contato nenhum pra referenciar, entao nao da (nem faz sentido) guardar
// por pessoa. Alimenta o Painel Executivo ("template X enviou pra Y prospects").
@Entity
@Table(name = "disparo_prospect_historico")
@Getter
@Setter
@NoArgsConstructor
public class DisparoProspectHistorico {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    private Long campanhaId;

    private String campanhaNome;

    private Long templateId;

    private String templateNome;

    private int totalProspects;

    private int quantidadeEntregue;

    private int quantidadeFalhou;

    private LocalDateTime criadoEm;

    @PrePersist
    protected void aoCriar() {
        this.criadoEm = LocalDateTime.now();
    }
}
