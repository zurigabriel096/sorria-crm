package br.com.sorria.crm.user;

import jakarta.persistence.*;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

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
}
