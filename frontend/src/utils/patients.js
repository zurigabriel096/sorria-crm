import * as XLSX from "xlsx";
import { HOJE } from "../theme";

// Condicoes de campo customizado carregam o tipo na propria chave
// ("custom:TIPO:nome" - ver data/seed.js montarFieldMeta), entao dao pra
// avaliar aqui sem precisar consultar a lista de CampoCustomizado de novo.
function evalCondCustomizado(p, c) {
  const [, tipo, ...resto] = c.field.split(":");
  const nome = resto.join(":");
  const valor = p.camposCustomizados?.[nome];
  if (tipo === "NUMERO") return c.op === "maior" ? (Number(valor) || 0) > +c.value : (Number(valor) || 0) < +c.value;
  if (tipo === "DATA") return c.op === "maior" ? new Date(valor || 0) > new Date(c.value) : new Date(valor || 0) < new Date(c.value);
  if (tipo === "LISTA") return c.op === "é" ? valor === c.value : valor !== c.value;
  const contem = String(valor || "").toLowerCase().includes(String(c.value || "").toLowerCase());
  return c.op === "contém" ? contem : !contem;
}

export function evalCond(p, c) {
  if (c.field.startsWith("custom:")) return evalCondCustomizado(p, c);
  switch (c.field) {
    case "financ": return c.op === "é" ? p.financ === c.value : p.financ !== c.value;
    case "recencia": return c.op === "maior" ? (p.recencia || 0) > +c.value : (p.recencia || 0) < +c.value;
    case "elegivel": { const y = c.value === "Sim"; return c.op === "é" ? p.elegivel === y : p.elegivel !== y; }
    case "tag": return c.op === "contém" ? (p.tags || []).includes(c.value) : !(p.tags || []).includes(c.value);
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
  { chave: "cod", rotulo: "Código" },
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
// (ignorado).
export function montarPacientes(rows, hi, mapeamento) {
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
    });
  });
  return pacientes;
}

export function exportarXlsx(patients) {
  const data = patients.map((p) => ({ Cód: p.cod, Lead: p.nome, Telefone: p.tel, Email: p.email, "Sit.Financ.": p.financ, Dentista: p.dentista, "Últ. Atend": p.ultAtend, Estágio: p.estagio, Elegível: p.elegivel ? "Sim" : "Não", Tags: (p.tags || []).join(", "), Status: p.enviado }));
  const ws = XLSX.utils.json_to_sheet(data);
  const wb = XLSX.utils.book_new(); XLSX.utils.book_append_sheet(wb, ws, "Leads");
  XLSX.writeFile(wb, "sorria_leads_atualizado.xlsx");
}
