import { api } from "./client";

// Numeros ADICIONAIS de WhatsApp (alem do numero principal, gerenciado em
// api/whatsapp.js). Usados pra escolher por qual numero disparar cada campanha.
export const listNumeros = () => api.get("/api/whatsapp/numeros");
export const createNumero = (numero) => api.post("/api/whatsapp/numeros", numero);
export const deleteNumero = (id) => api.del(`/api/whatsapp/numeros/${id}`);

// Leads que ja trocaram mensagem por um numero especifico - base do filtro do
// Kanban de conversas por numero. id null/omitido = numero principal.
export const contatosPorNumero = (id) => api.get(`/api/whatsapp/numeros/contatos${id ? `?id=${id}` : ""}`);
