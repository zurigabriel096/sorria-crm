package br.com.sorria.crm.desempenho;

import br.com.sorria.crm.user.UsuarioRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Service;

import java.util.Comparator;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

// Agregacao SQL (GROUP BY) em vez de carregar Contato/Mensagem inteiros pra
// memoria - mesmo raciocinio anti-OOM do PainelCardService (ver comentario
// la), essencial numa base de milhares de leads/mensagens no Render free tier.
@Service
@RequiredArgsConstructor
public class DesempenhoEquipeService {

    private final UsuarioRepository usuarioRepository;
    private final JdbcTemplate jdbcTemplate;

    public List<DesempenhoColaboradorDTO> listar() {
        Map<Long, Long> atendimentos = mapaContagem(
                "SELECT responsavel_id, COUNT(*) FROM contatos WHERE responsavel_id IS NOT NULL GROUP BY responsavel_id");
        Map<Long, Long> convertidos = mapaContagem(
                "SELECT c.responsavel_id, COUNT(*) FROM contatos c "
                        + "JOIN etapas_kanban e ON e.nome = c.estagio "
                        + "WHERE c.responsavel_id IS NOT NULL AND e.etapa_final = true "
                        + "GROUP BY c.responsavel_id");
        Map<Long, Long> vencidos = mapaContagem(
                "SELECT responsavel_id, COUNT(*) FROM contatos "
                        + "WHERE responsavel_id IS NOT NULL AND proxima_acao_em < now() "
                        + "GROUP BY responsavel_id");
        Map<Long, Long> respondidas = mapaContagem(
                "SELECT enviado_por_usuario_id, COUNT(*) FROM mensagens "
                        + "WHERE enviado_por_usuario_id IS NOT NULL AND direcao = 'SAIDA' "
                        + "GROUP BY enviado_por_usuario_id");

        return usuarioRepository.findAll().stream()
                .map(u -> new DesempenhoColaboradorDTO(
                        u.getId(), u.getNome(), u.getCorPerfil(), u.getAvatarUrl(),
                        atendimentos.getOrDefault(u.getId(), 0L),
                        convertidos.getOrDefault(u.getId(), 0L),
                        respondidas.getOrDefault(u.getId(), 0L),
                        vencidos.getOrDefault(u.getId(), 0L)
                ))
                .sorted(Comparator.comparingLong(DesempenhoColaboradorDTO::convertidos).reversed()
                        .thenComparing(Comparator.comparingLong(DesempenhoColaboradorDTO::respondidas).reversed()))
                .toList();
    }

    private Map<Long, Long> mapaContagem(String sql) {
        List<Object[]> linhas = jdbcTemplate.query(sql, (rs, i) -> new Object[]{rs.getLong(1), rs.getLong(2)});
        Map<Long, Long> mapa = new HashMap<>();
        for (Object[] linha : linhas) mapa.put((Long) linha[0], (Long) linha[1]);
        return mapa;
    }
}
