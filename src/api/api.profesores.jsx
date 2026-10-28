import api from "./axios.js";

export const getProfesor = async () => {
  try {
    const response = await api.get("/profesores");
    return response.data;
  } catch (error) {
    console.error("Error al obtener datos de profesores:", error);
    throw error;
  }
};

export const createprofesores = async (horario) => {
  try {
    return await api.post("/profesores", horario);
  } catch (error) {
    console.error("error al registrar el profesor", error);
    throw error;
  }
};

export const updateprofesores = async (id, horario) => {
  try {
    return await api.put(`/profesores/${id}`, horario);
  } catch (error) {
    console.error("error al actualizar el profesor", error);
    throw error;
  }
};

export const deleterofesores = async (id) => {
  try {
    return await api.delete(`/profesores/${id}`);
  } catch (error) {
    console.error("error al eliminar el profesor", error);
    throw error;
  }
};