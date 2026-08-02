package br.com.sorria.crm.conversa;

import br.com.sorria.crm.conversa.dto.EnviarMensagemRequest;
import br.com.sorria.crm.conversa.dto.MensagemDTO;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/contatos/{contatoId}/mensagens")
@RequiredArgsConstructor
public class MensagemController {

    private final MensagemService service;

    @GetMapping
    public List<MensagemDTO> listar(@PathVariable Long contatoId) {
        return service.listar(contatoId);
    }

    @PostMapping
    public MensagemDTO enviar(@PathVariable Long contatoId, @Valid @RequestBody EnviarMensagemRequest req, Authentication auth) {
        return service.enviar(contatoId, req, auth.getName());
    }
}
