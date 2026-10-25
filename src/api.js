import axios from "axios";

const STORAGE_KEY = "tilesWalaAuth";

const api = axios.create();

// Forward LAN requests through the frontend's /api proxy to the local backend.
export const resolveApiUrl = (url, {
  hostname = window.location.hostname,
  useProxy = process.env.REACT_APP_USE_API_PROXY === 'true',
} = {}) => {
  const localBrowser = ['localhost', '127.0.0.1', '[::1]', '::1'].includes(hostname);
  return (useProxy || !localBrowser) && typeof url === 'string'
    ? url.replace(/^http:\/\/localhost:4000(?=\/api(?:\/|$))/, '')
    : url;
};

api.interceptors.request.use((config) => {
  config.url = resolveApiUrl(config.url);
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
