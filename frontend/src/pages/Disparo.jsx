import { useEffect, useMemo, useRef, useState } from "react";
import { T } from "../theme";
import { s } from "../styles/s";
import { brl, num, pct } from "../utils/format";
import { Card } from "../components/ui/Card";
import { Metric } from "../components/ui/Metric";
import { StatusBadge } from "../components/ui/StatusBadge";
import { IconSend } from "../components/icons";

// TODO(backend): este componente hoje SIMULA o envio no próprio navegador
// (setInterval + Math.random) só para fins de demo. No mundo real, o disparo
// deve ser feito pelo backend (fila + Evolution API) e este componente deve
// apenas chamar src/api/campaigns.js `dispatchCampaign(id, {...})` e então
// consultar o progresso via polling ou WebSocket em /api/dispatch-history.
export function DisparoFlow({ campanha, patients, templates, onFinish, onCancel }) {
  const camp = campanha;
  const email = camp?.canal === "Email";
  const elegiveis = useMemo(() => patients.filter((p) => p.elegivel && p.enviado === "Pendente"), [patients]);
  const [step, setStep] = useState("revisar");
  const [tpl, setTpl] = useState(null);
  const [progress, setProgress] = useState(0);
  const [resultados, setResultados] = useState([]);
  const timer = useRef(null);
  const custo = elegiveis.length * (email ? 0.001 : 0.31);
  const ativos = templates.filter((t) => t.ativo);
  const iniciar = () => { setStep("enviando"); setProgress(0); setResultados([]); };

  useEffect(() => {
    if (step !== "enviando") return;
    let i = 0;
    const res = [];
    timer.current = setInterval(() => {
      if (i >= elegiveis.length) {
        clearInterval(timer.current);
        setTimeout(() => setStep("resumo"), 400);
        return;
      }
      const p = elegiveis[i];
      const roll = Math.random();
      const status = roll < 0.8 ? "Entregue" : roll < 0.92 ? "Disparado" : roll < 0.97 ? "Falhou" : "Bloqueado";
      res.push({ paciente_id: p.id, nome: p.nome, status, hora: new Date().toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" }) });
      setResultados([...res]);
      i++;
      setProgress(Math.round((i / elegiveis.length) * 100));
    }, 400);
    return () => clearInterval(timer.current);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [step]);

  if (!camp) return <Card title="Disparo"><p style={{ color: T.inkSoft }}>Selecione uma campanha.</p></Card>;

  const entregues = resultados.filter((r) => r.status === "Entregue" || r.status === "Disparado").length;
  const podeEnviar = elegiveis.length && (email || tpl);

  return (
    <div style={{ maxWidth: 760, margin: "0 auto", display: "grid", gap: 16 }}>
      <Steps step={step} />
      {step === "revisar" && (
        <>
          <Card title={`${camp.nome} · ${camp.canal}`}>
            <div style={s.summaryRow}>
              <Metric label="Destinatários elegíveis" value={num(elegiveis.length)} />
              <Metric label="Canal" value={email ? "Email" : "WhatsApp oficial"} />
              <Metric label="Custo estimado" value={brl(custo)} />
            </div>
          </Card>
          {email ? (
            <Card title="Mensagem de email">
              <div style={{ fontSize: 13, color: T.inkSoft, marginBottom: 8 }}>Nesta fase o email é simples (não personalizado). Leitor de HTML entra depois.</div>
              <textarea style={s.textarea} rows={4} defaultValue={camp.emailMsg || "Olá! Temos novidades na Orthodontic..."} />
            </Card>
          ) : (
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
                      {!!t.botoes.length && <div style={{ display: "flex", gap: 4, marginTop: 8, flexWrap: "wrap" }}>{t.botoes.map((b, i) => <span key={i} style={s.btnPreview}>{b.texto}</span>)}</div>}
                    </button>
                  ))}
                </div>
              )}
              {tpl && (
                <div style={{ ...s.waPreview, marginTop: 14 }}>
                  <div style={s.waBubble}>
                    {tpl.corpo.replace(/\{nome\}/g, elegiveis[0]?.primeiro || "Maria").replace(/\{data\}/g, "05/08").replace(/\{hora\}/g, "14:30")}
                    {!!tpl.botoes.length && (
                      <div style={{ borderTop: "1px solid #b9d8a8", marginTop: 8, paddingTop: 6, display: "grid", gap: 4 }}>
                        {tpl.botoes.map((b, i) => <div key={i} style={{ textAlign: "center", color: "#0a7", fontWeight: 600, fontSize: 12.5 }}>{b.texto}</div>)}
                      </div>
                    )}
                  </div>
                </div>
              )}
            </Card>
          )}
          <div style={{ display: "flex", gap: 10 }}>
            <button style={{ ...s.btnGhost, flex: 1 }} onClick={onCancel}>Cancelar</button>
            <button style={{ ...s.btnWa, flex: 2, justifyContent: "center", opacity: podeEnviar ? 1 : .4, cursor: podeEnviar ? "pointer" : "not-allowed" }} disabled={!podeEnviar} onClick={iniciar}>
              <IconSend color="#fff" /> Disparar para {elegiveis.length}
            </button>
          </div>
          <p style={{ fontSize: 12, color: T.inkSoft, textAlign: "center" }}>Roda no servidor, em segundo plano. Você não precisa ficar na tela.</p>
        </>
      )}
      {step === "enviando" && (
        <Card title="Enviando campanha...">
          <div style={{ display: "flex", alignItems: "center", gap: 14, marginBottom: 14 }}>
            <div style={s.spinner} />
            <div>
              <div style={{ fontWeight: 700, color: T.ink }}>Processando em segundo plano</div>
              <div style={{ fontSize: 13, color: T.inkSoft }}>{resultados.length} de {elegiveis.length} · {entregues} entregues</div>
            </div>
            <div style={{ marginLeft: "auto", fontSize: 26, fontWeight: 800, color: T.primary }}>{progress}%</div>
          </div>
          <div style={s.progTrack}><div style={{ ...s.progFill, width: `${progress}%` }} /></div>
          <div style={s.feed}>
            {resultados.slice().reverse().slice(0, 6).map((r, i) => (
              <div key={i} style={s.feedRow}>
                <StatusBadge status={r.status} sm />
                <span style={{ color: T.ink }}>{r.nome}</span>
                <span style={{ marginLeft: "auto", color: T.inkSoft, fontSize: 12 }}>{r.hora}</span>
              </div>
            ))}
          </div>
        </Card>
      )}
      {step === "resumo" && (
        <Card title="Campanha concluída">
          <div style={s.summaryRow}>
            <Metric label="Enviados" value={num(resultados.length)} />
            <Metric label="Entregues" value={num(entregues)} accent={T.wa} />
            <Metric label="Taxa" value={pct((entregues / resultados.length) * 100)} />
            <Metric label="Custo" value={brl(entregues * (email ? 0.001 : 0.31))} />
          </div>
          <button style={{ ...s.btnPrimary, width: "100%", marginTop: 16 }} onClick={() => onFinish(resultados, camp)}>Ver histórico</button>
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
