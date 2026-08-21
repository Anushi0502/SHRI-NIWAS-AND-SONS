import axios from "axios";
import { http } from "./http";
import { clearAccessToken, setAccessToken } from "./tokenStore";

const rawHttp = axios.create({
  baseURL: "/api",
  withCredentials: true,
});

export async function loginRequest(payload) {
  const response = await rawHttp.post("/auth/login", payload);
  setAccessToken(response.data.accessToken);
  return response.data;
}

export async function refreshSessionRequest() {
  const response = await rawHttp.post("/auth/refresh");
  setAccessToken(response.data.accessToken);
  return response.data;
}

export async function logoutRequest() {
  await http.post("/auth/logout");
  clearAccessToken();
}

export async function meRequest() {
  const response = await http.get("/auth/me");
  return response.data;
}

export async function setActiveCompanyRequest(companyId) {
  const response = await http.put("/auth/me/active-company", { companyId });
  return response.data;
}
