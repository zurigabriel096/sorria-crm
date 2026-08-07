import { useEffect, useState } from "react";
import { T } from "../theme";
import { s } from "../styles/s";
import { num } from "../utils/format";
import { getDashboardKpis } from "../api/dashboard";
import { listDispatchProspectHistory, removerDisparoProspect } from "../api/campaigns";
import { getMetricasVisiveis, setMetricasVisiveis as apiSetMetricasVisiveis } from "../api/configPainelMetricas";
import { listPainelCards, createPainelCard, updatePainelCard, deletePainelCard } from "../api/painelCards";
import { Card } from "../components/ui/Card";
import { KpiCard } from "../components/ui/KpiCard";
import { PrimeirosPassos } from "../components/ui/PrimeirosPassos";
import { ImportBox } from "../components/ui/ImportBox";
import { Field } from "../components/ui/Field";
import { Select } from "../components/ui/Select";
import { Modal } from "../components/ui/Modal";
import { DotMenu } from "../components/ui/DotMenu";
import { IconUsers, IconCheck, IconSend, IconGrid, IconCoin, IconGavel } from "../components/icons";
import { CAMPOS_FIXOS, rotuloCampo } from "../utils/painelCampos";
import { iniciais } from "../utils/usuario";
import { pontuarPrioridade, motivoPrioridade, diasSemAtividade } from "../utils/prioridade";
import { brl } from "../utils/format";
import { ABAS_PAINEL } from "../utils/painelAbas";
import { getDesempenhoEquipe, getMetas, salvarMetaEmpresa, salvarMetaEquipe, salvarMetaIndividual } from "../api/desempenho";

// "disparados" (Mensagens disparadas) fica de fora deste catalogo de proposito -
// e' tratado a parte pra sempre ficar por ULTIMO na fileira, com estilo proprio
// (ver render principal abaixo). "totalContatos" (Leads na base) tambem e'
// especial: sempre PRIMEIRO.
const METRICAS = [
  { chave: "totalContatos", rotulo: "Leads na base", montar: (kpis, ctx) => <KpiCard label="Leads na base" value={num(kpis.totalContatos)} icon={<IconUsers color={T.primary} />} onClick={() => ctx.irParaPacientes()} /> },
  { chave: "elegiveis", rotulo: "Elegíveis p/ disparo", montar: (kpis, ctx) => <KpiCard label="Elegíveis p/ disparo" value={num(kpis.elegiveis)} sub="telefone válido" icon={<IconCheck color={T.wa} />} onClick={() => ctx.irParaPacientes("Elegíveis")} /> },
  { chave: "disparados", rotulo: "Mensagens disparadas", montar: (kpis, ctx) => <KpiCard label="Mensagens disparadas" value={num(kpis.disparados)} icon={<IconSend color={T.primary} />} borderColor={T.primary} onClick={() => ctx.setView("disparos")} /> },
  { chave: "entregues", rotulo: "Entregues", montar: (kpis, ctx) => <KpiCard label="Entregues" value={num(kpis.entregues)} highlight icon={<IconCheck color="#fff" />} onClick={() => ctx.setView("disparos")} /> },
  { chave: "taxaEntrega", rotulo: "Taxa de entrega", montar: (kpis, ctx) => <KpiCard label="Taxa de entrega" value={`${num(kpis.taxaEntregaPct)}%`} icon={<IconCheck color={T.primary} />} onClick={() => ctx.setView("disparos")} /> },
];

const CORES_GRAFICO = [T.primary, T.coral, T.gold, T.primaryDark, "#4C6FFF", "#8B5CF6", "#EC4899"];

// Donut em CSS puro (conic-gradient) - sem dependencia de lib de grafico,
// mesmo espirito de "so o que ja existe no projeto" do resto do app.
function GraficoPizza({ valores, onClickValor }) {
  const total = valores.reduce((acc, v) => acc + v.contagem, 0) || 1;
  let acumulado = 0;
  const paradas = valores.map((v, i) => {
    const inicio = acumulado;
    acumulado += (v.contagem / total) * 100;
    return `${CORES_GRAFICO[i % CORES_GRAFICO.length]} ${inicio}% ${acumulado}%`;
  }).join(", ");
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 18 }}>
      <div style={{ width: 92, height: 92, borderRadius: "50%", background: `conic-gradient(${paradas})`, flexShrink: 0, position: "relative" }}>
        <div style={{ position: "absolute", inset: 13, borderRadius: "50%", background: "#fff", display: "grid", placeItems: "center", fontSize: 13, fontWeight: 800, color: T.ink }}>
          {total}
        </div>
      </div>
      <div style={{ display: "grid", gap: 5, flex: 1, minWidth: 0 }}>
        {valores.map((v, i) => (
          <div
            key={v.valor}
            onClick={() => onClickValor?.(v.valor)}
            style={{ display: "flex", alignItems: "center", gap: 7, fontSize: 12, color: T.inkSoft, cursor: onClickValor ? "pointer" : "default" }}
          >
            <span style={{ width: 8, height: 8, borderRadius: 2, background: CORES_GRAFICO[i % CORES_GRAFICO.length], flexShrink: 0 }} />
            <span style={{ flex: 1, minWidth: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{v.valor}</span>
            <b style={{ color: T.ink }}>{v.contagem}</b>
          </div>
        ))}
      </div>
    </div>
  );
}

function GraficoBarras({ valores, onClickValor }) {
  const maxima = Math.max(1, ...valores.map((v) => v.contagem));
  return (
    <div style={{ display: "flex", alignItems: "flex-end", gap: 12, height: 130, paddingTop: 10 }}>
      {valores.map((v, i) => (
        <div
          key={v.valor}
          onClick={() => onClickValor?.(v.valor)}
          style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 6, flex: 1, minWidth: 0, cursor: onClickValor ? "pointer" : "default" }}
        >
          <div style={{ fontSize: 11.5, fontWeight: 800, color: T.ink }}>{v.contagem}</div>
          <div style={{
            width: "100%", maxWidth: 38, borderRadius: "6px 6px 2px 2px",
            background: CORES_GRAFICO[i % CORES_GRAFICO.length], height: `${Math.max(6, (v.contagem / maxima) * 88)}px`,
          }} />
          <div style={{ fontSize: 10.5, color: T.inkSoft, textAlign: "center", lineHeight: 1.25, overflow: "hidden", textOverflow: "ellipsis" }}>{v.valor}</div>
        </div>
      ))}
    </div>
  );
}

// Aba "Equipe" do Painel Executivo - ranking real por colaborador (dados de
// DesempenhoEquipeService: atendimentos/convertidos/respondidas/vencidos,
// tudo ja existente no banco) + metas manuais (Empresa/Equipe/Individual,
// so ADMIN/GESTOR editam - pedido do Samuel 07/08/2026). "Super meta" nao
// tem numero proprio: e' um selo automatico que acende quando TODO MUNDO
// que tem meta individual definida bateu a propria meta.
function DesempenhoEquipe({ desempenho, metaEmpresa, metaEquipe, metaIndividualDe, superMeta, totalConvertidosEquipe, souGestorOuAdmin, onSalvarMeta }) {
  const [editando, setEditando] = useState(null); // null | "EMPRESA" | "EQUIPE" | colaboradorId
  const [rascunho, setRascunho] = useState("");

  const abrirEdicao = (chave, valorAtual) => { setEditando(chave); setRascunho(valorAtual != null ? String(valorAtual) : ""); };
  const confirmarEdicao = async () => {
    const valor = Math.max(0, parseInt(rascunho, 10) || 0);
    if (editando === "EMPRESA") await onSalvarMeta("EMPRESA", null, valor);
    else if (editando === "EQUIPE") await onSalvarMeta("EQUIPE", null, valor);
    else await onSalvarMeta("INDIVIDUAL", editando, valor);
    setEditando(null);
  };

  const MetaCard = ({ titulo, valor, chave }) => {
    const pct = valor ? Math.min(100, Math.round((totalConvertidosEquipe / valor) * 100)) : null;
    return (
      <div style={{ flex: 1, minWidth: 180, padding: 14, borderRadius: 12, background: T.lineSoft }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 6 }}>
          <span style={{ fontSize: 12, fontWeight: 700, color: T.inkSoft }}>{titulo}</span>
          {souGestorOuAdmin && editando !== chave && <button style={{ fontSize: 11, color: T.primary, fontWeight: 700 }} onClick={() => abrirEdicao(chave, valor)}>Editar</button>}
        </div>
        {editando === chave ? (
          <div style={{ display: "flex", gap: 6 }}>
            <input autoFocus type="number" min={0} style={{ ...s.input, padding: "4px 8px" }} value={rascunho} onChange={(e) => setRascunho(e.target.value)} />
            <button style={s.btnPrimarySm} onClick={confirmarEdicao}>OK</button>
          </div>
        ) : valor == null ? (
          <div style={{ fontSize: 12.5, color: T.inkSoft }}>Meta não definida{souGestorOuAdmin ? "" : " ainda"}</div>
        ) : (
          <>
            <div style={{ fontSize: 20, fontWeight: 800, color: T.ink }}>{num(totalConvertidosEquipe)}<span style={{ fontSize: 13, color: T.inkSoft, fontWeight: 600 }}> / {num(valor)}</span></div>
            <div style={{ ...s.segBarTrack, marginTop: 6 }}>
              <div style={{ ...s.segBarFill, width: `${pct}%`, background: pct >= 100 ? T.wa : T.primary }} />
            </div>
          </>
        )}
      </div>
    );
  };

  return (
    <div>
      <div style={{ display: "flex", gap: 12, flexWrap: "wrap", marginBottom: 20 }}>
        <MetaCard titulo="Meta da empresa" valor={metaEmpresa} chave="EMPRESA" />
        <MetaCard titulo="Meta da equipe" valor={metaEquipe} chave="EQUIPE" />
        <div style={{
          flex: 1, minWidth: 180, padding: 14, borderRadius: 12,
          background: superMeta ? "#FFF7E0" : T.lineSoft, border: superMeta ? `1.5px solid ${T.gold}` : "none",
        }}>
          <div style={{ fontSize: 12, fontWeight: 700, color: T.inkSoft, marginBottom: 6 }}>Super meta</div>
          {superMeta ? (
            <div style={{ fontSize: 13, fontWeight: 800, color: T.gold }}>🏆 Toda a equipe bateu a meta individual!</div>
          ) : (
            <div style={{ fontSize: 12, color: T.inkSoft }}>Acende quando todo mundo com meta individual definida bater a própria meta.</div>
          )}
        </div>
      </div>

      {!desempenho.length ? (
        <div style={{ color: T.inkSoft, fontSize: 12.5 }}>Nenhum colaborador com leads atribuídos ainda.</div>
      ) : (
        <div style={{ display: "grid", gap: 8 }}>
          {desempenho.map((d, i) => {
            const meta = metaIndividualDe(d.colaboradorId);
            const pct = meta ? Math.min(100, Math.round((d.convertidos / meta) * 100)) : null;
            const bateuMeta = meta != null && d.convertidos >= meta;
            return (
              <div key={d.colaboradorId} style={{ display: "flex", alignItems: "center", gap: 12, padding: "10px 12px", borderRadius: 10, background: "#fff", border: `1px solid ${T.line}` }}>
                <div style={{ width: 22, textAlign: "center", fontSize: 12.5, fontWeight: 800, color: i === 0 && d.convertidos > 0 ? T.gold : T.inkSoft }}>
                  {i === 0 && d.convertidos > 0 ? "🏆" : `#${i + 1}`}
                </div>
                <div style={{
                  width: 30, height: 30, borderRadius: "50%", background: d.corPerfil || T.inkSoft, color: "#fff",
                  display: "grid", placeItems: "center", fontSize: 12, fontWeight: 700, flexShrink: 0, overflow: "hidden",
                }}>
                  {d.avatarUrl ? <img src={d.avatarUrl} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} /> : iniciais(d.nome)}
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontWeight: 700, fontSize: 13, color: T.ink }}>{d.nome}</div>
                  <div style={{ fontSize: 11, color: T.inkSoft }}>
                    {num(d.atendimentos)} leads · {num(d.respondidas)} respostas{d.vencidos > 0 ? ` · ${num(d.vencidos)} follow-ups vencidos` : ""}
                  </div>
                  {meta != null && (
                    <div style={{ ...s.segBarTrack, marginTop: 6, maxWidth: 220 }}>
                      <div style={{ ...s.segBarFill, width: `${pct}%`, background: bateuMeta ? T.wa : T.primary }} />
                    </div>
                  )}
                </div>
                <div style={{ textAlign: "right", minWidth: 74 }}>
                  <div style={{ fontWeight: 800, fontSize: 15, color: bateuMeta ? T.wa : T.ink }}>
                    {num(d.convertidos)}{meta != null && <span style={{ fontSize: 11, color: T.inkSoft, fontWeight: 600 }}> / {num(meta)}</span>}
                  </div>
                  <div style={{ fontSize: 10.5, color: T.inkSoft }}>convertidos</div>
                </div>
                {souGestorOuAdmin && (
                  editando === d.colaboradorId ? (
                    <div style={{ display: "flex", gap: 4 }}>
                      <input autoFocus type="number" min={0} style={{ ...s.input, width: 60, padding: "4px 6px" }} value={rascunho} onChange={(e) => setRascunho(e.target.value)} />
                      <button style={s.btnPrimarySm} onClick={confirmarEdicao}>OK</button>
                    </div>
                  ) : (
                    <button style={s.btnGhostSm} onClick={() => abrirEdicao(d.colaboradorId, meta)}>Meta</button>
                  )
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

const TIPOS_VISUALIZACAO = [
  { valor: "lista", rotulo: "Lista com barra" },
  { valor: "pizza", rotulo: "Gráfico de pizza" },
  { valor: "barra", rotulo: "Gráfico de barras" },
  { valor: "soma", rotulo: "Soma (R$/número)" },
];

function saudacao() {
  const hora = new Date().getHours();
  return hora < 12 ? "Bom dia" : hora < 18 ? "Boa tarde" : "Boa noite";
}

// Icone do card personalizado por campo - Financeiro vira moeda, qualquer
// campo chamado "Situação" (fixo ou personalizado) vira martelo de juiz;
// os demais caem no icone generico (grade).
function iconeDoCard(campoNome) {
  if (campoNome === "fixo:financ") return IconCoin;
  const rotulo = rotuloCampo(campoNome).toLowerCase();
  if (rotulo === "situação" || rotulo === "situacao") return IconGavel;
  return IconGrid;
}

export function Dashboard({ patients, historico, onImport, showToast, setView, irParaPacientes, usuario, camposCustomizados, onCriarCampo, tags, tagObjetos, onCriarTag, colaboradores, campanhas, onAbrirConversa }) {
  const souAdmin = usuario?.papel === "ADMIN";
  const souGestorOuAdmin = souAdmin || usuario?.papel === "GESTOR";
  const [kpis, setKpis] = useState(null);
  const [metricasVisiveis, setMetricasVisiveisState] = useState(null);
  const [cards, setCards] = useState([]);
  const [prospectsHistorico, setProspectsHistorico] = useState([]);
  const [personalizando, setPersonalizando] = useState(false);
  const [abaFixa, setAbaFixa] = useState("inadimplentes");
  const [desempenhoEquipe, setDesempenhoEquipe] = useState([]);
  const [metas, setMetas] = useState([]);
  const [atualizandoManual, setAtualizandoManual] = useState(false);

  // Colaborador comum (nao ADMIN/GESTOR) so ve as abas que foram liberadas
  // pra ele em Colaboradores > Permissões do painel - ADMIN/GESTOR sempre
  // veem todas (pedido do Samuel, 07/08/2026).
  const abasVisiveis = souGestorOuAdmin
    ? ABAS_PAINEL
    : ABAS_PAINEL.filter((a) => (usuario?.abasDashboardPermitidas || []).includes(a.chave));
  const abaAtual = abasVisiveis.some((a) => a.chave === abaFixa) ? abaFixa : abasVisiveis[0]?.chave;

  const carregarProspectsHistorico = () => listDispatchProspectHistory().then(setProspectsHistorico).catch(() => setProspectsHistorico([]));

  const removerProspectHistorico = async (id) => {
    try {
      await removerDisparoProspect(id);
      setProspectsHistorico((lista) => lista.filter((h) => h.id !== id));
    } catch (e) {
      showToast(e.message || "Erro ao remover registro", "warn");
    }
  };

  // Tudo que o Painel mostra e muda no servidor "por fora" (outro colaborador
  // respondeu, follow-up venceu, meta foi editada) - reusada no carregamento
  // inicial, no polling automatico e no botao "Atualizar" (F: atualizar sem
  // dar F5, pedido do Samuel 07/08/2026). NAO inclui `patients`/`historico` -
  // esses vem de fora (App.jsx), so o Painel em si atualiza sozinho aqui.
  const carregarPainel = () => Promise.all([
    getDashboardKpis().then(setKpis).catch((e) => showToast(e.message || "Erro ao carregar KPIs", "warn")),
    listPainelCards().then(setCards).catch(() => setCards([])),
    getDesempenhoEquipe().then(setDesempenhoEquipe).catch(() => setDesempenhoEquipe([])),
    getMetas().then(setMetas).catch(() => setMetas([])),
    carregarProspectsHistorico(),
  ]);

  const atualizarManualmente = async () => {
    setAtualizandoManual(true);
    await carregarPainel();
    setAtualizandoManual(false);
    showToast("Painel atualizado", "ok");
  };

  useEffect(() => {
    if (!patients.length) return;
    // "baseEstagio" e' migrado sozinho pra dentro da lista salva se ainda nao
    // estiver la (config antiga, de antes dessa secao virar ocultavel) - assim
    // quem ja usava o painel nao perde a secao do nada so por causa da mudanca,
    // ela so some se a pessoa desmarcar de proposito. So roda 1x (nao entra no
    // polling abaixo, senao um "desmarcar" do usuario voltaria sozinho).
    getMetricasVisiveis()
      .then((v) => setMetricasVisiveisState(v.includes("baseEstagio") ? v : [...v, "baseEstagio"]))
      .catch(() => setMetricasVisiveisState([...METRICAS.map((m) => m.chave), "baseEstagio"]));
    carregarPainel();
    // Atualiza sozinho a cada 60s (dado muda por fora: outro colaborador
    // respondendo, follow-up vencendo) - sem precisar de F5. Reload de
    // pagina refaria login/rebuscaria TUDO (patients, colaboradores,
    // campanhas etc via App.jsx) e perderia scroll/estado da tela; esse
    // polling so re-busca o que o Painel realmente mostra, mais leve e sem
    // "piscar" a tela.
    const intervalo = setInterval(carregarPainel, 60000);
    return () => clearInterval(intervalo);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [patients.length, historico.length]);

  if (!patients.length) {
    return (
      <div style={{ display: "grid", gap: 16, placeItems: "center", padding: "40px 0" }}>
        <div style={{ textAlign: "center", maxWidth: 460 }}>
          <div style={{ fontSize: 20, fontWeight: 800, color: T.ink, marginBottom: 6 }}>Comece importando sua base</div>
          <div style={{ fontSize: 14, color: T.inkSoft, marginBottom: 20 }}>Sua conta está limpa. Suba uma das suas planilhas da Orthodontic para popular o painel, a base de leads e a agenda.</div>
        </div>
        <div style={{ width: "min(560px,100%)" }}><ImportBox onImport={onImport} showToast={showToast} camposCustomizados={camposCustomizados} onCriarCampo={onCriarCampo} tags={tags} tagObjetos={tagObjetos} onCriarTag={onCriarTag} /></div>
      </div>
    );
  }

  if (!kpis || !metricasVisiveis) return <div style={{ color: T.inkSoft, fontSize: 14, padding: "20px 0" }}>Carregando painel...</div>;

  const ctx = { irParaPacientes, setView };
  const metricasAtivas = METRICAS.filter((m) => metricasVisiveis.includes(m.chave));
  // "Mensagens disparadas" sempre por ultimo (pedido explicito) - o resto
  // mantem a ordem do catalogo, que ja comeca com "Leads na base".
  const metricasSemDisparados = metricasAtivas.filter((m) => m.chave !== "disparados");
  const metricaDisparados = metricasAtivas.find((m) => m.chave === "disparados");

  // "Prioridades de hoje" (pedido do Samuel, 06/08/2026) - reusa o MESMO
  // pontuarPrioridade da Fila de Trabalho, so' que mostra so' o top 4 aqui no
  // Painel. Dado real (patients ja carregado), nada inventado.
  const prioridadesHoje = [...patients]
    .filter((p) => motivoPrioridade(p))
    .sort((a, b) => pontuarPrioridade(b) - pontuarPrioridade(a))
    .slice(0, 4);

  // "Carga da equipe" - quantos leads tem responsavel atribuido x quantos
  // estao na fila compartilhada (responsavelId null). Dado real, sem calculo
  // nenhum alem de contar o que ja existe em patients.
  const comResponsavel = patients.filter((p) => p.responsavelId).length;
  const pctComResponsavel = patients.length ? Math.round((comResponsavel / patients.length) * 100) : 0;

  // --- Recorte fixo "Inadimplentes" - distribuicao real do campo nativo
  // financ (Adimplente/Inadimplente/—), dado ja existente em todo Contato.
  const totalInadimplentes = patients.filter((p) => p.financ === "Inadimplente").length;
  const distribuicaoFinanceira = ["Adimplente", "Inadimplente", "—"]
    .map((v) => ({ valor: v, contagem: patients.filter((p) => (p.financ || "—") === v).length }))
    .filter((v) => v.contagem > 0);

  // --- Recorte fixo "Quase a churn" - sem follow-up futuro agendado
  // (proximaAcaoEm) E parado ha 30+ dias sem mensagem (mesmo criterio de
  // "diasSemAtividade" ja usado na ocultacao inteligente da Fila de Trabalho).
  const BANDAS_CHURN = [
    { valor: "30–60 dias parado", min: 30, max: 60 },
    { valor: "60–90 dias parado", min: 60, max: 90 },
    { valor: "90+ dias parado", min: 90, max: Infinity },
  ];
  const churnValores = BANDAS_CHURN
    .map((b) => ({
      valor: b.valor,
      contagem: patients.filter((p) => !p.proximaAcaoEm && diasSemAtividade(p) >= b.min && diasSemAtividade(p) < b.max).length,
    }))
    .filter((v) => v.contagem > 0);
  const totalQuaseChurn = churnValores.reduce((acc, v) => acc + v.contagem, 0);

  // --- Recorte fixo "Aguardando resposta" - cliente falou por ultimo
  // (ultimaMensagemDirecao "ENTRADA") e ainda ninguem respondeu, bandas por
  // tempo de espera (quanto mais tempo, maior o risco de perder a venda).
  const BANDAS_AGUARDANDO = [
    { valor: "até 1h", min: 0, max: 1 },
    { valor: "1 a 24h", min: 1, max: 24 },
    { valor: "mais de 24h", min: 24, max: Infinity },
  ];
  const aguardandoRespostaValores = BANDAS_AGUARDANDO
    .map((b) => ({
      valor: b.valor,
      contagem: patients.filter((p) => {
        if (p.ultimaMensagemDirecao !== "ENTRADA" || !p.ultimaMensagemEm) return false;
        const horas = (Date.now() - new Date(p.ultimaMensagemEm).getTime()) / 36e5;
        return horas >= b.min && horas < b.max;
      }).length,
    }))
    .filter((v) => v.contagem > 0);
  const totalAguardandoResposta = aguardandoRespostaValores.reduce((acc, v) => acc + v.contagem, 0);

  // --- Aba "Equipe": metas manuais (Empresa/Equipe/Individual) definidas
  // pelo ADMIN/GESTOR, comparadas com "convertidos" real de cada colaborador
  // (ver DesempenhoEquipeService no backend). "Super meta" e' automatico:
  // so acende quando TODO MUNDO que tem meta individual definida bateu ela.
  const metaEmpresa = metas.find((m) => m.tipo === "EMPRESA")?.valor ?? null;
  const metaEquipe = metas.find((m) => m.tipo === "EQUIPE")?.valor ?? null;
  const metaIndividualDe = (colaboradorId) => metas.find((m) => m.tipo === "INDIVIDUAL" && m.colaboradorId === colaboradorId)?.valor ?? null;
  const totalConvertidosEquipe = desempenhoEquipe.reduce((acc, d) => acc + d.convertidos, 0);
  const comMetaIndividual = desempenhoEquipe.filter((d) => metaIndividualDe(d.colaboradorId) != null && metaIndividualDe(d.colaboradorId) > 0);
  const superMeta = comMetaIndividual.length > 0 && comMetaIndividual.every((d) => d.convertidos >= metaIndividualDe(d.colaboradorId));

  const salvarMeta = async (tipo, colaboradorId, valor) => {
    try {
      if (tipo === "EMPRESA") await salvarMetaEmpresa(valor);
      else if (tipo === "EQUIPE") await salvarMetaEquipe(valor);
      else await salvarMetaIndividual(colaboradorId, valor);
      setMetas(await getMetas());
      showToast("Meta salva", "ok");
    } catch (e) {
      showToast(e.message || "Erro ao salvar meta", "warn");
    }
  };

  return (
    <div style={{ display: "grid", gap: 18 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end", flexWrap: "wrap", gap: 10 }}>
        <div>
          <div style={{ fontSize: 20, fontWeight: 800, color: T.ink }}>{saudacao()}{usuario?.nome ? `, ${String(usuario.nome).trim().split(/\s+/)[0]}` : ""}.</div>
          <div style={{ fontSize: 13, color: T.inkSoft, marginTop: 2 }}>Pronto pra recuperar receita hoje?</div>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <button style={s.btnGhostSm} onClick={atualizarManualmente} disabled={atualizandoManual}>
            {atualizandoManual ? "Atualizando..." : "Atualizar"}
          </button>
          {souAdmin && <DotMenu items={[{ label: "Personalizar painel", onClick: () => setPersonalizando(true) }]} />}
        </div>
      </div>
      <PrimeirosPassos patients={patients} colaboradores={colaboradores || []} campanhas={campanhas || []} setView={setView} />
      <div className="kpiRow" style={s.kpiRow}>
        {metricasSemDisparados.map((m) => <div key={m.chave}>{m.montar(kpis, ctx)}</div>)}
        {/* So cards em modo "lista" viram big number individual aqui no topo -
            pizza/barra ja tem espaco proprio (mais legivel) no detalhamento
            abaixo, sem duplicar E sem lotar a fileira do topo com dezenas de
            numeros quando o campo tem muitos valores distintos. "soma" e' 1
            numero so' por natureza, entao entra direto como big number. */}
        {cards.filter((c) => c.tipoVisualizacao === "soma").map((c) => {
          const Icone = iconeDoCard(c.campoNome);
          return (
            <KpiCard
              key={c.id}
              label={c.rotulo || rotuloCampo(c.campoNome)}
              value={brl(c.soma || 0)}
              icon={<Icone color={T.coral} />}
            />
          );
        })}
        {cards.filter((c) => (c.tipoVisualizacao || "lista") === "lista").flatMap((c) => (c.valores || []).map((v) => {
          const Icone = iconeDoCard(c.campoNome);
          return (
            <KpiCard
              key={`${c.id}-${v.valor}`}
              label={`${c.rotulo || rotuloCampo(c.campoNome)}: ${v.valor}`}
              value={num(v.contagem)}
              icon={<Icone color={T.primary} />}
              onClick={() => irParaPacientes({ campo: c.campoNome, valor: v.valor })}
            />
          );
        }))}
        {!!prospectsHistorico.length && (
          <KpiCard
            label="Enviado pra prospects"
            value={num(prospectsHistorico.reduce((acc, h) => acc + h.totalProspects, 0))}
            sub={`${num(prospectsHistorico.reduce((acc, h) => acc + h.quantidadeEntregue, 0))} entregues`}
            icon={<IconSend color={T.gold} />}
          />
        )}
        {metricaDisparados && <div key={metricaDisparados.chave}>{metricaDisparados.montar(kpis, ctx)}</div>}
      </div>
      <div className="dashGrid" style={{ display: "grid", gridTemplateColumns: "2fr 1fr", gap: 14 }}>
        <Card title="Prioridades de hoje">
          {!prioridadesHoje.length ? (
            <div style={{ padding: "8px 0", color: T.inkSoft, fontSize: 12.5 }}>Nenhum lead pedindo atenção agora — fila em dia.</div>
          ) : (
            <div style={{ display: "grid", gap: 8 }}>
              {prioridadesHoje.map((p) => {
                const colaborador = colaboradores?.find((c) => c.id === p.responsavelId);
                const vencido = motivoPrioridade(p) === "follow-up vencido";
                return (
                  <div
                    key={p.id}
                    onClick={() => (onAbrirConversa ? onAbrirConversa(p.id) : irParaPacientes())}
                    style={{
                      display: "flex", alignItems: "center", gap: 10, padding: "8px 10px",
                      borderRadius: 10, background: T.lineSoft, cursor: "pointer",
                    }}
                  >
                    <div style={{
                      width: 26, height: 26, borderRadius: "50%", background: colaborador?.corPerfil || T.inkSoft, color: "#fff",
                      display: "grid", placeItems: "center", fontSize: 11, fontWeight: 700, flexShrink: 0,
                    }}>
                      {iniciais(colaborador?.nome || p.nome || "?")}
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontWeight: 700, fontSize: 13, color: T.ink }}>{p.nome}</div>
                      <div style={{ fontSize: 11.5, color: vencido ? T.coral : T.inkSoft }}>{motivoPrioridade(p)}</div>
                    </div>
                  </div>
                );
              })}
              <button style={{ ...s.btnGhost, marginTop: 4 }} onClick={() => setView("filaTrabalho")}>Ver fila de trabalho completa</button>
            </div>
          )}
        </Card>
        <Card title="Carga da equipe">
          <div style={{ display: "grid", gap: 10 }}>
            <div>
              <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12, color: T.inkSoft, marginBottom: 4 }}>
                <span>Com responsável</span><b style={{ color: T.ink }}>{pctComResponsavel}%</b>
              </div>
              <div style={s.segBarTrack}>
                <div style={{ ...s.segBarFill, width: `${pctComResponsavel}%`, background: T.primary }} />
              </div>
            </div>
            <div style={{ fontSize: 12, color: T.inkSoft }}>{num(comResponsavel)} de {num(patients.length)} leads têm um responsável atribuído</div>
          </div>
        </Card>
      </div>
      {metricasVisiveis.includes("baseEstagio") && (
        <Card>
          <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginBottom: 18 }}>
            {abasVisiveis.map((a) => (
              <button
                key={a.chave}
                onClick={() => setAbaFixa(a.chave)}
                style={{
                  padding: "6px 14px", borderRadius: 20, fontSize: 12.5, fontWeight: 700,
                  background: abaAtual === a.chave ? T.primarySoft : T.lineSoft,
                  color: abaAtual === a.chave ? T.primaryDark : T.inkSoft,
                }}
              >
                {a.rotulo}
              </button>
            ))}
          </div>

          {abaAtual === "inadimplentes" && (
            <div>
              <div style={{ display: "flex", alignItems: "baseline", gap: 8, marginBottom: 16 }}>
                <span style={{ fontSize: 26, fontWeight: 800, color: T.coral }}>{num(totalInadimplentes)}</span>
                <span style={{ fontSize: 13, color: T.inkSoft }}>leads inadimplentes agora</span>
              </div>
              {distribuicaoFinanceira.length ? (
                <GraficoPizza valores={distribuicaoFinanceira} onClickValor={(valor) => irParaPacientes({ campo: "fixo:financ", valor })} />
              ) : (
                <div style={{ color: T.inkSoft, fontSize: 12.5 }}>Nenhum lead com situação financeira registrada ainda.</div>
              )}
              {totalInadimplentes > 0 && (
                <button style={{ ...s.btnGhost, marginTop: 16 }} onClick={() => irParaPacientes({ campo: "fixo:financ", valor: "Inadimplente" })}>Ver leads inadimplentes</button>
              )}
            </div>
          )}

          {abaAtual === "quaseChurn" && (
            <div>
              <div style={{ display: "flex", alignItems: "baseline", gap: 8, marginBottom: 16 }}>
                <span style={{ fontSize: 26, fontWeight: 800, color: T.gold }}>{num(totalQuaseChurn)}</span>
                <span style={{ fontSize: 13, color: T.inkSoft }}>sem agendamento futuro e parados há 30+ dias</span>
              </div>
              {churnValores.length ? (
                <GraficoBarras valores={churnValores} />
              ) : (
                <div style={{ color: T.inkSoft, fontSize: 12.5 }}>Nenhum lead nessa situação agora — base saudável.</div>
              )}
              {totalQuaseChurn > 0 && (
                <button style={{ ...s.btnGhost, marginTop: 16 }} onClick={() => setView("filaTrabalho")}>Ver na fila de trabalho</button>
              )}
            </div>
          )}

          {abaAtual === "aguardandoResposta" && (
            <div>
              <div style={{ display: "flex", alignItems: "baseline", gap: 8, marginBottom: 16 }}>
                <span style={{ fontSize: 26, fontWeight: 800, color: T.primary }}>{num(totalAguardandoResposta)}</span>
                <span style={{ fontSize: 13, color: T.inkSoft }}>leads esperando resposta agora</span>
              </div>
              {aguardandoRespostaValores.length ? (
                <GraficoBarras valores={aguardandoRespostaValores} />
              ) : (
                <div style={{ color: T.inkSoft, fontSize: 12.5 }}>Ninguém esperando resposta agora — fila em dia.</div>
              )}
              {totalAguardandoResposta > 0 && (
                <button style={{ ...s.btnGhost, marginTop: 16 }} onClick={() => setView("filaTrabalho")}>Ver na fila de trabalho</button>
              )}
            </div>
          )}

          {abaAtual === "equipe" && (
            <DesempenhoEquipe
              desempenho={desempenhoEquipe}
              colaboradores={colaboradores || []}
              metaEmpresa={metaEmpresa}
              metaEquipe={metaEquipe}
              metaIndividualDe={metaIndividualDe}
              superMeta={superMeta}
              totalConvertidosEquipe={totalConvertidosEquipe}
              souGestorOuAdmin={souGestorOuAdmin}
              onSalvarMeta={salvarMeta}
            />
          )}

          {abaAtual === "personalizado" && (
            !cards.length ? (
              <div style={{ padding: "8px 0", color: T.inkSoft, fontSize: 12.5 }}>
                Nenhum card personalizado ainda.
                {souAdmin && <button style={{ ...s.btnGhost, marginLeft: 10 }} onClick={() => setPersonalizando(true)}>Criar card personalizado</button>}
              </div>
            ) : (
              <div style={{ display: "grid", gap: 24 }}>
                {cards.filter((c) => c.tipoVisualizacao !== "soma").map((c) => {
                  const valores = c.valores || [];
                  const tipo = c.tipoVisualizacao || "lista";
                  return (
                    <div key={c.id}>
                      <div style={{ fontWeight: 700, fontSize: 13.5, color: T.ink, marginBottom: 10 }}>{c.rotulo || rotuloCampo(c.campoNome)}</div>
                      {tipo === "pizza" && (
                        <GraficoPizza valores={valores} onClickValor={(valor) => irParaPacientes({ campo: c.campoNome, valor })} />
                      )}
                      {tipo === "barra" && (
                        <GraficoBarras valores={valores} onClickValor={(valor) => irParaPacientes({ campo: c.campoNome, valor })} />
                      )}
                      {tipo === "lista" && (
                        <div style={{ display: "grid", gap: 6 }}>
                          {valores.map((v) => (
                            <div
                              key={v.valor}
                              style={{ ...s.segRow, cursor: "pointer" }}
                              onClick={() => irParaPacientes({ campo: c.campoNome, valor: v.valor })}
                            >
                              <span style={{ ...s.segBadge, color: T.ink, background: T.lineSoft }}>{v.valor}</span>
                              <div style={s.segBarTrack}>
                                <div style={{ ...s.segBarFill, width: `${(v.contagem / (kpis.totalContatos || 1)) * 100}%`, background: T.primary }} />
                              </div>
                              <b style={{ fontSize: 13, color: T.ink, width: 34, textAlign: "right" }}>{v.contagem}</b>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  );
                })}
                <button style={{ ...s.btnGhost, marginTop: -8 }} onClick={() => setView("pacientes")}>Ver base de leads</button>
              </div>
            )
          )}
        </Card>
      )}
      {!!prospectsHistorico.length && (
        <Card title="Disparos pra prospects (fora do CRM)">
          <div style={{ display: "grid", gap: 6 }}>
            {prospectsHistorico.map((h) => (
              <div key={h.id} style={{ display: "flex", alignItems: "center", gap: 8, padding: "6px 10px", background: T.lineSoft, borderRadius: 8, fontSize: 12.5 }}>
                <span style={{ fontWeight: 700, color: T.ink, flex: 1 }}>{h.templateNome || "—"}</span>
                <span style={{ color: T.inkSoft }}>{h.campanhaNome}</span>
                <span style={{ color: T.wa, fontWeight: 700 }}>{num(h.quantidadeEntregue)} entregues</span>
                <span style={{ color: T.inkSoft }}>de {num(h.totalProspects)}</span>
                {souAdmin && (
                  <button
                    onClick={() => removerProspectHistorico(h.id)}
                    title="Remover este registro (ex.: disparo de teste)"
                    style={{ color: T.coral, fontWeight: 700, fontSize: 13, lineHeight: 1 }}
                  >
                    ×
                  </button>
                )}
              </div>
            ))}
          </div>
        </Card>
      )}
      {personalizando && (
        <PersonalizarPainelModal
          metricasVisiveis={metricasVisiveis}
          onSalvarMetricas={async (novas) => {
            await apiSetMetricasVisiveis(novas);
            setMetricasVisiveisState(novas);
          }}
          cards={cards}
          camposCustomizados={camposCustomizados}
          onCriarCard={async (dto) => setCards(await listAtualizado(async () => { await createPainelCard(dto); }))}
          onAtualizarCard={async (id, dto) => setCards(await listAtualizado(async () => { await updatePainelCard(id, dto); }))}
          onExcluirCard={async (id) => setCards(await listAtualizado(async () => { await deletePainelCard(id); }))}
          showToast={showToast}
          onClose={() => setPersonalizando(false)}
        />
      )}
    </div>
  );
}

async function listAtualizado(acao) {
  await acao();
  return listPainelCards();
}

function PersonalizarPainelModal({ metricasVisiveis, onSalvarMetricas, cards, camposCustomizados, onCriarCard, onAtualizarCard, onExcluirCard, showToast, onClose }) {
  const [selecao, setSelecao] = useState(metricasVisiveis);
  const [novoCard, setNovoCard] = useState(null); // null | {campoNome, rotulo, tipoVisualizacao}

  const alternarMetrica = (chave) => setSelecao((sel) => (sel.includes(chave) ? sel.filter((x) => x !== chave) : [...sel, chave]));

  const salvarMetricas = async () => {
    try {
      await onSalvarMetricas(selecao);
      showToast("Métricas atualizadas", "ok");
    } catch (e) {
      showToast(e.message || "Erro ao salvar métricas", "warn");
    }
  };

  const abrirNovoCard = () => setNovoCard({ id: null, campoNome: camposCustomizados[0]?.nome || CAMPOS_FIXOS[0].chave, rotulo: "", tipoVisualizacao: "lista" });
  const abrirEdicaoCard = (card) => setNovoCard({ id: card.id, campoNome: card.campoNome, rotulo: card.rotulo || "", tipoVisualizacao: card.tipoVisualizacao || "lista" });

  const salvarCard = async () => {
    if (!novoCard.campoNome) return showToast("Escolha o campo", "warn");
    try {
      const dto = { campoNome: novoCard.campoNome, rotulo: novoCard.rotulo, tipoVisualizacao: novoCard.tipoVisualizacao };
      if (novoCard.id) await onAtualizarCard(novoCard.id, dto);
      else await onCriarCard(dto);
      setNovoCard(null);
      showToast(novoCard.id ? "Card atualizado" : "Card criado", "ok");
    } catch (e) {
      showToast(e.message || "Erro ao salvar card", "warn");
    }
  };

  const excluirCard = async (card) => {
    try {
      await onExcluirCard(card.id);
      showToast("Card removido", "ok");
    } catch (e) {
      showToast(e.message || "Erro ao remover card", "warn");
    }
  };

  return (
    <Modal title="Personalizar Painel Executivo" onClose={onClose} wide>
      <div style={{ fontSize: 13, fontWeight: 700, color: T.ink, marginBottom: 8 }}>Métricas de volume</div>
      <div style={{ display: "grid", gap: 6, marginBottom: 10 }}>
        {METRICAS.map((m) => (
          <label key={m.chave} style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 13, color: T.ink }}>
            <input type="checkbox" checked={selecao.includes(m.chave)} onChange={() => alternarMetrica(m.chave)} />
            {m.rotulo}
          </label>
        ))}
        <label style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 13, color: T.ink }}>
          <input type="checkbox" checked={selecao.includes("baseEstagio")} onChange={() => alternarMetrica("baseEstagio")} />
          Detalhamento dos cards (barras)
        </label>
      </div>
      <button style={s.btnPrimarySm} onClick={salvarMetricas}>Salvar métricas</button>

      <div style={{ height: 1, background: T.line, margin: "18px 0" }} />

      <div style={{ fontSize: 13, fontWeight: 700, color: T.ink, marginBottom: 8 }}>
        Cards personalizados (quebra automática por valor do campo)
      </div>
      <div style={{ display: "grid", gap: 6, marginBottom: 10 }}>
        {!cards.length && <span style={{ fontSize: 13, color: T.inkSoft }}>Nenhum card criado ainda.</span>}
        {cards.map((c) => (
          <div key={c.id} style={{ padding: "6px 10px", background: T.lineSoft, borderRadius: 8 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <span style={{ fontSize: 13, fontWeight: 600, color: T.ink, flex: 1 }}>{c.rotulo || rotuloCampo(c.campoNome)}</span>
              <DotMenu items={[
                { label: "Editar", onClick: () => abrirEdicaoCard(c) },
                { label: "Excluir", danger: true, onClick: () => excluirCard(c) },
              ]} />
            </div>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginTop: 4 }}>
              {(c.valores || []).map((v) => (
                <span key={v.valor} style={{ fontSize: 11, color: T.inkSoft, background: "#fff", borderRadius: 6, padding: "2px 6px" }}>
                  {v.valor}: <b style={{ color: T.primary }}>{v.contagem}</b>
                </span>
              ))}
            </div>
          </div>
        ))}
      </div>
      {novoCard ? (
        <div style={{ border: `1.5px dashed ${T.line}`, borderRadius: 10, padding: 10, display: "grid", gap: 8 }}>
          <Field label="Campo personalizado">
            <Select
              block
              value={novoCard.campoNome}
              onChange={(v) => setNovoCard({ ...novoCard, campoNome: v })}
              options={[...camposCustomizados.map((c) => c.nome), ...CAMPOS_FIXOS.map((c) => c.chave)]}
              labels={Object.fromEntries(CAMPOS_FIXOS.map((c) => [c.chave, `${c.rotulo} (campo fixo)`]))}
            />
          </Field>
          <p style={{ fontSize: 11.5, color: T.inkSoft, margin: 0 }}>
            O card mostra sozinho a contagem de cada valor diferente encontrado nesse campo - não precisa cadastrar valor por valor.
          </p>
          <Field label="Visualização">
            <Select
              block
              value={novoCard.tipoVisualizacao}
              onChange={(v) => setNovoCard({ ...novoCard, tipoVisualizacao: v })}
              options={TIPOS_VISUALIZACAO.map((t) => t.valor)}
              labels={Object.fromEntries(TIPOS_VISUALIZACAO.map((t) => [t.valor, t.rotulo]))}
            />
          </Field>
          <Field label="Rótulo do card (opcional)">
            <input style={s.input} value={novoCard.rotulo} onChange={(e) => setNovoCard({ ...novoCard, rotulo: e.target.value })} placeholder="Ex: Situação financeira" />
          </Field>
          <div style={{ display: "flex", gap: 8 }}>
            <button style={{ ...s.btnGhost, flex: 1 }} onClick={() => setNovoCard(null)}>Cancelar</button>
            <button style={{ ...s.btnPrimary, flex: 1 }} onClick={salvarCard}>Salvar</button>
          </div>
        </div>
      ) : (
        <button style={s.btnGhostSm} onClick={abrirNovoCard}>+ Novo card</button>
      )}
    </Modal>
  );
}
