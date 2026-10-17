import axios from "axios";

const STORAGE_KEY = "tilesWalaAuth";

const api = axios.create();

api.interceptors.request.use((config) => {
  const storedAuth = localStorage.getItem(STORAGE_KEY);
  if (!storedAuth) return config;

  try {
    const { token } = JSON.parse(storedAuth);
    if (typeof token === "string" && token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
  } catch (error) {
    console.error("Unable to read saved authentication token:", error);
    localStorage.removeItem(STORAGE_KEY);
  }

  return config;
});

export default api;
