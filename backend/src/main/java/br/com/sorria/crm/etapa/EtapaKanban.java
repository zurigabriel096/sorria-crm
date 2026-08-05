package br.com.sorria.crm.etapa;

import jakarta.persistence.*;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;
import org.hibernate.annotations.ColumnDefault;

import java.time.LocalDateTime;

// Coluna do Kanban de conversas / estagio do funil do Lead. Substitui o
// antigo array fixo ESTAGIOS_LEAD (["Lead","Lead Qualificado","Cliente"]) por
// um cadastro de verdade, editavel pelo ADMIN (nome, ordem). O DataInitializer
// semeia esses 3 valores originais na primeira vez que a tabela roda vazia,
// pra nao quebrar leads que ja tem esse texto salvo em Contato.estagio.
@Entity
@Table(name = "etapas_kanban")
@Getter
@Setter
@NoArgsConstructor
public class EtapaKanban {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false)
    private String nome;

    @Column(nullable = false)
    private Integer ordem;

    private LocalDateTime criadoEm;

    // Marca uma coluna como "resolvida" (ex.: Cliente/Pos-venda) pra Fila de
    // Trabalho (F4) poder esconder por padrao quem esta aqui, sem
    // proximaAcaoEm futura e sem mensagem recente - nao afeta o Kanban nem
    // o Painel Executivo, so o filtro padrao da fila operacional.
    @ColumnDefault("false")
    private boolean etapaFinal;

    // So tem efeito quando etapaFinal=true - dias sem mensagem que a Fila de
    // Trabalho (F4) exige pra esconder por padrao quem esta aqui. Comeca em
    // 60 (mesmo valor que era fixo/global antes desta coluna existir) e o
    // ADMIN calibra por coluna se quiser.
    @ColumnDefault("60")
    private Integer limiarInatividadeDias = 60;

    // Nota fixa mostrada no topo da coluna no Kanban (Conversas.jsx) - ex.:
    // "Estes leads foram qualificados pelo bot, mova pra atendimento e agende."
    // So texto livre, editavel pelo ADMIN. Nullable/sem default - coluna sem
    // nota nao mostra nada no Kanban.
    @Column(length = 1000)
    private String descricao;

    @PrePersist
    protected void aoCriar() {
        this.criadoEm = LocalDateTime.now();
    }
}
