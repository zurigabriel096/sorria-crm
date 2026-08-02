import { useState } from "react";
import { SidePanel } from "./SidePanel";

const LIMITE_IMAGEM_BYTES = 300 * 1024; // localStorage tem cota baixa (~5MB por origem) - imagem em base64 pesa ~33% a mais que o arquivo original.

function lerArquivoComoDataUrl(arquivo) {
  return new Promise((resolve, reject) => {
    const leitor = new FileReader();
    leitor.onload = () => resolve(leitor.result);
    leitor.onerror = reject;
    leitor.readAsDataURL(arquivo);
  });
}

const campoNumero = { width: 56, height: 36, border: "1px solid #E6EDEC", borderRadius: 8, padding: "0 8px", fontSize: 13, textAlign: "center" };
const rotuloNumero = { fontSize: 10.5, color: "#8A96A3", textAlign: "center", marginTop: 3 };

// Painel a ESQUERDA (unico painel do lado esquerdo no app) - configura o no
// "Enviar Mensagem" de verdade: texto+imagem sao uma unidade so, respostas
// rapidas, blocos extras de conteudo, e o atraso ate a proxima mensagem.
// De proposito SEM "+ Botao Adicionar": o WhatsApp bloqueia mensagem com botao
// interativo fora da API Business oficial (mesma regra ja documentada no
// EvolutionApiClient.java do sorria-crm).
export function MensagemPanel({ data, onMudar, onFechar }) {
  const [aviso, setAviso] = useState(null);

  const anexarImagem = async (arquivo, aoSalvar) => {
    if (!arquivo) return;
    if (arquivo.size > LIMITE_IMAGEM_BYTES) {
      setAviso(`Imagem muito grande (máx. ${Math.round(LIMITE_IMAGEM_BYTES / 1024)}KB neste protótipo).`);
      setTimeout(() => setAviso(null), 3500);
      return;
    }
    const dataUrl = await lerArquivoComoDataUrl(arquivo);
    aoSalvar({ nome: arquivo.name, dataUrl });
  };

  const atualizarAtraso = (campo, valor) => {
    const limites = { dias: 30, horas: 23, minutos: 59, segundos: 59 };
    const num = Math.max(0, Math.min(limites[campo], Number(valor) || 0));
    onMudar({ atraso: { ...(data.atraso || { dias: 0, horas: 0, minutos: 0, segundos: 0 }), [campo]: num } });
  };

  const adicionarResposta = () => {
    onMudar({ respostasRapidas: [...(data.respostasRapidas || []), { id: crypto.randomUUID(), texto: "" }] });
  };
  const mudarResposta = (id, texto) => {
    onMudar({ respostasRapidas: (data.respostasRapidas || []).map((r) => (r.id === id ? { ...r, texto } : r)) });
  };
  const removerResposta = (id) => {
    onMudar({ respostasRapidas: (data.respostasRapidas || []).filter((r) => r.id !== id) });
  };

  const adicionarBloco = (tipo) => {
    onMudar({ blocosConteudo: [...(data.blocosConteudo || []), { id: crypto.randomUUID(), tipo, texto: "", arquivo: null }] });
  };
  const mudarBloco = (id, patch) => {
    onMudar({ blocosConteudo: (data.blocosConteudo || []).map((b) => (b.id === id ? { ...b, ...patch } : b)) });
  };
  const removerBloco = (id) => {
    onMudar({ blocosConteudo: (data.blocosConteudo || []).filter((b) => b.id !== id) });
  };

  const atraso = data.atraso || { dias: 0, horas: 0, minutos: 0, segundos: 0 };

  return (
    <SidePanel lado="esquerda" largura={320} titulo="Enviar Mensagem" onFechar={onFechar}>
      <div style={{ fontSize: 12, color: "#5C6E7E", marginBottom: 14 }}>
        Enviar <strong style={{ color: "#0FA895" }}>dentro da janela de 24 horas</strong>
      </div>

      <div style={{ position: "relative", marginBottom: 10 }}>
        <textarea
          rows={4}
          placeholder="Insira seu texto..."
          value={data.texto || ""}
          onChange={(e) => onMudar({ texto: e.target.value })}
          style={{ width: "100%", border: "1px solid #E6EDEC", borderRadius: 10, padding: "10px 34px 10px 10px", fontSize: 13, resize: "vertical" }}
        />
        <label title="Anexar imagem a esta mensagem" style={{ position: "absolute", right: 8, top: 8, cursor: "pointer", fontSize: 16 }}>
          🖼
          <input type="file" accept="image/*" style={{ display: "none" }} onChange={(e) => anexarImagem(e.target.files[0], (img) => onMudar({ imagem: img }))} />
        </label>
      </div>
      {data.imagem && (
        <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 14, fontSize: 12, color: "#0FA895", fontWeight: 600 }}>
          🖼 {data.imagem.nome}
          <button onClick={() => onMudar({ imagem: null })} style={{ color: "#B0463E", fontSize: 11 }}>remover</button>
        </div>
      )}

      {(data.respostasRapidas || []).map((r) => (
        <div key={r.id} style={{ display: "flex", gap: 6, marginBottom: 8 }}>
          <input
            value={r.texto} onChange={(e) => mudarResposta(r.id, e.target.value)} placeholder="Resposta rápida..."
            style={{ flex: 1, height: 36, border: "1px solid #E6EDEC", borderRadius: 8, padding: "0 10px", fontSize: 12.5 }}
          />
          <button onClick={() => removerResposta(r.id)} style={{ color: "#B0463E", fontSize: 12 }}>×</button>
        </div>
      ))}
      <button onClick={adicionarResposta} style={{ width: "100%", padding: "9px 0", borderRadius: 10, border: "1px dashed #CBD5DB", color: "#5C6E7E", fontSize: 12.5, fontWeight: 600, marginBottom: 16 }}>
        + Adicionar Resposta Rápida
      </button>

      <div style={{ fontSize: 11, fontWeight: 700, color: "#8A96A3", textTransform: "uppercase", letterSpacing: .4, marginBottom: 8 }}>
        Adicione um dos blocos de conteúdo
      </div>
      <div style={{ display: "flex", gap: 6, marginBottom: 12 }}>
        {[["texto", "Texto"], ["imagem", "Imagem"], ["pdf", "PDF"]].map(([tipo, rotulo]) => (
          <button key={tipo} onClick={() => adicionarBloco(tipo)} style={{ flex: 1, padding: "8px 0", borderRadius: 8, border: "1px solid #E6EDEC", fontSize: 11.5, fontWeight: 600, color: "#16263B" }}>
            + {rotulo}
          </button>
        ))}
      </div>
      {(data.blocosConteudo || []).map((bloco) => (
        <div key={bloco.id} style={{ border: "1px solid #E6EDEC", borderRadius: 10, padding: 10, marginBottom: 10 }}>
          <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 6 }}>
            <span style={{ fontSize: 11, fontWeight: 700, color: "#8A96A3", textTransform: "uppercase" }}>{bloco.tipo}</span>
            <button onClick={() => removerBloco(bloco.id)} style={{ color: "#B0463E", fontSize: 12 }}>remover</button>
          </div>
          {bloco.tipo === "texto" ? (
            <textarea rows={2} value={bloco.texto} onChange={(e) => mudarBloco(bloco.id, { texto: e.target.value })}
              placeholder="Texto adicional..." style={{ width: "100%", border: "1px solid #E6EDEC", borderRadius: 8, padding: 8, fontSize: 12.5 }} />
          ) : (
            <>
              <input type="file" accept={bloco.tipo === "imagem" ? "image/*" : "application/pdf"}
                onChange={(e) => anexarImagem(e.target.files[0], (arq) => mudarBloco(bloco.id, { arquivo: arq }))} style={{ fontSize: 12 }} />
              {bloco.arquivo && <div style={{ fontSize: 11.5, color: "#0FA895", marginTop: 4 }}>{bloco.arquivo.nome}</div>}
            </>
          )}
        </div>
      ))}

      <div style={{ fontSize: 11, fontWeight: 700, color: "#8A96A3", textTransform: "uppercase", letterSpacing: .4, margin: "16px 0 8px" }}>
        Atraso até a próxima mensagem
      </div>
      <div style={{ display: "flex", gap: 8 }}>
        {[["dias", "Dias"], ["horas", "Horas"], ["minutos", "Min"], ["segundos", "Seg"]].map(([campo, rotulo]) => (
          <div key={campo}>
            <input type="number" min={0} value={atraso[campo]} onChange={(e) => atualizarAtraso(campo, e.target.value)} style={campoNumero} />
            <div style={rotuloNumero}>{rotulo}</div>
          </div>
        ))}
      </div>

      {aviso && <div style={{ marginTop: 14, fontSize: 12, color: "#B0463E", fontWeight: 600 }}>{aviso}</div>}
    </SidePanel>
  );
}
