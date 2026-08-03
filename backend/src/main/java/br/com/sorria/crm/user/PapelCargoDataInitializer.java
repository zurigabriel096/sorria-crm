package br.com.sorria.crm.user;

import lombok.RequiredArgsConstructor;
import org.springframework.boot.CommandLineRunner;
import org.springframework.stereotype.Component;

// Semeia o catalogo de funcoes com os 5 valores que ate aqui eram um enum fixo
// (Papel) - "chave" precisa bater exatamente com o que ja esta gravado em
// Usuario.papel pros colaboradores existentes (ADMIN/GESTOR/etc.) continuarem
// autenticando normalmente.
@Component
@RequiredArgsConstructor
public class PapelCargoDataInitializer implements CommandLineRunner {

    private final PapelCargoRepository repository;

    @Override
    public void run(String... args) {
        if (repository.count() > 0) {
            return;
        }
        String[][] padrao = {
                {"ADMIN", "Administrador", "#5A7089"},
                {"GESTOR", "Gestor", "#4C6FFF"},
                {"MARKETING", "Marketing", "#C8912A"},
                {"RECEPCAO", "Recepção", "#0FA895"},
                {"TELEMARKETING", "Telemarketing", "#8A5CF6"},
        };
        for (String[] linha : padrao) {
            PapelCargo cargo = new PapelCargo();
            cargo.setChave(linha[0]);
            cargo.setRotulo(linha[1]);
            cargo.setCor(linha[2]);
            repository.save(cargo);
        }
    }
}
