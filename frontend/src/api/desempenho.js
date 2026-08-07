import { api } from "./client";

// Dados reais de desempenho por colaborador (aba "Equipe" do Painel
// Executivo) - agregado no backend a partir de Contato/Mensagem, sem
// nenhum numero inventado no frontend.
export const getDesempenhoEquipe = () => api.get("/api/dashboard/desempenho-equipe");

export const getMetas = () => api.get("/api/metas");
export const salvarMetaEmpresa = (valor) => api.put("/api/metas/empresa", { valor });
export const salvarMetaEquipe = (valor) => api.put("/api/metas/equipe", { valor });
export const salvarMetaIndividual = (colaboradorId, valor) => api.put(`/api/metas/individual/${colaboradorId}`, { valor });
