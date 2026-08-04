// Guia de segmentacao por texto livre - SEM IA, so regras/regex/dicionario de
// sinonimos, rodando 100% no navegador. Le uma frase em portugues (ex.: "quero
// falar com quem tem entre 2 a 3 parcelas vencidas e valor de debito acima de
// R$400,00") e devolve os "groups" no MESMO formato que o construtor manual de
// Segmentacoes usa (ver evalCond/matchSeg em utils/patients.js) - quem chama
// so aplica o resultado no state do builder, nunca cria a segmentacao direto,
// entao qualquer erro de interpretacao fica visivel e editavel antes de salvar.

const removerAcento = (s) => (s || "").normalize("NFD").replace(/\p{Diacritic}/gu, "");
const norm = (s) => removerAcento(s || "").toLowerCase().trim();

// Reduz variacoes da mesma ideia pra uma raiz comum, pra bater tanto com o
// jeito que o usuario escreve na frase quanto com o nome que ele deu ao campo
// customizado (ex.: campo "Parcelas Atrasadas" bate com "parcelas vencidas").
const RAIZ = {
  vencida: "atrasado", vencidas: "atrasado", vencido: "atrasado", vencidos: "atrasado",
  atrasada: "atrasado", atrasadas: "atrasado", atrasados: "atrasado", atraso: "atrasado", atrasado: "atrasado",
  debito: "debito", debitos: "debito", devedor: "debito", divida: "debito", dividas: "debito", aberto: "debito",
  boleto: "parcela", boletos: "parcela", parcela: "parcela", parcelas: "parcela",
};

const STOPWORDS = new Set([
  "de", "da", "do", "das", "dos", "em", "para", "com", "o", "a", "os", "as",
  "um", "uma", "uns", "umas", "que", "tem", "tenha", "possui", "ha", "e", "ou",
  "quero", "falar", "publico", "com o", "no", "na",
]);

function tokenizar(texto) {
  return norm(texto)
    .split(/[^a-z0-9]+/)
    .filter(Boolean)
    .filter((t) => !STOPWORDS.has(t))
    .map((t) => RAIZ[t] || t);
}

// Campos fixos (financ/diasInadimplente/recencia/elegivel) nao tem o nome
// escrito igual ao rotulo, entao usam palavras-gatilho especificas em vez do
// casamento por rotulo usado nos campos customizados (ver candidatosCustom).
function candidatosFixos(tokens) {
  const tem = (...ws) => ws.some((w) => tokens.includes(w));
  const out = [];
  if (tem("financeiro") || tem("adimplente") || (tem("inadimplente") && !tem("dias") && !tem("ha"))) out.push({ field: "financ", score: 1 });
  if (tem("dias") && (tem("atrasado") || tem("inadimplente"))) out.push({ field: "diasInadimplente", score: 1 });
  if ((tem("tempo") || tem("dias")) && (tem("atendimento") || tem("atende") || tem("vem") || tem("visita"))) out.push({ field: "recencia", score: 1 });
  if (tem("elegivel") || tem("elegibilidade")) out.push({ field: "elegivel", score: 1 });
  return out;
}

// Campos customizados sao criados pelo proprio usuario (Config > Campos do
// Lead) - o nome deles E' o rotulo, entao aqui casamos por sobreposicao de
// palavras entre o rotulo do campo e a frase (depois de aplicar RAIZ nos dois
// lados). >=50% das palavras do rotulo presentes na frase = candidato valido.
function candidatosCustom(tokens, fieldMeta) {
  const out = [];
  for (const [key, meta] of Object.entries(fieldMeta)) {
    if (!key.startsWith("custom:")) continue;
    const labelTokens = tokenizar(meta.label);
    if (!labelTokens.length) continue;
    const bateu = labelTokens.filter((t) => tokens.includes(t));
    const score = bateu.length / labelTokens.length;
    if (score >= 0.5 && bateu.length >= 1) out.push({ field: key, score });
  }
  return out;
}

function normalizarNumero(bruto) {
  const limpo = bruto.replace(/r\$\s*/i, "").trim();
  if (/\d,\d{1,2}$/.test(limpo)) return parseFloat(limpo.replace(/\./g, "").replace(",", "."));
  return parseFloat(limpo.replace(",", "."));
}

const NUM = "(?:r\\$\\s*)?\\d+(?:[.,]\\d+)*";

// So existe "maior"/"menor" no motor de condicoes (sem "entre" nativo) - uma
// faixa "entre 2 a 3" vira DUAS condicoes (maior 1 E menor 4) que juntas
// capturam exatamente {2,3}; pra decimais (dinheiro) a margem e' de 1 centavo
// em vez de 1 unidade, pra nao excluir os proprios limites informados.
function condicoesNumericas(clauseNorm, field) {
  let m;
  if ((m = clauseNorm.match(new RegExp(`entre\\s+(${NUM})\\s*(?:a|e|ate|-)\\s*(${NUM})`, "i")))) {
    const lo = normalizarNumero(m[1]), hi = normalizarNumero(m[2]);
    const inteiro = Number.isInteger(lo) && Number.isInteger(hi);
    const eps = inteiro ? 1 : 0.01;
    return [{ field, op: "maior", value: String(lo - eps) }, { field, op: "menor", value: String(hi + eps) }];
  }
  if ((m = clauseNorm.match(new RegExp(`(?:acima de|maior que|maior de|mais de|superior a)\\s+(${NUM})`, "i")))) {
    return [{ field, op: "maior", value: String(normalizarNumero(m[1])) }];
  }
  if ((m = clauseNorm.match(new RegExp(`(?:abaixo de|menor que|menor de|menos de|inferior a)\\s+(${NUM})`, "i")))) {
    return [{ field, op: "menor", value: String(normalizarNumero(m[1])) }];
  }
  return null;
}

function condicaoLista(clauseOriginal, clauseNorm, field, meta) {
  const negado = /\bnao\b/.test(clauseNorm);
  // \b evita "adimplente" casar dentro de "inadimplente" (substring valida
  // mas palavra errada) - com limite de palavra so bate a palavra inteira.
  for (const v of meta.values || []) {
    if (new RegExp(`\\b${norm(v)}\\b`).test(clauseNorm)) return [{ field, op: negado ? "não é" : "é", value: v }];
  }
  return null;
}

// Retorna { groups, naoEntendido }. "groups" ja sai no formato pronto pra
// entrar no builder (mesma estrutura de Segmentacao.groups); "naoEntendido"
// lista os trechos que nao bateram com nenhum campo/valor conhecido - quem
// usa deve SEMPRE mostrar essa lista, nunca aplicar o resultado calado.
export function interpretarTexto(texto, fieldMeta, tags = []) {
  if (!texto || !texto.trim()) return { groups: [], naoEntendido: [] };

  // Protege o "e" de dentro de "entre X e Y" antes de usar "e" pra separar
  // condicoes (E-logico) - senao a faixa quebra em duas clausulas erradas.
  const protegido = texto.replace(
    /(entre\s+(?:r\$\s*)?[\d.,]+\s*)e(\s*(?:r\$\s*)?[\d.,]+)/gi,
    "$1@ATE@$2"
  );

  const gruposTexto = protegido.split(/\s+ou\s+/i);
  const groups = [];
  const naoEntendido = [];

  gruposTexto.forEach((trechoGrupo) => {
    const clausulas = trechoGrupo.split(/\s+e\s+/i).map((t) => t.replace(/@ATE@/gi, "e"));
    const condicoesGrupo = [];

    clausulas.forEach((clauseOriginal) => {
      const clause = clauseOriginal.trim();
      if (!clause) return;
      const clauseNorm = norm(clause);
      const tokens = tokenizar(clause);

      const tagBatida = tags.find((t) => clauseNorm.includes(norm(t)));
      const candidatos = [...candidatosFixos(tokens), ...candidatosCustom(tokens, fieldMeta)];

      if (!candidatos.length) {
        if (tagBatida) { condicoesGrupo.push({ field: "tag", op: "contém", value: tagBatida }); return; }
        naoEntendido.push(clause);
        return;
      }

      const melhor = candidatos.reduce((a, b) => (b.score > a.score ? b : a));
      const meta = fieldMeta[melhor.field];
      const condicoes = meta.value === "number"
        ? condicoesNumericas(clauseNorm, melhor.field)
        : meta.values
          ? condicaoLista(clause, clauseNorm, melhor.field, meta)
          : null;

      if (!condicoes) { naoEntendido.push(clause); return; }
      condicoesGrupo.push(...condicoes);
    });

    if (condicoesGrupo.length) groups.push(condicoesGrupo);
  });

  return { groups, naoEntendido };
}
