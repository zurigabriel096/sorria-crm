import { api } from "./client";

// Numeros ADICIONAIS de WhatsApp (alem do numero principal, gerenciado em
// api/whatsapp.js). Usados pra escolher por qual numero disparar cada campanha.
export const listNumeros = () => api.get("/api/whatsapp/numeros");
export const createNumero = (numero) => api.post("/api/whatsapp/numeros", numero);
export const deleteNumero = (id) => api.del(`/api/whatsapp/numeros/${id}`);
