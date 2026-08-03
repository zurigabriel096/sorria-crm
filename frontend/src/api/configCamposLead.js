import { api } from "./client";

// Ordem dos campos fixos na aba "Dados" do cadastro do lead - configuração
// única (não por pessoa), só ADMIN edita.
export const getOrdemCamposLead = async () => (await api.get("/api/config-campos-lead")).campos;
export const setOrdemCamposLead = async (campos) => (await api.put("/api/config-campos-lead", { campos })).campos;
