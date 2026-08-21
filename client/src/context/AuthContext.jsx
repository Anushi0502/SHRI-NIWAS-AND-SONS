import { createContext, useContext, useEffect, useMemo, useState } from "react";
import toast from "react-hot-toast";
import { loginRequest, logoutRequest, meRequest, refreshSessionRequest, setActiveCompanyRequest } from "../api/auth";
import { clearAccessToken } from "../api/tokenStore";

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;
    async function restoreSession() {
      try {
        const response = await refreshSessionRequest();
        if (mounted) {
          setUser(response.user);
        }
      } catch (error) {
        try {
          const response = await meRequest();
          if (mounted) setUser(response.user);
        } catch (innerError) {
          clearAccessToken();
          if (mounted) setUser(null);
        }
      } finally {
        if (mounted) setLoading(false);
      }
    }
    restoreSession();
    return () => {
      mounted = false;
    };
  }, []);

  const value = useMemo(
    () => ({
      user,
      loading,
      isAuthenticated: Boolean(user),
      role: user?.role || null,
      async login(credentials) {
        const response = await loginRequest(credentials);
        setUser(response.user);
        toast.success(`Welcome back, ${response.user.name}`);
        return response.user;
      },
      async logout() {
        try {
          await logoutRequest();
        } finally {
          setUser(null);
          clearAccessToken();
          toast.success("Signed out");
        }
      },
      async reloadUser() {
        const response = await meRequest();
        setUser(response.user);
        return response.user;
      },
      async selectCompany(companyId) {
        const response = await setActiveCompanyRequest(companyId);
        setUser(response.user);
        return response.user;
      },
      hasRole(...roles) {
        return roles.includes(user?.role);
      },
    }),
    [user, loading],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within AuthProvider");
  }
  return context;
}
