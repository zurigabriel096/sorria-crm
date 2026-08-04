import { api } from "./client";

// Agente Virtual: triagem simples sem IA (palavra-chave -> resposta fixa,
// escritas pelo Samuel). So ADMIN acessa - responde lead em nome da clinica.
export const getAgenteVirtualConfig = () => api.get("/api/agente-virtual/config");
export const setAgenteVirtualConfig = (config) => api.put("/api/agente-virtual/config", config);
export const listarPerguntasFrequentes = () => api.get("/api/agente-virtual/perguntas");
export const criarPerguntaFrequente = (pergunta) => api.post("/api/agente-virtual/perguntas", pergunta);
export const atualizarPerguntaFrequente = (id, pergunta) => api.put(`/api/agente-virtual/perguntas/${id}`, pergunta);
export const excluirPerguntaFrequente = (id) => api.del(`/api/agente-virtual/perguntas/${id}`);
