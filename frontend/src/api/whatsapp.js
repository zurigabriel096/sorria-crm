import { api } from "./client";

export const getWhatsAppStatus = () => api.get("/api/whatsapp/status");
export const solicitarCodigoPareamento = (telefone) => api.post("/api/whatsapp/pareamento", { telefone });
