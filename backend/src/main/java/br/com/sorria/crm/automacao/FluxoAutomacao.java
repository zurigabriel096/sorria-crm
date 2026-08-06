package br.com.sorria.crm.automacao;

import jakarta.persistence.*;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.time.LocalDateTime;

// Grafo do construtor visual (nos + arestas do @xyflow/react) guardado como JSON
// bruto em TEXT - mesmo padrao ja usado em Segmentacao.groupsJson: serializar
// a estrutura inteira em vez de modelar cada tipo de no como tabela relacional
// (mais simples, e o schema dos nos ainda muda com frequencia nesta fase).
@Entity
@Table(name = "fluxos_automacao")
@Getter
@Setter
@NoArgsConstructor
public class FluxoAutomacao {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false)
    private String nome;

    // So roda de verdade (motor de execucao) quando ativo=true - ver AutomacaoEngineService.
    private Boolean ativo = false;

    // Arquivado so tira da lista principal (menu de "..." > Arquivar, pedido do
    // Samuel 05/08/2026) - arquivar forca ativo=false tambem (ver
    // FluxoAutomacaoService.arquivar), pra nunca ficar rodando escondido.
    private Boolean arquivado = false;

    @Column(columnDefinition = "TEXT", nullable = false)
    private String nodesJson;

    @Column(columnDefinition = "TEXT", nullable = false)
    private String edgesJson;

    // Corte de seguranca (Fase 5): quando preenchido, o motor de execucao IGNORA
    // a segmentacao de entrada e cria execucao so pra esse contato - deixa o
    // ADMIN validar o ciclo inteiro (mensagem, tag, aguardar resposta) com um
    // numero real antes de tirar o campo e deixar o fluxo rodar pra quem
    // realmente bate com a segmentacao. Ver AutomacaoEngineService.processarEntradaDeUmFluxo.
    private Long contatoTesteId;

    // "Fura fila" (06/08/2026, pedido do Samuel pra disparo de 115 pessoas): TODO
    // envio da Automacao passa por UMA fila unica pra respeitar o espacamento
    // minimo entre mensagens (evitar bloqueio do WhatsApp) - fluxo marcado como
    // prioritario tem seu envio checado ANTES da fila normal, mas continua
    // respeitando o mesmo espacamento (nao pula o intervalo, so a ORDEM). Ver
    // FilaEnvioWhatsApp/AutomacaoEngineService.executarNoMensagem.
    private Boolean prioritario = false;

    // Qual numero de WhatsApp esse fluxo usa pra mandar mensagem - null = numero
    // principal (comportamento antigo, retrocompativel). Pedido do Samuel
    // (05/08/2026): restringir automacao de baixo volume (cobranca, confirmacao
    // de consulta) aos numeros "saudaveis" (RTL/Sara/Joao), nunca aos numeros
    // usados pra disparo em massa - a escolha de QUAL numero fica com o ADMIN no
    // editor, nao fixa em codigo (nomes de pessoa podem mudar).
    private Long whatsappNumeroId;

    private LocalDateTime atualizadoEm;

    @PrePersist
    @PreUpdate
    protected void aoSalvar() {
        this.atualizadoEm = LocalDateTime.now();
    }
}
