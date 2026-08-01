import { api } from "./client";

export const listCampaigns = () => api.get("/api/campaigns");
export const createCampaign = (payload) => api.post("/api/campaigns", payload);
export const updateCampaign = (id, payload) => api.put(`/api/campaigns/${id}`, payload);
export const deleteCampaign = (id) => api.del(`/api/campaigns/${id}`);

// Dispara a campanha para os contatos elegíveis. Retorna { total, entregues, falhas }.
// O backend fala com a Evolution API GO de verdade (ver /backend/whatsapp).
export const dispatchCampaign = (id) => api.post(`/api/campaigns/${id}/dispatch`);

export const listDispatchHistory = async () =>
  (await api.get("/api/dispatch-history")).map((h) => ({
    nome: h.contatoNome,
    campanha: h.campanhaNome,
    status: h.status,
    hora: h.hora ? new Date(h.hora).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" }) : "",
  }));

// Templates: o backend não suporta botões/imagem por enquanto (só nome, categoria,
// objetivo/campanha, corpo e ativo) — esses campos ficam só no estado local do editor
// e não são persistidos ao salvar.
function templateFromApi(t) {
  return { id: t.id, nome: t.nome, categoria: t.categoria, campanha: t.campanhaObjetivo || "", corpo: t.corpo || "", botoes: [], imagem: t.imagemUrl || "", ativo: !!t.ativo };
}
function templateToApi(t) {
  return { nome: t.nome, categoria: t.categoria, campanhaObjetivo: t.campanha || null, corpo: t.corpo || "", imagemUrl: t.imagem?.startsWith("data:") ? null : (t.imagem || null), ativo: !!t.ativo };
}

export const listTemplates = async () => (await api.get("/api/templates")).map(templateFromApi);
export const createTemplate = async (tpl) => templateFromApi(await api.post("/api/templates", templateToApi(tpl)));
export const updateTemplate = async (id, tpl) => templateFromApi(await api.put(`/api/templates/${id}`, templateToApi(tpl)));
