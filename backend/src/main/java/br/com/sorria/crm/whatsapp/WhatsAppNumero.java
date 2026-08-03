package br.com.sorria.crm.whatsapp;

import jakarta.persistence.*;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.time.LocalDate;
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

    // "DISPARO" (padrao, retrocompativel com numero criado antes desse campo
    // existir) ou "AQUECIMENTO" - numero AQUECIMENTO nunca aparece como opcao
    // de disparo de campanha/A-B-C (ver Campanhas.jsx), so participa do ciclo
    // do Sorr.ia Protect (AquecimentoScheduler).
    @Column(nullable = false)
    private String finalidade = "DISPARO";

    // Preenchido quando finalidade passa a ser AQUECIMENTO - marca o "dia 1"
    // da curva de aquecimento (ver AquecimentoService.calcularMetaDiaria).
    private LocalDate aquecimentoIniciadoEm;

    // Proximo horario em que ESSE numero pode mandar a proxima mensagem de
    // aquecimento - recalculado a cada envio como "agora + intervalo
    // aleatorio dentro da faixa configurada" (ver AquecimentoConfig
    // intervaloMinSegundos/intervaloMaxSegundos + AquecimentoService).
    // Garante o ritmo minimo entre mensagens do MESMO numero, mesmo com o
    // scheduler checando a cada 1 min.
    private LocalDateTime proximoEnvioAquecimentoEm;

    private LocalDateTime criadoEm;

    @PrePersist
    protected void aoCriar() {
        this.criadoEm = LocalDateTime.now();
    }
}
