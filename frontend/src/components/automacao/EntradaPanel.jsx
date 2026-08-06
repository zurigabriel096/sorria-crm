import { useEffect, useState } from "react";
import { SidePanel } from "./SidePanel";
import { listSegmentacoes } from "../../api/segmentacoes";
import { montarFieldMeta } from "../../data/seed";
import { matchSeg } from "../../utils/patients";
import { CondicaoBuilder, novoGrupo } from "./CondicaoBuilder";

const cardEstilo = (selecionado) => ({
  display: "block", width: "100%", textAlign: "left", padding: "13px 14px", borderRadius: 12,
  border: `1.5px solid ${selecionado ? "#0FA895" : "#E6EDEC"}`, background: selecionado ? "#E1F4F0" : "#fff",
  marginBottom: 10,
});

// entrada: { modoEntrada, tipoCondicao, segmentacao, automacaoMarketing } | null
// onMudar(novaEntradaParcial) faz merge no data.entrada do no de inicio.
//
// "modoEntrada" NAO tem efeito real no motor (AutomacaoEngineService varre
// TODOS os contatos a cada tick, sempre - ver comentario "Simplificacoes
// conscientes" la) - as duas opcoes que existiam aqui ("vao atender" vs "ja
// atendem") sempre se comportavam como a segunda, escolhendo qualquer uma.
// Removido o falso escolha (confundia mais do que ajudava, reportado pelo
// Samuel 05/08/2026) - grava sozinho o unico comportamento que de fato
// existe, sem perguntar nada que nao faz diferenca.
export function EntradaPanel({ entrada, onMudar, onFechar, camposCustomizados, patients }) {
  const e = entrada || { modoEntrada: null, tipoCondicao: null, segmentacao: null, automacaoMarketing: null };
  const [segmentacoes, setSegmentacoes] = useState([]);
  const fieldMeta = montarFieldMeta(camposCustomizados);

  useEffect(() => { listSegmentacoes().then((lista) => setSegmentacoes(lista.filter((s) => !s.arquivado))); }, []);
  useEffect(() => {
    if (!e.modoEntrada) onMudar({ modoEntrada: "futurosEExistentes" });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <SidePanel lado="direita" largura={320} titulo="Selecionar os leads" onFechar={onFechar}>
      <div style={{ fontSize: 12.5, color: "#5C6E7E", background: "#F7F9F9", border: "1px solid #E6EDEC", borderRadius: 12, padding: "10px 12px", marginBottom: 16, lineHeight: 1.5 }}>
        Ao ativar, entram os leads que já atendem aos critérios de entrada abaixo <b>e</b> os que passarem a atender depois — sempre os dois juntos.
      </div>

      <div style={{ fontSize: 12.5, fontWeight: 700, color: "#8A96A3", textTransform: "uppercase", letterSpacing: .4, margin: "0 0 10px" }}>
        Origem dos leads
      </div>
      <button style={cardEstilo(e.tipoCondicao === "condicao")} onClick={() => onMudar({ tipoCondicao: "condicao", condicao: e.condicao || { groups: [novoGrupo()] } })}>
        <div style={{ fontWeight: 700, fontSize: 13.5, color: "#16263B" }}>Condição direta (campo do lead)</div>
        <div style={{ fontSize: 12, color: "#5C6E7E", marginTop: 3 }}>
          Monte a condição aqui mesmo — qualquer campo nativo ou Personalizado — sem precisar salvar uma Segmentação separada primeiro.
        </div>
      </button>
      {e.tipoCondicao === "condicao" && (
        <div style={{ marginBottom: 14 }}>
          <CondicaoBuilder
            groups={e.condicao?.groups || [novoGrupo()]}
            onChange={(groups) => onMudar({ condicao: { groups } })}
            fieldMeta={fieldMeta}
          />
          {patients && (
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: 10, padding: "10px 12px", background: "#E1F4F0", borderRadius: 10 }}>
              <span style={{ fontSize: 12.5, color: "#0E9484", fontWeight: 600 }}>Captura agora:</span>
              <b style={{ fontSize: 15, color: "#0E9484" }}>
                {(() => {
                  const n = patients.filter((p) => matchSeg(p, { groups: e.condicao?.groups || [] })).length;
                  return n === 1 ? "1 lead" : `${n} leads`;
                })()}
              </b>
            </div>
          )}
        </div>
      )}

      <button style={cardEstilo(e.tipoCondicao === "segmentacao")} onClick={() => onMudar({ tipoCondicao: "segmentacao" })}>
        <div style={{ fontWeight: 700, fontSize: 13.5, color: "#16263B" }}>Entraram na lista de segmentação</div>
        <div style={{ fontSize: 12, color: "#5C6E7E", marginTop: 3 }}>Lista de Leads criadas em Segmentação.</div>
      </button>
      {e.tipoCondicao === "segmentacao" && (
        <select
          style={{ width: "100%", height: 40, border: "1px solid #E6EDEC", borderRadius: 10, padding: "0 12px", fontSize: 13.5, marginBottom: 14 }}
          value={e.segmentacao?.id || ""}
          onChange={(ev) => {
            const seg = segmentacoes.find((s) => s.id === Number(ev.target.value)) || null;
            onMudar({ segmentacao: seg ? { id: seg.id, nome: seg.nome } : null });
          }}
        >
          <option value="">Selecione a segmentação...</option>
          {segmentacoes.map((s) => <option key={s.id} value={s.id}>{s.nome}</option>)}
        </select>
      )}

      <button style={cardEstilo(e.tipoCondicao === "mensagemRecebida")} onClick={() => onMudar({ tipoCondicao: "mensagemRecebida" })}>
        <div style={{ fontWeight: 700, fontSize: 13.5, color: "#16263B" }}>Mensagem recebida (1ª do dia, sem resposta)</div>
        <div style={{ fontSize: 12, color: "#5C6E7E", marginTop: 3 }}>
          Dispara quando a primeira mensagem do dia de um lead fica um tempo sem nenhuma resposta (de humano ou de outra automação).
        </div>
      </button>
      {e.tipoCondicao === "mensagemRecebida" && (
        <div style={{ marginBottom: 14 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8 }}>
            <span style={{ fontSize: 12.5, color: "#5C6E7E" }}>Espera</span>
            <input
              type="number" min={1} max={1440}
              style={{ width: 64, height: 34, border: "1px solid #E6EDEC", borderRadius: 8, padding: "0 8px", fontSize: 13 }}
              value={e.mensagemRecebida?.esperaMinutos ?? 1}
              onChange={(ev) => onMudar({ mensagemRecebida: { ...e.mensagemRecebida, esperaMinutos: Math.max(1, Math.min(1440, Number(ev.target.value) || 1)) } })}
            />
            <span style={{ fontSize: 12.5, color: "#5C6E7E" }}>minuto(s) sem resposta</span>
          </div>
          <div style={{ fontSize: 11.5, color: "#8A96A3", marginBottom: 8 }}>
            Opcional: restrinja a uma Segmentação (ex.: só quem tem um Campo Personalizado com determinado valor) - em branco, vale pra qualquer lead que mandar mensagem.
          </div>
          <select
            style={{ width: "100%", height: 40, border: "1px solid #E6EDEC", borderRadius: 10, padding: "0 12px", fontSize: 13.5 }}
            value={e.mensagemRecebida?.segmentacao?.id || ""}
            onChange={(ev) => {
              const seg = segmentacoes.find((s) => s.id === Number(ev.target.value)) || null;
              onMudar({ mensagemRecebida: { ...e.mensagemRecebida, segmentacao: seg ? { id: seg.id, nome: seg.nome } : null } });
            }}
          >
            <option value="">Qualquer lead (sem restrição)</option>
            {segmentacoes.map((s) => <option key={s.id} value={s.id}>{s.nome}</option>)}
          </select>
        </div>
      )}

      <button style={cardEstilo(e.tipoCondicao === "automacaoMarketing")} onClick={() => onMudar({ tipoCondicao: "automacaoMarketing" })}>
        <div style={{ fontWeight: 700, fontSize: 13.5, color: "#16263B" }}>Automação de marketing</div>
        <div style={{ fontSize: 12, color: "#5C6E7E", marginTop: 3 }}>
          Recepção do lead que iniciou conversa: entende a intenção, coleta dados e prepara pro atendente prospectar depois.
        </div>
      </button>
      {e.tipoCondicao === "automacaoMarketing" && (
        <input
          style={{ width: "100%", height: 40, border: "1px solid #E6EDEC", borderRadius: 10, padding: "0 12px", fontSize: 13.5 }}
          placeholder="Objetivo da automação..."
          value={e.automacaoMarketing?.objetivo || ""}
          onChange={(ev) => onMudar({ automacaoMarketing: { objetivo: ev.target.value } })}
        />
      )}
    </SidePanel>
  );
}
