package br.com.sorria.crm.tag;

import lombok.RequiredArgsConstructor;
import org.springframework.boot.CommandLineRunner;
import org.springframework.core.annotation.Order;
import org.springframework.stereotype.Component;

// Semeia as tags que ate aqui eram um array fixo no estado local do frontend
// (App.jsx useState, se perdia a cada reload) - pra virarem cadastro de
// verdade, ja com uma cor de partida.
// @Order(1): precisa rodar antes do EtapaTagSyncInitializer (Order 2) - senao
// esse aqui pode achar a tabela ja com linhas (das tags de etapa) e pular a
// propria semeadura por engano.
@Component
@Order(1)
@RequiredArgsConstructor
public class TagDataInitializer implements CommandLineRunner {

    private final TagRepository repository;

    @Override
    public void run(String... args) {
        if (repository.count() > 0) {
            return;
        }
        String[][] padrao = {
                {"Inadimplente", "#FF6B5B"},
                {"Sem agendamento", "#C8912A"},
                {"Agenda Agosto", "#0FA895"},
                {"Retorno", "#4C6FFF"},
        };
        for (String[] par : padrao) {
            Tag tag = new Tag();
            tag.setNome(par[0]);
            tag.setCor(par[1]);
            repository.save(tag);
        }
    }
}
