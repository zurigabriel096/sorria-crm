import { api } from "./client";

// O shape usado nas páginas (Pacientes, Dashboard, Segmentacoes...) vem do protótipo original
// (tel, ultAtend) e não bate 1:1 com o DTO do backend (telefone, ultAtendimento). As funções
// abaixo convertem nos dois sentidos para que o resto do app não precise saber da diferença.

function fromApi(c) {
  return {
    id: c.id,
    cod: c.cod || "",
    nome: c.nome,
    primeiro: String(c.nome || "").trim().split(/\s+/)[0] || "",
    tel: c.telefone || "",
    telValido: !!c.telefone,
    email: c.email || "",
    financ: c.financ || "—",
    // Somente leitura - gravado/limpo pelo backend quando financ muda pra/sai de "Inadimplente".
    inadimplenteDesde: c.inadimplenteDesde || null,
    dentista: c.dentista || "",
    ultAtend: c.ultAtendimento || "",
    recencia: c.recencia,
    estagio: c.estagio || "Lead",
    responsavelId: c.responsavelId ?? null,
    elegivel: !!c.elegivel,
    enviado: c.enviado || "Pendente",
    tags: c.tags || [],
    origem: c.origem || "",
    ordemKanban: c.ordemKanban ?? null,
    camposCustomizados: c.camposCustomizados || {},
    // Somente leitura - quem grava e' o backend a cada mensagem trocada.
    ultimaMensagemEm: c.ultimaMensagemEm || null,
    ultimaMensagemDirecao: c.ultimaMensagemDirecao || null,
    proximaAcaoEm: c.proximaAcaoEm || null,
  };
}

function toApi(p) {
  return {
    cod: p.cod || null,
    nome: p.nome,
    telefone: p.tel || null,
    email: p.email || null,
    financ: p.financ || null,
    dentista: p.dentista || null,
    ultAtendimento: p.ultAtend || null,
    recencia: p.recencia ?? null,
    estagio: p.estagio || "Lead",
    responsavelId: p.responsavelId ?? null,
    elegivel: !!p.elegivel,
    enviado: p.enviado || "Pendente",
    tags: p.tags || [],
    origem: p.origem || null,
    ordemKanban: p.ordemKanban ?? null,
    camposCustomizados: p.camposCustomizados || {},
    proximaAcaoEm: p.proximaAcaoEm || null,
  };
}

export const listContacts = async () => (await api.get("/api/contacts")).map(fromApi);
export const createContact = async (patient) => fromApi(await api.post("/api/contacts", toApi(patient)));
export const updateContact = async (id, patient) => fromApi(await api.put(`/api/contacts/${id}`, toApi(patient)));
export const deleteContact = (id) => api.del(`/api/contacts/${id}`);

// Importação de planilha: roda em background no servidor (mesma
// infraestrutura de tag/excluir em lote) - retorna na hora com {jobId, total},
// sem esperar processar a planilha inteira numa única requisição bloqueada
// (isso travava a tela em bases maiores, sem nenhum feedback visual).
export const iniciarImportacaoLote = (patients) => api.post("/api/contacts/lote", patients.map(toApi));
export const getImportLoteStatus = (jobId) => api.get(`/api/contacts/lote/${jobId}`);

// Mescla cadastros duplicados (mesmo telefone) que ja existiam antes da
// trava de criacao existir - nao apaga dado, so unifica.
export const unificarDuplicados = () => api.post("/api/contacts/unificar-duplicados", {});

// Adiciona/remove uma tag em varios contatos de uma vez (ex.: todos que uma
// Segmentacao captura hoje) - restrito a ADMIN no backend. Roda em background
// no servidor: retorna na hora com {jobId, total}, sem esperar processar todo
// mundo - acompanhar com getTagLoteStatus.
export const aplicarTagEmLote = (contatoIds, tag, remover) =>
  api.post("/api/contacts/tags/lote", { contatoIds, tag, remover });

export const getTagLoteStatus = (jobId) => api.get(`/api/contacts/tags/lote/${jobId}`);

// Exclui varios contatos de uma vez (ex.: todo mundo que uma Segmentacao
// captura hoje) - restrito a ADMIN no backend, roda em background igual a
// tag em lote.
export const excluirContatosEmLote = (contatoIds) => api.post("/api/contacts/excluir-lote", { contatoIds });
export const getExcluirLoteStatus = (jobId) => api.get(`/api/contacts/excluir-lote/${jobId}`);
