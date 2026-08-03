package br.com.sorria.crm.dashboard;

import jakarta.persistence.*;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

// "Big number" configuravel do Painel Executivo: conta quantos Contato tem
// Contato.camposCustomizados.get(campoNome) == valor (ex.: campo "Protesto",
// valor "A protestar"). So ADMIN cria/edita (ver PainelCardController) -
// mecanismo generico, nao fica preso a um campo especifico.
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
