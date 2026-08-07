import * as XLSX from "xlsx";
import { HOJE } from "../theme";

// Condicoes de campo customizado carregam o tipo na propria chave
// ("custom:TIPO:nome" - ver data/seed.js montarFieldMeta), entao dao pra
// avaliar aqui sem precisar consultar a lista de CampoCustomizado de novo.
// "" (string vazia), null e undefined contam como "nao preenchido" - usado
// pelos ops "esta preenchido"/"nao esta preenchido" (ver OPS_SEM_VALOR em
// data/seed.js), que nao se aplicam a campo de texto (tag/custom TEXTO ja
// resolvem isso via contem/nao contem).
const vazio = (valor) => valor === undefined || valor === null || String(valor).trim() === "";

// Compara "atual" com o intervalo [c.value, c.value2] (operador "entre",
// 05/08/2026) - aceita os dois valores em qualquer ordem (nao exige que o
// usuario digite o menor primeiro).
const entreNumero = (atual, c) => atual >= Math.min(+c.value, +c.value2) && atual <= Math.max(+c.value, +c.value2);

// Texto livre (nome/telefone/email/etc.) - mesmo padrao de tag/custom TEXTO:
// contém/não contém cobrem o caso vazio, mas "está preenchido"/"não está
// preenchido" tambem ficam disponiveis pra quem quiser ser explicito.
function evalCondTexto(valor, c) {
  if (c.op === "está preenchido") return !vazio(valor);
  if (c.op === "não está preenchido") return vazio(valor);
  const contem = String(valor || "").toLowerCase().includes(String(c.value || "").toLowerCase());
  return c.op === "contém" ? contem : !contem;
}

// Campo de DATA nativo (ultimaMensagemEm/proximaAcaoEm/inadimplenteDesde/
// criadoEm) - mesma semantica de custom DATA (evalCondCustomizado), so que
// lendo direto do campo tipado em vez de camposCustomizados.
function evalCondData(valorBruto, c) {
  if (c.op === "está preenchido") return !vazio(valorBruto);
  if (c.op === "não está preenchido") return vazio(valorBruto);
  if (c.op === "faltam") {
    if (vazio(valorBruto)) return false;
    const hoje = new Date(); hoje.setHours(0, 0, 0, 0);
    const dataCampo = new Date(valorBruto); dataCampo.setHours(0, 0, 0, 0);
    const diasRestantes = Math.round((dataCampo.getTime() - hoje.getTime()) / 864e5);
    return diasRestantes === +c.value;
  }
  if (vazio(valorBruto)) return false;
  const atual = new Date(valorBruto);
  if (c.op === "entre") {
    const a = new Date(c.value), b = new Date(c.value2);
    const [ini, fim] = a <= b ? [a, b] : [b, a];
    return atual >= ini && atual <= fim;
  }
  return c.op === "maior" ? atual > new Date(c.value) : atual < new Date(c.value);
}

function evalCondCustomizado(p, c) {
  const [, tipo, ...resto] = c.field.split(":");
  const nome = resto.join(":");
  const valor = p.camposCustomizados?.[nome];
  if (c.op === "está preenchido") return !vazio(valor);
  if (c.op === "não está preenchido") return vazio(valor);
  if (tipo === "NUMERO" || tipo === "MOEDA") {
    const atual = Number(valor) || 0;
    if (c.op === "entre") return entreNumero(atual, c);
    return c.op === "maior" ? atual > +c.value : atual < +c.value;
  }
  if (tipo === "DATA" && c.op === "faltam") {
    if (vazio(valor)) return false;
    const hoje = new Date(); hoje.setHours(0, 0, 0, 0);
    const dataCampo = new Date(`${valor}T00:00:00`);
    const diasRestantes = Math.round((dataCampo.getTime() - hoje.getTime()) / 864e5);
    return diasRestantes === +c.value;
  }
  if (tipo === "DATA" && c.op === "entre") {
    if (vazio(valor)) return false;
    const atual = new Date(valor);
    const a = new Date(c.value), b = new Date(c.value2);
    const [ini, fim] = a <= b ? [a, b] : [b, a];
    return atual >= ini && atual <= fim;
  }
  if (tipo === "DATA") return c.op === "maior" ? new Date(valor || 0) > new Date(c.value) : new Date(valor || 0) < new Date(c.value);
  if (tipo === "LISTA") return c.op === "é" ? valor === c.value : valor !== c.value;
  const contem = String(valor || "").toLowerCase().includes(String(c.value || "").toLowerCase());
  return c.op === "contém" ? contem : !contem;
}

export function evalCond(p, c) {
  if (c.field.startsWith("custom:")) return evalCondCustomizado(p, c);
  switch (c.field) {
    case "financ":
      if (c.op === "está preenchido") return !vazio(p.financ) && p.financ !== "—";
      if (c.op === "não está preenchido") return vazio(p.financ) || p.financ === "—";
      return c.op === "é" ? p.financ === c.value : p.financ !== c.value;
    case "diasInadimplente": {
      if (c.op === "está preenchido") return !!p.inadimplenteDesde;
      if (c.op === "não está preenchido") return !p.inadimplenteDesde;
      if (!p.inadimplenteDesde) return false;
      const dias = Math.floor((Date.now() - new Date(p.inadimplenteDesde).getTime()) / 864e5);
      if (c.op === "entre") return entreNumero(dias, c);
      return c.op === "maior" ? dias > +c.value : dias < +c.value;
    }
    case "inadimplenteDesde": return evalCondData(p.inadimplenteDesde, c);
    case "recencia": {
      const recencia = p.recencia || 0;
      if (c.op === "está preenchido") return p.recencia != null;
      if (c.op === "não está preenchido") return p.recencia == null;
      if (c.op === "entre") return entreNumero(recencia, c);
      return c.op === "maior" ? recencia > +c.value : recencia < +c.value;
    }
    case "elegivel": { const y = c.value === "Sim"; return c.op === "é" ? p.elegivel === y : p.elegivel !== y; }
    case "tag": return c.op === "contém" ? (p.tags || []).includes(c.value) : !(p.tags || []).includes(c.value);
    case "nome": return evalCondTexto(p.nome, c);
    case "telefone": return evalCondTexto(p.tel, c);
    case "email": return evalCondTexto(p.email, c);
    case "cod": return evalCondTexto(p.cod, c);
    case "dentista": return evalCondTexto(p.dentista, c);
    case "origem": return evalCondTexto(p.origem, c);
    case "ultimaMensagemTexto": return evalCondTexto(p.ultimaMensagemTexto, c);
    // Nomes de estagio sao livres (colunas do Kanban) - aceita "é"/"não é"
    // (bate exato) alem de contém/não contém (tolera digitação diferente).
    case "estagio":
      if (c.op === "está preenchido") return !vazio(p.estagio);
      if (c.op === "não está preenchido") return vazio(p.estagio);
      if (c.op === "é") return p.estagio === c.value;
      if (c.op === "não é") return p.estagio !== c.value;
      return evalCondTexto(p.estagio, c);
    case "ultimaMensagemDirecao":
      if (c.op === "está preenchido") return !vazio(p.ultimaMensagemDirecao);
      if (c.op === "não está preenchido") return vazio(p.ultimaMensagemDirecao);
      return c.op === "é" ? p.ultimaMensagemDirecao === c.value : p.ultimaMensagemDirecao !== c.value;
    case "ultimaMensagemEm": return evalCondData(p.ultimaMensagemEm, c);
    case "proximaAcaoEm": return evalCondData(p.proximaAcaoEm, c);
    case "criadoEm": return evalCondData(p.criadoEm, c);
    // Lista fixa de ids (ex.: "Selecionar numero pra disparo" em Segmentacoes)
    // - value e' um array de ids, nao um valor unico igual as outras condicoes.
    case "id": return (c.value || []).includes(p.id);
    default: return false;
  }
}

// seg.groups: grupos de condições combinadas com E; os grupos entre si são combinados com OU.
// Ex.: groups=[[A,B],[C]] captura quem satisfaz (A E B) OU (C).
export const matchSeg = (p, seg) => {
  const groups = seg.groups || [];
  return groups.some((group) => group.length > 0 && group.every((c) => evalCond(p, c)));
};

export const limparTel = (s) => {
  if (!s) return { tel: "", ok: false };
  let d = String(s).replace(/\D/g, "");
  const m = String(s).match(/\(?(\d{2})\)?\s*(\d{4,5})[-\s]?(\d{4})/);
  if (m) d = `55${m[1]}${m[2]}${m[3]}`;
  const ok = d.length >= 12 && !/^550+/.test(d);
  return { tel: ok ? d : "", ok };
};

export const parseData = (s) => { if (!s) return null; const m = String(s).match(/(\d{2})\/(\d{2})\/(\d{4})/); return m ? new Date(+m[3], +m[2] - 1, +m[1]) : null; };
export const diasDesde = (d) => d ? Math.round((HOJE - d) / 864e5) : null;
export const primeiroNome = (n) => String(n || "").trim().split(/\s+/)[0] || "";

// Campos do Sorr.ia que o operador pode mapear pra uma coluna da planilha,
// na tela de "Importar Lead" (ver ImportMappingModal). "nome" é o único
// obrigatório - o resto pode ser ignorado.
export const CAMPOS_IMPORTACAO = [
  { chave: "nome", rotulo: "Nome do lead", obrigatorio: true },
  { chave: "tel", rotulo: "Telefone" },
  { chave: "email", rotulo: "Email" },
  { chave: "estagio", rotulo: "Estágio" },
  { chave: "financ", rotulo: "Situação financeira" },
  { chave: "dentista", rotulo: "Dentista" },
  { chave: "cod", rotulo: "Cód. de Importação" },
  { chave: "ultAtend", rotulo: "Último atendimento" },
];

const PISTAS_SUGESTAO = {
  nome: ["nome", "lead", "paciente", "cliente"],
  tel: ["telefone", "celular", "whatsapp", "fone"],
  email: ["email", "e-mail"],
  estagio: ["estágio", "estagio", "etapa"],
  financ: ["financ", "situaç", "situac"],
  dentista: ["dentista"],
  cod: ["cód", "codigo", "código"],
  ultAtend: ["atend", "data"],
};

// Só lê o cabeçalho + linhas cruas - não decide nada sozinho. A decisão de
// qual coluna é qual campo fica com o operador, na tela de mapeamento.
export function lerPlanilhaBruta(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const wb = XLSX.read(e.target.result, { type: "array" });
        const ws = wb.Sheets[wb.SheetNames[0]];
        const rows = XLSX.utils.sheet_to_json(ws, { header: 1, raw: false, defval: "" });
        const pareceCabecalho = (c) => {
          const t = String(c).toLowerCase();
          return t.includes("nome") || t.includes("paciente") || t.includes("lead") || t.includes("cliente") || t.includes("telefone");
        };
        let hi = rows.findIndex((r) => r.some(pareceCabecalho));
        if (hi < 0) hi = 0;
        const headers = rows[hi].map((x) => String(x).trim());
        resolve({ headers, rows, hi });
      } catch (err) {
        reject(err);
      }
    };
    reader.onerror = () => reject(new Error("Não consegui ler o arquivo."));
    reader.readAsArrayBuffer(file);
  });
}

// Sugestão automática de qual coluna da planilha bate com cada campo - só um
// ponto de partida pré-selecionado, o operador confirma ou troca livremente.
export function sugerirMapeamento(headers) {
  const mapeamento = {};
  CAMPOS_IMPORTACAO.forEach(({ chave }) => {
    const pistas = PISTAS_SUGESTAO[chave] || [];
    const idx = headers.findIndex((h) => pistas.some((p) => h.toLowerCase().includes(p)));
    mapeamento[chave] = idx >= 0 ? idx : null;
  });
  return mapeamento;
}

// Constrói a lista de pacientes a partir do mapeamento confirmado pelo
// operador - cada campo aponta pro índice da coluna na planilha, ou null
// (ignorado). novosCampos: colunas mapeadas pro operador pra virar Campo
// Personalizado na hora (ver ImportMappingModal) - [{ colIdx, nome }].
export function montarPacientes(rows, hi, mapeamento, novosCampos = []) {
  const pega = (r, chave) => {
    const idx = mapeamento[chave];
    return idx != null ? String(r[idx] ?? "").trim() : "";
  };

  const pacientes = [];
  rows.slice(hi + 1).forEach((r) => {
    const nome = pega(r, "nome");
    if (!nome || nome.length < 2) return;

    const { tel, ok } = limparTel(pega(r, "tel"));
    const financRaw = pega(r, "financ").toUpperCase();
    const inadimpl = /INADIMPL|PROTESTAR/.test(financRaw);
    const ultAtend = pega(r, "ultAtend");
    const recencia = diasDesde(parseData(ultAtend));

    const camposCustomizados = {};
    novosCampos.forEach(({ colIdx, nome: nomeCampo }) => {
      if (colIdx == null) return;
      const valor = String(r[colIdx] ?? "").trim();
      if (valor) camposCustomizados[nomeCampo] = valor;
    });

    pacientes.push({
      cod: pega(r, "cod"),
      nome, primeiro: primeiroNome(nome),
      tel, telValido: ok,
      email: pega(r, "email"),
      financ: financRaw ? (inadimpl ? "Inadimplente" : "Adimplente") : "—",
      dentista: pega(r, "dentista"),
      ultAtend: ultAtend.slice(0, 16),
      recencia,
      estagio: pega(r, "estagio") || "Lead",
      elegivel: ok, enviado: "Pendente", tags: [], origem: "Importação",
      camposCustomizados,
    });
  });
  return pacientes;
}

// Exporta TODOS os campos do lead, inclusive os que nao aparecem na tabela
// (ocultos por colunasVisiveis) e os Campos Personalizados - pensado pra
// cruzamento de dados com planilha fonte, nao so pra visualizacao rapida.
export function exportarXlsx(patients) {
  const chavesCustomizadas = [...new Set(patients.flatMap((p) => Object.keys(p.camposCustomizados || {})))];
  const data = patients.map((p) => {
    const linha = {
      Cód: p.cod, Lead: p.nome, Telefone: p.tel, Email: p.email,
      "Sit.Financ.": p.financ, "Inadimplente desde": p.inadimplenteDesde || "",
      Dentista: p.dentista, "Últ. Atend": p.ultAtend, "Tempo sem atendimento (dias)": p.recencia ?? "",
      Estágio: p.estagio, Elegível: p.elegivel ? "Sim" : "Não", Tags: (p.tags || []).join(", "),
      Status: p.enviado, Origem: p.origem || "", "Próxima ação em": p.proximaAcaoEm || "",
      "Última mensagem em": p.ultimaMensagemEm || "", "Última mensagem (direção)": p.ultimaMensagemDirecao || "",
    };
    chavesCustomizadas.forEach((chave) => { linha[chave] = (p.camposCustomizados || {})[chave] ?? ""; });
    return linha;
  });
  const ws = XLSX.utils.json_to_sheet(data);
  const wb = XLSX.utils.book_new(); XLSX.utils.book_append_sheet(wb, ws, "Leads");
  XLSX.writeFile(wb, "sorria_leads_atualizado.xlsx");
}
