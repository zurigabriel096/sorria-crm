package br.com.sorria.crm.dashboard;

import jakarta.persistence.*;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

// "Big number" configuravel do Painel Executivo: conta quantos Contato batem
// campoNome=valor. campoNome pode ser um campo customizado (nome livre, ver
// CampoCustomizado) ou um campo fixo do cadastro com prefixo "fixo:" (ex.:
// "fixo:financ", valor "Inadimplente") - ver PainelCardService.bate e
// Dashboard.jsx (CAMPOS_FIXOS) pro catalogo completo. So ADMIN cria/edita
// (ver PainelCardController) - mecanismo generico, nao fica preso a 1 campo.
@Entity
@Table(name = "painel_cards")
@Getter
@Setter
@NoArgsConstructor
public class PainelCard {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false)
    private String campoNome;

    @Column(nullable = false)
    private String valor;

    // Texto mostrado no card - se vazio, cai no fallback (campoNome + valor)
    // na hora de exibir (ver PainelCardService).
    private String rotulo;

    @Column(nullable = false)
    private Integer ordem;
}
