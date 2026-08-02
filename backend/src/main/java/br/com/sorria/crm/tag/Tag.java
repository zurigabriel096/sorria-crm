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
}
