package br.com.sorria.crm.campaign;

import jakarta.persistence.*;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.time.LocalDateTime;

// Escalonamento do Disparo A/B/C entre numeros de WhatsApp - antes rodava
// inteiro no frontend (Campanhas.jsx, loop com await setTimeout), que podia
// levar HORAS ("Recomendavel" = 120min por numero) e parava de vez se a aba
// fosse fechada (risco aceito conscientemente ate 07/08/2026, ver SESSAO do
// dia da suspensao de numero em 04/08/2026 - decisao revertida a pedido do
// Samuel apos auditoria de UX). Agora e' um job durável: cria uma vez com
// TODOS os grupos ja calculados (ver gruposJson), e o scheduler
// (@Scheduled aqui mesmo) dispara um grupo por vez, respeitando o
// espacamento em minutos, mesmo que ninguem esteja com o navegador aberto.
@Entity
@Table(name = "disparo_ab_jobs")
@Getter
@Setter
@NoArgsConstructor
public class DisparoAbJob {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    // "ativo" (ainda tem grupo pra disparar) | "concluido" | "erro" (nao usado
    // hoje - falha de grupo e' logada e tentada de novo no proximo tick, pra
    // nao deixar disparo pela metade por um erro passageiro).
    @Column(nullable = false)
    private String status = "ativo";

    @Column(nullable = false)
    private Integer minutosEscalonamento;

    // Indice do proximo grupo (dentro de gruposJson) que ainda falta disparar.
    @Column(nullable = false)
    private Integer proximoIndice = 0;

    @Column(nullable = false)
    private LocalDateTime proximaExecucaoEm;

    // So' pra identificar no toast/log qual letra (A/B ou A/B/C) esse job era.
    private String letras;

    private String criadoPorNome;

    @Column(nullable = false)
    private LocalDateTime criadoEm;

    // JSON: [{"numeroId": 3, "itens": [{"campanhaId": 10, "contatoIds": [1,2,3]}]}]
    // Um "grupo" = tudo que precisa disparar pra UM numero de WhatsApp (todas
    // as variantes A/B/C daquele numero juntas) - o escalonamento e' entre
    // numeros comecando a mandar mensagem, nao entre variantes de conteudo do
    // mesmo numero (isso pode ser junto, ver Campanhas.jsx original).
    @Column(columnDefinition = "TEXT", nullable = false)
    private String gruposJson;

    @PrePersist
    protected void aoCriar() {
        this.criadoEm = LocalDateTime.now();
    }
}
