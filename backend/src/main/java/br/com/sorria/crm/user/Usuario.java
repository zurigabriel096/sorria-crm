package br.com.sorria.crm.user;

import jakarta.persistence.*;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.util.ArrayList;
import java.util.List;

@Entity
@Table(name = "usuarios")
@Getter
@Setter
@NoArgsConstructor
public class Usuario {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false)
    private String nome;

    @Column(nullable = false, unique = true)
    private String email;

    private String cpf;

    private String corPerfil;

    private String avatarUrl;

    @Column(nullable = false)
    private String senhaHash;

    // Chave de PapelCargo (ex.: "ADMIN", "GESTOR", ou uma funcao criada pelo
    // ADMIN depois) - era enum fixo (Papel), virou String pra permitir criar
    // novas funcoes sem alterar codigo (ver PapelCargo). Mesma coluna/valores
    // de antes (EnumType.STRING ja gravava o texto puro), sem migracao de dado.
    @Column(nullable = false)
    private String papel;

    // Chaves de aba do Painel Executivo (ver Dashboard.jsx ABAS_PAINEL) que
    // este colaborador pode ver quando NAO e' ADMIN/GESTOR - esses dois
    // continuam vendo todas as abas sempre, independente deste campo (ver
    // AcessoRestrito/Dashboard.jsx no frontend). Vazio = colaborador comum
    // sem nenhum acesso ao Painel (comportamento de antes desta feature).
    @ElementCollection(fetch = FetchType.EAGER)
    @CollectionTable(name = "usuario_abas_dashboard", joinColumns = @JoinColumn(name = "usuario_id"))
    @Column(name = "aba")
    private List<String> abasDashboardPermitidas = new ArrayList<>();
}
