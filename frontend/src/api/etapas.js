import { api } from "./client";

// Colunas do Kanban / estagio do funil do Lead - cadastro editavel (ADMIN),
// substitui o antigo array fixo ESTAGIOS_LEAD.
export const listEtapas = () => api.get("/api/etapas");
export const createEtapa = (nome) => api.post("/api/etapas", { nome });
export const renameEtapa = (id, nome) => api.patch(`/api/etapas/${id}`, { nome });
export const deleteEtapa = (id) => api.del(`/api/etapas/${id}`);
export const reorderEtapas = (idsEmOrdem) => api.put("/api/etapas/reordenar", idsEmOrdem);
