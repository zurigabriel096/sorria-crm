import { api } from "./client";

// Quais colunas aparecem na tabela da Base de Leads - configuração única
// (não por pessoa), só ADMIN/GESTOR edita, todo colaborador enxerga a mesma
// tabela.
export const getColunasVisiveis = async () => (await api.get("/api/config-colunas")).colunas;
export const setColunasVisiveis = async (colunas) => (await api.put("/api/config-colunas", { colunas })).colunas;
