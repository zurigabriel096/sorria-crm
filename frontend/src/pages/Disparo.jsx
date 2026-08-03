import { useMemo, useRef, useState } from "react";
import { T } from "../theme";
import { s } from "../styles/s";
import { brl, num, pct } from "../utils/format";
import { dispatchCampaign, dispatchProspects } from "../api/campaigns";
import { matchSeg, lerPlanilhaBruta } from "../utils/patients";
import { PRECOS } from "../data/seed";
import { Card } from "../components/ui/Card";
import { Metric } from "../components/ui/Metric";
import { Field } from "../components/ui/Field";
import { Select } from "../components/ui/Select";
import { Modal } from "../components/ui/Modal";
import { IconSend, IconUpload } from "../components/icons";

// Confirmacao final antes de disparar de verdade (pedido explicito do
// Samuel: evitar clique acidental no botao "Disparar", ja que manda WhatsApp
// real e nao tem como desfazer). Compartilhado pelos 2 fluxos abaixo (normal
// e prospects).
function ConfirmarDisparoModal({ quantidade, onConfirmar, onCancelar }) {
  return (
    <Modal title="Confirmar disparo" onClose={onCancelar}>
      <div style={{ fontSize: 14, color: T.ink, marginBottom: 18 }}>
        Tem certeza que quer disparar essa campanha agora pra <b>{num(quantidade)}</b> pessoa(s)? Essa ação não pode ser desfeita.
      </div>
      <div style={{ display: "flex", gap: 10 }}>
        <button style={{ ...s.btnGhost, flex: 1 }} onClick={onCancelar}>Não</button>
        <button style={{ ...s.btnWa, flex: 1, justifyContent: "center" }} onClick={onConfirmar}>Sim, disparar</button>
      </div>
    </Modal>
  );
}

// Dispara de verdade via backend (que fala com a Evolution API GO). Quando a campanha
// tem uma segmentação associada, restringimos aqui os elegíveis a quem casa com ela e
// mandamos os ids explicitamente; sem segmentação, dispara pra toda a base elegível.
// "enviado" no contato é só o status do último disparo (exibição), não trava elegibilidade
// pra sempre — o que impede reenvio é já ter disparo registrado PRA ESSA campanha.
export function DisparoFlow({ campanha, patients, templates, segmentos, historico, onFinish, onCancel, showToast }) {
  const camp = campanha;
  const email = camp?.canal === "Email";
  const segmento = camp?.segmentoId ? segmentos?.find((sg) => sg.id === camp.segmentoId) : null;
  const elegiveis = useMemo(() => {
    const jaDisparado = new Set((historico || []).filter((h) => h.campanha === camp?.nome).map((h) => h.contatoId));
    const base = patients.filter((p) => p.elegivel && !jaDisparado.has(p.id));
    return segmento ? base.filter((p) => matchSeg(p, segmento)) : base;
  }, [patients, segmento, historico, camp?.nome]);
  const [step, setStep] = useState("revisar");
  const [tpl, setTpl] = useState(() => templates.find((t) => t.id === camp?.templateId) || null);
  const [trocandoTpl, setTrocandoTpl] = useState(!camp?.templateId);
  const [resultado, setResultado] = useState(null);
  const [confirmando, setConfirmando] = useState(false);
  const custo = elegiveis.length * (email ? PRECOS.msgEmail : PRECOS.msgWhats);
  const ativos = templates.filter((t) => t.ativo && !t.arquivado);

  const iniciar = async () => {
    setStep("enviando");
    try {
      const contatoIds = segmento ? elegiveis.map((p) => p.id) : null;
      const res = await dispatchCampaign(camp.id, email ? null : tpl?.id, contatoIds);
      setResultado(res);
      setStep("resumo");
    } catch (e) {
      showToast(e.message || "Erro ao disparar campanha", "warn");
      setStep("revisar");
    }
  };

  // Depois de todos os hooks (regra do React) - campanha em modo prospects usa
  // um fluxo totalmente separado (DisparoProspectsFlow tem os próprios hooks).
  if (camp?.modoProspects) {
    return <DisparoProspectsFlow camp={camp} templates={templates} onFinish={onFinish} onCancel={onCancel} showToast={showToast} />;
  }

  if (!camp) return <Card title="Disparo"><p style={{ color: T.inkSoft }}>Selecione uma campanha.</p></Card>;

  const podeEnviar = elegiveis.length && (email || tpl);

  return (
    <div style={{ maxWidth: 760, margin: "0 auto", display: "grid", gap: 16 }}>
      <Steps step={step} />
      {step === "revisar" && (
        <>
          <Card title={`${camp.nome} · ${camp.canal}`}>
            {segmento && (
              <div style={{ fontSize: 12.5, color: T.primaryDark, fontWeight: 600, marginBottom: 10 }}>
                Restrito à segmentação "{segmento.nome}"
              </div>
            )}
            <div style={s.summaryRow}>
              <Metric label="Destinatários elegíveis (prévia)" value={num(elegiveis.length)} />
              <Metric label="Canal" value={email ? "Email" : "WhatsApp oficial"} />
              <Metric label="Custo estimado" value={brl(custo)} />
            </div>
          </Card>
          {email ? (
            <Card title="Mensagem de email">
              <div style={{ fontSize: 13, color: T.inkSoft, marginBottom: 8 }}>Nesta fase o email é simples (não personalizado). Leitor de HTML entra depois.</div>
              <textarea style={s.textarea} rows={4} defaultValue={camp.emailMsg || "Olá! Temos novidades na Orthodontic..."} />
            </Card>
          ) : tpl && !trocandoTpl ? (
            <Card title="Template da campanha">
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                <div>
                  <b style={{ fontSize: 13.5, color: T.ink }}>{tpl.nome}</b>
                  <span style={{ marginLeft: 8, fontSize: 10.5, fontWeight: 700, color: tpl.categoria === "Marketing" ? T.gold : "#0E9484" }}>{tpl.categoria}</span>
                </div>
                <button style={s.btnGhostSm} onClick={() => setTrocandoTpl(true)}>Trocar template</button>
              </div>
              <div style={{ ...s.waPreview, marginTop: 14 }}>
                <div style={s.waBubble}>
                  {tpl.corpo.replace(/\{nome\}/g, elegiveis[0]?.primeiro || "Maria").replace(/\{data\}/g, "05/08").replace(/\{hora\}/g, "14:30")}
                </div>
              </div>
            </Card>
          ) : (
            <Card title="Escolha o template ativo">
              {!ativos.length ? (
                <div style={{ color: T.inkSoft, fontSize: 13 }}>Nenhum template ativo. Crie um na aba Templates.</div>
              ) : (
                <div style={s.tplGrid}>
                  {ativos.map((t) => (
                    <button key={t.id} onClick={() => { setTpl(t); setTrocandoTpl(false); }} style={{ ...s.tplPick, ...(tpl?.id === t.id ? { outline: `2.5px solid ${T.primary}`, background: T.primarySoft } : {}) }}>
                      <div style={{ display: "flex", justifyContent: "space-between" }}>
                        <b style={{ fontSize: 13, color: T.ink }}>{t.nome}</b>
                        <span style={{ fontSize: 10.5, fontWeight: 700, color: t.categoria === "Marketing" ? T.gold : "#0E9484" }}>{t.categoria}</span>
                      </div>
                      <div style={{ fontSize: 12, color: T.inkSoft, marginTop: 6, lineHeight: 1.4 }}>{t.corpo.slice(0, 90)}{t.corpo.length > 90 ? "..." : ""}</div>
                    </button>
                  ))}
                </div>
              )}
            </Card>
          )}
          <div style={{ display: "flex", gap: 10 }}>
            <button style={{ ...s.btnGhost, flex: 1 }} onClick={onCancel}>Cancelar</button>
            <button style={{ ...s.btnWa, flex: 2, justifyContent: "center", opacity: podeEnviar ? 1 : .4, cursor: podeEnviar ? "pointer" : "not-allowed" }} disabled={!podeEnviar} onClick={() => setConfirmando(true)}>
              <IconSend color="#fff" /> Disparar para {elegiveis.length}
            </button>
          </div>
          <p style={{ fontSize: 12, color: T.inkSoft, textAlign: "center" }}>O envio roda no servidor e fala de verdade com o WhatsApp conectado.</p>
        </>
      )}
      {confirmando && (
        <ConfirmarDisparoModal
          quantidade={elegiveis.length}
          onCancelar={() => setConfirmando(false)}
          onConfirmar={() => { setConfirmando(false); iniciar(); }}
        />
      )}
      {step === "enviando" && (
        <Card title="Enviando campanha...">
          <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
            <div style={s.spinner} />
            <div style={{ fontWeight: 700, color: T.ink }}>Disparando pelo WhatsApp, aguarde...</div>
          </div>
        </Card>
      )}
      {step === "resumo" && resultado && (
        <Card title="Campanha concluída">
          <div style={s.summaryRow}>
            <Metric label="Enviados" value={num(resultado.total)} />
            <Metric label="Entregues" value={num(resultado.entregues)} accent={T.wa} />
            <Metric label="Taxa" value={pct((resultado.entregues / (resultado.total || 1)) * 100)} />
            <Metric label="Falhas" value={num(resultado.falhas)} accent={resultado.falhas ? T.coral : undefined} />
          </div>
          <button style={{ ...s.btnPrimary, width: "100%", marginTop: 16 }} onClick={onFinish}>Ver histórico</button>
        </Card>
      )}
    </div>
  );
}

function Steps({ step }) {
  const order = ["revisar", "enviando", "resumo"];
  const labels = { revisar: "Revisar", enviando: "Enviando", resumo: "Resultado" };
  const idx = order.indexOf(step);
  return (
    <div style={{ display: "flex", gap: 8, justifyContent: "center" }}>
      {order.map((k, i) => (
        <div key={k} style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <span style={{ ...s.stepDot, background: i <= idx ? T.primary : T.line, color: i <= idx ? "#fff" : T.inkSoft }}>{i + 1}</span>
          <span style={{ fontSize: 13, fontWeight: 600, color: i <= idx ? T.ink : T.inkSoft }}>{labels[k]}</span>
          {i < 2 && <span style={{ width: 30, height: 2, background: i < idx ? T.primary : T.line }} />}
        </div>
      ))}
    </div>
  );
}

// Disparo pra prospects (fora do CRM): a planilha e' lida so pra tirar
// telefone+nome na hora, nada disso vira Contato - nao reaproveita ImportBox/
// ImportMappingModal de proposito (aquele fluxo e' pro schema inteiro de lead,
// aqui e' so 2 campos e o resultado nunca e' persistido como cadastro).
function DisparoProspectsFlow({ camp, templates, onFinish, onCancel, showToast }) {
  const [step, setStep] = useState("revisar");
  const [tpl, setTpl] = useState(() => templates.find((t) => t.id === camp?.templateId) || null);
  const [planilha, setPlanilha] = useState(null); // {headers, rows, hi}
  const [colTelefone, setColTelefone] = useState(null);
  const [colNome, setColNome] = useState(null);
  const [resultado, setResultado] = useState(null);
  const [confirmando, setConfirmando] = useState(false);
  const inputRef = useRef(null);
  const ativos = templates.filter((t) => t.ativo && !t.arquivado);

  const escolherArquivo = async (files) => {
    const arquivo = [...files][0];
    if (!arquivo) return;
    if (!arquivo.name.match(/\.(xlsx|xls|csv)$/i)) return showToast("Envie um arquivo .xlsx", "warn");
    try {
      const { headers, rows, hi } = await lerPlanilhaBruta(arquivo);
      const idxTel = headers.findIndex((h) => /tel|fone|whats|celular/i.test(h));
      const idxNome = headers.findIndex((h) => /nome/i.test(h));
      setPlanilha({ headers, rows, hi });
      setColTelefone(idxTel >= 0 ? idxTel : 0);
      setColNome(idxNome >= 0 ? idxNome : null);
    } catch (e) {
      showToast(e.message || "Erro ao ler a planilha", "warn");
    }
  };

  const prospects = useMemo(() => {
    if (!planilha || colTelefone == null) return [];
    return planilha.rows.slice(planilha.hi + 1)
      .map((r) => ({
        telefone: String(r[colTelefone] ?? "").trim(),
        nome: colNome != null ? String(r[colNome] ?? "").trim() : "",
      }))
      .filter((p) => p.telefone);
  }, [planilha, colTelefone, colNome]);

  const iniciar = async () => {
    setStep("enviando");
    try {
      const res = await dispatchProspects(camp.id, tpl?.id, prospects);
      setResultado(res);
      setStep("resumo");
    } catch (e) {
      showToast(e.message || "Erro ao disparar pra prospects", "warn");
      setStep("revisar");
    }
  };

  const podeEnviar = !!tpl && prospects.length > 0;

  return (
    <div style={{ maxWidth: 760, margin: "0 auto", display: "grid", gap: 16 }}>
      <Steps step={step} />
      {step === "revisar" && (
        <>
          <Card title={`${camp.nome} · Prospects (fora do CRM)`}>
            <div style={{ fontSize: 12.5, color: T.coral, fontWeight: 700, marginBottom: 12 }}>
              Atenção: esses números vão receber a mensagem, mas não serão salvos no CRM — não viram
              lead, não entram na Base de Leads. Só o total do disparo fica registrado no Painel Executivo.
            </div>
            <div
              style={{ ...s.importBox, padding: 14 }}
              onDragOver={(e) => e.preventDefault()}
              onDrop={(e) => { e.preventDefault(); escolherArquivo(e.dataTransfer.files); }}
              onClick={() => inputRef.current.click()}
            >
              <IconUpload color={T.primary} />
              <div>
                <div style={{ fontWeight: 700, color: T.ink, fontSize: 14 }}>
                  {planilha ? "Trocar planilha" : "Subir planilha de prospects (.xlsx)"}
                </div>
                <div style={{ fontSize: 12.5, color: T.inkSoft }}>Arraste ou clique. Precisa de uma coluna com telefone.</div>
              </div>
            </div>
            <input ref={inputRef} type="file" accept=".xlsx,.xls,.csv" style={{ display: "none" }} onChange={(e) => escolherArquivo(e.target.files)} />
          </Card>
          {planilha && (
            <Card title="Colunas da planilha">
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                <Field label="Coluna do telefone">
                  <Select block value={String(colTelefone)} onChange={(v) => setColTelefone(Number(v))} options={planilha.headers.map((_, i) => String(i))} labels={Object.fromEntries(planilha.headers.map((h, i) => [String(i), h || `Coluna ${i + 1}`]))} />
                </Field>
                <Field label="Coluna do nome (opcional)">
                  <Select block value={colNome == null ? "" : String(colNome)} onChange={(v) => setColNome(v === "" ? null : Number(v))} options={["", ...planilha.headers.map((_, i) => String(i))]} labels={{ "": "Nenhuma", ...Object.fromEntries(planilha.headers.map((h, i) => [String(i), h || `Coluna ${i + 1}`])) }} />
                </Field>
              </div>
              <div style={{ fontSize: 12.5, color: T.inkSoft }}>{num(prospects.length)} telefone(s) válido(s) encontrado(s).</div>
            </Card>
          )}
          <Card title="Escolha o template ativo">
            {!ativos.length ? (
              <div style={{ color: T.inkSoft, fontSize: 13 }}>Nenhum template ativo. Crie um na aba Templates.</div>
            ) : (
              <div style={s.tplGrid}>
                {ativos.map((t) => (
                  <button key={t.id} onClick={() => setTpl(t)} style={{ ...s.tplPick, ...(tpl?.id === t.id ? { outline: `2.5px solid ${T.primary}`, background: T.primarySoft } : {}) }}>
                    <div style={{ display: "flex", justifyContent: "space-between" }}>
                      <b style={{ fontSize: 13, color: T.ink }}>{t.nome}</b>
                      <span style={{ fontSize: 10.5, fontWeight: 700, color: t.categoria === "Marketing" ? T.gold : "#0E9484" }}>{t.categoria}</span>
                    </div>
                    <div style={{ fontSize: 12, color: T.inkSoft, marginTop: 6, lineHeight: 1.4 }}>{t.corpo.slice(0, 90)}{t.corpo.length > 90 ? "..." : ""}</div>
                  </button>
                ))}
              </div>
            )}
          </Card>
          <div style={{ display: "flex", gap: 10 }}>
            <button style={{ ...s.btnGhost, flex: 1 }} onClick={onCancel}>Cancelar</button>
            <button style={{ ...s.btnWa, flex: 2, justifyContent: "center", opacity: podeEnviar ? 1 : .4, cursor: podeEnviar ? "pointer" : "not-allowed" }} disabled={!podeEnviar} onClick={() => setConfirmando(true)}>
              <IconSend color="#fff" /> Disparar para {num(prospects.length)} prospects
            </button>
          </div>
        </>
      )}
      {confirmando && (
        <ConfirmarDisparoModal
          quantidade={prospects.length}
          onCancelar={() => setConfirmando(false)}
          onConfirmar={() => { setConfirmando(false); iniciar(); }}
        />
      )}
      {step === "enviando" && (
        <Card title="Enviando pra prospects...">
          <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
            <div style={s.spinner} />
            <div style={{ fontWeight: 700, color: T.ink }}>Disparando pelo WhatsApp, aguarde...</div>
          </div>
        </Card>
      )}
      {step === "resumo" && resultado && (
        <Card title="Disparo pra prospects concluído">
          <div style={s.summaryRow}>
            <Metric label="Enviados" value={num(resultado.total)} />
            <Metric label="Entregues" value={num(resultado.entregues)} accent={T.wa} />
            <Metric label="Taxa" value={pct((resultado.entregues / (resultado.total || 1)) * 100)} />
            <Metric label="Falhas" value={num(resultado.falhas)} accent={resultado.falhas ? T.coral : undefined} />
          </div>
          <button style={{ ...s.btnPrimary, width: "100%", marginTop: 16 }} onClick={onFinish}>Ver histórico</button>
        </Card>
      )}
    </div>
  );
}
