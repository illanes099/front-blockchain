import axios from "axios";

const api = axios.create({
  // baseURL: "http://localhost:20000/usuarios",
  baseURL: "https://back-blockchain-88mqq4sf4-illanes.vercel.app/usuarios",
  headers: {
    "Content-Type": "application/json",
  },
});

api.interceptors.request.use((config) => {
  const token = localStorage.getItem("access");
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

export default api;
