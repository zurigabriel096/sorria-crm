import { useEffect, useState } from "react";
import { T } from "../theme";
import { s } from "../styles/s";
import { Field } from "./ui/Field";
import { Select } from "./ui/Select";
import { Modal } from "./ui/Modal";
import { StatusBadge } from "./ui/StatusBadge";
import { IconBook, IconEdit } from "./icons";
import { listEtapas } from "../api/etapas";
import { listColaboradores } from "../api/colaboradores";
import { getOrdemCamposLead, setOrdemCamposLead } from "../api/configCamposLead";

const ORDEM_PADRAO = ["nome", "cod", "tel", "email", "estagio", "responsavelId", "financ", "dentista", "elegivel"];
const ROTULOS_CAMPOS = {
  nome: "Nome", cod: "Código", tel: "Telefone", email: "Email", estagio: "Estágio",
  responsavelId: "Responsável pelo Lead", financ: "Financeiro", dentista: "Dentista", elegivel: "Elegível p/ disparo",
};

// Modal de detalhe do paciente, com duas abas: Dados (cadastro) e Histórico do cliente
// (mensagens que ele recebeu). Usado tanto pela tela de Pacientes quanto pela de Disparos,
// pra manter a mesma experiência não importa de onde a pessoa chegou até o paciente.
export function PatientDetailModal({ paciente, tags, tagObjetos, camposCustomizados, historico, usuario, abaInicial = "dados", onSave, onClose }) {
  const souAdmin = usuario?.papel === "ADMIN";
  const [aba, setAba] = useState(abaInicial);
  const [p, setP] = useState(paciente);
  const [dirty, setDirty] = useState(false);
  // Cadastro abre so-leitura de proposito: no mobile, arrastar/deslizar essa
  // caixa pra ler os dados as vezes tocava sem querer num input (nome/telefone/
  // email) e abria o teclado. So vira editavel de verdade clicando no lapis.
  const [editando, setEditando] = useState(false);
  const [etapas, setEtapas] = useState(["Lead"]);
  const [colaboradores, setColaboradores] = useState([]);
  const [ordemCampos, setOrdemCamposState] = useState(ORDEM_PADRAO);
  const [reordenando, setReordenando] = useState(false);
  const [erroOrdem, setErroOrdem] = useState(null);
  useEffect(() => { listEtapas().then((lista) => setEtapas(lista.map((e) => e.nome))).catch(() => {}); }, []);
  useEffect(() => { listColaboradores().then(setColaboradores).catch(() => {}); }, []);
  useEffect(() => { getOrdemCamposLead().then((ordem) => setOrdemCamposState(ordem?.length ? ordem : ORDEM_PADRAO)).catch(() => {}); }, []);

  const moverCampo = (indice, direcao) => {
    const novo = [...ordemCampos];
    const alvo = indice + direcao;
    if (alvo < 0 || alvo >= novo.length) return;
    [novo[indice], novo[alvo]] = [novo[alvo], novo[indice]];
    setOrdemCamposState(novo);
  };
  const salvarOrdem = async () => {
    try {
      await setOrdemCamposLead(ordemCampos);
      setErroOrdem(null);
      setReordenando(false);
    } catch (e) {
      setErroOrdem(e.message || "Erro ao salvar a ordem dos campos.");
    }
  };
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

  const rotuloOuTraco = (v) => (v && String(v).trim() ? v : "—");
  const valorSoLeituraJsx = (texto) => (
    <div style={{ ...s.input, display: "flex", alignItems: "center", background: T.bg, color: T.ink, cursor: "default" }}>{texto}</div>
  );

  // Um Field por campo fixo - a ORDEM de renderizacao vem de ordemCampos
  // (configuravel pelo lapisinho de reordenar), o conteudo de cada um continua
  // fixo. Fora do modo edicao, mostra texto estatico em vez de input/select -
  // ver "editando" acima.
  const campoFixoJsx = (chave) => {
    if (!editando) {
      const texto = {
        nome: rotuloOuTraco(p.nome), cod: rotuloOuTraco(p.cod), tel: rotuloOuTraco(p.tel), email: rotuloOuTraco(p.email),
        estagio: p.estagio || "Lead",
        responsavelId: colaboradores.find((c) => c.id === p.responsavelId)?.nome || "Sem responsável",
        financ: rotuloOuTraco(p.financ), dentista: rotuloOuTraco(p.dentista), elegivel: p.elegivel ? "Sim" : "Não",
      }[chave];
      return <Field key={chave} label={ROTULOS_CAMPOS[chave] || chave}>{valorSoLeituraJsx(texto)}</Field>;
    }
    switch (chave) {
      case "nome": return <Field key={chave} label="Nome"><input style={s.input} value={p.nome} onChange={(e) => set("nome", e.target.value)} /></Field>;
      case "cod": return <Field key={chave} label="Código"><input style={s.input} value={p.cod} onChange={(e) => set("cod", e.target.value)} /></Field>;
      case "tel": return <Field key={chave} label="Telefone"><input style={s.input} value={p.tel} onChange={(e) => set("tel", e.target.value)} /></Field>;
      case "email": return <Field key={chave} label="Email"><input style={s.input} value={p.email} onChange={(e) => set("email", e.target.value)} placeholder="email@paciente.com" /></Field>;
      case "estagio": return <Field key={chave} label="Estágio"><Select block value={p.estagio || "Lead"} onChange={(v) => set("estagio", v)} options={etapas} /></Field>;
      case "responsavelId": return (
        <Field key={chave} label="Responsável pelo Lead">
          <Select
            block
            value={p.responsavelId ? String(p.responsavelId) : ""}
            onChange={(v) => set("responsavelId", v ? Number(v) : null)}
            options={["", ...colaboradores.map((c) => String(c.id))]}
            labels={{ "": "Sem responsável (fila compartilhada)", ...Object.fromEntries(colaboradores.map((c) => [String(c.id), c.nome])) }}
          />
        </Field>
      );
      case "financ": return <Field key={chave} label="Financeiro"><Select block value={p.financ} onChange={(v) => set("financ", v)} options={["Adimplente", "Inadimplente", "—"]} /></Field>;
      case "dentista": return <Field key={chave} label="Dentista"><input style={s.input} value={p.dentista} onChange={(e) => set("dentista", e.target.value)} /></Field>;
      case "elegivel": return <Field key={chave} label="Elegível p/ disparo"><Select block value={p.elegivel ? "Sim" : "Não"} onChange={(v) => set("elegivel", v === "Sim")} options={["Sim", "Não"]} /></Field>;
      default: return null;
    }
  };

  return (
    <Modal title={`Lead: ${paciente.nome}`} onClose={onClose} dirty={aba === "dados" && dirty} onSave={() => onSave(p)} wide>
      <div style={{ display: "flex", gap: 8, marginBottom: 16, alignItems: "center" }}>
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
        {aba === "dados" && (
          <div style={{ marginLeft: "auto", display: "flex", gap: 8, alignItems: "center" }}>
            {!editando && (
              <button onClick={() => setEditando(true)} style={{ ...s.btnGhostSm, display: "inline-flex", alignItems: "center", gap: 6 }}>
                <IconEdit color={T.primary} width={13} height={13} /> Editar
              </button>
            )}
            {souAdmin && (
              <button
                onClick={() => { setReordenando((r) => !r); setErroOrdem(null); }}
                title="Reordenar campos do cadastro"
                style={s.collapseBtn}
              >
                <IconEdit color={reordenando ? T.primary : T.inkSoft} width={15} height={15} />
              </button>
            )}
          </div>
        )}
      </div>

      {aba === "dados" && reordenando && (
        <div style={{ background: T.lineSoft, borderRadius: 12, padding: 12, marginBottom: 16 }}>
          <div style={{ fontSize: 12.5, color: T.inkSoft, marginBottom: 8 }}>Reordene os campos do cadastro (afeta todos os leads):</div>
          <div style={{ display: "grid", gap: 6 }}>
            {ordemCampos.map((chave, i) => (
              <div key={chave} style={{ display: "flex", alignItems: "center", gap: 8, background: "#fff", border: `1px solid ${T.line}`, borderRadius: 8, padding: "6px 10px" }}>
                <span style={{ flex: 1, fontSize: 13, color: T.ink }}>{ROTULOS_CAMPOS[chave] || chave}</span>
                <button style={s.btnGhostSm} disabled={i === 0} onClick={() => moverCampo(i, -1)}>↑</button>
                <button style={s.btnGhostSm} disabled={i === ordemCampos.length - 1} onClick={() => moverCampo(i, 1)}>↓</button>
              </div>
            ))}
          </div>
          {erroOrdem && <div style={{ fontSize: 12.5, color: T.coral, marginTop: 8 }}>{erroOrdem}</div>}
          <div style={{ display: "flex", gap: 8, marginTop: 10 }}>
            <button style={s.btnGhostSm} onClick={() => setReordenando(false)}>Cancelar</button>
            <button style={s.btnPrimarySm} onClick={salvarOrdem}>Salvar ordem</button>
          </div>
        </div>
      )}

      {aba === "dados" && (
        <>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
            {ordemCampos.map((chave) => campoFixoJsx(chave))}
          </div>
          <Field label="Próxima ação (follow-up)">
            {editando ? (
              <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                <input
                  type="datetime-local"
                  style={{ ...s.input, flex: 1 }}
                  value={p.proximaAcaoEm ? p.proximaAcaoEm.slice(0, 16) : ""}
                  onChange={(e) => set("proximaAcaoEm", e.target.value || null)}
                />
                {p.proximaAcaoEm && <button style={s.btnGhostSm} onClick={() => set("proximaAcaoEm", null)}>Limpar</button>}
              </div>
            ) : valorSoLeituraJsx(p.proximaAcaoEm ? new Date(p.proximaAcaoEm).toLocaleString("pt-BR") : "Nenhuma")}
          </Field>
          <Field label="Tags">
            <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
              {editando ? (
                tags.map((t) => {
                  const on = (p.tags || []).includes(t);
                  const cor = tagObjetos?.find((tg) => tg.nome === t)?.cor;
                  return (
                    <button key={t} onClick={() => toggleTag(t)} style={{ ...s.tagChipBig, cursor: "pointer", display: "inline-flex", alignItems: "center", gap: 6, opacity: on ? 1 : .45, outline: on ? `1.5px solid ${T.primary}` : "none" }}>
                      <span style={{ width: 8, height: 8, borderRadius: "50%", background: cor || T.inkSoft, flexShrink: 0 }} />
                      {t}
                    </button>
                  );
                })
              ) : (p.tags || []).length ? (
                (p.tags || []).map((t) => {
                  const cor = tagObjetos?.find((tg) => tg.nome === t)?.cor;
                  return (
                    <span key={t} style={{ ...s.tagChipBig, display: "inline-flex", alignItems: "center", gap: 6 }}>
                      <span style={{ width: 8, height: 8, borderRadius: "50%", background: cor || T.inkSoft, flexShrink: 0 }} />
                      {t}
                    </span>
                  );
                })
              ) : <span style={{ fontSize: 12.5, color: T.inkSoft }}>Nenhuma tag</span>}
            </div>
          </Field>
          {!!(camposCustomizados || []).length && (
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginTop: 12 }}>
              {camposCustomizados.map((campo) => (
                <Field key={campo.id} label={campo.nome}>
                  {!editando ? valorSoLeituraJsx(rotuloOuTraco(p.camposCustomizados?.[campo.nome])) : campo.tipo === "LISTA" ? (
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
            {editando ? (
              <>
                <button style={{ ...s.btnGhost, flex: 1 }} onClick={() => { setP(paciente); setDirty(false); setEditando(false); }}>Cancelar edição</button>
                <button style={{ ...s.btnPrimary, flex: 1 }} onClick={() => { onSave(p); setEditando(false); }}>Salvar alterações</button>
              </>
            ) : (
              <button style={{ ...s.btnGhost, flex: 1 }} onClick={onClose}>Fechar</button>
            )}
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
