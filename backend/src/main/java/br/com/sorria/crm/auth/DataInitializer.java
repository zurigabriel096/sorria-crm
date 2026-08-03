package br.com.sorria.crm.auth;

import br.com.sorria.crm.user.Usuario;
import br.com.sorria.crm.user.UsuarioRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.boot.CommandLineRunner;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Component;

@Component
@RequiredArgsConstructor
@Slf4j
public class DataInitializer implements CommandLineRunner {

    private final UsuarioRepository usuarioRepository;
    private final PasswordEncoder passwordEncoder;

    @Override
    public void run(String... args) {
        if (usuarioRepository.count() > 0) {
            return;
        }

        // Credenciais espelham o preenchimento de demonstracao do frontend (Login.jsx)
        Usuario admin = new Usuario();
        admin.setNome("Clinica Orthodontics JC");
        admin.setEmail("clinica@orthodonticsjc.com.br");
        admin.setSenhaHash(passwordEncoder.encode("demodemo"));
        admin.setPapel("ADMIN");
        usuarioRepository.save(admin);

        log.info("Usuario admin seed criado: {}", admin.getEmail());
    }
}
