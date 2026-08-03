package br.com.sorria.crm.user;

import br.com.sorria.crm.user.dto.PapelCargoDTO;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.web.server.ResponseStatusException;

import java.text.Normalizer;
import java.util.List;
import java.util.NoSuchElementException;
import java.util.Set;

@Service
@RequiredArgsConstructor
public class PapelCargoService {

    // Essas duas chaves sao especiais - varios @PreAuthorize do backend
    // (ContatoService.PAPEIS_VISAO_TOTAL etc.) checam esses nomes literalmente,
    // entao nunca podem ser removidas (senao ninguem mais teria acesso de
    // admin/gestor).
    private static final Set<String> CHAVES_PROTEGIDAS = Set.of("ADMIN", "GESTOR");

    private final PapelCargoRepository repository;

    public List<PapelCargoDTO> listar() {
        return repository.findAllByOrderByRotuloAsc().stream().map(this::toDTO).toList();
    }

    // "chave" e' derivada do rotulo digitado (maiuscula, sem acento, espaco
    // vira "_") e fica fixa pra sempre - e' o valor de verdade gravado em
    // Usuario.papel e usado pelo Spring Security, nunca muda depois de criada.
    public PapelCargoDTO criar(String rotulo, String cor) {
        String chave = gerarChave(rotulo);
        if (repository.existsByChave(chave)) {
            throw new ResponseStatusException(HttpStatus.CONFLICT, "Ja existe uma funcao com esse nome");
        }
        PapelCargo cargo = new PapelCargo();
        cargo.setChave(chave);
        cargo.setRotulo(rotulo);
        cargo.setCor(cor);
        return toDTO(repository.save(cargo));
    }

    // So rotulo/cor sao editaveis - "chave" nunca muda (ver comentario da classe).
    public PapelCargoDTO atualizar(Long id, String rotulo, String cor) {
        PapelCargo cargo = buscarEntidade(id);
        cargo.setRotulo(rotulo);
        cargo.setCor(cor);
        return toDTO(repository.save(cargo));
    }

    public void remover(Long id) {
        PapelCargo cargo = buscarEntidade(id);
        if (CHAVES_PROTEGIDAS.contains(cargo.getChave())) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Essa funcao nao pode ser removida");
        }
        repository.deleteById(id);
    }

    private PapelCargo buscarEntidade(Long id) {
        return repository.findById(id)
                .orElseThrow(() -> new NoSuchElementException("Funcao nao encontrada: " + id));
    }

    private static String gerarChave(String rotulo) {
        String semAcento = Normalizer.normalize(rotulo, Normalizer.Form.NFD)
                .replaceAll("\\p{M}", "");
        String chave = semAcento.trim().toUpperCase().replaceAll("[^A-Z0-9]+", "_").replaceAll("^_+|_+$", "");
        if (chave.isBlank()) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Nome de funcao invalido");
        }
        return chave;
    }

    private PapelCargoDTO toDTO(PapelCargo c) {
        return new PapelCargoDTO(c.getId(), c.getChave(), c.getRotulo(), c.getCor());
    }
}
