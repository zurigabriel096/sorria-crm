package br.com.sorria.crm.dashboard;

import br.com.sorria.crm.dashboard.dto.PainelCardDTO;
import br.com.sorria.crm.dashboard.dto.PainelCardDTO.ValorContagemDTO;
import lombok.RequiredArgsConstructor;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Service;

import java.util.Comparator;
import java.util.List;
import java.util.Map;
import java.util.NoSuchElementException;

// A quebra automatica (quantos Contato tem cada valor distinto de um campo)
// virou agregacao SQL (COUNT/GROUP BY) em vez de puxar TODOS os Contato pra
// memoria e contar em Java (Collectors.groupingBy). Antes, cada carga do
// Painel pagava o custo de trazer a base inteira (com as colecoes EAGER de
// tags/camposCustomizados) - numa base de milhares de leads, isso contribuiu
// pra um OutOfMemoryError/OOM-kill real no Render free tier (512MB). Agrupar
// no banco e' ordens de magnitude mais leve, tanto em memoria quanto em tempo.
@Service
@RequiredArgsConstructor
public class PainelCardService {

    private static final String VAZIO = "(vazio)";

    // Mapa campoNome (prefixo "fixo:") -> coluna real de "contatos". So os
    // valores deste Map (nunca campoNome em si) entram na string do SQL -
    // campoNome so e' usado como CHAVE de lookup aqui, nunca concatenado
    // direto, entao nao ha risco de injecao mesmo sendo um dado gravado pelo
    // usuario (PainelCard.campoNome).
    private static final Map<String, String> COLUNA_FIXA = Map.of(
            "fixo:financ", "financ",
            "fixo:estagio", "estagio",
            "fixo:dentista", "dentista"
    );

    private final PainelCardRepository repository;
    private final JdbcTemplate jdbcTemplate;

    public List<PainelCardDTO> listar() {
        return repository.findAllByOrderByOrdemAsc().stream().map(this::toDTO).toList();
    }

    public PainelCardDTO criar(PainelCardDTO dto) {
        PainelCard card = new PainelCard();
        aplicar(dto, card);
        int proximaOrdem = repository.findAll().stream().mapToInt(PainelCard::getOrdem).max().orElse(-1) + 1;
        card.setOrdem(proximaOrdem);
        return toDTO(repository.save(card));
    }

    public PainelCardDTO atualizar(Long id, PainelCardDTO dto) {
        PainelCard card = buscar(id);
        aplicar(dto, card);
        return toDTO(repository.save(card));
    }

    public void remover(Long id) {
        if (!repository.existsById(id)) {
            throw new NoSuchElementException("Card do painel nao encontrado: " + id);
        }
        repository.deleteById(id);
    }

    private PainelCard buscar(Long id) {
        return repository.findById(id)
                .orElseThrow(() -> new NoSuchElementException("Card do painel nao encontrado: " + id));
    }

    private void aplicar(PainelCardDTO dto, PainelCard card) {
        card.setCampoNome(dto.campoNome());
        card.setRotulo(dto.rotulo());
        card.setTipoVisualizacao(dto.tipoVisualizacao());
    }

    private PainelCardDTO toDTO(PainelCard c) {
        List<ValorContagemDTO> valores = contarPorValor(c.getCampoNome());
        String tipo = c.getTipoVisualizacao() != null ? c.getTipoVisualizacao() : "lista";
        return new PainelCardDTO(c.getId(), c.getCampoNome(), c.getRotulo(), tipo, c.getOrdem(), valores);
    }

    // Balde "(vazio)" fica de fora do resultado de proposito (pedido do
    // usuario) - poluia o card com um valor sem sentido de negocio.
    private List<ValorContagemDTO> contarPorValor(String campoNome) {
        String sql;
        Object[] params;
        if ("fixo:elegivel".equals(campoNome)) {
            sql = "SELECT CASE WHEN elegivel THEN 'Sim' ELSE 'Não' END AS v, COUNT(*) AS contagem FROM contatos GROUP BY v";
            params = new Object[0];
        } else if (campoNome.startsWith("fixo:")) {
            String coluna = COLUNA_FIXA.get(campoNome);
            if (coluna == null) return List.of();
            sql = "SELECT COALESCE(NULLIF(TRIM(" + coluna + "), ''), '" + VAZIO + "') AS v, COUNT(*) AS contagem "
                    + "FROM contatos GROUP BY v";
            params = new Object[0];
        } else {
            // LEFT JOIN de proposito: um contato sem NENHUMA linha pra esse
            // campo_nome (nunca preencheu) tem que contar como "(vazio)"
            // tambem, senao a soma dos grupos nunca bateria com o total de
            // leads (mesmo raciocinio que ja existia na versao em Java).
            sql = "SELECT COALESCE(NULLIF(TRIM(ccc.valor), ''), '" + VAZIO + "') AS v, COUNT(*) AS contagem "
                    + "FROM contatos c LEFT JOIN contato_campos_customizados ccc "
                    + "ON ccc.contato_id = c.id AND ccc.campo_nome = ? "
                    + "GROUP BY v";
            params = new Object[]{campoNome};
        }
        return jdbcTemplate.query(sql, params, (rs, rowNum) -> new ValorContagemDTO(rs.getString("v"), rs.getLong("contagem")))
                .stream()
                .filter(v -> !VAZIO.equals(v.valor()))
                .sorted(Comparator.comparing(ValorContagemDTO::contagem).reversed())
                .toList();
    }
}
