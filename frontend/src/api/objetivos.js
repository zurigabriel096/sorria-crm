import { api } from "./client";

// Objetivos/categorias de campanha e template, persistidos no backend - antes
// era só um array local em App.jsx que se perdia a cada reload.
export const listObjetivos = () => api.get("/api/objetivos");
export const createObjetivo = (nome) => api.post("/api/objetivos", { nome });
export const deleteObjetivo = (id) => api.del(`/api/objetivos/${id}`);
