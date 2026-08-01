import { api } from "./client";

export const listCampaigns = () => api.get("/api/campaigns");
export const createCampaign = (payload) => api.post("/api/campaigns", payload);
export const updateCampaign = (id, payload) => api.put(`/api/campaigns/${id}`, payload);
export const deleteCampaign = (id) => api.del(`/api/campaigns/${id}`);

// Dispara a campanha para os contatos elegíveis. O backend fica responsável por
// enfileirar os envios e falar com o WhatsApp via Evolution API (ver /backend/whatsapp).
export const dispatchCampaign = (id, payload) => api.post(`/api/campaigns/${id}/dispatch`, payload);

export const listDispatchHistory = () => api.get("/api/dispatch-history");

export const listTemplates = () => api.get("/api/templates");
export const createTemplate = (payload) => api.post("/api/templates", payload);
export const updateTemplate = (id, payload) => api.put(`/api/templates/${id}`, payload);
