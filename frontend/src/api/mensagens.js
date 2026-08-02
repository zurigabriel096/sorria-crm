import { api } from "./client";

// Historico real de conversa por lead (mao-dupla) - base do Kanban de
// conversas e do reply avulso fora do fluxo de campanha.
export const listMensagens = (contatoId) => api.get(`/api/contatos/${contatoId}/mensagens`);
export const enviarMensagem = (contatoId, payload) => api.post(`/api/contatos/${contatoId}/mensagens`, payload);
