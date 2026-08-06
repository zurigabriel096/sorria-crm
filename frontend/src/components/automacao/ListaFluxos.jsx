import { useEffect, useState } from "react";
import { T } from "../../theme";
import { s } from "../../styles/s";
import { Card } from "../ui/Card";
import { DotMenu } from "../ui/DotMenu";
import { IconZap } from "../icons";
import { NomeFluxoModal } from "./NomeFluxoModal";
import { listFluxos, createFluxo, deleteFluxo, ativarFluxo, arquivarFluxo } from "../../api/automacoes";

function noInicioPadrao() {
  return { id: "inicio", type: "start", position: { x: 60, y: 220 }, data: { entrada: null } };
}

export function ListaFluxos({ souAdmin, onAbrir, showToast, patients }) {
  const [fluxos, setFluxos] = useState(null);
  const [modalAberto, setModalAberto] = useState(false);
  const [criando, setCriando] = useState(false);
  const [verArquivados, setVerArquivados] = useState(false);

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

  const duplicar = async (f) => {
    try {
      const novo = await createFluxo({
        nome: `${f.nome} (cópia)`, ativo: false, nodes: f.nodes, edges: f.edges,
        contatoTesteId: f.contatoTesteId || null, whatsappNumeroId: f.whatsappNumeroId || null,
      });
      setFluxos((lista) => [...lista, novo]);
      showToast("Fluxo duplicado", "ok");
    } catch (e) {
      showToast(e.message || "Erro ao duplicar fluxo", "warn");
    }
  };

  // Pedido do Samuel (05/08/2026): excluir e' irreversivel (sem Ctrl+Z) e o
  // clique acidental ja aconteceu de verdade - sempre confirma antes.
  const excluir = async (f) => {
    if (!window.confirm(`Excluir o fluxo "${f.nome}"? Essa ação não pode ser desfeita.`)) return;
    try {
      await deleteFluxo(f.id);
      setFluxos((lista) => lista.filter((x) => x.id !== f.id));
      showToast("Fluxo excluído", "ok");
    } catch (e) {
      showToast(e.message || "Erro ao excluir fluxo", "warn");
    }
  };

  const arquivar = async (f) => {
    const vaiArquivar = !f.arquivado;
    try {
      const atualizado = await arquivarFluxo(f.id, vaiArquivar);
      setFluxos((lista) => lista.map((x) => (x.id === f.id ? atualizado : x)));
      showToast(vaiArquivar ? "Fluxo arquivado" : "Fluxo reativado", "ok");
    } catch (e) {
      showToast(e.message || "Erro ao arquivar fluxo", "warn");
    }
  };

  const alternarAtivo = async (f) => {
    if (!souAdmin) return;
    const vaiAtivar = !f.ativo;
    // Corte de seguranca (Fase 5): sem contato de teste, ativar um fluxo passa a
    // mandar mensagem de verdade pra todo mundo que bater com a segmentacao -
    // confirma explicitamente em vez de só virar a chavinha sem aviso.
    if (vaiAtivar && !f.contatoTesteId) {
      const confirmou = window.confirm(
        `"${f.nome}" não tem contato de teste configurado. Ao ativar, ele vai começar a mandar mensagens reais pra todo mundo que bater com a segmentação de entrada. Confirma?`
      );
      if (!confirmou) return;
    }
    try {
      await ativarFluxo(f.id, vaiAtivar);
      setFluxos((lista) => lista.map((x) => (x.id === f.id ? { ...x, ativo: vaiAtivar } : x)));
    } catch (e) {
      showToast(e.message || "Erro ao ativar/desativar fluxo", "warn");
    }
  };

  const nomeContatoTeste = (f) => (patients || []).find((p) => p.id === f.contatoTesteId)?.nome;

  if (fluxos === null) {
    return <Card><div style={{ textAlign: "center", padding: 30, color: T.inkSoft }}>Carregando fluxos...</div></Card>;
  }

  const listaFiltrada = fluxos.filter((f) => !!f.arquivado === verArquivados);

  return (
    <div style={{ display: "grid", gap: 14 }}>
      <div style={s.toolbar}>
        <div style={s.toggle}>
          <button style={{ ...s.toggleBtn, ...(!verArquivados ? { background: "#fff", color: T.ink } : {}) }} onClick={() => setVerArquivados(false)}>Ativos</button>
          <button style={{ ...s.toggleBtn, ...(verArquivados ? { background: "#fff", color: T.ink } : {}) }} onClick={() => setVerArquivados(true)}>Arquivados</button>
        </div>
        <div style={{ flex: 1 }} />
        <button style={s.btnPrimarySm} onClick={() => setModalAberto(true)}>+ Novo fluxo</button>
      </div>
      {!listaFiltrada.length && (
        <Card>
          {verArquivados ? (
            <div style={{ textAlign: "center", padding: 20, color: T.inkSoft }}>Nenhum fluxo arquivado.</div>
          ) : (
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
          )}
        </Card>
      )}
      <div style={s.cardGrid}>
        {listaFiltrada.map((f) => (
          <div key={f.id} style={{ ...s.campCard, display: "flex", flexDirection: "column" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <span style={{ ...s.tagOk, ...(f.ativo ? {} : { color: T.inkSoft, background: T.lineSoft }) }}>{f.ativo ? "● Ativo" : "○ Inativo"}</span>
              <DotMenu
                items={[
                  { label: "Editar", onClick: () => onAbrir(f.id) },
                  { label: "Duplicar", onClick: () => duplicar(f) },
                  { label: f.arquivado ? "Reativar" : "Arquivar", onClick: () => arquivar(f) },
                  { label: "Excluir", danger: true, onClick: () => excluir(f) },
                ]}
              />
            </div>
            <div style={{ fontWeight: 700, fontSize: 16, color: T.ink, margin: "12px 0 4px" }}>{f.nome}</div>
            {f.contatoTesteId && (
              <div style={{ fontSize: 11, fontWeight: 700, color: T.gold, marginBottom: 4 }}>
                🧪 Modo teste: só roda pra {nomeContatoTeste(f) || `contato #${f.contatoTesteId}`}
              </div>
            )}
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
