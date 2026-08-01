import { api } from "./client";

// Antes só existia em memória (useState local) — sumia toda vez que a página
// recarregava ou a sessão expirava. Agora é persistido de verdade no backend.
export const listSegmentacoes = () => api.get("/api/segmentacoes");
export const createSegmentacao = (seg) => api.post("/api/segmentacoes", { nome: seg.nome, groups: seg.groups });
export const updateSegmentacao = (id, seg) => api.put(`/api/segmentacoes/${id}`, { nome: seg.nome, groups: seg.groups });
export const deleteSegmentacao = (id) => api.del(`/api/segmentacoes/${id}`);
