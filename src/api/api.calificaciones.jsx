import api from "./axios.js";

// ==================== GET: Obtener todas las calificaciones ====================
export const getCalificaciones = async () => {
  try {
    const res = await api.get("/calificaciones");
    return res.data;
  } catch (error) {
    console.error("Error al obtener Calificaciones:", error);
    throw error;
  }
};

export const getCalificacionesMaterias = async () => {
  try {
    const response = await api.get("/calificacionesMaterias");
    return response.data;
  } catch (error) {
    console.error("error al obtener datos ", error);
    throw error;
  }
};

// ==================== GET: Obtener una Calificación por ID ====================
export const getCalificacioneById = async (id) => {
  try {
    const res = await api.get(`/calificaciones/${id}`);
    return res.data;
  } catch (error) {
    console.error(`Error al obtener Calificacione con ID ${id}:`, error);
    throw error;
  }
};

// ==================== POST: Crear una nueva Calificación ====================
export const createCalificacione = async (nuevoCalificacione) => {
  try {
    const res = await api.post("/calificaciones", nuevoCalificacione);
    return res.data;
  } catch (error) {
    console.error("Error al crear Calificacione:", error);
    throw error;
  }
};

// ==================== PUT: Actualizar una Calificación existente ====================
export const updateCalificacione = async (id, CalificacioneActualizado) => {
  try {
    const res = await api.put(`/calificaciones/${id}`, CalificacioneActualizado);
    return res.data;
  } catch (error) {
    console.error(`Error al actualizar Calificacione con ID ${id}:`, error);
    throw error;
  }
};

// ==================== DELETE: Eliminar una Calificación ====================
export const deleteCalificacione = async (id) => {
  try {
    const res = await api.delete(`/calificaciones/${id}`);
    return res.data;
  } catch (error) {
    console.error(`Error al eliminar Calificacione con ID ${id}:`, error);
    throw error;
  }
};