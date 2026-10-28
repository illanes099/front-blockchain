import api from "../api/axios.js"; 

const LOGIN_URL = "/api/login"; 

export async function login({ username, password }) {
  const { data } = await api.post(LOGIN_URL, { username, password });
  // data = { message, token, usuario }
  localStorage.setItem("access", data.token);
  localStorage.setItem("user", JSON.stringify(data.usuario));
  localStorage.setItem("username", username);
  return data.usuario;
}

export function logout() {
  localStorage.removeItem("access");
  localStorage.removeItem("user");
}

export function getCurrentUser() {
  const raw = localStorage.getItem("user");
  return raw ? JSON.parse(raw) : null;
}

export function isAuthenticated() {
  return !!localStorage.getItem("access");
}