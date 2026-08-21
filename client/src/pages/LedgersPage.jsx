import { useEffect, useMemo, useState } from "react";
import EntityManager from "../components/EntityManager";
import { resources } from "../api/resources";
import { useAuth } from "../context/AuthContext";
import { useCompany } from "../context/CompanyContext";
import PageHeader from "../components/PageHeader";

export default function LedgersPage() {
  const { activeCompany } = useCompany();
  const { hasRole } = useAuth();
  const canModify = hasRole("ADMIN", "ACCOUNTANT");
  const [groups, setGroups] = useState([]);

  useEffect(() => {
    let mounted = true;
    async function load() {
      if (!activeCompany) return;
      const data = await resources.accountGroups.list();
      if (mounted) setGroups(data);
    }
    load();
    return () => {
      mounted = false;
    };
  }, [activeCompany?.id]);

  const groupOptions = useMemo(
    () => groups.map((group) => ({ label: `${group.name} (${group.reportCategory})`, value: group.id })),
    [groups],
  );

  return (
    <div className="space-y-6">
      <PageHeader title="Ledgers" subtitle="Maintain party ledgers, balances, and contact details." />
      <EntityManager
        title="Ledger"
        subtitle="Party, cash, bank, sales and purchase ledgers"
        columns={[
          { key: "name", label: "Name" },
          { key: "accountGroup", label: "Group", render: (row) => row.accountGroup?.name || "" },
          { key: "openingBalancePaisa", label: "Opening Balance", type: "money" },
          { key: "openingBalanceType", label: "Dr/Cr" },
          { key: "state", label: "State" },
          { key: "isParty", label: "Party", render: (row) => (row.isParty ? "Yes" : "No") },
        ]}
        fields={[
          { name: "accountGroupId", label: "Account Group", type: "select", options: groupOptions, required: true },
          { name: "name", label: "Ledger Name", required: true },
          { name: "openingBalancePaisa", label: "Opening Balance (USD)", type: "number", step: "0.01", defaultValue: 0 },
          { name: "openingBalanceType", label: "Opening Type", type: "select", options: [
            { label: "Dr", value: "Dr" },
            { label: "Cr", value: "Cr" },
          ] },
          { name: "ledgerType", label: "Ledger Type" },
          { name: "gstin", label: "Tax ID" },
          { name: "pan", label: "Business ID" },
          { name: "state", label: "State" },
          { name: "address", label: "Address", type: "textarea", rows: 3, fullWidth: true },
          { name: "phone", label: "Phone" },
          { name: "email", label: "Email", type: "email" },
          { name: "creditLimitPaisa", label: "Credit Limit (USD)", type: "number", step: "0.01" },
          { name: "isParty", label: "Party Ledger", type: "checkbox" },
        ]}
        loadData={(search) => resources.ledgers.list(search)}
        createRecord={(payload) => resources.ledgers.create(payload)}
        updateRecord={(id, payload) => resources.ledgers.update(id, payload)}
        deleteRecord={(id) => resources.ledgers.remove(id)}
        transformPayload={(values) => ({
          ...values,
          accountGroupId: Number(values.accountGroupId),
          openingBalancePaisa: Math.round(Number(values.openingBalancePaisa || 0) * 100),
          creditLimitPaisa: Math.round(Number(values.creditLimitPaisa || 0) * 100),
          isParty: Boolean(values.isParty),
        })}
        canCreate={canModify}
        canEdit={canModify}
        canDelete={canModify}
      />
    </div>
  );
}
