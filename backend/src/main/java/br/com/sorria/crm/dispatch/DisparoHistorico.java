package br.com.sorria.crm.dispatch;

import jakarta.persistence.*;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.time.LocalDateTime;

@Entity
@Table(name = "disparo_historico")
@Getter
@Setter
@NoArgsConstructor
public class DisparoHistorico {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    private Long contatoId;

    private String contatoNome;

    private String campanhaNome;

    private String status;

    private LocalDateTime hora;
}
