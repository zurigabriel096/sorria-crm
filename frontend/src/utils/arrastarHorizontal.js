import { useRef } from "react";

// Permite arrastar o conteudo pro lado clicando e puxando a tela, em vez de
// depender so da barra de rolagem fina - usado em qualquer container com
// overflowX: auto (Kanban de Conversas, tabelas largas). Suprime o clique
// dos elementos por baixo (ex.: abrir um card) quando o usuario efetivamente
// arrastou, pra nao abrir nada por engano ao soltar o mouse.
export function useArrastarHorizontal() {
  const ref = useRef(null);
  const estado = useRef({ arrastando: false, inicioX: 0, scrollInicial: 0, moveu: false });

  const onMouseDown = (e) => {
    if (!ref.current) return;
    estado.current = { arrastando: true, inicioX: e.clientX, scrollInicial: ref.current.scrollLeft, moveu: false };
  };

  const onMouseMove = (e) => {
    if (!estado.current.arrastando || !ref.current) return;
    const delta = e.clientX - estado.current.inicioX;
    if (Math.abs(delta) > 4) estado.current.moveu = true;
    ref.current.scrollLeft = estado.current.scrollInicial - delta;
  };

  const parar = () => { estado.current.arrastando = false; };

  const onClickCapture = (e) => {
    if (estado.current.moveu) {
      e.stopPropagation();
      e.preventDefault();
      estado.current.moveu = false;
    }
  };

  return {
    ref,
    style: { cursor: "grab" },
    props: { onMouseDown, onMouseMove, onMouseUp: parar, onMouseLeave: parar, onClickCapture },
  };
}
