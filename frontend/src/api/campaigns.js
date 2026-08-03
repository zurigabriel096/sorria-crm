import { api } from "./client";
import { dataHora } from "../utils/format";

export const listCampaigns = () => api.get("/api/campaigns");
export const createCampaign = (payload) => api.post("/api/campaigns", payload);
export const updateCampaign = (id, payload) => api.put(`/api/campaigns/${id}`, payload);
export const deleteCampaign = (id) => api.del(`/api/campaigns/${id}`);
export const archiveCampaign = (id, arquivado) => api.patch(`/api/campaigns/${id}/arquivar`, { arquivado });

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

// Disparo pra prospects (fora do CRM) - a lista inteira (telefone+nome) vai no
// corpo, nao cria/mescla Contato nenhum. Retorna { total, entregues, falhas }.
export const dispatchProspects = (id, templateId, prospects) =>
  api.post(`/api/campaigns/${id}/dispatch-prospects`, { templateId: templateId || null, prospects });

// Performance calculada sob demanda (nao fica salva nem exposta por padrao) -
// pensado pra comparar 2 campanhas usadas como variantes de teste A/B.
export const getCampaignPerformance = (id) => api.get(`/api/campaigns/${id}/performance`);

export const listDispatchProspectHistory = () => api.get("/api/dispatch-prospect-history");

// Limpeza manual do historico de disparo (CRM + prospects) - irreversivel,
// restrito a ADMIN no backend. O frontend exige frase de confirmacao digitada
// antes de chamar (ver HistoricoDisparos.jsx).
export const limparHistoricoDisparo = () => api.del("/api/dispatch-history");
export const limparHistoricoProspects = () => api.del("/api/dispatch-prospect-history");
// Remove so 1 registro (ex.: disparo de teste que inflou o total do Painel) -
// restrito a ADMIN no backend.
export const removerDisparoProspect = (id) => api.del(`/api/dispatch-prospect-history/${id}`);

export const listDispatchHistory = async () =>
  (await api.get("/api/dispatch-history")).map((h) => ({
    contatoId: h.contatoId,
    nome: h.contatoNome,
    campanha: h.campanhaNome,
    status: h.status,
    horaCompleta: h.hora,
    hora: dataHora(h.hora),
  }));

// Templates: o WhatsApp não permite botões interativos fora da API Business oficial,
// e o backend não suporta imagem de verdade ainda (só guarda uma URL, sem upload).
function templateFromApi(t) {
  return {
    id: t.id, nome: t.nome, categoria: t.categoria, campanha: t.campanhaObjetivo || "", corpo: t.corpo || "",
    imagem: t.imagemUrl || "", ativo: !!t.ativo, arquivado: !!t.arquivado, atualizadoEm: t.atualizadoEm,
  };
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
export const deleteTemplate = (id) => api.del(`/api/templates/${id}`);
export const archiveTemplate = async (id, arquivado) => templateFromApi(await api.patch(`/api/templates/${id}/arquivar`, { arquivado }));

// Disparo isolado de teste - manda o template pra um numero digitado na hora,
// sem criar/precisar de nenhum Contato/lead cadastrado.
export const testarDisparoTemplate = (id, telefone, whatsappNumeroId) =>
  api.post(`/api/templates/${id}/testar-disparo`, { telefone, whatsappNumeroId: whatsappNumeroId || null });
