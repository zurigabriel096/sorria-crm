import { useState } from "react";
import { T, AVATAR_COLORS } from "../theme";
import { s } from "../styles/s";
import { montarFieldMeta, OP_LABEL } from "../data/seed";
import { matchSeg } from "../utils/patients";
import { dataHora } from "../utils/format";
import { Card } from "../components/ui/Card";
import { Field } from "../components/ui/Field";
import { Select } from "../components/ui/Select";
import { Modal } from "../components/ui/Modal";
import { DotMenu } from "../components/ui/DotMenu";
import { ColorPicker } from "../components/ui/ColorPicker";

const novaCondicao = () => ({ field: "financ", op: "é", value: "Adimplente" });
const novoGrupo = () => [{ field: "recencia", op: "maior", value: 120 }];
const contagemLabel = (n) => (n === 1 ? "1 lead" : `${n} leads`);

export function Segmentacoes({
  patients, segmentos, onCriar, onAtualizar, onExcluir, onArquivar,
  tags, tagObjetos, onCriarTag, onAtualizarTag, onExcluirTag,
  camposCustomizados,
  onAplicarTagEmLote, onExcluirLeadsEmLote, usuario,
  showToast,
}) {
  const souAdmin = usuario?.papel === "ADMIN";
  const [builder, setBuilder] = useState(null);
  const [salvando, setSalvando] = useState(false);
  const [novaTag, setNovaTag] = useState("");
  const [buscaTag, setBuscaTag] = useState("Todas");
  const [tagEditando, setTagEditando] = useState(null);
  const [tagEditValor, setTagEditValor] = useState("");
  const [tagEditCor, setTagEditCor] = useState(T.primary);
  const [verArquivadas, setVerArquivadas] = useState(false);
  const [tagLote, setTagLote] = useState(null); // null | {seg, remover, tag}
  const [aplicandoLote, setAplicandoLote] = useState(false);
  const [excluirLote, setExcluirLote] = useState(null); // null | {seg, quantidade, confirmacao}
  const [excluindoLote, setExcluindoLote] = useState(false);

  const fieldMeta = montarFieldMeta(camposCustomizados);

  const salvar = async () => {
    if (!builder.nome.trim()) return showToast("Dê um nome", "warn");
    setSalvando(true);
    try {
      if (builder.id) await onAtualizar(builder.id, builder);
      else await onCriar(builder);
      setBuilder(null);
      showToast("Segmentação salva", "ok");
    } catch (e) {
      showToast(e.message || "Erro ao salvar segmentação", "warn");
    } finally {
      setSalvando(false);
    }
  };

  const duplicar = async (seg) => {
    try {
      await onCriar({ nome: `${seg.nome} (cópia)`, groups: JSON.parse(JSON.stringify(seg.groups)) });
      showToast("Segmentação duplicada", "ok");
    } catch (e) {
      showToast(e.message || "Erro ao duplicar segmentação", "warn");
    }
  };

  const excluir = async (seg) => {
    try {
      await onExcluir(seg.id);
      showToast("Removida", "ok");
    } catch (e) {
      showToast(e.message || "Erro ao remover segmentação", "warn");
    }
  };

  const arquivar = async (seg) => {
    try {
      await onArquivar(seg.id, !seg.arquivado);
      showToast(seg.arquivado ? "Segmentação reativada" : "Segmentação arquivada", "ok");
    } catch (e) {
      showToast(e.message || "Erro ao arquivar segmentação", "warn");
    }
  };

  const abrirTagLote = (seg, remover) => setTagLote({ seg, remover, tag: tags[0] || "" });

  const confirmarTagLote = async () => {
    if (!tagLote.tag) return showToast("Escolha uma tag", "warn");
    setAplicandoLote(true);
    try {
      // Roda em background - o modal fecha na hora, o progresso aparece na
      // barra no canto da tela (ver JobsProgress em App.jsx), sem travar aqui.
      await onAplicarTagEmLote(tagLote.seg, tagLote.tag, tagLote.remover);
      showToast(`Aplicando tag "${tagLote.tag}" em segundo plano...`, "ok");
      setTagLote(null);
    } catch (e) {
      showToast(e.message || "Erro ao aplicar tag em massa", "warn");
    } finally {
      setAplicandoLote(false);
    }
  };

  const abrirExcluirLote = (seg) => {
    const quantidade = patients.filter((p) => matchSeg(p, seg)).length;
    setExcluirLote({ seg, quantidade, confirmacao: "" });
  };

  const fraseConfirmacaoEsperada = (quantidade) => `EXCLUIR${quantidade}LEADS`;

  const confirmarExcluirLote = async () => {
    if (excluirLote.confirmacao !== fraseConfirmacaoEsperada(excluirLote.quantidade)) {
      return showToast("Frase de confirmação não bate", "warn");
    }
    setExcluindoLote(true);
    try {
      await onExcluirLeadsEmLote(excluirLote.seg);
      showToast("Excluindo leads em segundo plano...", "ok");
      setExcluirLote(null);
    } catch (e) {
      showToast(e.message || "Erro ao excluir leads em massa", "warn");
    } finally {
      setExcluindoLote(false);
    }
  };

  const criarTag = async () => {
    const t = novaTag.trim();
    if (!t) return;
    if (tags.includes(t)) return showToast("Tag já existe", "warn");
    try {
      await onCriarTag(t, AVATAR_COLORS[tagObjetos.length % AVATAR_COLORS.length]);
      setNovaTag("");
      showToast(`Tag "${t}" criada`, "ok");
    } catch (e) {
      showToast(e.message || "Erro ao criar tag", "warn");
    }
  };

  const abrirEdicaoTag = (tag) => {
    setTagEditando(tag.id);
    setTagEditValor(tag.nome);
    setTagEditCor(tag.cor || T.primary);
  };

  const salvarEdicaoTag = async () => {
    const novo = tagEditValor.trim();
    if (!novo) return;
    try {
      await onAtualizarTag(tagEditando, novo, tagEditCor);
      setTagEditando(null);
      showToast("Tag atualizada", "ok");
    } catch (e) {
      showToast(e.message || "Erro ao atualizar tag", "warn");
    }
  };

  const excluirTag = async (tag) => {
    try {
      await onExcluirTag(tag.id);
      if (buscaTag === tag.nome) setBuscaTag("Todas");
      showToast(`Tag "${tag.nome}" removida`, "ok");
    } catch (e) {
      showToast(e.message || "Erro ao remover tag", "warn");
    }
  };

  const busca = buscaTag === "Todas" ? [] : patients.filter((p) => (p.tags || []).includes(buscaTag));

  return (
    <div style={{ display: "grid", gridTemplateColumns: "1.5fr 1fr", gap: 18 }} className="dashGrid">
      <div style={{ display: "grid", gap: 14, alignContent: "start" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
          <div style={{ fontSize: 14, fontWeight: 700, color: T.ink }}>Suas segmentações</div>
          <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
            <div style={s.toggle}>
              <button style={{ ...s.toggleBtn, ...(!verArquivadas ? { background: "#fff", color: T.ink } : {}) }} onClick={() => setVerArquivadas(false)}>Ativas</button>
              <button style={{ ...s.toggleBtn, ...(verArquivadas ? { background: "#fff", color: T.ink } : {}) }} onClick={() => setVerArquivadas(true)}>Arquivadas</button>
            </div>
            <button style={s.btnPrimarySm} onClick={() => setBuilder({ id: null, nome: "", groups: [novoGrupo()] })}>+ Nova segmentação</button>
          </div>
        </div>
        {segmentos.filter((seg) => !!seg.arquivado === verArquivadas).length === 0 && (
          <Card><div style={{ textAlign: "center", padding: 20, color: T.inkSoft }}>{verArquivadas ? "Nenhuma segmentação arquivada." : "Nenhuma segmentação ativa."}</div></Card>
        )}
        {segmentos.filter((seg) => !!seg.arquivado === verArquivadas).map((seg) => {
          const count = patients.filter((p) => matchSeg(p, seg)).length;
          return (
            <div key={seg.id} style={{ ...s.segCard, opacity: seg.arquivado ? .7 : 1 }}>
              <div style={{ display: "flex", justifyContent: "space-between", gap: 10 }}>
                <div>
                  <div style={{ fontWeight: 700, fontSize: 15, color: T.ink }}>{seg.nome}</div>
                  <div style={{ fontSize: 12, color: T.inkSoft, marginTop: 3 }}>
                    {seg.groups.map((group, gi) => (
                      <span key={gi}>
                        {gi > 0 && <b style={{ color: T.coral }}> OU </b>}
                        {group.map((c, i) => (
                          <span key={i}>
                            {i > 0 && <b style={{ color: T.primary }}> E </b>}
                            {fieldMeta[c.field]?.label || c.field} {OP_LABEL[c.op]} <b style={{ color: T.ink }}>{String(c.value)}</b>
                          </span>
                        ))}
                      </span>
                    ))}
                  </div>
                  {seg.atualizadoEm && <div style={{ fontSize: 10.5, color: T.inkSoft, marginTop: 4 }}>Editado em {dataHora(seg.atualizadoEm)}</div>}
                </div>
                <div style={{ display: "flex", alignItems: "start", gap: 8 }}>
                  <span style={s.countPill}>{contagemLabel(count)}</span>
                  <DotMenu
                    items={[
                      { label: "Editar", onClick: () => setBuilder(JSON.parse(JSON.stringify(seg))) },
                      { label: "Duplicar", onClick: () => duplicar(seg) },
                      ...(souAdmin ? [
                        { label: "Adicionar tag a estes leads", onClick: () => abrirTagLote(seg, false) },
                        { label: "Remover tag destes leads", onClick: () => abrirTagLote(seg, true) },
                        { label: "Excluir leads contidos nesse fluxo", danger: true, onClick: () => abrirExcluirLote(seg) },
                      ] : []),
                      { label: seg.arquivado ? "Reativar" : "Arquivar", onClick: () => arquivar(seg) },
                      { label: "Excluir", danger: true, onClick: () => excluir(seg) },
                    ]}
                  />
                </div>
              </div>
            </div>
          );
        })}
      </div>
      <div style={{ display: "grid", gap: 14, alignContent: "start" }}>
        <Card title="Tags">
          <div style={{ display: "flex", gap: 8, marginBottom: 12 }}>
            <input style={{ ...s.input, height: 38 }} placeholder="Nova tag..." value={novaTag} onChange={(e) => setNovaTag(e.target.value)} onKeyDown={(e) => e.key === "Enter" && criarTag()} />
            <button style={s.btnPrimarySm} onClick={criarTag}>Criar</button>
          </div>
          <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
            {tagObjetos.map((tag) =>
              tagEditando === tag.id ? (
                <span key={tag.id} style={{ display: "inline-flex", alignItems: "center", gap: 6, background: T.lineSoft, padding: "4px 8px", borderRadius: 10 }}>
                  <input
                    autoFocus
                    style={{ ...s.input, height: 28, width: 110, fontSize: 12.5 }}
                    value={tagEditValor}
                    onChange={(e) => setTagEditValor(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && salvarEdicaoTag()}
                  />
                  {AVATAR_COLORS.map((c) => (
                    <button
                      key={c}
                      onClick={() => setTagEditCor(c)}
                      style={{ width: 18, height: 18, borderRadius: "50%", background: c, border: tagEditCor === c ? `2px solid ${T.ink}` : "2px solid transparent", flexShrink: 0 }}
                    />
                  ))}
                  <ColorPicker value={tagEditCor} onChange={setTagEditCor} />
                  <button style={s.btnGhostSm} onClick={salvarEdicaoTag}>OK</button>
                </span>
              ) : (
                <span key={tag.id} style={{ ...s.tagChipBig, display: "inline-flex", alignItems: "center", gap: 6 }}>
                  <span style={{ width: 9, height: 9, borderRadius: "50%", background: tag.cor || T.inkSoft, flexShrink: 0 }} />
                  {tag.nome}
                  <DotMenu
                    items={[
                      { label: "Editar", onClick: () => abrirEdicaoTag(tag) },
                      { label: "Excluir", danger: true, onClick: () => excluirTag(tag) },
                    ]}
                  />
                </span>
              )
            )}
          </div>
        </Card>
        <Card title="Buscar por tag">
          <Select block value={buscaTag} onChange={setBuscaTag} options={["Todas", ...tags]} />
          <div style={{ marginTop: 12, display: "grid", gap: 6, maxHeight: 220, overflowY: "auto" }}>
            {buscaTag === "Todas" ? (
              <span style={{ fontSize: 13, color: T.inkSoft }}>Escolha uma tag.</span>
            ) : busca.length ? (
              busca.slice(0, 40).map((p) => (
                <div key={p.id} style={s.tagResult}>
                  <b style={{ color: T.ink }}>{p.nome}</b>
                  <span style={{ marginLeft: "auto", fontSize: 12, color: T.inkSoft }}>{p.estagio || "Lead"}</span>
                </div>
              ))
            ) : (
              <span style={{ fontSize: 13, color: T.inkSoft }}>Nenhum lead.</span>
            )}
          </div>
        </Card>
      </div>
      {builder && <SegBuilder builder={builder} setBuilder={setBuilder} tags={tags} fieldMeta={fieldMeta} patients={patients} onSave={salvar} onClose={() => setBuilder(null)} salvando={salvando} />}
      {tagLote && (
        <Modal title={`${tagLote.remover ? "Remover" : "Adicionar"} tag em massa`} onClose={() => setTagLote(null)}>
          <div style={{ fontSize: 13, color: T.inkSoft, marginBottom: 14 }}>
            {tagLote.remover ? "Remove" : "Adiciona"} a tag escolhida em todo mundo que <b>{tagLote.seg.nome}</b> captura agora
            ({contagemLabel(patients.filter((p) => matchSeg(p, tagLote.seg)).length)}).
          </div>
          {tags.length === 0 ? (
            <div style={{ fontSize: 13, color: T.inkSoft }}>Crie uma tag primeiro (painel ao lado).</div>
          ) : (
            <Field label="Tag">
              <Select block value={tagLote.tag} onChange={(v) => setTagLote({ ...tagLote, tag: v })} options={tags} />
            </Field>
          )}
          <div style={{ display: "flex", gap: 10, marginTop: 16 }}>
            <button style={{ ...s.btnGhost, flex: 1 }} onClick={() => setTagLote(null)}>Cancelar</button>
            <button
              style={{ ...s.btnPrimary, flex: 1, opacity: aplicandoLote ? .6 : 1 }}
              onClick={confirmarTagLote}
              disabled={aplicandoLote || tags.length === 0}
            >
              {aplicandoLote ? "Aplicando..." : "Confirmar"}
            </button>
          </div>
        </Modal>
      )}
      {excluirLote && (
        <Modal title="Excluir leads em massa" onClose={() => setExcluirLote(null)}>
          <div style={{ fontSize: 13, color: T.coral, fontWeight: 700, marginBottom: 10 }}>
            Atenção: isso apaga da Base de Leads todo mundo que <b>{excluirLote.seg.nome}</b> captura agora
            ({contagemLabel(excluirLote.quantidade)}). Não pode ser desfeito.
          </div>
          <div style={{ fontSize: 13, color: T.inkSoft, marginBottom: 10 }}>
            Pra confirmar, digite <code style={{ fontWeight: 700, color: T.ink }}>{fraseConfirmacaoEsperada(excluirLote.quantidade)}</code> abaixo:
          </div>
          <input
            style={s.input}
            value={excluirLote.confirmacao}
            onChange={(e) => setExcluirLote({ ...excluirLote, confirmacao: e.target.value })}
            placeholder={fraseConfirmacaoEsperada(excluirLote.quantidade)}
            autoFocus
          />
          <div style={{ display: "flex", gap: 10, marginTop: 16 }}>
            <button style={{ ...s.btnGhost, flex: 1 }} onClick={() => setExcluirLote(null)}>Cancelar</button>
            <button
              style={{ ...s.btnPrimary, flex: 1, background: T.coral, opacity: (excluindoLote || excluirLote.confirmacao !== fraseConfirmacaoEsperada(excluirLote.quantidade)) ? .5 : 1 }}
              onClick={confirmarExcluirLote}
              disabled={excluindoLote || excluirLote.confirmacao !== fraseConfirmacaoEsperada(excluirLote.quantidade)}
            >
              {excluindoLote ? "Excluindo..." : "Excluir leads"}
            </button>
          </div>
        </Modal>
      )}
    </div>
  );
}

function SegBuilder({ builder, setBuilder, tags, fieldMeta, patients, onSave, onClose, salvando }) {
  const set = (patch) => setBuilder({ ...builder, ...patch });

  const setCond = (gi, ci, patch) =>
    set({ groups: builder.groups.map((g, j) => (j === gi ? g.map((c, k) => (k === ci ? { ...c, ...patch } : c)) : g)) });

  const changeField = (gi, ci, field) => {
    const m = fieldMeta[field];
    const valorPadrao = m.value === "number" ? 0
      : m.value === "date" ? ""
      : m.value === "text" ? ""
      : (m.values[0] || "");
    setCond(gi, ci, { field, op: m.ops[0], value: valorPadrao });
  };

  const addCondicao = (gi) => set({ groups: builder.groups.map((g, j) => (j === gi ? [...g, novaCondicao()] : g)) });

  const removeCondicao = (gi, ci) =>
    set({
      groups: builder.groups
        .map((g, j) => (j === gi ? g.filter((_, k) => k !== ci) : g))
        .filter((g, j) => g.length > 0 || builder.groups.length === 1),
    });

  const addGrupo = () => set({ groups: [...builder.groups, novoGrupo()] });
  const removeGrupo = (gi) => set({ groups: builder.groups.filter((_, j) => j !== gi) });

  const preview = patients.filter((p) => matchSeg(p, builder)).length;

  return (
    <Modal title={builder.id ? "Editar segmentação" : "Nova segmentação"} onClose={onClose} wide>
      <Field label="Nome"><input style={s.input} value={builder.nome} onChange={(e) => set({ nome: e.target.value })} placeholder="Ex: Reativação +120D" /></Field>

      {builder.groups.map((group, gi) => (
        <div key={gi} style={{ marginBottom: 10 }}>
          {gi > 0 && (
            <div style={{ display: "flex", alignItems: "center", gap: 8, margin: "10px 0" }}>
              <div style={{ flex: 1, height: 1, background: T.line }} />
              <b style={{ fontSize: 12, color: T.coral }}>OU</b>
              <div style={{ flex: 1, height: 1, background: T.line }} />
            </div>
          )}
          <div style={{ border: `1.5px dashed ${T.line}`, borderRadius: 12, padding: 10 }}>
            <div style={{ display: "grid", gap: 8 }}>
              {group.map((c, ci) => {
                const m = fieldMeta[c.field] || fieldMeta.financ;
                return (
                  <div key={ci} style={s.condRow}>
                    <span style={{ width: 24, fontSize: 12, fontWeight: 700, color: ci > 0 ? T.primary : "transparent" }}>{ci > 0 ? "E" : ""}</span>
                    <select value={c.field} onChange={(e) => changeField(gi, ci, e.target.value)} style={s.condSelect}>
                      {Object.entries(fieldMeta).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
                    </select>
                    <select value={c.op} onChange={(e) => setCond(gi, ci, { op: e.target.value })} style={s.condSelect}>
                      {m.ops.map((o) => <option key={o} value={o}>{OP_LABEL[o]}</option>)}
                    </select>
                    {OPS_SEM_VALOR.includes(c.op) ? (
                      <span style={{ ...s.condSelect, display: "flex", alignItems: "center", color: T.inkSoft, background: "transparent", border: "none" }}>sem valor</span>
                    ) : m.value === "number" ? (
                      <input type="number" value={c.value} onChange={(e) => setCond(gi, ci, { value: e.target.value })} style={{ ...s.condSelect, width: 84 }} />
                    ) : m.value === "date" ? (
                      <input type="date" value={c.value} onChange={(e) => setCond(gi, ci, { value: e.target.value })} style={{ ...s.condSelect, width: 150 }} />
                    ) : m.value === "text" ? (
                      <input type="text" value={c.value} onChange={(e) => setCond(gi, ci, { value: e.target.value })} placeholder="Valor..." style={s.condSelect} />
                    ) : (
                      <select value={c.value} onChange={(e) => setCond(gi, ci, { value: e.target.value })} style={s.condSelect}>
                        {m.values.map((v) => <option key={v} value={v}>{v}</option>)}
                      </select>
                    )}
                    <button onClick={() => removeCondicao(gi, ci)} style={s.condRm}>×</button>
                  </div>
                );
              })}
            </div>
            <div style={{ display: "flex", gap: 8, marginTop: 8 }}>
              <button style={s.btnGhostSm} onClick={() => addCondicao(gi)}>+ Condição (E)</button>
              {builder.groups.length > 1 && <button style={s.btnGhostSm} onClick={() => removeGrupo(gi)}>Remover grupo</button>}
            </div>
          </div>
        </div>
      ))}

      <button style={{ ...s.btnGhostSm, marginTop: 4 }} onClick={addGrupo}>+ Grupo (OU)</button>

      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: 18, padding: "12px 14px", background: T.primarySoft, borderRadius: 12 }}>
        <span style={{ fontSize: 13, color: T.primaryDark, fontWeight: 600 }}>Captura agora:</span>
        <b style={{ fontSize: 18, color: T.primaryDark }}>{contagemLabel(preview)}</b>
      </div>
      <div style={{ display: "flex", gap: 10, marginTop: 16 }}>
        <button style={{ ...s.btnGhost, flex: 1 }} onClick={onClose}>Cancelar</button>
        <button style={{ ...s.btnPrimary, flex: 1, opacity: salvando ? .6 : 1 }} onClick={onSave} disabled={salvando}>{salvando ? "Salvando..." : "Salvar"}</button>
      </div>
    </Modal>
  );
}
