import { useEffect, useState } from "react";
import { SidePanel } from "./SidePanel";
import { listSegmentacoes } from "../../api/segmentacoes";

const cardEstilo = (selecionado) => ({
  display: "block", width: "100%", textAlign: "left", padding: "13px 14px", borderRadius: 12,
  border: `1.5px solid ${selecionado ? "#0FA895" : "#E6EDEC"}`, background: selecionado ? "#E1F4F0" : "#fff",
  marginBottom: 10,
});

// entrada: { modoEntrada, tipoCondicao, segmentacao, automacaoMarketing } | null
// onMudar(novaEntradaParcial) faz merge no data.entrada do no de inicio.
export function EntradaPanel({ entrada, onMudar, onFechar }) {
  const e = entrada || { modoEntrada: null, tipoCondicao: null, segmentacao: null, automacaoMarketing: null };
  const [segmentacoes, setSegmentacoes] = useState([]);

  useEffect(() => { listSegmentacoes().then((lista) => setSegmentacoes(lista.filter((s) => !s.arquivado))); }, []);

  return (
    <SidePanel lado="direita" largura={320} titulo="Selecionar os leads" onFechar={onFechar}>
      <div style={{ fontSize: 12.5, fontWeight: 700, color: "#8A96A3", textTransform: "uppercase", letterSpacing: .4, marginBottom: 10 }}>
        Quando entram no fluxo
      </div>
      <button style={cardEstilo(e.modoEntrada === "futuros")} onClick={() => onMudar({ modoEntrada: "futuros" })}>
        <div style={{ fontWeight: 700, fontSize: 13.5, color: "#16263B" }}>Leads que vão atender aos critérios</div>
        <div style={{ fontSize: 12, color: "#5C6E7E", marginTop: 3 }}>Ao ativar o fluxo, entrarão leads que vão atender às condições após a ativação.</div>
      </button>
      <button style={cardEstilo(e.modoEntrada === "futurosEExistentes")} onClick={() => onMudar({ modoEntrada: "futurosEExistentes" })}>
        <div style={{ fontWeight: 700, fontSize: 13.5, color: "#16263B" }}>Leads que já atendem aos critérios</div>
        <div style={{ fontSize: 12, color: "#5C6E7E", marginTop: 3 }}>Ao ativar o fluxo, entrarão leads que já atendem às condições de entrada e aqueles que vão atender futuramente.</div>
      </button>

      <div style={{ fontSize: 12.5, fontWeight: 700, color: "#8A96A3", textTransform: "uppercase", letterSpacing: .4, margin: "18px 0 10px" }}>
        Origem dos leads
      </div>
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
