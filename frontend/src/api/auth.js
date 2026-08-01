import { api, setToken } from "./client";

// POST /api/auth/login -> { token, nome, email, papel }
export async function login(email, senha) {
  const data = await api.post("/api/auth/login", { email, senha });
  setToken(data.token);
  return data;
}

export function logout() {
  setToken(null);
}
