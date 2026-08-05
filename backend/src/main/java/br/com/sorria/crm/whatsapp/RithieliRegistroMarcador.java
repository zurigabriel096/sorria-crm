package br.com.sorria.crm.whatsapp;

import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

// Marca que o registro do numero da Rithieli (instancia ja criada manualmente
// no servidor sorria-evolution-saudavel, ver RithieliRegistroInitializer) ja
// rodou uma vez - existir QUALQUER linha aqui e' o suficiente, mesmo padrao do
// EtapaSeedMarcador/KanbanReestruturacaoMarcador.
@Entity
@Table(name = "rithieli_registro_marcador")
@Getter
@Setter
@NoArgsConstructor
public class RithieliRegistroMarcador {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;
}
