import { api } from "./client";

export const getWhatsAppStatus = () => api.get("/api/whatsapp/status");
export const desconectarWhatsApp = () => api.post("/api/whatsapp/desconectar", {});
export const solicitarCodigoPareamento = (telefone) => api.post("/api/whatsapp/pareamento", { telefone });
export const obterQrCodeWhatsApp = () => api.post("/api/whatsapp/qrcode", {});
