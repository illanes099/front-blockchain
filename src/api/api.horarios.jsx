import api from "./axios.js";

export const gethorarios = async () => {
  try {
    return await api.get("/horarios");
  } catch (error) {
    console.error("error al obtener datos ", error);
    throw error;
  }
};

export const createhorarios = async (horario) => {
  try {
    return await api.post("/horarios", horario);
  } catch (error) {
    console.error("error al registrar el horario ", error);
    throw error;
  }
};

export const updatehorarios = async (id, horario) => {
  try {
    return await api.put(`/horarios/${id}`, horario);
  } catch (error) {
    console.error("error al actualizar el horario ", error);
    throw error;
  }
};

export const deletehorarios = async (id) => {
  try {
    return await api.delete(`/horarios/${id}`);
  } catch (error) {
    console.error("error al eliminar el horario ", error);
    throw error;
  }
};