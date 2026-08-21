import EntityManager from "../components/EntityManager";
import { resources } from "../api/resources";
import { useAuth } from "../context/AuthContext";
import PageHeader from "../components/PageHeader";

export default function UsersPage() {
  const { hasRole } = useAuth();
  const canModify = hasRole("ADMIN");

  if (!canModify) {
    return (
      <div className="rounded-2xl border border-slate-200 bg-white p-8 text-sm text-slate-600 shadow-soft">
        Admin access is required to manage users.
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader title="Users" subtitle="Admin-only access control and role management." />
      <EntityManager
        title="User"
        subtitle="Create admin, accountant, and viewer accounts"
        columns={[
          { key: "name", label: "Name" },
          { key: "email", label: "Email" },
          { key: "role", label: "Role" },
          { key: "isActive", label: "Active", render: (row) => (row.isActive ? "Yes" : "No") },
        ]}
        fields={[
          { name: "name", label: "Full Name", required: true },
          { name: "email", label: "Email", type: "email", required: true },
          { name: "password", label: "Password", type: "password", required: true },
          { name: "role", label: "Role", type: "select", required: true, options: [
            { label: "Admin", value: "ADMIN" },
            { label: "Accountant", value: "ACCOUNTANT" },
            { label: "Viewer", value: "VIEWER" },
          ] },
          { name: "isActive", label: "Active", type: "checkbox" },
        ]}
        loadData={() => resources.users.list()}
        createRecord={(payload) => resources.users.create(payload)}
        updateRecord={(id, payload) => resources.users.update(id, payload)}
        deleteRecord={(id) => resources.users.remove(id)}
        transformPayload={(values) => ({
          ...values,
          isActive: Boolean(values.isActive),
        })}
        canCreate
        canEdit
        canDelete
      />
    </div>
  );
}
