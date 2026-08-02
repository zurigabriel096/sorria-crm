// Formata um atraso {dias,horas,minutos,segundos} pro rodape do no de mensagem,
// ex: "Aguardando por 5min 30seg". Omite unidades zeradas; null se tudo zero.
export function formatarAtraso(atraso) {
  if (!atraso) return null;
  const { dias = 0, horas = 0, minutos = 0, segundos = 0 } = atraso;
  const partes = [];
  if (dias > 0) partes.push(`${dias}d`);
  if (horas > 0) partes.push(`${horas}h`);
  if (minutos > 0) partes.push(`${minutos}min`);
  if (segundos > 0) partes.push(`${segundos}seg`);
  if (!partes.length) return null;
  return `Aguardando por ${partes.join(" ")}`;
}
