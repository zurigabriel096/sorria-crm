import { api } from "./client";

// "Big numbers" configuráveis do Painel Executivo (campo personalizado +
// valor -> contagem). Só ADMIN cria/edita/remove no backend.
export const listPainelCards = () => api.get("/api/painel-cards");
export const createPainelCard = (card) => api.post("/api/painel-cards", card);
export const updatePainelCard = (id, card) => api.put(`/api/painel-cards/${id}`, card);
export const deletePainelCard = (id) => api.del(`/api/painel-cards/${id}`);
