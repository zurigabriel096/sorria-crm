// Pontuacao de prioridade do lead - extraida de FilaTrabalho.jsx (06/08/2026)
// pra ser reaproveitada tambem no Painel Executivo ("Prioridades de hoje"),
// sem duplicar a regra em 2 lugares e correr risco dela divergir com o tempo.
export function pontuarPrioridade(p) {
  let score = 0;
  if (p.ultimaMensagemDirecao === "ENTRADA" && p.ultimaMensagemEm) {
    // Aguardando resposta do cliente e' sempre o que mais importa - soma um
    // teto de horas de espera pra desempatar quem esta esperando ha mais tempo.
    score += 1000 + Math.min(500, Math.floor((Date.now() - new Date(p.ultimaMensagemEm).getTime()) / 36e5));
  }
  if (p.proximaAcaoEm) {
    const diffMs = new Date(p.proximaAcaoEm).getTime() - Date.now();
    if (diffMs < 0) score += 900; // follow-up vencido
    else if (diffMs < 864e5) score += 700; // vence nas proximas 24h
  }
  return score;
}

export function diasSemAtividade(p) {
  if (!p.ultimaMensagemEm) return Infinity;
  return Math.floor((Date.now() - new Date(p.ultimaMensagemEm).getTime()) / 864e5);
}

// Motivo textual curto pro card de prioridade do Painel Executivo - mesma
// logica de pesos do pontuarPrioridade, so' que em texto pro usuario.
export function motivoPrioridade(p) {
  const vencido = !!p.proximaAcaoEm && new Date(p.proximaAcaoEm).getTime() < Date.now();
  if (p.ultimaMensagemDirecao === "ENTRADA" && p.ultimaMensagemEm) return "aguardando resposta";
  if (vencido) return "follow-up vencido";
  if (p.proximaAcaoEm) return "follow-up nas próximas 24h";
  return null;
}
