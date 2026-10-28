import api from "./axios.js";

// ======== USUARIOS ======== //
export const getUsuarios = () => {
  return api.get("/usuarios");
};

export const getUsuarioById = (id) => {
  return api.get(`/usuarios/${id}`);
};

export const createUsuario = (nuevoUsuario) => {
  return api.post("/usuarios", nuevoUsuario);
};

export const updateUsuarioById = (id, usuarioActualizado) => {
  return api.put(`/usuarios/${id}`, usuarioActualizado);
};

export const deleteUsuarioById = (id) => {
  return api.delete(`/usuarios/${id}`);
};

// ======== CALIFICACIONES ======== //
export const getCalificaciones = () => {
  return api.get("/calificaciones");
};

export const getCalificacionById = (id) => {
  return api.get(`/calificaciones/${id}`);
};