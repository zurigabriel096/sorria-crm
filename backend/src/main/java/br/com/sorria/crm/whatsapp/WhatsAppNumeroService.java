package br.com.sorria.crm.whatsapp;

import br.com.sorria.crm.whatsapp.dto.WhatsAppNumeroDTO;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import java.util.List;
import java.util.Map;
import java.util.NoSuchElementException;

@Service
@RequiredArgsConstructor
public class WhatsAppNumeroService {

    private final WhatsAppNumeroRepository repository;
    private final EvolutionApiClient evolutionApiClient;

    public List<WhatsAppNumeroDTO> listar() {
        return repository.findAll().stream().map(this::toDTOComStatus).toList();
    }

    public WhatsAppNumeroDTO criar(WhatsAppNumeroDTO dto) {
        WhatsAppNumero numero = new WhatsAppNumero();
        numero.setNome(dto.nome());
        numero.setInstancia(dto.instancia());
        numero.setToken(dto.token());
        return toDTOComStatus(repository.save(numero));
    }

    public void remover(Long id) {
        if (!repository.existsById(id)) {
            throw new NoSuchElementException("Número não encontrado: " + id);
        }
        repository.deleteById(id);
    }

    private WhatsAppNumeroDTO toDTOComStatus(WhatsAppNumero n) {
        Map<String, Object> status = evolutionApiClient.obterStatus(n.getToken());
        boolean conectado = Boolean.TRUE.equals(status.get("connected")) && Boolean.TRUE.equals(status.get("loggedIn"));
        return new WhatsAppNumeroDTO(
                n.getId(), n.getNome(), n.getInstancia(), null, n.getCriadoEm(),
                conectado, String.valueOf(status.getOrDefault("nome", "")));
    }
}
