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

    // Teto de valores distintos por card - sem isso, um campo continuo (ex.:
    // Valor do Orcamento, um preco por lead, quase todo valor e' unico) gera
    // 1 "big number" por valor distinto na fileira do topo do Painel e
    // estoura o layout (achado real: card "teste" com 40+ valores diferentes
    // vazou a tela pra direita, 06/08/2026). Os valores que sobram do teto
    // entram somados num balde "Outros" em vez de simplesmente desaparecer -
    // a soma dos baldes continua batendo com o total de leads do campo.
    private static final int MAX_VALORES_POR_CARD = 12;
    private static final String OUTROS = "Outros";

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
        String tipo = c.getTipoVisualizacao() != null ? c.getTipoVisualizacao() : "lista";
        if ("soma".equals(tipo)) {
            Double soma = somarValor(c.getCampoNome());
            return new PainelCardDTO(c.getId(), c.getCampoNome(), c.getRotulo(), tipo, c.getOrdem(), List.of(), soma);
        }
        List<ValorContagemDTO> valores = contarPorValor(c.getCampoNome());
        return new PainelCardDTO(c.getId(), c.getCampoNome(), c.getRotulo(), tipo, c.getOrdem(), valores, null);
    }

    // Soma numerica de um campo personalizado (ex.: "Valor em Atraso (R$)")
    // por todos os leads - modo "soma" do card, pensado pra virar 1 big number
    // no topo do Painel em vez de quebra por valor distinto. So funciona pra
    // campo personalizado (nao tem "fixo:" numerico hoje no cadastro nativo).
    // O REPLACE cobre valor gravado com virgula decimal (raro, mas o tipo
    // MOEDA nao trava formato na entrada) - sem isso um valor assim quebraria
    // o CAST inteiro em vez de so' ser ignorado.
    private Double somarValor(String campoNome) {
        if (campoNome.startsWith("fixo:")) return 0.0;
        String sql = "SELECT COALESCE(SUM("
                + "CASE WHEN TRIM(ccc.valor) ~ '^-?[0-9]+([.,][0-9]+)?$' "
                + "THEN CAST(REPLACE(TRIM(ccc.valor), ',', '.') AS NUMERIC) ELSE 0 END"
                + "), 0) AS soma "
                + "FROM contato_campos_customizados ccc WHERE ccc.campo_nome = ?";
        Double resultado = jdbcTemplate.queryForObject(sql, Double.class, campoNome);
        return resultado != null ? resultado : 0.0;
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
        List<ValorContagemDTO> todos = jdbcTemplate.query(sql, params, (rs, rowNum) -> new ValorContagemDTO(rs.getString("v"), rs.getLong("contagem")))
                .stream()
                .filter(v -> !VAZIO.equals(v.valor()))
                .sorted(Comparator.comparing(ValorContagemDTO::contagem).reversed())
                .toList();
        return limitarComOutros(todos);
    }

    private List<ValorContagemDTO> limitarComOutros(List<ValorContagemDTO> todos) {
        if (todos.size() <= MAX_VALORES_POR_CARD) return todos;
        List<ValorContagemDTO> top = new java.util.ArrayList<>(todos.subList(0, MAX_VALORES_POR_CARD - 1));
        long somaResto = todos.subList(MAX_VALORES_POR_CARD - 1, todos.size()).stream().mapToLong(ValorContagemDTO::contagem).sum();
        top.add(new ValorContagemDTO(OUTROS, somaResto));
        return top;
    }
}
