package br.com.sorria.crm.auth;

import br.com.sorria.crm.security.JwtService;
import br.com.sorria.crm.user.Usuario;
import br.com.sorria.crm.user.UsuarioRepository;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.Map;
import java.util.Optional;

@RestController
@RequestMapping("/api/auth")
@RequiredArgsConstructor
public class AuthController {

    private final UsuarioRepository usuarioRepository;
    private final PasswordEncoder passwordEncoder;
    private final JwtService jwtService;

    @PostMapping("/login")
    public ResponseEntity<?> login(@Valid @RequestBody LoginRequest request) {
        Optional<Usuario> usuarioOpt = usuarioRepository.findByEmail(request.email());
        if (usuarioOpt.isEmpty() || !passwordEncoder.matches(request.senha(), usuarioOpt.get().getSenhaHash())) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body(Map.of("message", "Email ou senha invalidos"));
        }

        Usuario usuario = usuarioOpt.get();
        String token = jwtService.gerarToken(usuario.getEmail(), Map.of(
                "nome", usuario.getNome(),
                "papel", usuario.getPapel().name()
        ));

        return ResponseEntity.ok(new LoginResponse(token, usuario.getNome(), usuario.getEmail(), usuario.getPapel().name(), usuario.getCorPerfil(), usuario.getAvatarUrl()));
    }
}
