// Shell generico de modal (overlay escuro + caixa centralizada de cantos
// arredondados). Usado por NomeFluxoModal e AjudaZoomModal.
export function Modal({ aberto, onFechar, titulo, subtitulo, children, rodape, largura = 420 }) {
  if (!aberto) return null;

  return (
    <div
      style={{
        position: "fixed", inset: 0, background: "rgba(20,40,55,.45)",
        display: "grid", placeItems: "center", zIndex: 100, padding: 20,
      }}
      onClick={() => onFechar?.()}
    >
      <div
        style={{
          background: "#fff", borderRadius: 16, padding: 26, width: `min(${largura}px, 100%)`,
          boxShadow: "0 24px 60px rgba(20,40,55,.28)", maxHeight: "88vh", overflowY: "auto",
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {titulo && <div style={{ fontSize: 17, fontWeight: 800, color: "#16263B" }}>{titulo}</div>}
        {subtitulo && <div style={{ fontSize: 13, color: "#5C6E7E", marginTop: 6, lineHeight: 1.5 }}>{subtitulo}</div>}
        <div style={{ marginTop: titulo ? 18 : 0 }}>{children}</div>
        {rodape && <div style={{ display: "flex", gap: 10, marginTop: 20 }}>{rodape}</div>}
      </div>
    </div>
  );
}
