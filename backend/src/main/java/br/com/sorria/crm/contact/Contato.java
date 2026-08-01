package br.com.sorria.crm.contact;

import jakarta.persistence.*;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.util.ArrayList;
import java.util.List;

@Entity
@Table(name = "contatos")
@Getter
@Setter
@NoArgsConstructor
public class Contato {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    private String cod;

    @Column(nullable = false)
    private String nome;

    private String telefone;

    private String email;

    private String financ;

    private String dentista;

    private String ultAtendimento;

    private Integer recencia;

    private String segmento;

    private boolean elegivel;

    private String enviado;

    @ElementCollection
    @CollectionTable(name = "contato_tags", joinColumns = @JoinColumn(name = "contato_id"))
    @Column(name = "tag")
    private List<String> tags = new ArrayList<>();

    private String origem;
}
