package br.com.sorria.crm.dashboard;

import jakarta.persistence.*;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

// "Big number" configuravel do Painel Executivo: quebra automatica de quantos
// Contato tem cada valor distinto de campoNome (ex.: campo "Situacao" vira um
// card com "Em dia: 340, Atrasado: 82, Protestado: 12" sozinho, sem precisar
// cadastrar valor por valor - ver PainelCardService.valorDoCampo). campoNome
// pode ser um campo customizado (nome livre, ver CampoCustomizado) ou um campo
// fixo do cadastro com prefixo "fixo:" (ex.: "fixo:financ") - ver
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

    // Titulo do card - se vazio, cai no fallback (rotulo amigavel do campo)
    // na hora de exibir (ver Dashboard.jsx rotuloCampo).
    private String rotulo;

    @Column(nullable = false)
    private Integer ordem;
}
