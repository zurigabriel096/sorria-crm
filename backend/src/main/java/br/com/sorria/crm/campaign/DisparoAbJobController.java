package br.com.sorria.crm.campaign;

import br.com.sorria.crm.campaign.dto.DisparoAbJobDTO;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.*;

import java.util.List;

// Sem @PreAuthorize de proposito - mesmo nivel de acesso do dispatch normal
// de campanha (CampanhaController./{id}/dispatch, tambem sem restricao de
// papel), que ja depende so' do grupo "Campanhas" no menu (ADMIN/GESTOR)
// estar visivel no frontend pra alguem chegar nessa tela.
@RestController
@RequestMapping("/api/disparo-ab")
@RequiredArgsConstructor
public class DisparoAbJobController {

    private final DisparoAbJobService service;

    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    public DisparoAbJobDTO criar(@RequestBody DisparoAbJobDTO dto) {
        return service.criar(dto);
    }

    @GetMapping
    public List<DisparoAbJobDTO> listar() {
        return service.listar();
    }
}
