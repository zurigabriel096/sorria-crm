import { useEffect, useState } from "react";
import { T } from "../../theme";
import { s } from "../../styles/s";
import { Card } from "../ui/Card";
import { IconZap } from "../icons";
import { NomeFluxoModal } from "./NomeFluxoModal";
import { listFluxos, createFluxo, deleteFluxo, ativarFluxo } from "../../api/automacoes";

function noInicioPadrao() {
  return { id: "inicio", type: "start", position: { x: 60, y: 220 }, data: { entrada: null } };
}

export function ListaFluxos({ souAdmin, onAbrir, showToast }) {
  const [fluxos, setFluxos] = useState(null);
  const [modalAberto, setModalAberto] = useState(false);
  const [criando, setCriando] = useState(false);

  const carregar = () => listFluxos().then(setFluxos).catch(() => setFluxos([]));
  useEffect(() => { carregar(); }, []);

  const criar = async (nome) => {
    setCriando(true);
    try {
      const novo = await createFluxo({ nome, ativo: false, nodes: [noInicioPadrao()], edges: [] });
      setModalAberto(false);
      onAbrir(novo.id);
    } catch (e) {
      showToast(e.message || "Erro ao criar fluxo", "warn");
    } finally {
      setCriando(false);
    }
  };

  const excluir = async (f) => {
    try {
      await deleteFluxo(f.id);
      setFluxos((lista) => lista.filter((x) => x.id !== f.id));
      showToast("Fluxo excluído", "ok");
    } catch (e) {
      showToast(e.message || "Erro ao excluir fluxo", "warn");
    }
  };

  const alternarAtivo = async (f) => {
    if (!souAdmin) return;
    try {
      await ativarFluxo(f.id, !f.ativo);
      setFluxos((lista) => lista.map((x) => (x.id === f.id ? { ...x, ativo: !x.ativo } : x)));
    } catch (e) {
      showToast(e.message || "Erro ao ativar/desativar fluxo", "warn");
    }
  };

  if (fluxos === null) {
    return <Card><div style={{ textAlign: "center", padding: 30, color: T.inkSoft }}>Carregando fluxos...</div></Card>;
  }

  return (
    <div style={{ display: "grid", gap: 14 }}>
      <div style={{ ...s.toolbar, justifyContent: "flex-end" }}>
        <button style={s.btnPrimarySm} onClick={() => setModalAberto(true)}>+ Novo fluxo</button>
      </div>
      {!fluxos.length && (
        <Card>
          <div style={{ display: "grid", placeItems: "center", padding: "50px 20px", textAlign: "center", gap: 14 }}>
            <div style={{ width: 56, height: 56, borderRadius: 16, background: T.primarySoft, display: "grid", placeItems: "center" }}>
              <IconZap color={T.primary} />
            </div>
            <div style={{ fontSize: 17, fontWeight: 700, color: T.ink }}>Nenhum fluxo criado ainda</div>
            <div style={{ fontSize: 13.5, color: T.inkSoft, maxWidth: 420, lineHeight: 1.5 }}>
              Construtor visual de automações — triggers, mensagens, atrasos e ações conectados por linhas, pra montar jornadas de reativação sem depender de um modelo engessado.
            </div>
            <button style={s.btnPrimarySm} onClick={() => setModalAberto(true)}>+ Criar meu primeiro fluxo</button>
          </div>
        </Card>
      )}
      <div style={s.cardGrid}>
        {fluxos.map((f) => (
          <div key={f.id} style={{ ...s.campCard, display: "flex", flexDirection: "column" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <span style={{ ...s.tagOk, ...(f.ativo ? {} : { color: T.inkSoft, background: T.lineSoft }) }}>{f.ativo ? "● Ativo" : "○ Inativo"}</span>
              <button onClick={() => excluir(f)} style={{ fontSize: 12, color: T.coral, fontWeight: 600 }}>Excluir</button>
            </div>
            <div style={{ fontWeight: 700, fontSize: 16, color: T.ink, margin: "12px 0 4px" }}>{f.nome}</div>
            {f.atualizadoEm && <div style={{ fontSize: 10.5, color: T.inkSoft, flex: 1 }}>Editado em {new Date(f.atualizadoEm).toLocaleString("pt-BR")}</div>}
            <div style={{ display: "flex", gap: 8, marginTop: 14 }}>
              {souAdmin && (
                <button style={{ ...s.btnGhostSm, flex: 1, justifyContent: "center" }} onClick={() => alternarAtivo(f)}>
                  {f.ativo ? "Desativar" : "Ativar"}
                </button>
              )}
              <button style={{ ...s.btnPrimarySm, flex: 1, justifyContent: "center" }} onClick={() => onAbrir(f.id)}>Abrir</button>
            </div>
          </div>
        ))}
      </div>
      <NomeFluxoModal aberto={modalAberto} nomeAtual="" onFechar={() => setModalAberto(false)} onConfirmar={criar} />
      {criando && <div style={{ position: "fixed", inset: 0, background: "rgba(255,255,255,.5)", zIndex: 200 }} />}
    </div>
  );
}
