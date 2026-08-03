import { useEffect, useState } from "react";
import { T } from "../theme";
import { s } from "../styles/s";
import { dataHora } from "../utils/format";
import { Card } from "../components/ui/Card";
import { Field } from "../components/ui/Field";
import { Select } from "../components/ui/Select";
import { Modal } from "../components/ui/Modal";
import { DotMenu } from "../components/ui/DotMenu";
import { IconSend } from "../components/icons";
import { listNumeros } from "../api/whatsappNumeros";
import { dispatchCampaign, getCampaignPerformance } from "../api/campaigns";
import { matchSeg } from "../utils/patients";

const vazio = () => ({ id: null, nome: "", objetivo: "Reativação", canal: "WhatsApp", emailMsg: "", segmentoId: "", templateId: "", intervaloSegundos: 6, whatsappNumeroId: "", modoProspects: false });

export function Campanhas({ campanhas, onCriarCampanha, onAtualizarCampanha, onExcluirCampanha, onArquivarCampanha, templates, objetivos, objetivoObjetos, onCriarObjetivo, onExcluirObjetivo, segmentos, patients, onDisparar, showToast, usuario }) {
  const responsavel = usuario?.nome || "Você";
  const souAdmin = usuario?.papel === "ADMIN";
  const [modal, setModal] = useState(null);
  const [salvando, setSalvando] = useState(false);
  const [f, setF] = useState(vazio());
  const [novoObj, setNovoObj] = useState("");
  const [fObjetivo, setFObjetivo] = useState("Todos");
  const [verArquivadas, setVerArquivadas] = useState(false);
  const [numeros, setNumeros] = useState([]);
  // Numero de aquecimento (Sorr.ia Protect) nunca aparece como opcao de
  // disparo de campanha/A-B-C - existe so pra trocar mensagem com outro
  // numero de aquecimento, nunca com lead real.
  const numerosDisparo = numeros.filter((n) => n.finalidade !== "AQUECIMENTO");
  const [performance, setPerformance] = useState({}); // {[campanhaId]: dados | "carregando"}
  const [abModal, setAbModal] = useState(null); // null | {segmentoId, variantes: [idA, idB, idC?], numeroIds: []}
  const [disparandoAB, setDisparandoAB] = useState(false);
  const ativos = templates.filter((t) => t.ativo && !t.arquivado);

  useEffect(() => { listNumeros().then(setNumeros).catch(() => setNumeros([])); }, []);

  // Performance calculada sob demanda, escondida ate o usuario clicar - "não
  // precisa ficar a mostra fulltime" (pedido explicito). Clicar de novo esconde.
  const alternarPerformance = async (id) => {
    if (performance[id]) {
      setPerformance((p) => { const cp = { ...p }; delete cp[id]; return cp; });
      return;
    }
    setPerformance((p) => ({ ...p, [id]: "carregando" }));
    try {
      const dados = await getCampaignPerformance(id);
      setPerformance((p) => ({ ...p, [id]: dados }));
    } catch (e) {
      showToast(e.message || "Erro ao calcular performance", "warn");
      setPerformance((p) => { const cp = { ...p }; delete cp[id]; return cp; });
    }
  };

  // Disparo A/B(/C): divide quem a segmentacao captura hoje em N variantes
  // (blocos aleatorios do mesmo tamanho) e dispara cada uma pra uma campanha
  // diferente - cada campanha ja e' seu proprio grupo/historico, sem precisar
  // de nenhum campo novo de "variante". Se mais de 1 numero for escolhido,
  // CADA variante e' dividida de novo entre os numeros (ex.: 2 variantes x 2
  // numeros = 4 blocos), via o override de whatsappNumeroId no dispatch -
  // nao muda o numero salvo na campanha, so esse disparo especifico.
  // Confirma direto aqui (sem passar pela tela de revisão do Disparo normal).
  const confirmarDisparoAB = async () => {
    const variantesValidas = abModal.variantes.filter(Boolean);
    if (variantesValidas.length < 2) return showToast("Escolha pelo menos 2 variantes", "warn");
    if (new Set(variantesValidas).size !== variantesValidas.length) return showToast("Escolha uma campanha diferente pra cada variante", "warn");
    if (!abModal.segmentoId) return showToast("Escolha uma segmentação", "warn");
    if (!abModal.numeroIds.length) return showToast("Escolha por qual número disparar", "warn");
    const segmento = segmentos.find((sg) => sg.id === abModal.segmentoId);
    const capturados = patients.filter((p) => matchSeg(p, segmento));
    if (!capturados.length) return showToast("Nenhum lead capturado por essa segmentação", "warn");
    setDisparandoAB(true);
    try {
      const embaralhados = [...capturados].sort(() => Math.random() - 0.5);
      const nV = variantesValidas.length;
      const nN = abModal.numeroIds.length;
      const chamadas = [];
      variantesValidas.forEach((campanhaId, vi) => {
        const inicioV = Math.floor((vi * embaralhados.length) / nV);
        const fimV = Math.floor(((vi + 1) * embaralhados.length) / nV);
        const grupoVariante = embaralhados.slice(inicioV, fimV);
        abModal.numeroIds.forEach((numeroId, ni) => {
          const inicioN = Math.floor((ni * grupoVariante.length) / nN);
          const fimN = Math.floor(((ni + 1) * grupoVariante.length) / nN);
          const ids = grupoVariante.slice(inicioN, fimN).map((p) => p.id);
          if (ids.length) chamadas.push(dispatchCampaign(campanhaId, null, ids, numeroId || null));
        });
      });
      const resultados = await Promise.all(chamadas);
      const totalEntregues = resultados.reduce((acc, r) => acc + (r.entregues || 0), 0);
      const totalGeral = resultados.reduce((acc, r) => acc + (r.total || 0), 0);
      const letras = "ABC".slice(0, nV).split("").join("/");
      showToast(`Disparo ${letras} feito — ${totalEntregues}/${totalGeral} entregues, em ${nN} número(s)`, "ok");
      setAbModal(null);
    } catch (e) {
      showToast(e.message || "Erro no disparo A/B", "warn");
    } finally {
      setDisparandoAB(false);
    }
  };

  const abrirNovo = () => { setF(vazio()); setModal("novo"); };
  const abrirEdicao = (c) => {
    setF({ id: c.id, nome: c.nome, objetivo: c.objetivo, canal: c.canal, emailMsg: c.emailMsg || "", segmentoId: c.segmentoId || "", templateId: c.templateId || "", intervaloSegundos: c.intervaloSegundos || 6, whatsappNumeroId: c.whatsappNumeroId || "", modoProspects: !!c.modoProspects });
    setModal("editar");
  };

  const salvar = async () => {
    if (!f.nome.trim()) return showToast("Dê um nome", "warn");
    if (f.canal === "WhatsApp" && !f.templateId) return showToast("Escolha um template", "warn");
    setSalvando(true);
    try {
      const { id, segmentoId, ...dadosApi } = f;
      const payload = { ...dadosApi, templateId: dadosApi.templateId || null, whatsappNumeroId: dadosApi.whatsappNumeroId || null, responsavel };
      if (id) {
        await onAtualizarCampanha(id, { ...payload, status: "Ativa", inicio: campanhas.find((c) => c.id === id)?.inicio }, segmentoId || null);
        showToast("Campanha atualizada", "ok");
      } else {
        await onCriarCampanha({ ...payload, status: "Ativa", inicio: new Date().toLocaleDateString("pt-BR") }, segmentoId || null);
        showToast("Campanha criada", "ok");
      }
      setModal(null);
    } catch (e) {
      showToast(e.message || "Erro ao salvar campanha", "warn");
    } finally {
      setSalvando(false);
    }
  };

  const duplicar = async (c) => {
    try {
      await onCriarCampanha({
        nome: `${c.nome} (cópia)`, objetivo: c.objetivo, canal: c.canal, emailMsg: c.emailMsg || "",
        templateId: c.templateId || null, responsavel, status: "Ativa", inicio: new Date().toLocaleDateString("pt-BR"),
        intervaloSegundos: c.intervaloSegundos || 6, whatsappNumeroId: c.whatsappNumeroId || null,
      }, c.segmentoId || null);
      showToast("Campanha duplicada", "ok");
    } catch (e) {
      showToast(e.message || "Erro ao duplicar campanha", "warn");
    }
  };

  const excluir = async (c) => {
    try {
      await onExcluirCampanha(c.id);
      showToast("Campanha removida", "ok");
    } catch (e) {
      showToast(e.message || "Erro ao remover campanha", "warn");
    }
  };

  const arquivar = async (c) => {
    try {
      await onArquivarCampanha(c.id, !c.arquivado);
      showToast(c.arquivado ? "Campanha reativada" : "Campanha arquivada", "ok");
    } catch (e) {
      showToast(e.message || "Erro ao arquivar campanha", "warn");
    }
  };

  const addObj = async () => {
    const o = novoObj.trim();
    if (!o || objetivos.includes(o)) return;
    try {
      await onCriarObjetivo(o);
      setF((x) => ({ ...x, objetivo: o }));
      setNovoObj("");
      showToast("Objetivo criado", "ok");
    } catch (e) {
      showToast(e.message || "Erro ao criar objetivo", "warn");
    }
  };

  const excluirObj = async (obj) => {
    if (!confirm(`Excluir o objetivo "${obj.nome}"?`)) return;
    try {
      await onExcluirObjetivo(obj.id);
      if (f.objetivo === obj.nome) setF((x) => ({ ...x, objetivo: "" }));
    } catch (e) {
      showToast(e.message || "Erro ao excluir objetivo", "warn");
    }
  };

  const lista = campanhas.filter((c) => {
    if (!!c.arquivado !== verArquivadas) return false;
    if (fObjetivo !== "Todos" && c.objetivo !== fObjetivo) return false;
    return true;
  });

  return (
    <div style={{ display: "grid", gap: 14 }}>
      <div style={s.toolbar}>
        <Select value={fObjetivo} onChange={setFObjetivo} options={["Todos", ...objetivos]} />
        <div style={s.toggle}>
          <button style={{ ...s.toggleBtn, ...(!verArquivadas ? { background: "#fff", color: T.ink } : {}) }} onClick={() => setVerArquivadas(false)}>Ativas</button>
          <button style={{ ...s.toggleBtn, ...(verArquivadas ? { background: "#fff", color: T.ink } : {}) }} onClick={() => setVerArquivadas(true)}>Arquivadas</button>
        </div>
        <div style={{ flex: 1 }} />
        <button style={s.btnGhostSm} onClick={() => setAbModal({ segmentoId: "", variantes: ["", ""], numeroIds: [] })}>Disparo A/B</button>
        <button style={s.btnPrimarySm} onClick={abrirNovo}>+ Nova campanha</button>
      </div>
      {!lista.length && <Card><div style={{ textAlign: "center", padding: 20, color: T.inkSoft }}>{verArquivadas ? "Nenhuma campanha arquivada." : "Nenhuma campanha ativa. Crie a primeira."}</div></Card>}
      <div style={s.cardGrid}>
        {lista.map((c) => (
          <div key={c.id} style={{ ...s.campCard, display: "flex", flexDirection: "column", opacity: c.arquivado ? .7 : 1 }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <span style={{ ...s.objTag, background: T.primarySoft, color: T.primaryDark }}>{c.objetivo}</span>
              <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                <span style={{ ...s.tagOk, background: c.canal === "Email" ? "#EDEBFF" : "#E1F4F0", color: c.canal === "Email" ? "#5B4CE0" : "#0E9484" }}>{c.canal}</span>
                <DotMenu
                  items={[
                    { label: "Editar", onClick: () => abrirEdicao(c) },
                    { label: "Duplicar", onClick: () => duplicar(c) },
                    { label: c.arquivado ? "Reativar" : "Arquivar", onClick: () => arquivar(c) },
                    { label: "Excluir", danger: true, onClick: () => excluir(c) },
                  ]}
                />
              </div>
            </div>
            <div style={{ fontWeight: 700, fontSize: 16, color: T.ink, margin: "12px 0 4px" }}>{c.nome}</div>
            <div style={{ fontSize: 12.5, color: T.inkSoft }}>{c.responsavel} · {c.inicio}</div>
            <div style={{ display: "grid", gap: 4, marginTop: 4, flex: 1 }}>
              {c.modoProspects && <div style={{ fontSize: 11.5, color: T.coral, fontWeight: 700 }}>⚠ Prospects (fora do CRM)</div>}
              {!c.modoProspects && c.segmentoId && <div style={{ fontSize: 11.5, color: T.primary, fontWeight: 600 }}>Segmentação: {segmentos.find((sg) => sg.id === c.segmentoId)?.nome || "—"}</div>}
              {c.templateId && <div style={{ fontSize: 11.5, color: T.inkSoft }}>Template: {templates.find((t) => t.id === c.templateId)?.nome || "—"}</div>}
              {c.atualizadoEm && <div style={{ fontSize: 10.5, color: T.inkSoft }}>Editado em {dataHora(c.atualizadoEm)}</div>}
            </div>
            {performance[c.id] && (
              performance[c.id] === "carregando" ? (
                <div style={{ fontSize: 11.5, color: T.inkSoft, marginTop: 8 }}>Calculando...</div>
              ) : (
                <div style={{ display: "flex", gap: 10, marginTop: 8, padding: "8px 10px", background: T.lineSoft, borderRadius: 8, fontSize: 11.5 }}>
                  <span>Enviados: <b style={{ color: T.ink }}>{performance[c.id].enviados}</b></span>
                  <span>Entregues: <b style={{ color: T.ink }}>{Math.round(performance[c.id].taxaEntregaPct)}%</b></span>
                  <span>Respondidos: <b style={{ color: T.primary }}>{Math.round(performance[c.id].taxaRespostaPct)}%</b></span>
                </div>
              )
            )}
            <button style={{ ...s.btnGhostSm, marginTop: 8, width: "100%", justifyContent: "center" }} onClick={() => alternarPerformance(c.id)}>
              {performance[c.id] ? "Esconder performance" : "Ver performance"}
            </button>
            <button onClick={() => onDisparar(c)} style={{ ...s.btnWa, marginTop: 8, width: "100%", justifyContent: "center" }}><IconSend color="#fff" /> Disparar campanha</button>
          </div>
        ))}
      </div>
      {modal && (
        <Modal title={f.id ? "Editar campanha" : "Nova campanha"} onClose={() => setModal(null)}>
          <Field label="Nome da campanha"><input style={s.input} value={f.nome} onChange={(e) => setF({ ...f, nome: e.target.value })} placeholder="Ex: Reativação Agosto" /></Field>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
            <Field label="Canal"><Select block value={f.canal} onChange={(v) => setF({ ...f, canal: v })} options={["WhatsApp", "Email"]} /></Field>
            <Field label="Responsável"><input style={{ ...s.input, background: T.lineSoft, color: T.inkSoft }} value={responsavel} disabled /></Field>
          </div>
          <Field label="Objetivo">
            <Select block value={f.objetivo} onChange={(v) => setF({ ...f, objetivo: v })} options={objetivos} />
            <div style={{ display: "flex", gap: 8, marginTop: 8 }}>
              <input style={{ ...s.input, height: 38 }} placeholder="Criar novo objetivo..." value={novoObj} onChange={(e) => setNovoObj(e.target.value)} onKeyDown={(e) => e.key === "Enter" && addObj()} />
              <button style={s.btnGhostSm} onClick={addObj}>+ Add</button>
            </div>
            {souAdmin && (
              <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginTop: 8 }}>
                {objetivoObjetos.map((obj) => (
                  <span key={obj.id} style={{ ...s.objTag, background: T.lineSoft, color: T.inkSoft, display: "flex", alignItems: "center", gap: 5 }}>
                    {obj.nome}
                    <span onClick={() => excluirObj(obj)} style={{ cursor: "pointer", fontWeight: 700 }} title="Excluir objetivo">×</span>
                  </span>
                ))}
              </div>
            )}
          </Field>
          <div style={{ border: `1.5px dashed ${T.coral}`, borderRadius: 10, padding: 10, marginBottom: 4 }}>
            <label style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 13, fontWeight: 700, color: T.ink }}>
              <input type="checkbox" checked={f.modoProspects} onChange={(e) => setF({ ...f, modoProspects: e.target.checked, segmentoId: "" })} />
              Disparo pra prospects (fora do CRM)
            </label>
            <div style={{ fontSize: 11.5, color: T.coral, fontWeight: 600, marginTop: 6 }}>
              Atenção: os números que subirem por aqui vão receber a mensagem de WhatsApp, mas NÃO
              serão salvos no CRM (não viram lead, não entram na Base de Leads). Só o total de
              disparos fica registrado no Painel Executivo.
            </div>
          </div>
          {!f.modoProspects && (
            <Field label="Segmentação (opcional)">
              <select
                style={{ ...s.select, width: "100%" }}
                value={f.segmentoId || ""}
                onChange={(e) => setF({ ...f, segmentoId: e.target.value ? Number(e.target.value) : "" })}
              >
                <option value="">Sem segmentação (toda a base elegível)</option>
                {segmentos.filter((sg) => !sg.arquivado || sg.id === f.segmentoId).map((sg) => <option key={sg.id} value={sg.id}>{sg.nome}</option>)}
              </select>
              <div style={{ fontSize: 11.5, color: T.inkSoft, marginTop: 6 }}>
                {f.segmentoId ? `Disparo restrito à segmentação "${segmentos.find((sg) => sg.id === f.segmentoId)?.nome}".` : "Sem segmentação: dispara pra toda a base elegível."}
              </div>
            </Field>
          )}
          {f.canal === "Email" && (
            <Field label="Mensagem de email (não personalizada nesta fase)">
              <textarea style={s.textarea} rows={3} value={f.emailMsg} onChange={(e) => setF({ ...f, emailMsg: e.target.value })} placeholder="Texto simples do email..." />
            </Field>
          )}
          {f.canal === "WhatsApp" && (
            <Field label="Template">
              <select
                style={{ ...s.select, width: "100%" }}
                value={f.templateId || ""}
                onChange={(e) => setF({ ...f, templateId: e.target.value ? Number(e.target.value) : "" })}
              >
                <option value="">Selecione um template ativo...</option>
                {ativos.map((t) => <option key={t.id} value={t.id}>{t.nome}</option>)}
              </select>
              {!ativos.length && <div style={{ fontSize: 11.5, color: T.coral, marginTop: 6 }}>Nenhum template ativo — crie um na aba Templates.</div>}
            </Field>
          )}
          {f.canal === "WhatsApp" && !!numerosDisparo.length && (
            <Field label="Número de disparo">
              <Select
                block
                value={f.whatsappNumeroId}
                onChange={(v) => setF({ ...f, whatsappNumeroId: v ? Number(v) : "" })}
                options={["", ...numerosDisparo.map((n) => n.id)]}
                labels={{ "": "Número principal", ...Object.fromEntries(numerosDisparo.map((n) => [n.id, n.nome])) }}
              />
            </Field>
          )}
          {f.canal === "WhatsApp" && (
            <Field label="Intervalo entre envios (segundos)">
              <input
                type="number" min={6} max={30} style={{ ...s.input, maxWidth: 120 }}
                value={f.intervaloSegundos}
                onChange={(e) => setF({ ...f, intervaloSegundos: Math.max(6, Math.min(30, Number(e.target.value) || 6)) })}
              />
              <div style={{ fontSize: 11.5, color: T.inkSoft, marginTop: 6 }}>
                Pausa entre uma mensagem e outra. Mínimo 6s — rajadas sem
                intervalo aumentam o risco do número ser marcado como spam pelo WhatsApp.
              </div>
            </Field>
          )}
          <div style={{ display: "flex", gap: 10 }}>
            <button style={{ ...s.btnGhost, flex: 1 }} onClick={() => setModal(null)}>Cancelar</button>
            <button style={{ ...s.btnPrimary, flex: 1, opacity: salvando ? .6 : 1 }} onClick={salvar} disabled={salvando}>{salvando ? "Salvando..." : f.id ? "Salvar alterações" : "Criar campanha"}</button>
          </div>
        </Modal>
      )}
      {abModal && (() => {
        const candidatas = campanhas.filter((c) => c.canal === "WhatsApp" && !c.arquivado && !c.modoProspects);
        const segmento = segmentos.find((sg) => sg.id === abModal.segmentoId);
        const capturados = segmento ? patients.filter((p) => matchSeg(p, segmento)) : [];
        const nV = abModal.variantes.length;
        const letras = "ABC".slice(0, nV).split("");
        const setVariante = (i, v) => setAbModal({ ...abModal, variantes: abModal.variantes.map((x, xi) => (xi === i ? (v ? Number(v) : "") : x)) });
        const toggleNumero = (id) => setAbModal({
          ...abModal,
          numeroIds: abModal.numeroIds.includes(id) ? abModal.numeroIds.filter((x) => x !== id) : [...abModal.numeroIds, id],
        });
        return (
          <Modal title={`Disparo ${letras.join("/")}`} onClose={() => setAbModal(null)}>
            <div style={{ fontSize: 13, color: T.inkSoft, marginBottom: 14 }}>
              Divide quem a segmentação captura hoje em {nV} grupos aleatórios do mesmo tamanho e
              dispara cada um pra uma campanha diferente (variante) — dá pra comparar performance
              depois (botão "Ver performance" no card). Se escolher mais de 1 número, cada variante
              também é dividida entre os números escolhidos.
            </div>
            <Field label="Segmentação">
              <select style={{ ...s.select, width: "100%" }} value={abModal.segmentoId || ""} onChange={(e) => setAbModal({ ...abModal, segmentoId: e.target.value ? Number(e.target.value) : "" })}>
                <option value="">Selecione...</option>
                {segmentos.filter((sg) => !sg.arquivado).map((sg) => <option key={sg.id} value={sg.id}>{sg.nome}</option>)}
              </select>
              {segmento && <div style={{ fontSize: 11.5, color: T.inkSoft, marginTop: 6 }}>{capturados.length} lead(s) capturado(s) — ~{Math.ceil(capturados.length / nV)} pra cada variante.</div>}
            </Field>
            <div style={{ display: "grid", gridTemplateColumns: nV === 3 ? "1fr 1fr 1fr" : "1fr 1fr", gap: 12 }}>
              {abModal.variantes.map((valor, i) => (
                <Field key={i} label={`Variante ${letras[i]}`}>
                  <select style={{ ...s.select, width: "100%" }} value={valor || ""} onChange={(e) => setVariante(i, e.target.value)}>
                    <option value="">Selecione...</option>
                    {candidatas.map((c) => <option key={c.id} value={c.id}>{c.nome}</option>)}
                  </select>
                </Field>
              ))}
            </div>
            {nV < 3 ? (
              <button style={{ ...s.btnGhostSm, marginTop: 8 }} onClick={() => setAbModal({ ...abModal, variantes: [...abModal.variantes, ""] })}>
                + Adicionar variante C (opcional)
              </button>
            ) : (
              <button style={{ ...s.btnGhostSm, marginTop: 8 }} onClick={() => setAbModal({ ...abModal, variantes: abModal.variantes.slice(0, 2) })}>
                Remover variante C
              </button>
            )}
            <Field label="Você quer disparar por qual número?">
              <div style={{ display: "grid", gap: 6, marginTop: 4 }}>
                <label style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 13, color: T.ink }}>
                  <input type="checkbox" checked={abModal.numeroIds.includes("")} onChange={() => toggleNumero("")} />
                  Número principal
                </label>
                {numerosDisparo.map((n) => (
                  <label key={n.id} style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 13, color: T.ink }}>
                    <input type="checkbox" checked={abModal.numeroIds.includes(n.id)} onChange={() => toggleNumero(n.id)} />
                    {n.nome}
                  </label>
                ))}
              </div>
            </Field>
            <div style={{ display: "flex", gap: 10, marginTop: 16 }}>
              <button style={{ ...s.btnGhost, flex: 1 }} onClick={() => setAbModal(null)}>Cancelar</button>
              <button style={{ ...s.btnWa, flex: 1, opacity: disparandoAB ? .6 : 1 }} onClick={confirmarDisparoAB} disabled={disparandoAB}>
                {disparandoAB ? "Disparando..." : `Disparar ${letras.join("/")}`}
              </button>
            </div>
          </Modal>
        );
      })()}
    </div>
  );
}
