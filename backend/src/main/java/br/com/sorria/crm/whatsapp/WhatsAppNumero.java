package br.com.sorria.crm.whatsapp;

import jakarta.persistence.*;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.time.LocalDateTime;

// Cadastro de instancias Evolution ADICIONAIS, pra clinicas com mais de um
// numero de disparo. O numero original (unico ate aqui) continua vindo da
// config fixa em EvolutionApiClient/application.yml e permanece o padrao
// sempre que uma campanha nao escolhe um numero desta tabela (ver
// Campanha.whatsappNumeroId e CampanhaService.resolverTokenInstancia).
@Entity
@Table(name = "whatsapp_numeros")
@Getter
@Setter
@NoArgsConstructor
public class WhatsAppNumero {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false)
    private String nome;

    private String instancia;

    @Column(nullable = false)
    private String token;

    private LocalDateTime criadoEm;

    @PrePersist
    protected void aoCriar() {
        this.criadoEm = LocalDateTime.now();
    }
}
