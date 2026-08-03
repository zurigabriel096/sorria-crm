package br.com.sorria.crm.aquecimento;

import jakarta.persistence.*;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.time.LocalDateTime;

// 1 linha por mensagem trocada entre 2 numeros de aquecimento (ver
// AquecimentoService.executarCiclo) - so historico/contagem do dia, nao gera
// Mensagem nem Contato nenhum (esses numeros nunca falam com lead de verdade).
@Entity
@Table(name = "aquecimento_envios")
@Getter
@Setter
@NoArgsConstructor
public class AquecimentoEnvio {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false)
    private Long numeroOrigemId;

    @Column(nullable = false)
    private Long numeroDestinoId;

    private String status;

    private LocalDateTime criadoEm;

    @PrePersist
    protected void aoCriar() {
        this.criadoEm = LocalDateTime.now();
    }
}
