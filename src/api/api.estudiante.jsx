import api from "./axios.js";

// Obtener todos los estudiantes
export const getEstudiantes = async () => {
  try {
    const res = await api.get("/estudiantes");
    return res.data;
  } catch (error) {
    console.error("Error al obtener estudiantes:", error);
    throw error;
  }
};

export const createEstudiante = async (nuevoEstudiante) => {
    try {
        const res = await api.post("/estudiantes", nuevoEstudiante); 
        return res.data;
    } catch (error) {
        console.error("Error al crear estudiante:", error);
        throw error;
    }
};

export const getEstudiantesGeneral = async () => {
  try {
    const res = await api.get("/profesoresGeneralEstudiantes");
    return res.data;
  } catch (error) {
    console.error("Error al obtener datos generales del estudiante:", error);
    throw error;
  }
};

// Obtener estudiante por ID
export const getEstudianteById = async (id) => {
  try {
    const res = await api.get(`/estudiantes/${id}`);
    return res.data;
  } catch (error) {
    console.error(`Error al obtener estudiante con ID ${id}:`, error);
    throw error;
  }
};

export const updateStudents = async (id, updateStudent) => {
  try {
    const response = await api.put(`/estudiantes/${id}`, updateStudent);
    return response.data;
  } catch (error) {
    console.error(`error al actualizar los datos del estudiante ${id}`, {
      error,
      payload: updateStudent,
    });
    throw error;
  }
};

export const deleteStudent = async (id) => {
  try {
    const response = await api.delete(`/estudiantes/${id}`);
    return response.data;
  } catch (error) {
    console.error(`error al eliminar el estudiante ${id}`, { error });
    throw error;
  }
};