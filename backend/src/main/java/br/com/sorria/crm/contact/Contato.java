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

    // Estagio do funil de Lead: "Lead" | "Lead Qualificado" | "Cliente". Sem
    // enum/constraint no JPA de proposito - mesmo padrao ja usado em Campanha.canal,
    // validado so no Select do frontend.
    private String estagio;

    // Colaborador dono deste lead (Usuario.id). Null = "fila compartilhada",
    // visivel a qualquer colaborador ate alguem assumir/ser atribuido - ver
    // ContatoService.listarVisiveisPara.
    private Long responsavelId;

    // Posicao do card dentro da coluna do Kanban (ordenacao "fracionaria" tipo
    // Trello: ao arrastar um card entre dois outros, o novo valor fica na media
    // dos vizinhos, sem precisar renumerar o resto da coluna). Null = ainda nao
    // foi reordenado manualmente, cai no fallback por id.
    private Double ordemKanban;

    private boolean elegivel;

    private String enviado;

    // FetchType.EAGER: garante que tags sempre venham carregadas junto com o contato,
    // sem depender da sessao do Hibernate ainda estar aberta na hora de serializar pra JSON.
    @ElementCollection(fetch = FetchType.EAGER)
    @CollectionTable(name = "contato_tags", joinColumns = @JoinColumn(name = "contato_id"))
    @Column(name = "tag")
    private List<String> tags = new ArrayList<>();

    private String origem;
}
