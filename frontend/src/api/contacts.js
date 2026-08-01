import { api } from "./client";

// CRUD de pacientes/contatos. Espelha o shape usado hoje em memória (ver utils/patients.js)
// mas persistido no backend (tabela contatos).
export const listContacts = (params = "") => api.get(`/api/contacts${params}`);
export const getContact = (id) => api.get(`/api/contacts/${id}`);
export const createContact = (payload) => api.post("/api/contacts", payload);
export const updateContact = (id, payload) => api.put(`/api/contacts/${id}`, payload);
export const deleteContact = (id) => api.del(`/api/contacts/${id}`);

// Importação de planilha: hoje é feita 100% no navegador (utils/patients.js).
// Quando o backend existir, o ideal é enviar o arquivo pro endpoint abaixo e deixar
// o parsing/normalização do lado do servidor (mais seguro para bases grandes).
export const importContactsFile = (file) => {
  const form = new FormData();
  form.append("file", file);
  return fetch(`${import.meta.env.VITE_API_URL || "http://localhost:8080"}/api/contacts/import`, {
    method: "POST",
    body: form,
    headers: { Authorization: `Bearer ${localStorage.getItem("sorria_token") || ""}` },
  }).then((r) => r.json());
};
