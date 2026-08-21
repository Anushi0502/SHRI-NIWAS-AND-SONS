import axios from "axios";
import { clearAccessToken, getAccessToken, setAccessToken } from "./tokenStore";

export const http = axios.create({
  baseURL: "/api",
  withCredentials: true,
});

let refreshPromise = null;

async function refreshAccessToken() {
  if (!refreshPromise) {
    refreshPromise = axios
      .post("/api/auth/refresh", {}, { withCredentials: true })
      .then((response) => {
        const token = response.data?.accessToken || null;
        setAccessToken(token);
        return response.data;
      })
      .catch((error) => {
        clearAccessToken();
        throw error;
      })
      .finally(() => {
        refreshPromise = null;
      });
  }
  return refreshPromise;
}

http.interceptors.request.use((config) => {
  const token = getAccessToken();
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

http.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;
    const status = error.response?.status;

    if (status === 401 && originalRequest && !originalRequest._retry && !String(originalRequest.url || "").includes("/auth/refresh")) {
      originalRequest._retry = true;
      try {
        const refreshed = await refreshAccessToken();
        const token = refreshed?.accessToken || getAccessToken();
        if (token) {
          originalRequest.headers.Authorization = `Bearer ${token}`;
          return http.request(originalRequest);
        }
      } catch (refreshError) {
        clearAccessToken();
      }
    }

    return Promise.reject(error);
  },
);
