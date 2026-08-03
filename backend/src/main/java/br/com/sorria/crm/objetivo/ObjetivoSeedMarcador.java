package br.com.sorria.crm.objetivo;

import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

// Marca que o seed inicial dos objetivos padrao ja rodou uma vez - existir
// QUALQUER linha aqui e' o suficiente. Mesmo padrao de EtapaSeedMarcador:
// sem isso, um "repository.count()==0" reseeda os objetivos padrao toda vez
// que o ADMIN excluir todos e o backend reiniciar (cold start do Render
// conta como reinicio) - a exclusao deliberada nunca deveria voltar sozinha.
@Entity
@Table(name = "objetivo_seed_marcador")
@Getter
@Setter
@NoArgsConstructor
public class ObjetivoSeedMarcador {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;
}
