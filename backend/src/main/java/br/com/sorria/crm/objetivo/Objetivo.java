package br.com.sorria.crm.objetivo;

import jakarta.persistence.*;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

// Objetivo/categoria de campanha e template (ex.: "Reativação", "Cobrança").
// Antes era um array fixo no estado local do frontend (App.jsx useState) -
// um objetivo criado na hora, digitando em Templates/Campanhas, se perdia a
// cada reload. Agora e' cadastro de verdade.
@Entity
@Table(name = "objetivos")
@Getter
@Setter
@NoArgsConstructor
public class Objetivo {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false)
    private String nome;
}
