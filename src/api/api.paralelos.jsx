import api from "./axios.js";

// ==================== GET: Obtener todos los paralelos ====================
export const getParalelos = async () => {
  try {
    const res = await api.get("/paralelo");
    return res.data;
  } catch (error) {
    console.error("Error al obtener Paralelos:", error);
    throw error;
  }
};

// ==================== GET: Obtener un Paralelo por ID ====================
export const getParaleloById = async (id) => {
  try {
    const res = await api.get(`/paralelo/${id}`);
    return res.data;
  } catch (error) {
    console.error(`Error al obtener Paralelo con ID ${id}:`, error);
    throw error;
  }
};

// ==================== POST: Crear un nuevo Paralelo ====================
export const createParalelo = async (nuevoParalelo) => {
  try {
    const res = await api.post("/paralelo", nuevoParalelo);
    return res.data;
  } catch (error) {
    console.error("Error al crear Paralelo:", error);
    throw error;
  }
};

// ==================== PUT: Actualizar un Paralelo existente ====================
export const updateParalelo = async (id, ParaleloActualizado) => {
  try {
    const res = await api.put(`/paralelo/${id}`, ParaleloActualizado);
    return res.data;
  } catch (error) {
    console.error(`Error al actualizar Paralelo con ID ${id}:`, error);
    throw error;
  }
};

// ==================== DELETE: Eliminar un Paralelo ====================
export const deleteParalelo = async (id) => {
  try {
    const res = await api.delete(`/paralelo/${id}`);
    return res.data;
  } catch (error) {
    console.error(`Error al eliminar Paralelo con ID ${id}:`, error);
    throw error;
  }
};