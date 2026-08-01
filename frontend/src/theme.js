// Tokens visuais e constantes globais da clínica/tenant.
// Em uma versão multi-clínica, CLINICA/SUPORTE_WA viriam do backend (config do tenant logado).

export const T = {
  ink: "#16263B", inkSoft: "#5C6E7E", bg: "#F3F7F6", primary: "#0FA895",
  primaryDark: "#0B8375", primarySoft: "#E3F5F1", coral: "#FF6B5B", angry: "#FF6500",
  wa: "#25D366", line: "#E6EDEC", lineSoft: "#F0F4F3", gold: "#C8912A",
  seg: {
    VIP: { fg: "#B07C1E", bg: "#FBF1D8" },
    Fidelizado: { fg: "#0E9484", bg: "#E1F4F0" },
    Regular: { fg: "#5A7089", bg: "#EDF1F6" },
    Risco: { fg: "#C6761C", bg: "#FBEDDA" },
    Inativo: { fg: "#7A8791", bg: "#EEF1F2" },
  },
};

export const AVATAR_COLORS = ["#0FA895", "#4C6FFF", "#FF6B5B", "#C8912A", "#8B5CF6", "#EC4899", "#16263B"];

export const CLINICA = "Orthodontic SJC · Vilaça";

// TODO(backend): "hoje" deve vir do servidor (Date.now() do backend) quando o cálculo de
// recência/vencimento depender de dados reais e não puder confiar no relógio do navegador.
export const HOJE = new Date();

export const SUPORTE_WA = `https://wa.me/5512982152470?text=${encodeURIComponent("Testando protótipo da Sorr.ia :)")}`;
