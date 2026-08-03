import { api } from "./client";

// Quais métricas de volume de disparo/mensagem aparecem no Painel Executivo -
// configuração única (não por pessoa), só ADMIN edita.
export const getMetricasVisiveis = async () => (await api.get("/api/config-painel-metricas")).metricas;
export const setMetricasVisiveis = async (metricas) => (await api.put("/api/config-painel-metricas", { metricas })).metricas;
