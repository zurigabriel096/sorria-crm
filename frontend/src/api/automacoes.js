import { api } from "./client";

// Persistencia real dos fluxos de automacao (nodes/edges do @xyflow/react
// serializados como JSON no backend - ver FluxoAutomacao.java).
export const listFluxos = () => api.get("/api/automacoes");
export const getFluxo = (id) => api.get(`/api/automacoes/${id}`);
export const createFluxo = (fluxo) => api.post("/api/automacoes", fluxo);
export const updateFluxo = (id, fluxo) => api.put(`/api/automacoes/${id}`, fluxo);
export const deleteFluxo = (id) => api.del(`/api/automacoes/${id}`);
export const ativarFluxo = (id, ativo) => api.patch(`/api/automacoes/${id}/ativar`, { ativo });
export const arquivarFluxo = (id, arquivado) => api.patch(`/api/automacoes/${id}/arquivar`, { arquivado });
export const resetarTeste = (id) => api.post(`/api/automacoes/${id}/resetar-teste`);
