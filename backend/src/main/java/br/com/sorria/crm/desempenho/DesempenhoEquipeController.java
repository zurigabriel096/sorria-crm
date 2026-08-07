package br.com.sorria.crm.desempenho;

import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

// Sem @PreAuthorize de papel: qualquer colaborador autenticado pode ver -
// quem NAO tem a aba "Equipe" liberada (ver Usuario.abasDashboardPermitidas)
// simplesmente nunca chama esse endpoint, o controle e' no frontend (mesmo
// padrao ja usado nos outros dados do Painel).
@RestController
@RequestMapping("/api/dashboard/desempenho-equipe")
@RequiredArgsConstructor
public class DesempenhoEquipeController {

    private final DesempenhoEquipeService service;

    @GetMapping
    public List<DesempenhoColaboradorDTO> listar() {
        return service.listar();
    }
}
