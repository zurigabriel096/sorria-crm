// Cliente HTTP fino para falar com o backend Spring Boot (ver /backend).
// Nenhuma página usa isto por padrão: o app roda 100% no navegador (modo demo).
// Para ligar o backend real, troque o estado local em App.jsx pelas funções de
// src/api/*.js (auth.js, contacts.js, campaigns.js, dashboard.js).

const BASE_URL = import.meta.env.VITE_API_URL || "http://localhost:8080";

function getToken() {
  return localStorage.getItem("sorria_token");
}

export function setToken(token) {
  if (token) localStorage.setItem("sorria_token", token);
  else localStorage.removeItem("sorria_token");
}

// O backend responde erro como JSON ({"status":..,"message":".."}) — sem isso,
// os toasts mostravam o blob inteiro em vez da mensagem de verdade.
function extrairMensagem(texto, fallback) {
  if (!texto) return fallback;
  try {
    const obj = JSON.parse(texto);
    return obj.message || fallback;
  } catch {
    return texto;
  }
}

// Mensagem usada sempre que o fetch falha ANTES de chegar no servidor (rede
// instavel, backend fora do ar, CORS). O navegador gera um erro nativo em
// ingles nesse caso ("Failed to fetch") - nunca deixamos isso aparecer pro
// usuario, sempre trocamos por essa, em portugues.
const MSG_SEM_CONEXAO = "O sistema piscou por um instante. Tente novamente em alguns segundos — já deve estar de volta.";

async function request(path, { method = "GET", body, auth = true } = {}) {
  const headers = { "Content-Type": "application/json" };
  const token = getToken();
  const usouToken = auth && !!token;
  if (usouToken) headers.Authorization = `Bearer ${token}`;

  let res;
  try {
    res = await fetch(`${BASE_URL}${path}`, {
      method,
      headers,
      body: body !== undefined ? JSON.stringify(body) : undefined,
    });
  } catch {
    throw new Error(MSG_SEM_CONEXAO);
  }

  if (res.status === 401) {
    // Só é "sessão expirada" quando a chamada realmente usou um token (ex: token
    // vencido no meio do uso). Sem token — como uma tentativa de login — é só
    // credencial errada, não precisa deslogar nem mostrar essa mensagem confusa.
    if (usouToken) {
      setToken(null);
      window.dispatchEvent(new Event("sorria:unauthorized"));
      throw new Error("Sessão expirada, faça login novamente.");
    }
    const texto = await res.text().catch(() => "");
    throw new Error(extrairMensagem(texto, "A senha ou o email podem estar errados."));
  }
  if (!res.ok) {
    const texto = await res.text().catch(() => "");
    throw new Error(extrairMensagem(texto, `Erro ${res.status} ao chamar ${path}`));
  }
  if (res.status === 204) return null;
  return res.json();
}

export const api = {
  get: (path) => request(path),
  post: (path, body) => request(path, { method: "POST", body }),
  put: (path, body) => request(path, { method: "PUT", body }),
  patch: (path, body) => request(path, { method: "PATCH", body }),
  del: (path) => request(path, { method: "DELETE" }),
};

// Pra respostas binarias (midia de mensagem) - <img src> não manda o header de
// autenticação sozinho, então tem que buscar com fetch e virar um blob local.
export async function fetchBlobUrl(path) {
  const res = await fetch(`${BASE_URL}${path}`, { headers: { Authorization: `Bearer ${getToken()}` } });
  if (!res.ok) throw new Error("Não consegui carregar essa mídia.");
  const blob = await res.blob();
  return URL.createObjectURL(blob);
}
