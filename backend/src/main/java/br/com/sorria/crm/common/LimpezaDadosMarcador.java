package br.com.sorria.crm.common;

import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

// Marca que a limpeza pontual de Segmentacao/FluxoAutomacao/Campanha (pedido
// do Samuel, 06/08/2026, pivo do orquestrador) ja rodou uma vez - existir
// QUALQUER linha aqui e o suficiente. Sem esse marcador separado, um guard
// baseado em "repository.count()==0" apagaria de novo qualquer segmentacao/
// fluxo/campanha que o usuario criar depois da limpeza, todo restart do
// Render (mesmo problema que o EtapaSeedMarcador ja resolveu pro seed de
// etapas - aqui e o mesmo risco, na direcao contraria: deletar em vez de
// recriar).
@Entity
@Table(name = "limpeza_dados_marcador")
@Getter
@Setter
@NoArgsConstructor
public class LimpezaDadosMarcador {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;
}
