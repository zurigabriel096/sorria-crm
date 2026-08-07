import { api } from "./client";

// Colaboradores = usuarios com login real (tabela "usuarios" no backend).
// papel: ADMIN | GESTOR | MARKETING | RECEPCAO | TELEMARKETING.
export const listColaboradores = () => api.get("/api/usuarios");

export const createColaborador = (c) =>
  api.post("/api/usuarios", { nome: c.nome, cpf: c.cpf, email: c.email, senha: c.senha, papel: c.papel });

export const updateColaborador = (id, c) =>
  api.put(`/api/usuarios/${id}`, { nome: c.nome, cpf: c.cpf, email: c.email, senha: c.senha || null, papel: c.papel });

export const deleteColaborador = (id) => api.del(`/api/usuarios/${id}`);

// Quais abas fixas do Painel Executivo este colaborador pode ver quando NAO
// e' ADMIN/GESTOR (ver Usuario.abasDashboardPermitidas no backend).
export const updateAbasDashboard = (id, abas) => api.put(`/api/usuarios/${id}/abas-dashboard`, { abas });
