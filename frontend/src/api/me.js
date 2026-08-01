import { api } from "./client";

const BASE_URL = import.meta.env.VITE_API_URL || "http://localhost:8080";

// Perfil do usuário logado (independente de papel) — usado pra repopular o
// usuário quando a página recarrega com um token já salvo, e pra persistir
// a cor do avatar por conta (cada login tem a sua, não fica salva "global").
export const getMe = () => api.get("/api/me");
export const updateCorPerfil = (cor) => api.put("/api/me/cor-perfil", { cor });

// Upload multipart não passa pelo client.js genérico (que sempre manda JSON) —
// o FormData precisa definir o próprio Content-Type com boundary.
export async function uploadAvatar(blob) {
  const form = new FormData();
  form.append("file", blob, "avatar.jpg");
  const token = localStorage.getItem("sorria_token");
  const res = await fetch(`${BASE_URL}/api/me/avatar`, {
    method: "POST",
    headers: token ? { Authorization: `Bearer ${token}` } : {},
    body: form,
  });
  if (res.status === 401) {
    localStorage.removeItem("sorria_token");
    window.dispatchEvent(new Event("sorria:unauthorized"));
    throw new Error("Sessão expirada, faça login novamente.");
  }
  if (!res.ok) {
    const msg = await res.text().catch(() => "");
    throw new Error(msg || `Erro ${res.status} ao enviar a foto`);
  }
  return res.json();
}
