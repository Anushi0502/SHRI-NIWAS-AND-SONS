import { createContext, useContext, useEffect, useMemo, useState } from "react";
import { resources } from "../api/resources";
import { useAuth } from "./AuthContext";

const CompanyContext = createContext(null);

export function CompanyProvider({ children }) {
  const { user, isAuthenticated, selectCompany } = useAuth();
  const [companies, setCompanies] = useState([]);
  const [loading, setLoading] = useState(false);

  async function refreshCompanies() {
    const data = await resources.companies.list();
    setCompanies(data);
    return data;
  }

  useEffect(() => {
    let mounted = true;
    async function loadCompanies() {
      if (!isAuthenticated) {
        setCompanies([]);
        return;
      }
      setLoading(true);
      try {
        const data = await resources.companies.list();
        if (mounted) {
          setCompanies(data);
        }
      } finally {
        if (mounted) setLoading(false);
      }
    }
    loadCompanies();
    return () => {
      mounted = false;
    };
  }, [isAuthenticated, user?.activeCompanyId]);

  const activeCompany = useMemo(
    () => companies.find((company) => company.id === user?.activeCompanyId) || null,
    [companies, user?.activeCompanyId],
  );

  const value = useMemo(
    () => ({
      companies,
      activeCompany,
      activeCompanyId: user?.activeCompanyId || null,
      loading,
      refreshCompanies,
      async activateCompany(companyId) {
        const company = await selectCompany(companyId);
        await refreshCompanies();
        return company;
      },
      async createCompany(payload) {
        const company = await resources.companies.create(payload);
        const list = await resources.companies.list();
        setCompanies(list);
        return company;
      },
      async updateCompany(id, payload) {
        const company = await resources.companies.update(id, payload);
        const list = await resources.companies.list();
        setCompanies(list);
        return company;
      },
      async deleteCompany(id) {
        const result = await resources.companies.remove(id);
        const list = await resources.companies.list();
        setCompanies(list);
        return result;
      },
    }),
    [companies, activeCompany, loading, user?.activeCompanyId],
  );

  return <CompanyContext.Provider value={value}>{children}</CompanyContext.Provider>;
}

export function useCompany() {
  const context = useContext(CompanyContext);
  if (!context) {
    throw new Error("useCompany must be used within CompanyProvider");
  }
  return context;
}
