package br.com.sorria.crm.dashboard;

import jakarta.persistence.*;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.util.ArrayList;
import java.util.List;

// Configuracao unica (nao por usuario) de quais metricas de volume de
// disparo/mensagem aparecem no Painel Executivo - so ADMIN edita (ver
// ConfigPainelMetricasController), mesmo padrao de ConfigColunas (Base de
// Leads). So existe UMA linha nessa tabela.
@Entity
@Table(name = "config_painel_metricas")
@Getter
@Setter
@NoArgsConstructor
public class ConfigPainelMetricas {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ElementCollection(fetch = FetchType.EAGER)
    @CollectionTable(name = "config_painel_metricas_visiveis", joinColumns = @JoinColumn(name = "config_id"))
    @Column(name = "metrica")
    private List<String> metricasVisiveis = new ArrayList<>();
}
