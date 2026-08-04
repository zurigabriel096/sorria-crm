package br.com.sorria.crm.agentevirtual;

import jakarta.persistence.*;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

// Configuracao UNICA (nao por numero) do Agente Virtual - so ADMIN edita.
// "ativo" e' a chave-mestra: comeca DESLIGADA de proposito, mesmo padrao do
// Sorr.ia Protect (AquecimentoConfig) - ninguem deve responder lead de forma
// automatica so porque o codigo foi deployado.
//
// Sem IA de proposito (decisao do Samuel, 04/08/2026): so casa palavra-chave
// cadastrada em PerguntaFrequente contra o texto recebido - zero custo de API,
// zero risco de resposta inventada sobre saude/financeiro da clinica.
@Entity
@Table(name = "agente_virtual_config")
@Getter
@Setter
@NoArgsConstructor
public class AgenteVirtualConfig {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false)
    private boolean ativo = false;

    // Mandada quando nenhuma PerguntaFrequente bate com o texto recebido -
    // avisa o lead que foi visto, sem inventar resposta especifica.
    @Column(length = 1000, nullable = false)
    private String mensagemPadrao = "Recebemos sua mensagem! Alguém da nossa equipe vai te responder em breve.";
}
