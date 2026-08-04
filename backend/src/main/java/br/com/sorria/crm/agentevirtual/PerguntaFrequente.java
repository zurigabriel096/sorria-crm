package br.com.sorria.crm.agentevirtual;

import jakarta.persistence.*;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

// Pergunta-chave escrita pelo proprio Samuel (sem IA) - palavrasChave e' uma
// lista separada por virgula (ex.: "horario, que horas, atende ate que hora"),
// casada por "contem" (case-insensitive) contra o texto recebido do lead. A
// primeira que bater (ordem de cadastro) vence.
@Entity
@Table(name = "agente_virtual_pergunta_frequente")
@Getter
@Setter
@NoArgsConstructor
public class PerguntaFrequente {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(length = 500, nullable = false)
    private String palavrasChave;

    @Column(length = 1000, nullable = false)
    private String resposta;
}
