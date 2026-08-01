export const brl = (n) => new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL", minimumFractionDigits: 2 }).format(n || 0);
export const num = (n) => new Intl.NumberFormat("pt-BR").format(Math.round(n || 0));
export const pct = (n) => `${Math.round(n || 0)}%`;
