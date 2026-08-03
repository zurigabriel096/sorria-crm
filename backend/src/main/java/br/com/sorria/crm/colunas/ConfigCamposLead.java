package br.com.sorria.crm.colunas;

import jakarta.persistence.*;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.util.ArrayList;
import java.util.List;

// Ordem dos campos fixos na aba "Dados" do cadastro do lead (PatientDetailModal)
// - configuracao UNICA (nao por usuario), so ADMIN edita (ver
// ConfigCamposLeadController). @OrderColumn e' necessario aqui (diferente de
// ConfigColunas.colunasVisiveis, que so precisa do CONJUNTO, nunca da ordem
// exata) - sem ele o Hibernate nao garante que a ordem persistida seja a
// mesma ordem devolvida na leitura.
@Entity
@Table(name = "config_campos_lead")
@Getter
@Setter
@NoArgsConstructor
public class ConfigCamposLead {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ElementCollection(fetch = FetchType.EAGER)
    @CollectionTable(name = "config_campos_lead_ordem", joinColumns = @JoinColumn(name = "config_id"))
    @OrderColumn(name = "posicao")
    @Column(name = "campo")
    private List<String> ordemCampos = new ArrayList<>();
}
