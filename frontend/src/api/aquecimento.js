import { api } from "./client";

// "Sorr.ia Protect" - troca de mensagem entre numeros dedicados a
// aquecimento (nunca com lead real), curva de volume crescente + intervalo
// "ritmo humano" entre envios. So ADMIN acessa (mexe em infra de WhatsApp).
export const getAquecimentoConfig = () => api.get("/api/aquecimento/config");
export const setAquecimentoConfig = (config) => api.put("/api/aquecimento/config", config);
export const getAquecimentoStatus = () => api.get("/api/aquecimento/status");
