import api from "./axios.js";

// ==================== GET: Obtener todas las materias ====================
export const getMaterias = async () => {
  try {
    const res = await api.get("/materias");
    return res.data;
  } catch (error) {
    console.error("Error al obtener Materias:", error);
    throw error;
  }
};

export async function getMateriasUsername (){
  try {
    const response = await api.get("/materiasUsername");
    return response.data;
  } catch (error) {
    console.error("error al traer datos de la vista del backend ", error);
    throw error;
  }
}

export async function getMateriasConProfesor (){
  try {
    const response = await api.get("/profesoresMaterias");
    return response.data;
  } catch (error) {
    console.error("error al traer datos de la vista del backend ", error);
    throw error;
  }
}

// ==================== GET: Obtener una Materia por ID ====================
export const getMateriaById = async (id) => {
  try {
    const res = await api.get(`/materias/${id}`);
    return res.data;
  } catch (error) {
    console.error(`Error al obtener Materia con ID ${id}:`, error);
    throw error;
  }
};

// ==================== POST: Crear una nueva Materia ====================
export const createMateria = async (nuevoMateria) => {
  try {
    const res = await api.post("/materias", nuevoMateria);
    return res.data;
  } catch (error) {
    console.error("Error al crear Materia:", error);
    throw error;
  }
};

// ==================== PUT: Actualizar una Materia existente ====================
export const updateMateria = async (id, MateriaActualizado) => {
  try {
    const res = await api.put(`/materias/${id}`, MateriaActualizado);
    return res.data;
  } catch (error) {
    console.error(`Error al actualizar Materia con ID ${id}:`, error);
    throw error;
  }
};

// ==================== DELETE: Eliminar una Materia ====================
export const deleteMateria = async (id) => {
  try {
    const res = await api.delete(`/materias/${id}`);
    return res.data;
  } catch (error) {
    console.error(`Error al eliminar Materia con ID ${id}:`, error);
    throw error;
  }
};