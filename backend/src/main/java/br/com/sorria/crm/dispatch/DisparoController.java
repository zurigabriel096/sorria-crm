package br.com.sorria.crm.dispatch;

import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

@RestController
@RequestMapping("/api/dispatch-history")
@RequiredArgsConstructor
public class DisparoController {

    private final DisparoRepository disparoRepository;

    @GetMapping
    public List<DisparoHistorico> listar() {
        return disparoRepository.findAllByOrderByHoraDesc();
    }
}
