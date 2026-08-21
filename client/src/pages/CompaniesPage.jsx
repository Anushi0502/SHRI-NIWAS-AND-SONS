import EntityManager from "../components/EntityManager";
import { resources } from "../api/resources";
import { useAuth } from "../context/AuthContext";
import PageHeader from "../components/PageHeader";

export default function CompaniesPage() {
  const { hasRole } = useAuth();
  const canModify = hasRole("ADMIN", "ACCOUNTANT");
  const canDelete = hasRole("ADMIN");

  return (
    <div className="space-y-6">
      <PageHeader title="Companies" subtitle="Create and manage multiple company records and financial years." />
      <EntityManager
        title="Company"
        subtitle="Company profile, legal identity, and fiscal period"
        columns={[
          { key: "name", label: "Name" },
          { key: "state", label: "State" },
          { key: "currency", label: "Currency" },
          { key: "financialYearStart", label: "FY Start", type: "date" },
          { key: "financialYearEnd", label: "FY End", type: "date" },
          { key: "isActive", label: "Active", render: (row) => (row.isActive ? "Yes" : "No") },
        ]}
        fields={[
          { name: "name", label: "Company Name", required: true },
          { name: "address", label: "Address", type: "textarea", rows: 3 },
          { name: "phone", label: "Phone" },
          { name: "email", label: "Email", type: "email" },
          { name: "gstin", label: "GSTIN" },
          { name: "pan", label: "PAN" },
          { name: "state", label: "State", required: true },
          { name: "financialYearStart", label: "Financial Year Start", type: "date", required: true },
          { name: "financialYearEnd", label: "Financial Year End", type: "date", required: true },
          { name: "currency", label: "Currency", defaultValue: "INR" },
        ]}
        loadData={() => resources.companies.list()}
        createRecord={(payload) => resources.companies.create(payload)}
        updateRecord={(id, payload) => resources.companies.update(id, payload)}
        deleteRecord={(id) => resources.companies.remove(id)}
        transformRow={(row) => row}
        transformPayload={(values) => values}
        canCreate={canModify}
        canEdit={canModify}
        canDelete={canDelete}
      />
    </div>
  );
}
