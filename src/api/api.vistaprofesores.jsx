import api from "./axios.js";

export const getVistaProf = async () => {
  try {
    const res = await api.get("/vista_prof");
    return res.data;
  } catch (error) {
    console.error("Error al obtener la vista de profesores:", error);
    throw error;
  }
};