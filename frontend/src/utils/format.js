export const brl = (n) => new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL", minimumFractionDigits: 2 }).format(n || 0);
export const num = (n) => new Intl.NumberFormat("pt-BR").format(Math.round(n || 0));

// "5 mil" em vez de "5.000" - usado em cartões de plano/volumetria, onde o
// numero exato importa menos que a leitura rapida.
export const numAbrev = (n) => {
  const v = Math.round(n || 0);
  if (v >= 1000 && v % 1000 === 0) return `${v / 1000} mil`;
  return num(v);
};
export const pct = (n) => `${Math.round(n || 0)}%`;

// Ex.: "01/08/2026 às 14:35" — usado no histórico de disparos, pra rastreabilidade
// (só a hora, sem data, não dava pra saber de qual dia era o envio).
export const dataHora = (iso) => {
  if (!iso) return "";
  const d = new Date(iso);
  const data = d.toLocaleDateString("pt-BR");
  const hora = d.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" });
  return `${data} às ${hora}`;
};

// "3min"/"5h"/"2d" - usado no badge de ultima interacao (Kanban) e na Fila
// de Trabalho, pra mostrar ha quanto tempo uma mensagem foi trocada.
export const tempoDesde = (iso) => {
  const min = Math.floor((Date.now() - new Date(iso).getTime()) / 60000);
  if (min < 60) return `${Math.max(min, 1)}min`;
  const h = Math.floor(min / 60);
  if (h < 24) return `${h}h`;
  return `${Math.floor(h / 24)}d`;
};

// "Hoje às 14:35"/"Ontem às 09:10"/"03/08 às 18:20" - pedido explicito no
// card do Kanban (Conversas.jsx): complementa o "há Xh" relativo com o
// horario/data absoluto de verdade, igual ao rotulo do Kommo.
export const dataHoraRelativa = (iso) => {
  if (!iso) return "";
  const d = new Date(iso);
  const hora = d.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" });
  const hoje = new Date();
  const ontem = new Date(hoje); ontem.setDate(ontem.getDate() - 1);
  const mesmoDia = (a, b) => a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();
  if (mesmoDia(d, hoje)) return `Hoje às ${hora}`;
  if (mesmoDia(d, ontem)) return `Ontem às ${hora}`;
  return `${d.toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit" })} às ${hora}`;
};
