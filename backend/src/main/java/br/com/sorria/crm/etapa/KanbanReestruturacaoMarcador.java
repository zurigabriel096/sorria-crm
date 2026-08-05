package br.com.sorria.crm.etapa;

import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

// Marca que a reestruturacao do Kanban (04/08/2026, pedido explicito do
// Samuel - estrutura inspirada no Kommo: Etapa de Leads -> Solicitacao ->
// Qualificacao -> Em atendimento -> Agendado -> Confirmado -> Nao compareceu
// -> Comunicacao interna) ja rodou uma vez - mesmo raciocinio do
// EtapaSeedMarcador (existir QUALQUER linha aqui e' o suficiente, nao
// repository.count()==0), pra nao recriar/renomear de novo se o ADMIN editar
// essas colunas depois e o backend reiniciar.
@Entity
@Table(name = "kanban_reestruturacao_marcador")
@Getter
@Setter
@NoArgsConstructor
public class KanbanReestruturacaoMarcador {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;
}
