import { api } from "./client";

// Numeros ADICIONAIS de WhatsApp (alem do numero principal, gerenciado em
// api/whatsapp.js). Usados pra escolher por qual numero disparar cada campanha.
// createNumero so precisa do nome agora - o backend gera o token e ja cria a
// instancia na Evolution (antes precisava ser criada por fora, manualmente).
// finalidade: "DISPARO" (padrao) ou "AQUECIMENTO" (Sorr.ia Protect - nunca
// aparece como opcao de disparo de campanha).
export const listNumeros = () => api.get("/api/whatsapp/numeros");
// avancado (opcional): {token, instancia, servidorUrl} - pra vincular uma
// instancia QUE JA EXISTE (ex.: criada manualmente num servidor alternativo)
// em vez de criar uma nova. Omitido = comportamento normal (cria do zero).
export const createNumero = (nome, finalidade, avancado) => api.post("/api/whatsapp/numeros", { nome, finalidade, ...avancado });
export const deleteNumero = (id) => api.del(`/api/whatsapp/numeros/${id}`);

// Conectar um numero secundario direto pelo app (QR/pareamento/desconectar),
// mesmas acoes do numero principal (api/whatsapp.js) mas por id.
export const gerarQrCodeNumero = (id) => api.post(`/api/whatsapp/numeros/${id}/qrcode`);
export const solicitarPareamentoNumero = (id, telefone) => api.post(`/api/whatsapp/numeros/${id}/pareamento`, { telefone });
export const desconectarNumero = (id) => api.post(`/api/whatsapp/numeros/${id}/desconectar`);

// Leads que ja trocaram mensagem por um numero especifico - base do filtro do
// Kanban de conversas por numero. id null/omitido = numero principal.
export const contatosPorNumero = (id) => api.get(`/api/whatsapp/numeros/contatos${id ? `?id=${id}` : ""}`);
