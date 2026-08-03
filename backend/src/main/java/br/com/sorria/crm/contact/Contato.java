package br.com.sorria.crm.contact;

import jakarta.persistence.*;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;
import org.hibernate.annotations.BatchSize;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

@Entity
@Table(name = "contatos", indexes = @Index(name = "idx_contatos_telefone", columnList = "telefone"))
@Getter
@Setter
@NoArgsConstructor
public class Contato {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    private String cod;

    @Column(nullable = false)
    private String nome;

    // Sem indice, ContatoService.criarOuMesclarEntidade (findByTelefone, chamado
    // 1x por linha importada) varria a tabela inteira a cada linha - numa
    // importacao grande, quanto mais linha ja processada, mais devagar ficava
    // achar duplicado (tabela cresce durante a propria importacao), ate travar
    // o processo no Render free tier (pouca memoria) perto do fim de uma base
    // grande. @Index aqui faz o ddl-auto=update criar o indice no proximo boot.
    private String telefone;

    private String email;

    private String financ;

    // Desde quando o financ atual e' "Inadimplente" - null quando financ nao e'
    // "Inadimplente" (ContatoService.aplicar/mesclarNoExistente/mesclarEntidades
    // gravam/limpam sozinhos toda vez que financ muda, mesmo raciocinio de
    // sincronizarTagDeEtapa). Usado pra Segmentacoes filtrar "inadimplente ha
    // mais de X dias"/"ha menos de Y dias" (dias = hoje - inadimplenteDesde).
    private LocalDate inadimplenteDesde;

    private String dentista;

    private String ultAtendimento;

    private Integer recencia;

    // Estagio do funil de Lead: "Lead" | "Lead Qualificado" | "Cliente". Sem
    // enum/constraint no JPA de proposito - mesmo padrao ja usado em Campanha.canal,
    // validado so no Select do frontend.
    private String estagio;

    // Colaborador dono deste lead (Usuario.id). Null = "fila compartilhada",
    // visivel a qualquer colaborador ate alguem assumir/ser atribuido - ver
    // ContatoService.listarVisiveisPara.
    private Long responsavelId;

    // Posicao do card dentro da coluna do Kanban (ordenacao "fracionaria" tipo
    // Trello: ao arrastar um card entre dois outros, o novo valor fica na media
    // dos vizinhos, sem precisar renumerar o resto da coluna). Null = ainda nao
    // foi reordenado manualmente, cai no fallback por id.
    private Double ordemKanban;

    private boolean elegivel;

    private String enviado;

    // FetchType.EAGER: garante que tags sempre venham carregadas junto com o contato,
    // sem depender da sessao do Hibernate ainda estar aberta na hora de serializar pra JSON.
    // @BatchSize: sem isso, listar N contatos dispara 1 SELECT extra por contato so
    // pra buscar as tags (N+1) - numa base de centenas/milhares de leads, GET
    // /api/contacts (listarVisiveisPara) virava mais de mil consultas sequenciais,
    // travando a tela de "Carregando..." (mesmo raciocinio do camposCustomizados
    // abaixo). Com @BatchSize, Hibernate busca as tags de ate 50 contatos de uma vez.
    @ElementCollection(fetch = FetchType.EAGER)
    @CollectionTable(name = "contato_tags", joinColumns = @JoinColumn(name = "contato_id"))
    @Column(name = "tag")
    @BatchSize(size = 50)
    private List<String> tags = new ArrayList<>();

    private String origem;

    // Denormalizado a partir de Mensagem (ver MensagemService.enviar/registrarEntrada)
    // - so o proprio servico grava isso, nunca vem de fora via PUT/POST. Existe
    // pra a Fila de Trabalho (F3) ordenar/filtrar por "tempo sem resposta" sem
    // precisar consultar Mensagem por contato toda vez - essencial em escala
    // (centenas/milhares de leads).
    private LocalDateTime ultimaMensagemEm;

    // "ENTRADA" | "SAIDA" - direcao da ultima mensagem trocada com esse lead.
    private String ultimaMensagemDirecao;

    // Follow-up agendado pelo colaborador (ex.: "retornar dia X") - ao
    // contrario dos dois campos acima, esse e' editavel pelo usuario. Base
    // dos filtros Vencidos/Hoje/Amanha/Esta semana da Fila de Trabalho.
    private LocalDateTime proximaAcaoEm;

    // Valores dos campos customizados (ver br.com.sorria.crm.campo.CampoCustomizado),
    // chave = nome do campo. Guardado sempre como texto (a UI converte pro tipo
    // configurado - numero/data/lista) pra nao precisar de uma tabela por tipo.
    // @BatchSize: mesmo motivo da colecao tags acima - evita mais 1 SELECT por
    // contato so pra esse mapa (N+1 dobrado, ja que sao 2 colecoes EAGER na
    // mesma entidade).
    @ElementCollection(fetch = FetchType.EAGER)
    @CollectionTable(name = "contato_campos_customizados", joinColumns = @JoinColumn(name = "contato_id"))
    @MapKeyColumn(name = "campo_nome")
    @Column(name = "valor")
    @BatchSize(size = 50)
    private Map<String, String> camposCustomizados = new HashMap<>();
}
