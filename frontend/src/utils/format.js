export const brl = (n) => new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL", minimumFractionDigits: 2 }).format(n || 0);
export const num = (n) => new Intl.NumberFormat("pt-BR").format(Math.round(n || 0));
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
