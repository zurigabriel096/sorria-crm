import { api } from "./client";

// Colunas do Kanban / estagio do funil do Lead - cadastro editavel (ADMIN),
// substitui o antigo array fixo ESTAGIOS_LEAD.
export const listEtapas = () => api.get("/api/etapas");
export const createEtapa = (nome) => api.post("/api/etapas", { nome });
export const renameEtapa = (id, nome) => api.patch(`/api/etapas/${id}`, { nome });
export const deleteEtapa = (id) => api.del(`/api/etapas/${id}`);
export const reorderEtapas = (idsEmOrdem) => api.put("/api/etapas/reordenar", idsEmOrdem);

// Marca/desmarca uma coluna como "etapa final" (ex.: Cliente/Pos-venda) -
// so afeta a ocultacao inteligente da Fila de Trabalho, nunca o Kanban.
export const marcarEtapaFinal = (id, etapaFinal) => api.patch(`/api/etapas/${id}/final`, { etapaFinal });

// Dias sem mensagem que essa coluna exige (quando etapaFinal=true) pra sumir
// por padrao da Fila de Trabalho - calibravel por coluna em vez de um numero
// global fixo.
export const definirLimiarInatividade = (id, limiarInatividadeDias) =>
  api.patch(`/api/etapas/${id}/limiar`, { limiarInatividadeDias });
