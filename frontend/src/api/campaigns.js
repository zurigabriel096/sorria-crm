import { api } from "./client";

export const listCampaigns = () => api.get("/api/campaigns");
export const createCampaign = (payload) => api.post("/api/campaigns", payload);
export const updateCampaign = (id, payload) => api.put(`/api/campaigns/${id}`, payload);
export const deleteCampaign = (id) => api.del(`/api/campaigns/${id}`);

// Dispara a campanha para os contatos elegíveis. Retorna { total, entregues, falhas }.
// templateId (opcional): o template escolhido na tela de revisão do disparo.
// contatoIds (opcional): quando a campanha tem uma segmentação associada, restringe o
// disparo só a esses contatos em vez de toda a base elegível/pendente.
// O backend fala com a Evolution API GO de verdade (ver /backend/whatsapp).
export const dispatchCampaign = (id, templateId, contatoIds) => {
  const params = new URLSearchParams();
  if (templateId) params.set("templateId", templateId);
  (contatoIds || []).forEach((cid) => params.append("contatoIds", cid));
  const qs = params.toString();
  return api.post(`/api/campaigns/${id}/dispatch${qs ? `?${qs}` : ""}`);
};

export const listDispatchHistory = async () =>
  (await api.get("/api/dispatch-history")).map((h) => ({
    contatoId: h.contatoId,
    nome: h.contatoNome,
    campanha: h.campanhaNome,
    status: h.status,
    horaCompleta: h.hora,
    hora: h.hora ? new Date(h.hora).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" }) : "",
  }));

// Templates: o WhatsApp não permite botões interativos fora da API Business oficial,
// e o backend não suporta imagem de verdade ainda (só guarda uma URL, sem upload).
function templateFromApi(t) {
  return { id: t.id, nome: t.nome, categoria: t.categoria, campanha: t.campanhaObjetivo || "", corpo: t.corpo || "", imagem: t.imagemUrl || "", ativo: !!t.ativo };
}
function templateToApi(t) {
  return {
    nome: t.nome, categoria: t.categoria, campanhaObjetivo: t.campanha || null, corpo: t.corpo || "",
    imagemUrl: t.imagem?.startsWith("data:") ? null : (t.imagem || null), ativo: !!t.ativo,
  };
}

export const listTemplates = async () => (await api.get("/api/templates")).map(templateFromApi);
export const createTemplate = async (tpl) => templateFromApi(await api.post("/api/templates", templateToApi(tpl)));
export const updateTemplate = async (id, tpl) => templateFromApi(await api.put(`/api/templates/${id}`, templateToApi(tpl)));
