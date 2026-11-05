import api from "./axios.js";

// ==================== GET: Obtener todas las gestiones ====================
export const getGestiones = async () => {
  try {
    const res = await api.get("/gestiones");
    return res.data;
  } catch (error) {
    console.error("Error al obtener Gestiones:", error);
    throw error;
  }
};

// ==================== GET: Obtener una Gestión por ID ====================
export const getGestionById = async (id) => {
  try {
    const res = await api.get(`/gestiones/${id}`);
    return res.data;
  } catch (error) {
    console.error(`Error al obtener Gestión con ID ${id}:`, error);
    throw error;
  }
};

// ==================== POST: Crear una nueva Gestión ====================
export const createGestion = async (nuevaGestion) => {
  try {
    const res = await api.post("/gestiones", nuevaGestion);
    return res.data;
  } catch (error) {
    console.error("Error al crear Gestión:", error);
    throw error;
  }
};

// ==================== PUT: Actualizar una Gestión existente ====================
export const updateGestion = async (id, gestionActualizada) => {
  try {
    const res = await api.put(`/gestiones/${id}`, gestionActualizada);
    return res.data;
  } catch (error) {
    console.error(`Error al actualizar Gestión con ID ${id}:`, error);
    throw error;
  }
};

// ==================== DELETE: Eliminar una Gestión ====================
export const deleteGestion = async (id) => {
  try {
    const res = await api.delete(`/gestiones/${id}`);
    return res.data;
  } catch (error) {
    console.error(`Error al eliminar Gestión con ID ${id}:`, error);
    throw error;
  }
};