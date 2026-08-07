import { useEffect, useState } from "react";
import { T } from "../theme";
import { s } from "../styles/s";
import { IconPlus, IconX, IconEdit, IconKanban } from "../components/icons";
import { useArrastarHorizontal } from "../utils/arrastarHorizontal";

// Prévia do futuro módulo de Conversas com WhatsApp Business (API oficial da
// Meta) - pedido do Samuel (06/08/2026) pra substituir a tela real (que hoje
// roda sobre o Evolution API, nao-oficial) enquanto a integracao oficial nao
// e' construida. Kanban 100% local/ficticio (colunas e cards de exemplo, sem
// nenhum contato/mensagem real, sem chamada de API) - nunca deve ser confundido
// com dado de produção, por isso a etiqueta "Prévia" fixa no topo. Persistido
// so' em localStorage pra sobreviver a um refresh, nao no backend.
const CHAVE_STORAGE = "sorria_conversas_preview_v1";

const ESTADO_INICIAL = {
  colunas: [
    { id: "c1", nome: "Início" },
    { id: "c2", nome: "Qualificação" },
    { id: "c3", nome: "Em atendimento" },
    { id: "c4", nome: "Cliente" },
  ],
  cards: [
    { id: "f1", nome: "Lead de exemplo A", tel: "(12) 9 9999-0001", colunaId: "c1", ultima: null },
    { id: "f2", nome: "Lead de exemplo B", tel: "(12) 9 9999-0002", colunaId: "c2", ultima: "Oi! Ainda tenho interesse, pode me chamar?" },
    { id: "f3", nome: "Lead de exemplo C", tel: "(12) 9 9999-0003", colunaId: "c3", ultima: "Combinado, te espero na quinta 👍" },
    { id: "f4", nome: "Lead de exemplo D", tel: "(12) 9 9999-0004", colunaId: "c4", ultima: "Show, muito obrigado pelo atendimento!" },
  ],
};

function carregar() {
  try {
    const salvo = JSON.parse(localStorage.getItem(CHAVE_STORAGE));
    if (salvo?.colunas?.length) return salvo;
  } catch {}
  return ESTADO_INICIAL;
}

export function ConversasPreview() {
  const arraste = useArrastarHorizontal();
  const [estado, setEstado] = useState(carregar);
  const [renomeando, setRenomeando] = useState(null);
  const [nomeEdicao, setNomeEdicao] = useState("");

  useEffect(() => { localStorage.setItem(CHAVE_STORAGE, JSON.stringify(estado)); }, [estado]);

  const criarColuna = () => {
    const nome = `Nova etapa ${estado.colunas.length + 1}`;
    setEstado((e) => ({ ...e, colunas: [...e.colunas, { id: `c${Date.now()}`, nome }] }));
  };

  const salvarNomeColuna = (id) => {
    setEstado((e) => ({ ...e, colunas: e.colunas.map((c) => (c.id === id ? { ...c, nome: nomeEdicao.trim() || c.nome } : c)) }));
    setRenomeando(null);
  };

  const excluirColuna = (id) => {
    setEstado((e) => ({
      colunas: e.colunas.filter((c) => c.id !== id),
      cards: e.cards.filter((card) => card.colunaId !== id),
    }));
  };

  const moverCard = (cardId, colunaId) => {
    setEstado((e) => ({ ...e, cards: e.cards.map((c) => (c.id === cardId ? { ...c, colunaId } : c)) }));
  };

  return (
    <div style={{ display: "grid", gap: 14 }}>
      <div style={{
        display: "flex", alignItems: "center", gap: 10, padding: "10px 14px", borderRadius: 12,
        background: T.primarySoft, border: `1px solid ${T.primary}33`,
      }}>
        <IconKanban color={T.primaryDark} />
        <div style={{ fontSize: 12.5, color: T.primaryDark, fontWeight: 600, lineHeight: 1.4 }}>
          Prévia — aqui vai funcionar a Conversas com WhatsApp (API oficial da Meta). Colunas e cards abaixo são fictícios,
          só pra desenhar o layout; edite as colunas como quiser pra testar a estrutura.
        </div>
      </div>

      <div
        ref={arraste.ref}
        style={{ display: "flex", gap: 14, alignItems: "start", overflowX: "auto", paddingBottom: 8, ...arraste.style }}
        {...arraste.props}
      >
        {estado.colunas.map((coluna) => {
          const cardsDaColuna = estado.cards.filter((c) => c.colunaId === coluna.id);
          return (
            <div
              key={coluna.id}
              onDragOver={(e) => e.preventDefault()}
              onDrop={(e) => moverCard(e.dataTransfer.getData("text/plain"), coluna.id)}
              style={{ width: 260, flexShrink: 0, display: "grid", gap: 10 }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: 6, padding: "0 2px" }}>
                {renomeando === coluna.id ? (
                  <input
                    autoFocus
                    value={nomeEdicao}
                    onChange={(e) => setNomeEdicao(e.target.value)}
                    onBlur={() => salvarNomeColuna(coluna.id)}
                    onKeyDown={(e) => e.key === "Enter" && salvarNomeColuna(coluna.id)}
                    style={{ ...s.input, height: 30, fontSize: 13, fontWeight: 700, flex: 1 }}
                  />
                ) : (
                  <div style={{ fontSize: 13, fontWeight: 700, color: T.ink, flex: 1 }}>
                    {coluna.nome} <span style={{ color: T.inkSoft, fontWeight: 600 }}>{cardsDaColuna.length}</span>
                  </div>
                )}
                <button title="Renomear" onClick={() => { setRenomeando(coluna.id); setNomeEdicao(coluna.nome); }}>
                  <IconEdit color={T.inkSoft} width={13} height={13} />
                </button>
                <button title="Excluir coluna" onClick={() => excluirColuna(coluna.id)}>
                  <IconX color={T.inkSoft} width={13} height={13} />
                </button>
              </div>

              <div style={{ display: "grid", gap: 8 }}>
                {cardsDaColuna.map((card) => (
                  <div
                    key={card.id}
                    draggable
                    onDragStart={(e) => e.dataTransfer.setData("text/plain", card.id)}
                    style={{ ...s.card, padding: 12, cursor: "grab" }}
                  >
                    <div style={{ fontWeight: 700, fontSize: 13.5, color: T.ink }}>{card.nome}</div>
                    <div style={{ fontSize: 11.5, color: T.inkSoft, marginBottom: card.ultima ? 6 : 0 }}>{card.tel}</div>
                    {card.ultima && (
                      <div style={{ fontSize: 12, color: T.inkSoft, fontStyle: "italic" }}>"{card.ultima}"</div>
                    )}
                  </div>
                ))}
                {!cardsDaColuna.length && (
                  <div style={{ fontSize: 12, color: T.inkSoft, textAlign: "center", padding: "10px 0" }}>Sem cards aqui</div>
                )}
              </div>
            </div>
          );
        })}

        <button
          onClick={criarColuna}
          style={{
            width: 180, flexShrink: 0, height: 40, display: "flex", alignItems: "center", justifyContent: "center", gap: 6,
            border: `1.5px dashed ${T.line}`, borderRadius: 12, color: T.inkSoft, fontWeight: 600, fontSize: 13,
          }}
        >
          <IconPlus color={T.inkSoft} /> Nova coluna
        </button>
      </div>
    </div>
  );
}
