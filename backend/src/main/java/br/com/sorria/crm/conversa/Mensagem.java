package br.com.sorria.crm.conversa;

import jakarta.persistence.*;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.time.LocalDateTime;

// Historico REAL de conversa (recebida + enviada) por lead, base do Kanban de
// conversas e do reply avulso fora do fluxo de campanha. Pensada tambem pra
// ser reaproveitada pelo webhook de resposta da automacao (Fase 4 do plano de
// automacao) quando ele existir - mesma tabela serve os dois usos.
@Entity
@Table(name = "mensagens")
@Getter
@Setter
@NoArgsConstructor
public class Mensagem {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false)
    private Long contatoId;

    // null = numero principal (config fixa do EvolutionApiClient), mesmo
    // sentido de Campanha.whatsappNumeroId.
    private Long whatsappNumeroId;

    @Column(nullable = false)
    private String direcao; // "ENTRADA" | "SAIDA"

    @Column(length = 4000)
    private String texto;

    // Quem apertou "enviar" - null pra mensagens ENTRADA (do lead) ou geradas
    // por campanha/automacao (nao um humano respondendo avulso).
    private Long enviadoPorUsuarioId;

    // Trava de auditoria leve: true quando o usuario respondeu por um numero
    // que nao e o principal - so um sinalizador, nao bloqueia nada.
    private boolean numeroAlternativo;

    // Payload bruto do sub-objeto de midia (imageMessage/videoMessage/etc) do
    // webhook, quando a mensagem ENTRADA nao e texto simples - guardado so pra
    // investigar o formato real da Evolution e depois exibir a midia de verdade.
    // Nao aparece no chat (so o texto/placeholder aparece).
    @Column(length = 4000)
    private String payloadBrutoMidia;

    // ID da mensagem no provedor (Info.ID do payload da Evolution), quando o
    // webhook trouxe um - usado pra detectar reentrega duplicada do mesmo
    // evento (ver MensagemService.registrarEntrada). Null pra SAIDA e pra
    // ENTRADA cujo payload nao trouxe um id reconhecido.
    private String mensagemExternaId;

    private LocalDateTime criadoEm;

    @PrePersist
    protected void aoCriar() {
        this.criadoEm = LocalDateTime.now();
    }
}
