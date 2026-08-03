package br.com.sorria.crm.dispatch;

import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/dispatch-history")
@RequiredArgsConstructor
public class DisparoController {

    private final DisparoRepository disparoRepository;

    @GetMapping
    public List<DisparoHistorico> listar() {
        return disparoRepository.findAllByOrderByHoraDesc();
    }

    // Limpeza manual pedida pelo usuario (base de teste) - irreversivel, por
    // isso restrito a ADMIN e o frontend exige frase de confirmacao digitada
    // antes de chamar isso (mesmo padrao de excluir leads em massa).
    @DeleteMapping
    @PreAuthorize("hasRole('ADMIN')")
    @ResponseStatus(HttpStatus.OK)
    public Map<String, Long> limpar() {
        long total = disparoRepository.count();
        disparoRepository.deleteAll();
        return Map.of("removidos", total);
    }
}
