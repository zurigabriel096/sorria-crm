package br.com.sorria.crm.campaign;

import jakarta.persistence.*;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.util.ArrayList;
import java.util.List;

@Entity
@Table(name = "templates")
@Getter
@Setter
@NoArgsConstructor
public class Template {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false)
    private String nome;

    private String categoria;

    private String campanhaObjetivo;

    @Column(length = 1000)
    private String corpo;

    private String imagemUrl;

    private boolean ativo = true;

    // EAGER: mesma razao do Contato.tags - evita LazyInitializationException ao
    // serializar pra JSON depois que a sessao do Hibernate ja fechou.
    @ElementCollection(fetch = FetchType.EAGER)
    @CollectionTable(name = "template_botoes", joinColumns = @JoinColumn(name = "template_id"))
    @OrderColumn(name = "posicao")
    private List<TemplateBotao> botoes = new ArrayList<>();
}
