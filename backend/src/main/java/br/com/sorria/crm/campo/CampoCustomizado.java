package br.com.sorria.crm.campo;

import jakarta.persistence.*;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.util.ArrayList;
import java.util.List;

// Campo extra que o proprio usuario define pro lead (ex.: "Convenio",
// "Valor do plano") - alem de existir de verdade no cadastro do lead
// (Contato.camposCustomizados), fica disponivel como condicao no construtor
// de Segmentacoes. tipo: "TEXTO" | "NUMERO" | "DATA" | "LISTA" - sem
// enum/constraint no JPA de proposito, mesmo padrao ja usado em
// Contato.estagio/financ (validado so no frontend).
@Entity
@Table(name = "campos_customizados")
@Getter
@Setter
@NoArgsConstructor
public class CampoCustomizado {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false)
    private String nome;

    @Column(nullable = false)
    private String tipo;

    @Column(nullable = false)
    private Integer ordem;

    // So usado quando tipo="LISTA" - as opcoes que o operador pode escolher.
    @ElementCollection(fetch = FetchType.EAGER)
    @CollectionTable(name = "campo_customizado_opcoes", joinColumns = @JoinColumn(name = "campo_id"))
    @Column(name = "opcao")
    private List<String> opcoes = new ArrayList<>();
}
