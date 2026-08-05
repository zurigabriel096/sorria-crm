package br.com.sorria.crm.contact;

import java.time.LocalDate;
import java.time.format.DateTimeParseException;
import java.time.temporal.ChronoUnit;
import java.util.Map;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

// Substitui "{variavel}" no corpo de mensagem/template pelo dado real do
// contato - antes so existia "{nome}" (hardcoded em CampanhaService/
// AutomacaoEngineService); agora qualquer nome de Campo Personalizado
// tambem funciona como variavel (ex.: "{Atrasadas}"), sem precisar de codigo
// novo a cada campo criado. Token que nao bate com "nome" nem com nenhum
// Campo Personalizado fica literal (nunca vira vazio) - evita apagar texto
// por um typo ou um "{" que nao era pra ser variavel.
//
// "{diasPara:NomeDoCampo}" e' um segundo tipo de token, calculado (nao um
// valor bruto do cadastro): quantos dias faltam de HOJE ate a data guardada
// num Campo Personalizado tipo DATA (ex.: "{diasPara:Data da consulta}" vira
// "1" no dia anterior a consulta) - mesma conta de dias de
// SegmentacaoMatcher (op "faltam"), so que pro TEXTO da mensagem em vez da
// condicao de entrada do fluxo.
public final class SubstituicaoVariaveis {

    private static final Pattern TOKEN = Pattern.compile("\\{([^{}]+)\\}");

    private SubstituicaoVariaveis() {
    }

    public static String aplicar(String corpo, Contato contato) {
        if (corpo == null) return "";
        Matcher m = TOKEN.matcher(corpo);
        StringBuilder resultado = new StringBuilder();
        while (m.find()) {
            String token = m.group(1).trim();
            String valor = resolver(token, contato);
            m.appendReplacement(resultado, Matcher.quoteReplacement(valor != null ? valor : m.group()));
        }
        m.appendTail(resultado);
        return resultado.toString();
    }

    private static String resolver(String token, Contato contato) {
        if ("nome".equalsIgnoreCase(token)) return primeiroNome(contato.getNome());
        if (token.regionMatches(true, 0, "diasPara:", 0, 9)) {
            return resolverDiasPara(token.substring(9).trim(), contato);
        }
        Map<String, String> campos = contato.getCamposCustomizados();
        if (campos == null) return null;
        for (Map.Entry<String, String> e : campos.entrySet()) {
            if (e.getKey().equalsIgnoreCase(token)) return e.getValue();
        }
        return null;
    }

    // null (token fica literal) quando o campo nao existe, esta vazio ou nao e'
    // uma data valida - nunca manda "0" ou um numero errado por engano pro lead.
    private static String resolverDiasPara(String nomeCampo, Contato contato) {
        Map<String, String> campos = contato.getCamposCustomizados();
        if (campos == null) return null;
        String valorData = campos.entrySet().stream()
                .filter(e -> e.getKey().equalsIgnoreCase(nomeCampo))
                .map(Map.Entry::getValue)
                .findFirst().orElse(null);
        if (valorData == null || valorData.isBlank()) return null;
        try {
            LocalDate data = LocalDate.parse(valorData.length() > 10 ? valorData.substring(0, 10) : valorData);
            return String.valueOf(ChronoUnit.DAYS.between(LocalDate.now(), data));
        } catch (DateTimeParseException e) {
            return null;
        }
    }

    private static String primeiroNome(String nomeCompleto) {
        if (nomeCompleto == null || nomeCompleto.isBlank()) return "";
        return nomeCompleto.trim().split("\\s+")[0];
    }
}
