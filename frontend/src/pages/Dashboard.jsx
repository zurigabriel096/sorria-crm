import { useEffect, useState } from "react";
import { T } from "../theme";
import { s } from "../styles/s";
import { num } from "../utils/format";
import { getDashboardKpis } from "../api/dashboard";
import { listDispatchProspectHistory } from "../api/campaigns";
import { getMetricasVisiveis, setMetricasVisiveis as apiSetMetricasVisiveis } from "../api/configPainelMetricas";
import { listPainelCards, createPainelCard, updatePainelCard, deletePainelCard } from "../api/painelCards";
import { Card } from "../components/ui/Card";
import { KpiCard } from "../components/ui/KpiCard";
import { ImportBox } from "../components/ui/ImportBox";
import { Field } from "../components/ui/Field";
import { Select } from "../components/ui/Select";
import { Modal } from "../components/ui/Modal";
import { DotMenu } from "../components/ui/DotMenu";
import { IconUsers, IconCheck, IconSend, IconGrid } from "../components/icons";

// Catálogo de métricas de volume de disparo/mensagem que o ADMIN pode
// mostrar/esconder (ConfigPainelMetricas) - cada uma sabe montar seu próprio KpiCard.
const METRICAS = [
  { chave: "totalContatos", rotulo: "Leads na base", montar: (kpis, ctx) => <KpiCard label="Leads na base" value={num(kpis.totalContatos)} icon={<IconUsers color={T.primary} />} onClick={() => ctx.irParaPacientes()} /> },
  { chave: "elegiveis", rotulo: "Elegíveis p/ disparo", montar: (kpis, ctx) => <KpiCard label="Elegíveis p/ disparo" value={num(kpis.elegiveis)} sub="telefone válido" icon={<IconCheck color={T.wa} />} onClick={() => ctx.irParaPacientes("Elegíveis")} /> },
  { chave: "disparados", rotulo: "Mensagens disparadas", montar: (kpis, ctx) => <KpiCard label="Mensagens disparadas" value={num(kpis.disparados)} icon={<IconSend color={T.gold} />} onClick={() => ctx.setView("disparos")} /> },
  { chave: "entregues", rotulo: "Entregues", montar: (kpis, ctx) => <KpiCard label="Entregues" value={num(kpis.entregues)} highlight icon={<IconCheck color="#fff" />} onClick={() => ctx.setView("disparos")} /> },
  { chave: "taxaEntrega", rotulo: "Taxa de entrega", montar: (kpis, ctx) => <KpiCard label="Taxa de entrega" value={`${num(kpis.taxaEntregaPct)}%`} icon={<IconCheck color={T.primary} />} onClick={() => ctx.setView("disparos")} /> },
];

// Campos fixos do cadastro que tambem podem virar card personalizado, alem
// dos campos customizados que o proprio usuario cria (ver CampoCustomizado) -
// prefixo "fixo:" no campoNome distingue dos nomes livres de campo
// customizado (ver PainelCardService.bate no backend).
const CAMPOS_FIXOS = [
  { chave: "fixo:financ", rotulo: "Financeiro", opcoes: ["Adimplente", "Inadimplente", "—"] },
  { chave: "fixo:estagio", rotulo: "Estágio" },
  { chave: "fixo:elegivel", rotulo: "Elegível", opcoes: ["Sim", "Não"] },
  { chave: "fixo:dentista", rotulo: "Dentista" },
];

// Campo customizado usa o proprio nome como rotulo; campo fixo (prefixo
// "fixo:") traduz pro rotulo amigavel de CAMPOS_FIXOS. Usado tanto na tela
// principal (label de cada tile de quebra automatica) quanto no modal de
// configuracao.
const rotuloCampo = (campoNome) => CAMPOS_FIXOS.find((c) => c.chave === campoNome)?.rotulo || campoNome;

export function Dashboard({ patients, historico, onImport, showToast, setView, irParaPacientes, usuario, camposCustomizados, onCriarCampo }) {
  const souAdmin = usuario?.papel === "ADMIN";
  const [kpis, setKpis] = useState(null);
  const [metricasVisiveis, setMetricasVisiveisState] = useState(null);
  const [cards, setCards] = useState([]);
  const [prospectsHistorico, setProspectsHistorico] = useState([]);
  const [personalizando, setPersonalizando] = useState(false);

  useEffect(() => {
    if (!patients.length) return;
    getDashboardKpis().then(setKpis).catch((e) => showToast(e.message || "Erro ao carregar KPIs", "warn"));
    // "baseEstagio" e' migrado sozinho pra dentro da lista salva se ainda nao
    // estiver la (config antiga, de antes dessa secao virar ocultavel) - assim
    // quem ja usava o painel nao perde a secao do nada so por causa da mudanca,
    // ela so some se a pessoa desmarcar de proposito.
    getMetricasVisiveis()
      .then((v) => setMetricasVisiveisState(v.includes("baseEstagio") ? v : [...v, "baseEstagio"]))
      .catch(() => setMetricasVisiveisState([...METRICAS.map((m) => m.chave), "baseEstagio"]));
    listPainelCards().then(setCards).catch(() => setCards([]));
    listDispatchProspectHistory().then(setProspectsHistorico).catch(() => setProspectsHistorico([]));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [patients.length, historico.length]);

  if (!patients.length) {
    return (
      <div style={{ display: "grid", gap: 16, placeItems: "center", padding: "40px 0" }}>
        <div style={{ textAlign: "center", maxWidth: 460 }}>
          <div style={{ fontSize: 20, fontWeight: 800, color: T.ink, marginBottom: 6 }}>Comece importando sua base</div>
          <div style={{ fontSize: 14, color: T.inkSoft, marginBottom: 20 }}>Sua conta está limpa. Suba uma das suas planilhas da Orthodontic para popular o painel, a base de leads e a agenda.</div>
        </div>
        <div style={{ width: "min(560px,100%)" }}><ImportBox onImport={onImport} showToast={showToast} camposCustomizados={camposCustomizados} onCriarCampo={onCriarCampo} /></div>
      </div>
    );
  }

  if (!kpis || !metricasVisiveis) return <div style={{ color: T.inkSoft, fontSize: 14, padding: "20px 0" }}>Carregando painel...</div>;

  const ctx = { irParaPacientes, setView };
  const metricasAtivas = METRICAS.filter((m) => metricasVisiveis.includes(m.chave));

  return (
    <div style={{ display: "grid", gap: 18 }}>
      {souAdmin && (
        <div style={{ display: "flex", justifyContent: "flex-end" }}>
          <DotMenu items={[{ label: "Personalizar painel", onClick: () => setPersonalizando(true) }]} />
        </div>
      )}
      <div className="kpiRow" style={s.kpiRow}>
        {metricasAtivas.map((m) => <div key={m.chave}>{m.montar(kpis, ctx)}</div>)}
        {cards.flatMap((c) => (c.valores || []).map((v) => (
          <KpiCard key={`${c.id}-${v.valor}`} label={`${c.rotulo || rotuloCampo(c.campoNome)}: ${v.valor}`} value={num(v.contagem)} icon={<IconGrid color={T.primary} />} />
        )))}
        {!!prospectsHistorico.length && (
          <KpiCard
            label="Enviado pra prospects"
            value={num(prospectsHistorico.reduce((acc, h) => acc + h.totalProspects, 0))}
            sub={`${num(prospectsHistorico.reduce((acc, h) => acc + h.quantidadeEntregue, 0))} entregues`}
            icon={<IconSend color={T.gold} />}
          />
        )}
      </div>
      {metricasVisiveis.includes("baseEstagio") && (
        <Card title="Base por estágio">
          {Object.entries(kpis.porEstagio || {}).map(([etapa, qtd]) => {
            const col = T.estagio[etapa] || T.estagio.Lead;
            return (
              <div key={etapa} style={s.segRow}>
                <span style={{ ...s.segBadge, color: col.fg, background: col.bg }}>{etapa}</span>
                <div style={s.segBarTrack}>
                  <div style={{ ...s.segBarFill, width: `${(qtd / (kpis.totalContatos || 1)) * 100}%`, background: col.fg }} />
                </div>
                <b style={{ fontSize: 13, color: T.ink, width: 26, textAlign: "right" }}>{qtd}</b>
              </div>
            );
          })}
          <button style={{ ...s.btnGhost, marginTop: 16 }} onClick={() => setView("pacientes")}>Ver base de leads</button>
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
  const [novoCard, setNovoCard] = useState(null); // null | {campoNome, rotulo}

  const alternarMetrica = (chave) => setSelecao((sel) => (sel.includes(chave) ? sel.filter((x) => x !== chave) : [...sel, chave]));

  const salvarMetricas = async () => {
    try {
      await onSalvarMetricas(selecao);
      showToast("Métricas atualizadas", "ok");
    } catch (e) {
      showToast(e.message || "Erro ao salvar métricas", "warn");
    }
  };

  const abrirNovoCard = () => setNovoCard({ id: null, campoNome: camposCustomizados[0]?.nome || CAMPOS_FIXOS[0].chave, rotulo: "" });
  const abrirEdicaoCard = (card) => setNovoCard({ id: card.id, campoNome: card.campoNome, rotulo: card.rotulo || "" });

  const salvarCard = async () => {
    if (!novoCard.campoNome) return showToast("Escolha o campo", "warn");
    try {
      const dto = { campoNome: novoCard.campoNome, rotulo: novoCard.rotulo };
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
          Base por estágio
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
