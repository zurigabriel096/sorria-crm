package br.com.sorria.crm.contact;

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
        Map<String, String> campos = contato.getCamposCustomizados();
        if (campos == null) return null;
        for (Map.Entry<String, String> e : campos.entrySet()) {
            if (e.getKey().equalsIgnoreCase(token)) return e.getValue();
        }
        return null;
    }

    private static String primeiroNome(String nomeCompleto) {
        if (nomeCompleto == null || nomeCompleto.isBlank()) return "";
        return nomeCompleto.trim().split("\\s+")[0];
    }
}
