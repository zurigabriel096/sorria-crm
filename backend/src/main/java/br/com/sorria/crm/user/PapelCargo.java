package br.com.sorria.crm.user;

import jakarta.persistence.*;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

// Catalogo dinamico de funcoes/cargos de colaborador - substitui o antigo
// enum fixo Papel. "chave" e' o valor de verdade gravado em Usuario.papel e
// usado pelo Spring Security (JwtAuthFilter monta "ROLE_"+chave) - por isso
// e' imutavel depois de criada (nunca editar direto no banco). ADMIN/GESTOR
// sao especiais (varios @PreAuthorize do backend checam esses dois nomes
// literalmente) - as demais funcoes (existentes ou criadas pelo ADMIN depois)
// nao tem nenhum privilegio especial, so aparecem coloridas na UI.
@Entity
@Table(name = "papeis_cargo")
@Getter
@Setter
@NoArgsConstructor
public class PapelCargo {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false, unique = true)
    private String chave;

    @Column(nullable = false)
    private String rotulo;

    @Column(nullable = false)
    private String cor;
}
