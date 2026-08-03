import { useEffect, useState } from "react";
import { T } from "../theme";
import { s } from "../styles/s";
import { Field } from "./ui/Field";
import { Select } from "./ui/Select";
import { Modal } from "./ui/Modal";
import { StatusBadge } from "./ui/StatusBadge";
import { IconBook } from "./icons";
import { listEtapas } from "../api/etapas";
import { listColaboradores } from "../api/colaboradores";

// Modal de detalhe do paciente, com duas abas: Dados (cadastro) e Histórico do cliente
// (mensagens que ele recebeu). Usado tanto pela tela de Pacientes quanto pela de Disparos,
// pra manter a mesma experiência não importa de onde a pessoa chegou até o paciente.
export function PatientDetailModal({ paciente, tags, tagObjetos, camposCustomizados, historico, abaInicial = "dados", onSave, onClose }) {
  const [aba, setAba] = useState(abaInicial);
  const [p, setP] = useState(paciente);
  const [dirty, setDirty] = useState(false);
  const [etapas, setEtapas] = useState(["Lead"]);
  const [colaboradores, setColaboradores] = useState([]);
  useEffect(() => { listEtapas().then((lista) => setEtapas(lista.map((e) => e.nome))).catch(() => {}); }, []);
  useEffect(() => { listColaboradores().then(setColaboradores).catch(() => {}); }, []);
  const set = (k, v) => { setP((x) => ({ ...x, [k]: v })); setDirty(true); };
  const toggleTag = (t) => {
    setP((x) => ({ ...x, tags: (x.tags || []).includes(t) ? x.tags.filter((y) => y !== t) : [...(x.tags || []), t] }));
    setDirty(true);
  };
  const setCampoCustomizado = (nome, valor) => {
    setP((x) => ({ ...x, camposCustomizados: { ...(x.camposCustomizados || {}), [nome]: valor } }));
    setDirty(true);
  };

  const mensagens = (historico || [])
    .filter((h) => h.contatoId === paciente.id)
    .sort((a, b) => new Date(b.horaCompleta || 0) - new Date(a.horaCompleta || 0));

  return (
    <Modal title={`Lead: ${paciente.nome}`} onClose={onClose} dirty={aba === "dados" && dirty} onSave={() => onSave(p)} wide>
      <div style={{ display: "flex", gap: 8, marginBottom: 16 }}>
        <button
          onClick={() => setAba("dados")}
          style={{ ...s.toggleBtn, background: aba === "dados" ? T.primary : T.lineSoft, color: aba === "dados" ? "#fff" : T.inkSoft }}
        >
          Dados
        </button>
        <button
          onClick={() => setAba("historico")}
          style={{ ...s.toggleBtn, background: aba === "historico" ? T.primary : T.lineSoft, color: aba === "historico" ? "#fff" : T.inkSoft, display: "inline-flex", alignItems: "center", gap: 6 }}
        >
          <IconBook color={aba === "historico" ? "#fff" : T.inkSoft} /> Histórico do cliente
        </button>
      </div>

      {aba === "dados" && (
        <>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
            <Field label="Nome"><input style={s.input} value={p.nome} onChange={(e) => set("nome", e.target.value)} /></Field>
            <Field label="Código"><input style={s.input} value={p.cod} onChange={(e) => set("cod", e.target.value)} /></Field>
            <Field label="Telefone"><input style={s.input} value={p.tel} onChange={(e) => set("tel", e.target.value)} /></Field>
            <Field label="Email"><input style={s.input} value={p.email} onChange={(e) => set("email", e.target.value)} placeholder="email@paciente.com" /></Field>
            <Field label="Estágio"><Select block value={p.estagio || "Lead"} onChange={(v) => set("estagio", v)} options={etapas} /></Field>
            <Field label="Responsável pelo Lead">
              <Select
                block
                value={p.responsavelId ? String(p.responsavelId) : ""}
                onChange={(v) => set("responsavelId", v ? Number(v) : null)}
                options={["", ...colaboradores.map((c) => String(c.id))]}
                labels={{ "": "Sem responsável (fila compartilhada)", ...Object.fromEntries(colaboradores.map((c) => [String(c.id), c.nome])) }}
              />
            </Field>
            <Field label="Financeiro"><Select block value={p.financ} onChange={(v) => set("financ", v)} options={["Adimplente", "Inadimplente", "—"]} /></Field>
            <Field label="Dentista"><input style={s.input} value={p.dentista} onChange={(e) => set("dentista", e.target.value)} /></Field>
            <Field label="Elegível p/ disparo"><Select block value={p.elegivel ? "Sim" : "Não"} onChange={(v) => set("elegivel", v === "Sim")} options={["Sim", "Não"]} /></Field>
          </div>
          <Field label="Próxima ação (follow-up)">
            <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
              <input
                type="datetime-local"
                style={{ ...s.input, flex: 1 }}
                value={p.proximaAcaoEm ? p.proximaAcaoEm.slice(0, 16) : ""}
                onChange={(e) => set("proximaAcaoEm", e.target.value || null)}
              />
              {p.proximaAcaoEm && <button style={s.btnGhostSm} onClick={() => set("proximaAcaoEm", null)}>Limpar</button>}
            </div>
          </Field>
          <Field label="Tags">
            <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
              {tags.map((t) => {
                const on = (p.tags || []).includes(t);
                const cor = tagObjetos?.find((tg) => tg.nome === t)?.cor;
                return (
                  <button key={t} onClick={() => toggleTag(t)} style={{ ...s.tagChipBig, cursor: "pointer", display: "inline-flex", alignItems: "center", gap: 6, opacity: on ? 1 : .45, outline: on ? `1.5px solid ${T.primary}` : "none" }}>
                    <span style={{ width: 8, height: 8, borderRadius: "50%", background: cor || T.inkSoft, flexShrink: 0 }} />
                    {t}
                  </button>
                );
              })}
            </div>
          </Field>
          {!!(camposCustomizados || []).length && (
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginTop: 12 }}>
              {camposCustomizados.map((campo) => (
                <Field key={campo.id} label={campo.nome}>
                  {campo.tipo === "LISTA" ? (
                    <Select
                      block
                      value={p.camposCustomizados?.[campo.nome] || ""}
                      onChange={(v) => setCampoCustomizado(campo.nome, v)}
                      options={["", ...campo.opcoes]}
                      labels={{ "": "—" }}
                    />
                  ) : (
                    <input
                      style={s.input}
                      type={campo.tipo === "DATA" ? "date" : campo.tipo === "NUMERO" || campo.tipo === "MOEDA" ? "number" : "text"}
                      step={campo.tipo === "MOEDA" ? "0.01" : undefined}
                      placeholder={campo.tipo === "MOEDA" ? "Ex: 89.90" : undefined}
                      value={p.camposCustomizados?.[campo.nome] || ""}
                      onChange={(e) => setCampoCustomizado(campo.nome, e.target.value)}
                    />
                  )}
                </Field>
              ))}
            </div>
          )}
          <div style={{ display: "flex", gap: 10, marginTop: 8 }}>
            <button style={{ ...s.btnGhost, flex: 1 }} onClick={onClose}>Cancelar</button>
            <button style={{ ...s.btnPrimary, flex: 1 }} onClick={() => onSave(p)}>Salvar alterações</button>
          </div>
        </>
      )}

      {aba === "historico" && (
        <div style={{ display: "grid", gap: 8, maxHeight: 360, overflowY: "auto" }}>
          {!mensagens.length && <div style={{ fontSize: 13.5, color: T.inkSoft, padding: "12px 0" }}>Nenhuma mensagem enviada pra esse lead ainda.</div>}
          {mensagens.map((m, i) => (
            <div key={i} style={s.feedRow}>
              <span style={{ width: 74, flexShrink: 0, display: "inline-flex" }}><StatusBadge status={m.status} sm /></span>
              <span style={{ color: T.ink }}>{m.campanha}</span>
              <span style={{ marginLeft: "auto", color: T.inkSoft, fontSize: 12 }}>{m.hora}</span>
            </div>
          ))}
        </div>
      )}
    </Modal>
  );
}
