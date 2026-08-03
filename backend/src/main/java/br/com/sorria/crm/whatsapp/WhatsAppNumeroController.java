package br.com.sorria.crm.whatsapp;

import br.com.sorria.crm.conversa.MensagemRepository;
import br.com.sorria.crm.whatsapp.dto.WhatsAppNumeroDTO;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/whatsapp/numeros")
@RequiredArgsConstructor
public class WhatsAppNumeroController {

    private final WhatsAppNumeroService service;
    private final MensagemRepository mensagemRepository;

    @GetMapping
    public List<WhatsAppNumeroDTO> listar() {
        return service.listar();
    }

    // Base do filtro "kanban por numero": id=null (omitido) = leads que ja
    // conversaram pelo numero principal; id=X = leads que ja conversaram
    // pelo numero cadastrado X.
    @GetMapping("/contatos")
    public List<Long> contatosPorNumero(@RequestParam(required = false) Long id) {
        return id == null
                ? mensagemRepository.findDistinctContatoIdByWhatsappNumeroIdIsNull()
                : mensagemRepository.findDistinctContatoIdByWhatsappNumeroId(id);
    }

    // Cadastrar/remover numero mexe em qual numero de verdade fica disponivel
    // pra disparar campanhas - restrito a ADMIN, mesmo padrao do resto da integracao.
    @PostMapping
    @PreAuthorize("hasRole('ADMIN')")
    public WhatsAppNumeroDTO criar(@Valid @RequestBody WhatsAppNumeroDTO dto) {
        return service.criar(dto);
    }

    @DeleteMapping("/{id}")
    @PreAuthorize("hasRole('ADMIN')")
    public Map<String, Boolean> remover(@PathVariable Long id) {
        service.remover(id);
        return Map.of("ok", true);
    }

    // Conectar numero secundario direto pelo app - mesmas acoes sensiveis do
    // numero principal (WhatsAppController), so que por id em vez de fixo.
    @PostMapping("/{id}/qrcode")
    @PreAuthorize("hasRole('ADMIN')")
    public Map<String, String> qrCode(@PathVariable Long id) {
        return Map.of("qrcode", service.gerarQrCode(id));
    }

    @PostMapping("/{id}/pareamento")
    @PreAuthorize("hasRole('ADMIN')")
    public Map<String, String> pareamento(@PathVariable Long id, @RequestBody Map<String, String> body) {
        return Map.of("pairingCode", service.solicitarPareamento(id, body.get("telefone")));
    }

    @PostMapping("/{id}/desconectar")
    @PreAuthorize("hasRole('ADMIN')")
    public Map<String, Boolean> desconectar(@PathVariable Long id) {
        service.desconectar(id);
        return Map.of("ok", true);
    }
}
