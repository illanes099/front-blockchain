import axios from "axios";

// Instancia centralizada de Axios
const api = axios.create({
  // baseURL: "http://localhost:20000",
  baseURL: "https://back-blockchain-88mqq4sf4-illanes.vercel.app",
  headers: {
    "Content-Type": "application/json",
  },
});


api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem("token"); 
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

export default api;