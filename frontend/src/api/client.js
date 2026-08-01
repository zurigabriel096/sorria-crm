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

async function request(path, { method = "GET", body, auth = true } = {}) {
  const headers = { "Content-Type": "application/json" };
  const token = getToken();
  if (auth && token) headers.Authorization = `Bearer ${token}`;

  const res = await fetch(`${BASE_URL}${path}`, {
    method,
    headers,
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });

  if (res.status === 401) {
    setToken(null);
    window.dispatchEvent(new Event("sorria:unauthorized"));
    throw new Error("Sessão expirada, faça login novamente.");
  }
  if (!res.ok) {
    const msg = await res.text().catch(() => "");
    throw new Error(msg || `Erro ${res.status} ao chamar ${path}`);
  }
  if (res.status === 204) return null;
  return res.json();
}

export const api = {
  get: (path) => request(path),
  post: (path, body) => request(path, { method: "POST", body }),
  put: (path, body) => request(path, { method: "PUT", body }),
  del: (path) => request(path, { method: "DELETE" }),
};
