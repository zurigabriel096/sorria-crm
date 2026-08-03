import { useEffect, useRef, useState } from "react";
import { T } from "../../theme";

// Lista de variaveis realmente substituidas no backend na hora do envio
// (CampanhaService.primeiroNome / AutomacaoEngineService.primeiroNome) - so
// aparece aqui o que de fato funciona, pra nao repetir o bug de {nome} vs
// {data}/{hora} que nunca foram implementados mas apareciam no placeholder.
const VARIAVEIS_ATIVAS = [
  { chave: "{nome}", desc: "Primeiro nome do contato" },
];

// Icone "?" clicavel que abre um guia com as variaveis disponiveis pra usar
// no texto - clicar numa variavel insere ela na posicao do cursor do
// textarea (via ref) ou no final do texto, se nao tiver ref.
export function GuiaVariaveis({ textareaRef, valor, onMudar }) {
  const [aberto, setAberto] = useState(false);
  const wrapRef = useRef(null);

  useEffect(() => {
    if (!aberto) return;
    const fechar = (e) => {
      if (wrapRef.current && !wrapRef.current.contains(e.target)) setAberto(false);
    };
    document.addEventListener("mousedown", fechar);
    return () => document.removeEventListener("mousedown", fechar);
  }, [aberto]);

  const inserir = (variavel) => {
    const el = textareaRef?.current;
    const atual = valor || "";
    if (!el) {
      onMudar(atual + variavel);
      setAberto(false);
      return;
    }
    const start = el.selectionStart ?? atual.length;
    const end = el.selectionEnd ?? atual.length;
    onMudar(atual.slice(0, start) + variavel + atual.slice(end));
    setAberto(false);
    requestAnimationFrame(() => {
      el.focus();
      const pos = start + variavel.length;
      el.setSelectionRange(pos, pos);
    });
  };

  return (
    <div ref={wrapRef} style={{ position: "relative", display: "inline-block" }}>
      <button
        type="button"
        title="Ver variáveis disponíveis"
        onClick={() => setAberto((v) => !v)}
        style={{
          width: 20, height: 20, borderRadius: "50%", border: `1px solid ${T.line}`,
          background: aberto ? T.primarySoft : "#fff", color: aberto ? T.primary : T.inkSoft,
          fontSize: 11, fontWeight: 700, cursor: "pointer", display: "grid", placeItems: "center", lineHeight: 1, padding: 0,
        }}
      >
        ?
      </button>
      {aberto && (
        <div style={{
          position: "absolute", right: 0, top: 26, zIndex: 120, width: 230,
          background: "#fff", border: `1px solid ${T.line}`, borderRadius: 12,
          boxShadow: "0 16px 40px rgba(20,40,55,.16)", padding: 12,
        }}>
          <div style={{ fontSize: 10.5, fontWeight: 700, color: T.inkSoft, textTransform: "uppercase", letterSpacing: .4, marginBottom: 8 }}>
            Variáveis ativas
          </div>
          <div style={{ display: "grid", gap: 2 }}>
            {VARIAVEIS_ATIVAS.map((v) => (
              <button
                key={v.chave}
                type="button"
                onClick={() => inserir(v.chave)}
                style={{ display: "block", width: "100%", textAlign: "left", padding: "6px 8px", borderRadius: 8, border: "none", background: "transparent", cursor: "pointer" }}
                onMouseEnter={(e) => { e.currentTarget.style.background = T.primarySoft; }}
                onMouseLeave={(e) => { e.currentTarget.style.background = "transparent"; }}
              >
                <div style={{ fontSize: 12.5, fontWeight: 700, color: T.primaryDark }}>{v.chave}</div>
                <div style={{ fontSize: 11, color: T.inkSoft }}>{v.desc}</div>
              </button>
            ))}
          </div>
          <div style={{ fontSize: 10.5, color: T.inkSoft, marginTop: 8, lineHeight: 1.4 }}>
            Clique pra inserir no texto. É substituída de verdade no envio (campanha, disparo pra Prospects e fluxo de automação).
          </div>
        </div>
      )}
    </div>
  );
}
