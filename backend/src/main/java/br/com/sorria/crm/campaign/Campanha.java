package br.com.sorria.crm.campaign;

import jakarta.persistence.*;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

@Entity
@Table(name = "campanhas")
@Getter
@Setter
@NoArgsConstructor
public class Campanha {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false)
    private String nome;

    private String objetivo;

    private String canal;

    private String responsavel;

    private String status;

    private String inicio;

    @Column(length = 2000)
    private String emailMsg;

    private Long templateId;
}
