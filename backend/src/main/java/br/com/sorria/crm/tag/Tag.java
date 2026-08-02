package br.com.sorria.crm.tag;

import jakarta.persistence.*;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

// Tag de verdade (nome + cor), em vez do array fixo que so existia no estado
// local do frontend (App.jsx useState) e se perdia a cada reload. Contato.tags
// continua sendo so uma lista de nomes (String) - a cor e' resolvida no
// frontend cruzando esse nome com a lista de Tag.
@Entity
@Table(name = "tags")
@Getter
@Setter
@NoArgsConstructor
public class Tag {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false)
    private String nome;

    @Column(nullable = false)
    private String cor;

    // Preenchido quando essa tag e' a tag automatica de uma coluna do Kanban
    // (ver EtapaKanbanService) - null pra tags criadas livremente pelo
    // usuario em Segmentacoes. So marca a origem; nao ha FK de verdade
    // porque excluir a coluna nao deve apagar a tag (leads que ja passaram
    // por ali mantem o historico).
    private Long etapaId;
}
