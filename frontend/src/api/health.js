const BASE_URL = import.meta.env.VITE_API_URL || "http://localhost:8080";

// No plano free do Render o backend "dorme" e demora até ~1min pra acordar — isso é
// normal e NÃO deve marcar o sistema como inativo. O timeout generoso + uma segunda
// tentativa antes de desistir evitam falso-positivo por causa do cold start.
export async function checkHealth(timeoutMs = 90000) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const res = await fetch(`${BASE_URL}/actuator/health`, { signal: controller.signal });
    return res.ok;
  } catch {
    return false;
  } finally {
    clearTimeout(timer);
  }
}
