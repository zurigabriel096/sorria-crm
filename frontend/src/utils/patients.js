import * as XLSX from "xlsx";
import { HOJE } from "../theme";

export function evalCond(p, c) {
  switch (c.field) {
    case "segmento": return c.op === "é" ? p.segmento === c.value : p.segmento !== c.value;
    case "financ": return c.op === "é" ? p.financ === c.value : p.financ !== c.value;
    case "recencia": return c.op === "maior" ? (p.recencia || 0) > +c.value : (p.recencia || 0) < +c.value;
    case "elegivel": { const y = c.value === "Sim"; return c.op === "é" ? p.elegivel === y : p.elegivel !== y; }
    case "tag": return (p.tags || []).includes(c.value);
    default: return false;
  }
}

export const matchSeg = (p, seg) => !seg.conditions.length ? false : seg.match === "OU" ? seg.conditions.some((c) => evalCond(p, c)) : seg.conditions.every((c) => evalCond(p, c));

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

export function detectar(headers) {
  const h = headers.map((x) => String(x || "").toLowerCase());
  if (h.some((x) => x.includes("atrasadas")) && h.some((x) => x.includes("tot"))) return "inadimplentes";
  if (h.some((x) => x.includes("status últ") || x.includes("status ult"))) return "sem_agendamento";
  if (h.some((x) => x.includes("procedimento")) && h.some((x) => x.includes("agendado por"))) return "agendamentos";
  return "generico";
}

export function importarPlanilha(file, cb) {
  const reader = new FileReader();
  reader.onload = (e) => {
    const wb = XLSX.read(e.target.result, { type: "array" });
    const ws = wb.Sheets[wb.SheetNames[0]];
    const rows = XLSX.utils.sheet_to_json(ws, { header: 1, raw: false, defval: "" });
    let hi = rows.findIndex((r) => r.some((c) => String(c).toLowerCase().includes("paciente")));
    if (hi < 0) hi = 0;
    const headers = rows[hi].map((x) => String(x).trim());
    const tipo = detectar(headers);
    const col = (name) => headers.findIndex((x) => x.toLowerCase().includes(name));
    const idx = {
      cod: col("cód") >= 0 ? col("cód") : col("código"), nome: col("paciente"), tel: col("telefone"),
      financ: col("sit.financ") >= 0 ? col("sit.financ") : col("situação"), dentista: col("dentista"),
      ult: col("últ. atend") >= 0 ? col("últ. atend") : col("último atendimento"),
      atras: col("atrasadas"), tot: col("tot"), statusAg: col("status últ"),
      proc: col("procedimento"), valor: col("valor"), esp: col("especialidade"), agpor: col("agendado por"), data: col("data"),
    };
    const pacientes = []; const agenda = []; const colabSet = new Set();
    rows.slice(hi + 1).forEach((r) => {
      const nome = r[idx.nome]; if (!nome || String(nome).trim().length < 2) return;
      const cod = idx.cod >= 0 ? String(r[idx.cod]).trim() : "";
      const { tel, ok } = limparTel(idx.tel >= 0 ? r[idx.tel] : "");
      const financRaw = idx.financ >= 0 ? String(r[idx.financ]).trim().toUpperCase() : "";
      const ultD = idx.ult >= 0 ? parseData(r[idx.ult]) : null;
      const inadimpl = /INADIMPL|PROTESTAR/.test(financRaw) || tipo === "inadimplentes";
      const tags = [];
      if (tipo === "inadimplentes") tags.push("Inadimplente");
      if (tipo === "sem_agendamento") tags.push("Sem agendamento");
      if (tipo === "agendamentos") tags.push("Agenda Agosto");
      const recencia = diasDesde(ultD);
      let segmento = "Regular";
      if (inadimpl) segmento = "Risco";
      else if (tipo === "agendamentos") segmento = "Fidelizado";
      else if (recencia != null && recencia > 180) segmento = "Inativo";
      pacientes.push({
        id: cod || `P${pacientes.length}`, cod, nome: String(nome).trim(), primeiro: primeiroNome(nome),
        tel, telValido: ok, email: "", financ: inadimpl ? "Inadimplente" : (financRaw ? "Adimplente" : "—"),
        dentista: idx.dentista >= 0 ? String(r[idx.dentista]).split("Dent.")[0].trim() : "",
        ultAtend: idx.ult >= 0 ? String(r[idx.ult] || "").slice(0, 16) : "",
        atrasadas: idx.atras >= 0 ? r[idx.atras] : "", totAtraso: idx.tot >= 0 ? r[idx.tot] : "",
        statusAg: idx.statusAg >= 0 ? String(r[idx.statusAg]).trim() : "",
        recencia, segmento, elegivel: ok, enviado: "Pendente", tags, origem: tipo,
      });
      if (tipo === "agendamentos") {
        agenda.push({ data: String(r[idx.data] || "").slice(0, 16), paciente: String(nome).trim(), proc: r[idx.proc], valor: r[idx.valor], esp: r[idx.esp], por: r[idx.agpor] });
        const a = String(r[idx.agpor] || "").trim();
        if (a && !/SITE|SOFTWARE/i.test(a)) colabSet.add(a);
      }
    });
    cb({ tipo, pacientes, agenda, colaboradores: [...colabSet] });
  };
  reader.readAsArrayBuffer(file);
}

export function exportarXlsx(patients) {
  const data = patients.map((p) => ({ Cód: p.cod, Paciente: p.nome, Telefone: p.tel, Email: p.email, "Sit.Financ.": p.financ, Dentista: p.dentista, "Últ. Atend": p.ultAtend, Segmento: p.segmento, Elegível: p.elegivel ? "Sim" : "Não", Tags: (p.tags || []).join(", "), Status: p.enviado }));
  const ws = XLSX.utils.json_to_sheet(data);
  const wb = XLSX.utils.book_new(); XLSX.utils.book_append_sheet(wb, ws, "Pacientes");
  XLSX.writeFile(wb, "sorria_base_atualizada.xlsx");
}
