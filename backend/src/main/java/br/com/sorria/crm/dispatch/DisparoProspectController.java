package br.com.sorria.crm.dispatch;

import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

// Historico agregado de disparo pra prospects (fora do CRM) - alimenta o
// Painel Executivo ("template X enviou pra Y prospects").
@RestController
@RequestMapping("/api/dispatch-prospect-history")
@RequiredArgsConstructor
public class DisparoProspectController {

    private final DisparoProspectHistoricoRepository repository;

    @GetMapping
    public List<DisparoProspectHistorico> listar() {
        return repository.findAllByOrderByCriadoEmDesc();
    }
}
