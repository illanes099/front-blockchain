import api from "./axios.js";

export const certificarBoletin = async (datosBoletin) => {
  try {
    const response = await api.post("/certificar", datosBoletin);
    return response.data;
  } catch (error) {
    console.error("Error al certificar en blockchain:", error);
    throw error;
  }
};

export const verificarCertificado = async (hash) => {
  try {
    const response = await api.get("/verificar", {
      params: { hash },

      validateStatus: (status) => status >= 200 && status < 500,
    });

    if (response.status === 404) {
      return { existe: false };
    }

    return { existe: true, ...response.data };
  } catch (error) {
    console.error("Error al consultar el servidor:", error);
    return { existe: false };
  }
};
