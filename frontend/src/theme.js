// Tokens visuais e constantes globais da clínica/tenant.
// Em uma versão multi-clínica, CLINICA/SUPORTE_WA viriam do backend (config do tenant logado).

// ink/inkSoft/bg/line/lineSoft/cardBg apontam pra CSS vars (global.css) que
// trocam de valor no modo noturno (data-theme="dark" na <html>, ver
// Topbar.jsx) - funciona sem re-render porque e' resolvido pelo navegador,
// nao pelo React. Cores de marca abaixo ficam fixas em hex de propósito:
// varias sao concatenadas com sufixo de alpha (ex.: T.primary + "1A" em
// Suporte.jsx/Config.jsx) - virar var quebraria essa concatenacao.
export const T = {
  ink: "var(--ink)", inkSoft: "var(--inkSoft)", bg: "var(--bg)", primary: "#0FA895",
  primaryDark: "#0B8375", primarySoft: "#E3F5F1", coral: "#FF6B5B", angry: "#FF6500",
  wa: "#25D366", line: "var(--line)", lineSoft: "var(--lineSoft)", gold: "#C8912A",
  cardBg: "var(--cardBg)",
  // Estagio do funil de Lead - mesma paleta em progressao usada no restante do
  // app (mais neutro no inicio, mais forte/positivo perto de virar Cliente).
  estagio: {
    "Lead": { fg: "#5A7089", bg: "#EDF1F6" },
    "Lead Qualificado": { fg: "#B07C1E", bg: "#FBF1D8" },
    "Cliente": { fg: "#0E9484", bg: "#E1F4F0" },
  },
};

export const AVATAR_COLORS = ["#0FA895", "#4C6FFF", "#FF6B5B", "#C8912A", "#8B5CF6", "#EC4899", "#16263B"];

export const CLINICA = "Orthodontic SJC · Vilaça";

// TODO(backend): "hoje" deve vir do servidor (Date.now() do backend) quando o cálculo de
// recência/vencimento depender de dados reais e não puder confiar no relógio do navegador.
export const HOJE = new Date();

export const SUPORTE_WA = `https://wa.me/5512982154270?text=${encodeURIComponent("Testando protótipo da Sorria :)")}`;
