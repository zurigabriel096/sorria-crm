import { useState } from "react";
import { ListaFluxos } from "../components/automacao/ListaFluxos";
import { EditorFluxo } from "../components/automacao/EditorFluxo";

// Construtor visual de automações (triggers, mensagens, atrasos, tags/estágio),
// portado do protótipo isolado sorria-automacao e ligado na API real de
// /api/automacoes. `editando` null = lista de fluxos; um id = editor aberto.
export function Automacoes({ showToast, usuario }) {
  const [editando, setEditando] = useState(null);
  const souAdmin = usuario?.papel === "ADMIN";

  if (editando) {
    return <EditorFluxo fluxoId={editando} souAdmin={souAdmin} onVoltar={() => setEditando(null)} showToast={showToast} />;
  }
  return <ListaFluxos souAdmin={souAdmin} onAbrir={setEditando} showToast={showToast} />;
}
