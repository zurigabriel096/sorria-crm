import { useEffect, useMemo, useState } from "react";
import { T } from "../theme";
import { s } from "../styles/s";
import { dataHora, tempoDesde } from "../utils/format";
import { iniciais } from "../utils/usuario";
import { listEtapas } from "../api/etapas";
import { Card } from "../components/ui/Card";
import { DotMenu } from "../components/ui/DotMenu";
import { AtribuirResponsavelModal } from "../components/ui/AtribuirResponsavelModal";
import { IconUserPlaceholder } from "../components/icons";

function pontuarPrioridade(p) {
  let score = 0;
  if (p.ultimaMensagemDirecao === "ENTRADA" && p.ultimaMensagemEm) {
    // Aguardando resposta do cliente e' sempre o que mais importa - soma um
    // teto de horas de espera pra desempatar quem esta esperando ha mais tempo.
    score += 1000 + Math.min(500, Math.floor((Date.now() - new Date(p.ultimaMensagemEm).getTime()) / 36e5));
  }
  if (p.proximaAcaoEm) {
    const diffMs = new Date(p.proximaAcaoEm).getTime() - Date.now();
    if (diffMs < 0) score += 900; // follow-up vencido
    else if (diffMs < 864e5) score += 700; // vence nas proximas 24h
  }
  return score;
}

function diasSemAtividade(p) {
  if (!p.ultimaMensagemEm) return Infinity;
  return Math.floor((Date.now() - new Date(p.ultimaMensagemEm).getTime()) / 864e5);
}

const mesmoDia = (a, b) => a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();

const FILTROS = [
  { chave: "todos", rotulo: "Todos" },
  { chave: "sem_resposta", rotulo: "Sem resposta", teste: (p) => p.ultimaMensagemDirecao === "ENTRADA" },
  { chave: "aguardando_cliente", rotulo: "Aguardando cliente", teste: (p) => p.ultimaMensagemDirecao === "SAIDA" },
  { chave: "vencidos", rotulo: "Vencidos", teste: (p) => !!p.proximaAcaoEm && new Date(p.proximaAcaoEm).getTime() < Date.now() },
  { chave: "hoje", rotulo: "Hoje", teste: (p) => !!p.proximaAcaoEm && mesmoDia(new Date(p.proximaAcaoEm), new Date()) },
  {
    chave: "amanha", rotulo: "Amanhã",
    teste: (p) => {
      if (!p.proximaAcaoEm) return false;
      const amanha = new Date();
      amanha.setDate(amanha.getDate() + 1);
      return mesmoDia(new Date(p.proximaAcaoEm), amanha);
    },
  },
  {
    chave: "semana", rotulo: "Esta semana",
    teste: (p) => {
      if (!p.proximaAcaoEm) return false;
      const t = new Date(p.proximaAcaoEm).getTime();
      return t >= Date.now() && t <= Date.now() + 7 * 864e5;
    },
  },
];

export function FilaTrabalho({ patients, colaboradores, onAbrirConversa, usuario, filtroInicial, onAplicouFiltro, onAtribuirResponsavel, showToast }) {
  const souGestorOuAdmin = usuario?.papel === "ADMIN" || usuario?.papel === "GESTOR";
  const [atribuindoResponsavel, setAtribuindoResponsavel] = useState(null);
  const [filtro, setFiltro] = useState(filtroInicial || "todos");
  const [pagina, setPagina] = useState(1);
  const [tamanhoPagina, setTamanhoPagina] = useState(50);
  const [mostrarTudo, setMostrarTudo] = useState(false);
  const [etapas, setEtapas] = useState([]);
  useEffect(() => { listEtapas().then(setEtapas).catch(() => setEtapas([])); }, []);

  // Deep link do "Meu Dia" (big numbers) - App.jsx manda o filtro certo via
  // filtroInicial; consome uma vez e limpa, senao trava nesse filtro pra
  // sempre que a pessoa voltar nessa tela.
  useEffect(() => {
    if (!filtroInicial) return;
    setFiltro(filtroInicial);
    setPagina(1);
    onAplicouFiltro?.();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filtroInicial]);

  const filtros = useMemo(() => [
    ...FILTROS,
    { chave: "meus", rotulo: "Meus leads", teste: (p) => !!usuario?.id && p.responsavelId === usuario.id },
  ], [usuario]);

  // Nome da etapa -> limiar de dias sem mensagem calibrado pelo ADMIN nessa
  // coluna (EtapaKanban.limiarInatividadeDias), só existe pra etapas finais.
  const limiarPorEtapaFinal = useMemo(
    () => new Map(etapas.filter((e) => e.etapaFinal).map((e) => [e.nome, e.limiarInatividadeDias ?? 60])),
    [etapas]
  );

  // Ocultacao inteligente (F4): esconde por padrao quem esta numa etapa
  // final, sem follow-up futuro agendado e sem mensagem ha muito tempo -
  // nunca apaga o lead, so tira da rotina diaria. "Mostrar tudo" reverte.
  const visiveis = useMemo(() => {
    if (mostrarTudo) return patients;
    return patients.filter((p) => {
      const limiar = limiarPorEtapaFinal.get(p.estagio);
      const resolvido = limiar != null && !p.proximaAcaoEm && diasSemAtividade(p) > limiar;
      return !resolvido;
    });
  }, [patients, mostrarTudo, limiarPorEtapaFinal]);

  const filtrados = useMemo(() => {
    const f = filtros.find((x) => x.chave === filtro);
    const lista = !f?.teste ? visiveis : visiveis.filter(f.teste);
    return [...lista].sort((a, b) => pontuarPrioridade(b) - pontuarPrioridade(a));
  }, [visiveis, filtro, filtros]);

  const escondidos = patients.length - visiveis.length;

  const totalPaginas = Math.max(1, Math.ceil(filtrados.length / tamanhoPagina));
  const paginaAtual = Math.min(pagina, totalPaginas);
  const paginados = filtrados.slice((paginaAtual - 1) * tamanhoPagina, paginaAtual * tamanhoPagina);
  const trocarFiltro = (chave) => { setFiltro(chave); setPagina(1); };

  return (
    <div style={{ display: "grid", gap: 14 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 10 }}>
        <div style={{ fontSize: 14, fontWeight: 700, color: T.ink }}>Fila de Trabalho</div>
        {escondidos > 0 && (
          <button style={s.btnGhostSm} onClick={() => { setMostrarTudo((v) => !v); setPagina(1); }}>
            {mostrarTudo ? "Ocultar resolvidos" : `Mostrar tudo (${escondidos} ocultos)`}
          </button>
        )}
      </div>
      <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
        {filtros.map((f) => (
          <button
            key={f.chave}
            onClick={() => trocarFiltro(f.chave)}
            style={{
              padding: "6px 12px", borderRadius: 20, fontSize: 12.5, fontWeight: 700,
              background: filtro === f.chave ? T.primarySoft : T.lineSoft,
              color: filtro === f.chave ? T.primaryDark : T.inkSoft,
            }}
          >
            {f.rotulo}
          </button>
        ))}
      </div>
      {!filtrados.length && (
        <Card><div style={{ textAlign: "center", padding: 24, color: T.inkSoft }}>Nada por aqui — fila zerada.</div></Card>
      )}
      <div style={{ display: "grid", gap: 8 }}>
        {paginados.map((p) => {
          const colaborador = colaboradores.find((c) => c.id === p.responsavelId);
          const aguardando = p.ultimaMensagemDirecao === "ENTRADA";
          const vencido = !!p.proximaAcaoEm && new Date(p.proximaAcaoEm).getTime() < Date.now();
          return (
            <div
              key={p.id}
              onClick={() => onAbrirConversa(p.id)}
              className="prow"
              style={{
                display: "flex", alignItems: "center", gap: 12, padding: "12px 14px",
                background: "#fff", border: `1px solid ${T.line}`, borderRadius: 12,
                borderLeft: `3px solid ${aguardando ? T.coral : "transparent"}`,
              }}
            >
              <div style={{
                width: 30, height: 30, borderRadius: "50%", background: colaborador?.corPerfil || T.inkSoft, color: "#fff",
                display: "grid", placeItems: "center", fontSize: 12, fontWeight: 700, flexShrink: 0, overflow: "hidden",
              }}>
                {colaborador?.avatarUrl ? (
                  <img src={colaborador.avatarUrl} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                ) : colaborador ? (
                  iniciais(colaborador.nome)
                ) : (
                  <IconUserPlaceholder width={16} height={16} />
                )}
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontWeight: 700, fontSize: 13.5, color: T.ink }}>{p.nome}</div>
                <div style={{ fontSize: 11.5, color: T.inkSoft }}>{p.estagio || "Lead"} · {p.tel || "sem telefone"}</div>
              </div>
              <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: 4 }}>
                {p.ultimaMensagemEm && (
                  <span style={{ fontSize: 10.5, fontWeight: 700, color: aguardando ? T.coral : T.inkSoft, whiteSpace: "nowrap" }}>
                    {aguardando ? `⏱ aguardando há ${tempoDesde(p.ultimaMensagemEm)}` : `✓ respondido há ${tempoDesde(p.ultimaMensagemEm)}`}
                  </span>
                )}
                {p.proximaAcaoEm && (
                  <span style={{ fontSize: 10.5, fontWeight: 700, color: vencido ? T.coral : T.primary, whiteSpace: "nowrap" }}>
                    {vencido ? "📌 follow-up vencido" : `📌 ${dataHora(p.proximaAcaoEm)}`}
                  </span>
                )}
              </div>
              {souGestorOuAdmin && (
                <div onClick={(e) => e.stopPropagation()}>
                  <DotMenu items={[{ label: "Atribuir responsável", onClick: () => setAtribuindoResponsavel(p) }]} />
                </div>
              )}
            </div>
          );
        })}
      </div>
      <div style={{ display: "flex", alignItems: "center", gap: 14, flexWrap: "wrap", fontSize: 12.5, color: T.inkSoft }}>
        <span>
          Mostrando {filtrados.length ? (paginaAtual - 1) * tamanhoPagina + 1 : 0}–{Math.min(paginaAtual * tamanhoPagina, filtrados.length)} de {filtrados.length}.
        </span>
        <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
          <span>Por página:</span>
          <select
            value={tamanhoPagina} style={{ ...s.select, padding: "3px 8px", fontSize: 12.5 }}
            onChange={(e) => { setTamanhoPagina(Number(e.target.value)); setPagina(1); }}
          >
            {[10, 25, 50].map((n) => <option key={n} value={n}>{n}</option>)}
          </select>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <button style={s.btnGhostSm} disabled={paginaAtual <= 1} onClick={() => setPagina((p) => p - 1)}>‹ Anterior</button>
          <span>Página {paginaAtual} de {totalPaginas}</span>
          <button style={s.btnGhostSm} disabled={paginaAtual >= totalPaginas} onClick={() => setPagina((p) => p + 1)}>Próxima ›</button>
        </div>
      </div>

      {atribuindoResponsavel && (
        <AtribuirResponsavelModal
          paciente={atribuindoResponsavel}
          colaboradores={colaboradores || []}
          onConfirmar={(p, colaboradorId) => onAtribuirResponsavel(p, colaboradorId)}
          onClose={() => setAtribuindoResponsavel(null)}
          showToast={showToast}
        />
      )}
    </div>
  );
}
