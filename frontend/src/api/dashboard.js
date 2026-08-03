import { api } from "./client";

// KPIs calculados no servidor (contagem por estágio, elegíveis, entregues, etc.)
// em vez de derivados no cliente a partir da lista completa de pacientes.
export const getDashboardKpis = () => api.get("/api/dashboard/kpis");

// Volumetria real de disparo por categoria de template (Marketing/Utilidade/
// Autenticação) - usado na tela "Meu Plano" pra calcular consumo/excedente
// com dado de verdade em vez de numero fixo.
export const getDisparosPorCategoria = () => api.get("/api/dashboard/disparos-por-categoria");
