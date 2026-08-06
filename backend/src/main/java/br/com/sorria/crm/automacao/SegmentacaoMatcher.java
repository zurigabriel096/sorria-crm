package br.com.sorria.crm.automacao;

import br.com.sorria.crm.contact.Contato;
import br.com.sorria.crm.segment.Segmentacao;
import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Component;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.temporal.ChronoUnit;
import java.util.List;
import java.util.Map;

// Porta pro backend o mesmo algoritmo de frontend/src/utils/patients.js
// (matchSeg/evalCond/evalCondCustomizado) - a avaliacao de segmentacao so
// existia em JS ate agora, mas o motor de automacao roda no servidor (@Scheduled),
// entao precisa decidir sozinho quem entra em cada fluxo. Mantido com a MESMA
// semantica de campos/operadores do frontend de proposito, pra nao divergir do
// que o usuario configura/testa na tela de Segmentacoes.
@Component
@RequiredArgsConstructor
@Slf4j
public class SegmentacaoMatcher {

    private final ObjectMapper objectMapper;

    // groups: grupos de condicoes combinadas por E; os grupos entre si sao
    // combinados por OU. Ex.: [[A,B],[C]] = (A E B) OU (C).
    public boolean bate(Contato contato, Segmentacao segmentacao) {
        List<List<Map<String, Object>>> grupos;
        try {
            grupos = objectMapper.readValue(segmentacao.getGroupsJson(), new TypeReference<List<List<Map<String, Object>>>>() {});
        } catch (JsonProcessingException e) {
            log.warn("groupsJson invalido na segmentacao {}: {}", segmentacao.getId(), e.getMessage());
            return false;
        }
        return grupos.stream().anyMatch(grupo -> !grupo.isEmpty() && grupo.stream().allMatch(c -> avaliarCondicao(contato, c)));
    }

    private boolean avaliarCondicao(Contato contato, Map<String, Object> condicao) {
        Object fieldBruto = condicao.get("field");
        if (fieldBruto == null) return false;
        String field = String.valueOf(fieldBruto);
        String op = String.valueOf(condicao.get("op"));
        Object value = condicao.get("value");

        if (field.startsWith("custom:")) return avaliarCondicaoCustomizada(contato, field, op, value, condicao.get("value2"));

        return switch (field) {
            case "financ" -> {
                if ("está preenchido".equals(op)) yield !vazio(contato.getFinanc()) && !"—".equals(contato.getFinanc());
                if ("não está preenchido".equals(op)) yield vazio(contato.getFinanc()) || "—".equals(contato.getFinanc());
                yield "é".equals(op) ? igual(contato.getFinanc(), value) : !igual(contato.getFinanc(), value);
            }
            case "diasInadimplente" -> {
                if ("está preenchido".equals(op)) yield contato.getInadimplenteDesde() != null;
                if ("não está preenchido".equals(op)) yield contato.getInadimplenteDesde() == null;
                if (contato.getInadimplenteDesde() == null) yield false;
                long dias = ChronoUnit.DAYS.between(contato.getInadimplenteDesde(), LocalDate.now());
                if ("entre".equals(op)) yield entreNumero(dias, value, condicao.get("value2"));
                double comparado = paraNumero(value);
                yield "maior".equals(op) ? dias > comparado : dias < comparado;
            }
            // Data BRUTA de quando ficou inadimplente (distinto de "diasInadimplente"
            // acima, que e' a contagem derivada) - pedido do Samuel (05/08/2026):
            // expor TODO campo nativo do cadastro em Segmentacoes, nao so os
            // Campos Personalizados.
            case "inadimplenteDesde" -> avaliarData(contato.getInadimplenteDesde(), op, value, condicao.get("value2"));
            case "recencia" -> {
                if ("está preenchido".equals(op)) yield contato.getRecencia() != null;
                if ("não está preenchido".equals(op)) yield contato.getRecencia() == null;
                int recencia = contato.getRecencia() != null ? contato.getRecencia() : 0;
                if ("entre".equals(op)) yield entreNumero(recencia, value, condicao.get("value2"));
                double comparado = paraNumero(value);
                yield "maior".equals(op) ? recencia > comparado : recencia < comparado;
            }
            case "elegivel" -> {
                boolean esperado = "Sim".equals(value);
                yield "é".equals(op) ? contato.isElegivel() == esperado : contato.isElegivel() != esperado;
            }
            case "tag" -> {
                boolean contem = contato.getTags() != null && contato.getTags().contains(String.valueOf(value));
                yield "contém".equals(op) ? contem : !contem;
            }
            case "nome" -> avaliarTexto(contato.getNome(), op, value);
            case "telefone" -> avaliarTexto(contato.getTelefone(), op, value);
            case "email" -> avaliarTexto(contato.getEmail(), op, value);
            case "cod" -> avaliarTexto(contato.getCod(), op, value);
            case "dentista" -> avaliarTexto(contato.getDentista(), op, value);
            case "origem" -> avaliarTexto(contato.getOrigem(), op, value);
            case "ultimaMensagemTexto" -> avaliarTexto(contato.getUltimaMensagemTexto(), op, value);
            // Nomes de estagio sao livres (colunas do Kanban) - "e"/"nao e" bate
            // exato, contem/nao contem tolera digitacao diferente.
            case "estagio" -> {
                if ("está preenchido".equals(op)) yield !vazio(contato.getEstagio());
                if ("não está preenchido".equals(op)) yield vazio(contato.getEstagio());
                if ("é".equals(op)) yield igual(contato.getEstagio(), value);
                if ("não é".equals(op)) yield !igual(contato.getEstagio(), value);
                yield avaliarTexto(contato.getEstagio(), op, value);
            }
            case "ultimaMensagemDirecao" -> {
                if ("está preenchido".equals(op)) yield !vazio(contato.getUltimaMensagemDirecao());
                if ("não está preenchido".equals(op)) yield vazio(contato.getUltimaMensagemDirecao());
                yield "é".equals(op) ? igual(contato.getUltimaMensagemDirecao(), value) : !igual(contato.getUltimaMensagemDirecao(), value);
            }
            case "ultimaMensagemEm" -> avaliarDataHora(contato.getUltimaMensagemEm(), op, value, condicao.get("value2"));
            case "proximaAcaoEm" -> avaliarDataHora(contato.getProximaAcaoEm(), op, value, condicao.get("value2"));
            case "criadoEm" -> avaliarDataHora(contato.getCriadoEm(), op, value, condicao.get("value2"));
            // Lista fixa de ids (ex.: "Selecionar numero pra disparo" em
            // Segmentacoes) - value e' uma lista de ids, nao um valor unico.
            case "id" -> value instanceof List<?> ids && ids.stream().anyMatch(v -> paraNumero(v) == contato.getId());
            default -> false;
        };
    }

    // A chave de campo customizado carrega o tipo embutido: "custom:TIPO:nome"
    // (ver frontend/src/data/seed.js montarFieldMeta) - o nome do campo pode
    // conter ":", por isso o split com limite 3 (o resto sobra inteiro na
    // 3a posicao, igual ao `resto.join(":")` do lado JS).
    private boolean avaliarCondicaoCustomizada(Contato contato, String field, String op, Object value, Object value2) {
        String[] partes = field.split(":", 3);
        if (partes.length < 3) return false;
        String tipo = partes[1];
        String nome = partes[2];
        String valor = contato.getCamposCustomizados() != null ? contato.getCamposCustomizados().get(nome) : null;

        if ("está preenchido".equals(op)) return !vazio(valor);
        if ("não está preenchido".equals(op)) return vazio(valor);

        return switch (tipo) {
            case "NUMERO", "MOEDA" -> {
                double atual = paraNumero(valor);
                if ("entre".equals(op)) yield entreNumero(atual, value, value2);
                double comparado = paraNumero(value);
                yield "maior".equals(op) ? atual > comparado : atual < comparado;
            }
            case "DATA" -> {
                LocalDate atual = paraData(valor);
                if (atual == null) yield false;
                // "faltam": dinamico (compara com HOJE+N dias, nao com uma data fixa) -
                // base do gatilho "consulta em N dia(s)" (ver AutomacaoEngineService e o
                // fluxo-modelo de confirmacao). Espelha exatamente evalCondCustomizado em
                // frontend/src/utils/patients.js.
                if ("faltam".equals(op)) {
                    long diasRestantes = ChronoUnit.DAYS.between(LocalDate.now(), atual);
                    yield diasRestantes == (long) paraNumero(value);
                }
                if ("entre".equals(op)) {
                    LocalDate a = paraData(textoOuNull(value)), b = paraData(textoOuNull(value2));
                    if (a == null || b == null) yield false;
                    LocalDate ini = a.isBefore(b) ? a : b, fim = a.isBefore(b) ? b : a;
                    yield !atual.isBefore(ini) && !atual.isAfter(fim);
                }
                LocalDate comparado = paraData(textoOuNull(value));
                if (comparado == null) yield false;
                yield "maior".equals(op) ? atual.isAfter(comparado) : atual.isBefore(comparado);
            }
            case "LISTA" -> "é".equals(op) ? igual(valor, value) : !igual(valor, value);
            default -> {
                boolean contem = valor != null && valor.toLowerCase().contains(String.valueOf(value).toLowerCase());
                yield "contém".equals(op) ? contem : !contem;
            }
        };
    }

    // Campo TEXTO nativo (nome/telefone/email/etc.) - mesma semantica de
    // tag/custom TEXTO (contem/nao contem cobrem vazio, preenchido fica
    // disponivel mesmo assim pra quem preferir ser explicito).
    private boolean avaliarTexto(String valor, String op, Object value) {
        if ("está preenchido".equals(op)) return !vazio(valor);
        if ("não está preenchido".equals(op)) return vazio(valor);
        boolean contem = valor != null && valor.toLowerCase().contains(String.valueOf(value).toLowerCase());
        return "contém".equals(op) ? contem : !contem;
    }

    // Campo DATA/DATA-HORA nativo (ultimaMensagemEm/proximaAcaoEm/criadoEm/
    // inadimplenteDesde) - "entre" e "faltam" com a mesma semantica do campo
    // customizado DATA (avaliarCondicaoCustomizada), so lendo direto do campo
    // tipado do Contato em vez de camposCustomizados.
    private boolean avaliarDataHora(LocalDateTime valor, String op, Object value, Object value2) {
        if ("está preenchido".equals(op)) return valor != null;
        if ("não está preenchido".equals(op)) return valor == null;
        if (valor == null) return false;
        LocalDate atual = valor.toLocalDate();
        if ("faltam".equals(op)) {
            long diasRestantes = ChronoUnit.DAYS.between(LocalDate.now(), atual);
            return diasRestantes == (long) paraNumero(value);
        }
        LocalDate comparado = paraData(textoOuNull(value));
        if (comparado == null) return false;
        if ("entre".equals(op)) {
            LocalDate comparado2 = paraData(textoOuNull(value2));
            if (comparado2 == null) return false;
            LocalDate ini = comparado.isBefore(comparado2) ? comparado : comparado2;
            LocalDate fim = comparado.isBefore(comparado2) ? comparado2 : comparado;
            return !atual.isBefore(ini) && !atual.isAfter(fim);
        }
        return "maior".equals(op) ? atual.isAfter(comparado) : atual.isBefore(comparado);
    }

    private boolean avaliarData(LocalDate valor, String op, Object value, Object value2) {
        return avaliarDataHora(valor != null ? valor.atStartOfDay() : null, op, value, value2);
    }

    private static boolean entreNumero(double atual, Object value, Object value2) {
        double a = paraNumero(value), b = paraNumero(value2);
        return atual >= Math.min(a, b) && atual <= Math.max(a, b);
    }

    private static String textoOuNull(Object valor) {
        return valor != null ? String.valueOf(valor) : null;
    }

    private static boolean igual(String atual, Object esperado) {
        return atual != null ? atual.equals(esperado) : esperado == null;
    }

    // Mesma semantica do "vazio" em frontend/src/utils/patients.js - usado
    // pelos ops "esta preenchido"/"nao esta preenchido".
    private static boolean vazio(String valor) {
        return valor == null || valor.isBlank();
    }

    private static double paraNumero(Object valor) {
        if (valor == null) return 0;
        if (valor instanceof Number n) return n.doubleValue();
        try {
            return Double.parseDouble(String.valueOf(valor).replace(",", "."));
        } catch (NumberFormatException e) {
            return 0;
        }
    }

    private static LocalDate paraData(String valor) {
        if (valor == null || valor.isBlank()) return null;
        try {
            return LocalDate.parse(valor.length() > 10 ? valor.substring(0, 10) : valor);
        } catch (Exception e) {
            return null;
        }
    }
}
