package br.com.sorria.crm.user;

import br.com.sorria.crm.user.dto.CorPerfilRequest;
import br.com.sorria.crm.user.dto.UsuarioDTO;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

import java.util.NoSuchElementException;

// Perfil do PRÓPRIO usuário autenticado — sem restrição de papel, qualquer um
// logado consegue ver e ajustar as próprias preferências (cor do avatar etc).
// Existe separado do /api/usuarios (que é gestão de outros colaboradores, com
// @PreAuthorize) justamente pra recepcionista/marketing conseguirem mexer no
// próprio perfil sem precisar de permissão de Admin/Gestor.
@RestController
@RequestMapping("/api/me")
@RequiredArgsConstructor
public class MeController {

    private final UsuarioRepository usuarioRepository;
    private final AvatarService avatarService;

    @GetMapping
    public UsuarioDTO eu(Authentication auth) {
        return toDTO(buscar(auth));
    }

    @PutMapping("/cor-perfil")
    public UsuarioDTO atualizarCorPerfil(Authentication auth, @Valid @RequestBody CorPerfilRequest req) {
        Usuario usuario = buscar(auth);
        usuario.setCorPerfil(req.cor());
        return toDTO(usuarioRepository.save(usuario));
    }

    // O recorte (crop) acontece no navegador — aqui já chega só o JPEG/PNG/WebP
    // final, quadrado, redimensionado. Ver AvatarService pro upload no Supabase Storage.
    @PostMapping(value = "/avatar", consumes = "multipart/form-data")
    public UsuarioDTO trocarAvatar(Authentication auth, @RequestParam("file") MultipartFile file) {
        Usuario usuario = buscar(auth);
        String url = avatarService.upload(usuario.getId(), file);
        usuario.setAvatarUrl(url);
        return toDTO(usuarioRepository.save(usuario));
    }

    private Usuario buscar(Authentication auth) {
        return usuarioRepository.findByEmail(auth.getName())
                .orElseThrow(() -> new NoSuchElementException("Usuario nao encontrado"));
    }

    private UsuarioDTO toDTO(Usuario u) {
        return new UsuarioDTO(u.getId(), u.getNome(), u.getCpf(), u.getEmail(), u.getPapel(), u.getCorPerfil(), u.getAvatarUrl(), u.getAbasDashboardPermitidas());
    }
}
