import api from "./axios.js";

export const getCalendarios = async () => {
  try {
    return await api.get("/calendario");
  } catch (error) {
    console.error("error al obtener datos ", error);
    throw error;
  }
};

export const createCalendarios = async (calendario) => {
  try {
    return await api.post("/calendario", calendario);
  } catch (error) {
    console.error("error al registrar el calendario ", error);
    throw error;
  }
};

export const updateCalendarios = async (id, calendario) => {
  try {
    return await api.put(`/calendario/${id}`, calendario);
  } catch (error) {
    console.error("error al actualizar el calendario ", error);
    throw error;
  }
};

export const deleteCalendarios = async (id) => {
  try {
    return await api.delete(`/calendario/${id}`);
  } catch (error) {
    console.error("error al eliminar el calendario ", error);
    throw error;
  }
};