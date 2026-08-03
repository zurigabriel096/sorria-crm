import { api } from "./client";

// Catálogo dinâmico de funções/cargos de colaborador (nome + cor) - substitui
// a lista fixa que existia em utils/usuario.js. Só ADMIN cria/edita/remove.
export const listPapeisCargo = () => api.get("/api/papeis-cargo");
export const createPapelCargo = (papel) => api.post("/api/papeis-cargo", papel);
export const updatePapelCargo = (id, papel) => api.put(`/api/papeis-cargo/${id}`, papel);
export const deletePapelCargo = (id) => api.del(`/api/papeis-cargo/${id}`);
