import { api } from "./client";

// Campos que o proprio usuario define pro lead (ex.: "Convênio", "Valor do
// plano") - viram de verdade um campo no cadastro (Contato.camposCustomizados)
// e uma condição disponível no construtor de Segmentações.
export const listCamposCustomizados = () => api.get("/api/campos-customizados");
export const createCampoCustomizado = (campo) => api.post("/api/campos-customizados", campo);
export const updateCampoCustomizado = (id, campo) => api.put(`/api/campos-customizados/${id}`, campo);
export const deleteCampoCustomizado = (id) => api.del(`/api/campos-customizados/${id}`);
