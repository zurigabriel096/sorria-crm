import { api } from "./client";

// KPIs calculados no servidor (contagem por estágio, elegíveis, entregues, etc.)
// em vez de derivados no cliente a partir da lista completa de pacientes.
export const getDashboardKpis = () => api.get("/api/dashboard/kpis");
