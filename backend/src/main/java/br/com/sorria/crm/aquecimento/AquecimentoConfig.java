package br.com.sorria.crm.aquecimento;

import jakarta.persistence.*;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

// Configuracao UNICA (nao por numero) do Sorr.ia Protect - so ADMIN edita
// (ver AquecimentoController). "ativo" e' a chave-mestra: comeca DESLIGADA de
// proposito (ver AquecimentoService.executarCiclo) - ninguem deve trocar
// mensagem de verdade entre numeros so porque o codigo foi deployado, isso
// so deve acontecer quando o ADMIN ligar manualmente na tela.
@Entity
@Table(name = "aquecimento_config")
@Getter
@Setter
@NoArgsConstructor
public class AquecimentoConfig {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false)
    private boolean ativo = false;

    // Curva de aquecimento: comeca em mensagensDiaInicial, sobe
    // incrementoDiario por dia corrido, trava em mensagensDiaMaximo depois de
    // diasAquecimento dias - simples de proposito (crescimento gradual e' o
    // unico consenso real do mercado sobre reduzir risco, ninguem garante
    // "sem bloqueio").
    @Column(nullable = false)
    private int mensagensDiaInicial = 5;

    @Column(nullable = false)
    private int incrementoDiario = 3;

    @Column(nullable = false)
    private int mensagensDiaMaximo = 40;

    @Column(nullable = false)
    private int diasAquecimento = 21;

    // Intervalo entre mensagens do MESMO numero - faixa "ritmo humano"
    // (3-4min = 180-240s) e' o padrao recomendado; abaixo de 1min e'
    // considerado padrao detectavel demais, por isso nao ha validacao pra
    // permitir menos que isso (ver AquecimentoService).
    @Column(nullable = false)
    private int intervaloMinSegundos = 180;

    @Column(nullable = false)
    private int intervaloMaxSegundos = 240;

    // Modo dinamico: sorteia um valor dentro da faixa a cada envio, em vez de
    // usar sempre o mesmo intervalo fixo - quebra o padrao repetitivo que
    // ficaria facil de detectar como automacao.
    @Column(nullable = false)
    private boolean modoDinamico = true;
}
