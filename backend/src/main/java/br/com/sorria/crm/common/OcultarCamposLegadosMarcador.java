package br.com.sorria.crm.common;

import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

// Marca que a ocultacao pontual de campos legados da Base de Leads (pedido
// do Samuel, 06/08/2026, pivo do orquestrador) ja rodou uma vez. Sem esse
// marcador dedicado, um guard baseado so' no estado atual da tabela
// config_colunas_visiveis re-ocultaria de novo qualquer campo que o ADMIN
// decida reativar manualmente pelo checkbox de "Colunas visiveis" depois
// desta migracao - mesmo risco que o LimpezaDadosMarcador ja resolveu.
@Entity
@Table(name = "ocultar_campos_legados_marcador")
@Getter
@Setter
@NoArgsConstructor
public class OcultarCamposLegadosMarcador {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;
}
