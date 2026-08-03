package br.com.sorria.crm.user;

import br.com.sorria.crm.user.dto.UsuarioDTO;
import br.com.sorria.crm.user.dto.UsuarioRequest;
import lombok.RequiredArgsConstructor;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.http.HttpStatus;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.web.server.ResponseStatusException;

import java.util.List;
import java.util.NoSuchElementException;

@Service
@RequiredArgsConstructor
public class UsuarioService {

    private final UsuarioRepository usuarioRepository;
    private final PapelCargoRepository papelCargoRepository;
    private final PasswordEncoder passwordEncoder;

    public List<UsuarioDTO> listar() {
        return usuarioRepository.findAll().stream().map(this::toDTO).toList();
    }

    public UsuarioDTO criar(UsuarioRequest req) {
        if (req.senha() == null || req.senha().isBlank()) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Senha e obrigatoria pra novos colaboradores");
        }
        if (usuarioRepository.existsByEmail(req.email())) {
            throw new ResponseStatusException(HttpStatus.CONFLICT, "Ja existe um colaborador com esse email");
        }

        Usuario usuario = new Usuario();
        usuario.setNome(req.nome());
        usuario.setCpf(req.cpf());
        usuario.setEmail(req.email());
        usuario.setPapel(papelDe(req.papel()));
        usuario.setSenhaHash(passwordEncoder.encode(req.senha()));
        return toDTO(usuarioRepository.save(usuario));
    }

    public UsuarioDTO atualizar(Long id, UsuarioRequest req) {
        Usuario usuario = buscarEntidade(id);
        if (!usuario.getEmail().equalsIgnoreCase(req.email()) && usuarioRepository.existsByEmail(req.email())) {
            throw new ResponseStatusException(HttpStatus.CONFLICT, "Ja existe um colaborador com esse email");
        }
        usuario.setNome(req.nome());
        usuario.setCpf(req.cpf());
        usuario.setEmail(req.email());
        usuario.setPapel(papelDe(req.papel()));
        if (req.senha() != null && !req.senha().isBlank()) {
            usuario.setSenhaHash(passwordEncoder.encode(req.senha()));
        }
        return toDTO(usuarioRepository.save(usuario));
    }

    public void remover(Long id, String emailAutenticado) {
        Usuario usuario = buscarEntidade(id);
        if (usuario.getEmail().equalsIgnoreCase(emailAutenticado)) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Voce nao pode excluir o proprio usuario");
        }
        try {
            usuarioRepository.deleteById(id);
        } catch (DataIntegrityViolationException ex) {
            throw new ResponseStatusException(HttpStatus.CONFLICT, "Nao foi possivel excluir este colaborador");
        }
    }

    private Usuario buscarEntidade(Long id) {
        return usuarioRepository.findById(id)
                .orElseThrow(() -> new NoSuchElementException("Colaborador nao encontrado: " + id));
    }

    // Valida contra o catalogo dinamico (PapelCargo) em vez de um enum fixo -
    // devolve a "chave" (a que Usuario.papel guarda de verdade).
    private String papelDe(String papel) {
        String chave = papel == null ? "" : papel.trim().toUpperCase();
        if (!papelCargoRepository.existsByChave(chave)) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Papel invalido: " + papel);
        }
        return chave;
    }

    private UsuarioDTO toDTO(Usuario u) {
        return new UsuarioDTO(u.getId(), u.getNome(), u.getCpf(), u.getEmail(), u.getPapel(), u.getCorPerfil(), u.getAvatarUrl());
    }
}
