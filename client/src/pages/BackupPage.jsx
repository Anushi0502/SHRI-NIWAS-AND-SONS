import { useEffect, useState } from "react";
import toast from "react-hot-toast";
import PageHeader from "../components/PageHeader";
import { resources } from "../api/resources";
import DataTable from "../components/DataTable";
import { useAuth } from "../context/AuthContext";

export default function BackupPage() {
  const { hasRole } = useAuth();
  const canAccess = hasRole("ADMIN");
  const [backups, setBackups] = useState([]);
  const [loading, setLoading] = useState(true);
  const [fileName, setFileName] = useState("");

  async function refresh() {
    setLoading(true);
    try {
      const data = await resources.backup.list();
      setBackups(data);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (!canAccess) return;
    refresh();
  }, [canAccess]);

  if (!canAccess) {
    return (
      <div className="rounded-2xl border border-slate-200 bg-white p-8 text-sm text-slate-600 shadow-soft">
        Admin access is required for backup and restore.
      </div>
    );
  }

  async function createBackup() {
    try {
      await resources.backup.create();
      toast.success("Backup created");
      await refresh();
    } catch (error) {
      toast.error(error.response?.data?.message || "Unable to create backup");
    }
  }

  async function restoreBackup() {
    if (!fileName) {
      toast.error("Select a backup file");
      return;
    }
    if (!window.confirm("This will replace the current database snapshot. Continue?")) return;
    try {
      await resources.backup.restore({ fileName, confirm: true });
      toast.success("Backup restored");
      await refresh();
    } catch (error) {
      toast.error(error.response?.data?.message || "Unable to restore backup");
    }
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Backup & Restore"
        subtitle="Admin-only application snapshot backup and safe restore flow."
        actions={[
          <button key="create" onClick={createBackup} className="rounded-xl bg-slate-950 px-4 py-2 text-sm font-medium text-white">
            Create Backup
          </button>,
        ]}
      />

      <div className="grid gap-4 rounded-2xl border border-slate-200 bg-white p-5 shadow-soft md:grid-cols-[1fr_auto] md:items-end">
        <label className="block">
          <span className="mb-1 block text-sm font-medium text-slate-700">Restore file</span>
          <select
            value={fileName}
            onChange={(event) => setFileName(event.target.value)}
            className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm"
          >
            <option value="">Choose a backup</option>
            {backups.map((backup) => (
              <option key={backup.fileName} value={backup.fileName}>
                {backup.fileName}
              </option>
            ))}
          </select>
        </label>
        <button onClick={restoreBackup} className="rounded-xl bg-rose-600 px-4 py-2 text-sm font-medium text-white">
          Restore Backup
        </button>
      </div>

      <DataTable
        columns={[
          { key: "fileName", label: "File" },
          { key: "sizeBytes", label: "Size" },
          { key: "modifiedAt", label: "Modified", type: "date" },
        ]}
        rows={backups}
        emptyText={loading ? "Loading backups..." : "No backups found."}
      />
    </div>
  );
}
