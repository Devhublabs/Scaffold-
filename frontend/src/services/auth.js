const AUTH_API_URL =
  import.meta.env.VITE_AUTH_API_URL || "http://localhost:4000";
const SESSION_KEY = "scaffold-auth-session";


async function authRequest(path, body) {
  const response = await fetch(`${AUTH_API_URL}${path}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  const data = await response.json().catch(() => ({}));

  if (!response.ok) {
    throw new Error(data.error || "Authentication request failed");
  }

  return data;
}


export function login(credentials) {
  return authRequest("/auth/login", credentials);
}


export function signup(details) {
  return authRequest("/auth/signup", details);
}


export function readStoredSession() {
  try {
    const value = window.sessionStorage.getItem(SESSION_KEY);
    return value ? JSON.parse(value) : null;
  } catch {
    return null;
  }
}


export function storeSession(session) {
  window.sessionStorage.setItem(SESSION_KEY, JSON.stringify(session));
}


export function clearStoredSession() {
  window.sessionStorage.removeItem(SESSION_KEY);
}
