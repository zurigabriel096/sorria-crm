package br.com.sorria.crm.colunas;

import jakarta.persistence.*;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.util.ArrayList;
import java.util.List;

// Configuracao unica (nao por usuario) de quais colunas aparecem na tabela
// da Base de Leads - so ADMIN/GESTOR edita (ver ConfigColunasController),
// todo colaborador enxerga a mesma tabela. So existe UMA linha nessa tabela
// (ver ConfigColunasService.buscarOuCriar).
@Entity
@Table(name = "config_colunas")
@Getter
@Setter
@NoArgsConstructor
public class ConfigColunas {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ElementCollection(fetch = FetchType.EAGER)
    @CollectionTable(name = "config_colunas_visiveis", joinColumns = @JoinColumn(name = "config_id"))
    @Column(name = "coluna")
    private List<String> colunasVisiveis = new ArrayList<>();
}
