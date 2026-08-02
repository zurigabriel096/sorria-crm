import { api } from "./client";

// Tags de verdade (nome + cor), persistidas no backend - antes era só um
// array local em App.jsx que se perdia a cada reload.
export const listTags = () => api.get("/api/tags");
export const createTag = (nome, cor) => api.post("/api/tags", { nome, cor });
export const updateTag = (id, nome, cor) => api.put(`/api/tags/${id}`, { nome, cor });
export const deleteTag = (id) => api.del(`/api/tags/${id}`);
