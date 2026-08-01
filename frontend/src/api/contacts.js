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
    dentista: c.dentista || "",
    ultAtend: c.ultAtendimento || "",
    recencia: c.recencia,
    segmento: c.segmento || "Regular",
    estagio: c.estagio || "Lead",
    elegivel: !!c.elegivel,
    enviado: c.enviado || "Pendente",
    tags: c.tags || [],
    origem: c.origem || "",
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
    segmento: p.segmento || "Regular",
    estagio: p.estagio || "Lead",
    elegivel: !!p.elegivel,
    enviado: p.enviado || "Pendente",
    tags: p.tags || [],
    origem: p.origem || null,
  };
}

export const listContacts = async () => (await api.get("/api/contacts")).map(fromApi);
export const createContact = async (patient) => fromApi(await api.post("/api/contacts", toApi(patient)));
export const updateContact = async (id, patient) => fromApi(await api.put(`/api/contacts/${id}`, toApi(patient)));
export const deleteContact = (id) => api.del(`/api/contacts/${id}`);
