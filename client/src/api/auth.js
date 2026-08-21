import { clearAccessToken, setAccessToken } from "./tokenStore";
import { login as loginLocal, logout as logoutLocal, me as meLocal, refreshSession as refreshLocal, setActiveCompany as setActiveCompanyLocal } from "./localStore";

export async function loginRequest(payload) {
  const response = await loginLocal(payload);
  setAccessToken(response.accessToken);
  return response;
}

export async function refreshSessionRequest() {
  const response = await refreshLocal();
  setAccessToken(response.accessToken);
  return response;
}

export async function logoutRequest() {
  await logoutLocal();
  clearAccessToken();
}

export async function meRequest() {
  return meLocal();
}

export async function setActiveCompanyRequest(companyId) {
  return setActiveCompanyLocal(companyId);
}
