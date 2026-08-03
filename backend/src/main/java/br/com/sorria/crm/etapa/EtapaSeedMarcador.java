package br.com.sorria.crm.etapa;

import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

// Marca que o seed inicial das 3 etapas padrao (Lead/Lead Qualificado/Cliente)
// ja rodou uma vez - existir QUALQUER linha aqui e o suficiente. Sem isso,
// EtapaKanbanDataInitializer usava "repository.count()==0" pra decidir se
// semeava, o que recriava as colunas padrao (e suas tags) toda vez que o
// ADMIN excluia todas as etapas e o backend reiniciava (cold start do Render
// conta como reinicio) - a exclusao deliberada nunca deveria voltar sozinha.
@Entity
@Table(name = "etapa_seed_marcador")
@Getter
@Setter
@NoArgsConstructor
public class EtapaSeedMarcador {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;
}
