import { useEffect, useMemo, useState } from "react";
import { useForm } from "react-hook-form";
import toast from "react-hot-toast";
import DataTable from "./DataTable";
import Modal from "./Modal";

function buildDefaultValues(fields, row) {
  const values = {};
  fields.forEach((field) => {
    const value = row?.[field.name];
    if (field.type === "checkbox") {
      values[field.name] = Boolean(value);
    } else if (field.type === "date") {
      values[field.name] = value ? String(value).slice(0, 10) : "";
    } else {
      values[field.name] = value ?? field.defaultValue ?? "";
    }
  });
  return values;
}

export default function EntityManager({
  title,
  subtitle,
  columns,
  fields,
  loadData,
  createRecord,
  updateRecord,
  deleteRecord,
  transformPayload = (payload) => payload,
  transformRow = (row) => row,
  canCreate = true,
  canEdit = true,
  canDelete = true,
}) {
  const [rows, setRows] = useState([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [editingRow, setEditingRow] = useState(null);

  const defaultValues = useMemo(() => buildDefaultValues(fields), [fields]);
  const { register, handleSubmit, reset, watch } = useForm({ defaultValues });
  const watched = watch();

  async function refresh() {
    setLoading(true);
    try {
      const data = await loadData(search);
      setRows(Array.isArray(data) ? data : []);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    refresh();
  }, [search]);

  function openCreate() {
    setEditingRow(null);
    reset(defaultValues);
    setModalOpen(true);
  }

  function openEdit(row) {
    const transformed = transformRow(row);
    setEditingRow(transformed);
    reset(buildDefaultValues(fields, transformed));
    setModalOpen(true);
  }

  async function submit(formValues) {
    setSaving(true);
    try {
      const payload = transformPayload(formValues, editingRow);
      if (editingRow) {
        await updateRecord(editingRow.id, payload);
        toast.success(`${title} updated`);
      } else {
        await createRecord(payload);
        toast.success(`${title} created`);
      }
      setModalOpen(false);
      await refresh();
    } catch (error) {
      toast.error(error.response?.data?.message || error.message || "Unable to save record");
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(row) {
    if (!window.confirm(`Delete ${row.name || row.label || title.toLowerCase()}?`)) return;
    try {
      await deleteRecord(row.id);
      toast.success(`${title} removed`);
      await refresh();
    } catch (error) {
      toast.error(error.response?.data?.message || "Unable to delete record");
    }
  }

  return (
    <section className="space-y-4">
      <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
        <div>
          <h2 className="text-xl font-semibold text-slate-950">{title}</h2>
          {subtitle ? <p className="text-sm text-slate-500">{subtitle}</p> : null}
        </div>
        <div className="flex w-full items-center gap-2 sm:gap-3 md:w-auto">
          <input
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder={`Search ${title.toLowerCase()}`}
            className="w-full rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm outline-none focus:border-accent-400 md:w-64"
          />
          {canCreate ? (
            <button
              type="button"
              onClick={openCreate}
              className="shrink-0 rounded-xl bg-slate-950 px-4 py-2 text-sm font-medium text-white hover:bg-slate-800"
            >
              Add New
            </button>
          ) : null}
        </div>
      </div>

      <DataTable
        columns={[
          ...columns,
          {
            key: "__actions",
            label: "Actions",
            render: (row) => (
              <div className="flex items-center gap-2">
                {canEdit ? (
                  <button type="button" className="rounded-lg border border-slate-200 px-3 py-1 text-xs" onClick={() => openEdit(row)}>
                    Edit
                  </button>
                ) : null}
                {canDelete ? (
                  <button type="button" className="rounded-lg border border-rose-200 px-3 py-1 text-xs text-rose-700" onClick={() => handleDelete(row)}>
                    Delete
                  </button>
                ) : null}
              </div>
            ),
          },
        ]}
        rows={rows}
        emptyText={loading ? "Loading..." : `No ${title.toLowerCase()} found.`}
      />

      <Modal
        open={modalOpen}
        title={editingRow ? `Edit ${title}` : `Create ${title}`}
        onClose={() => setModalOpen(false)}
        footer={
          <div className="flex justify-end gap-2">
            <button type="button" onClick={() => setModalOpen(false)} className="rounded-xl border border-slate-200 px-4 py-2 text-sm">
              Cancel
            </button>
            <button type="button" onClick={handleSubmit(submit)} className="rounded-xl bg-accent-600 px-4 py-2 text-sm font-medium text-white disabled:opacity-60" disabled={saving}>
              {saving ? "Saving..." : "Save"}
            </button>
          </div>
        }
      >
        <form className="grid gap-4 md:grid-cols-2" onSubmit={handleSubmit(submit)}>
          {fields.map((field) => {
            const common = {
              ...register(field.name, {
                required: field.required ? `${field.label} is required` : false,
              }),
            };

            return (
              <label key={field.name} className={field.fullWidth ? "md:col-span-2" : ""}>
                <span className="mb-1 block text-sm font-medium text-slate-700">{field.label}</span>
                {field.type === "textarea" ? (
                  <textarea
                    rows={field.rows || 3}
                    {...common}
                    className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm outline-none focus:border-accent-400"
                    placeholder={field.placeholder}
                  />
                ) : field.type === "select" ? (
                  <select
                    {...common}
                    className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm outline-none focus:border-accent-400"
                  >
                    <option value="">Select</option>
                    {field.options?.map((option) => (
                      <option key={option.value} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </select>
                ) : field.type === "checkbox" ? (
                  <input type="checkbox" {...register(field.name)} className="h-4 w-4 rounded border-slate-300" />
                ) : (
                  <input
                    type={field.type || "text"}
                    step={field.step}
                    {...common}
                    className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm outline-none focus:border-accent-400"
                    placeholder={field.placeholder}
                  />
                )}
                {field.helpText ? <span className="mt-1 block text-xs text-slate-500">{field.helpText}</span> : null}
              </label>
            );
          })}
          <button type="submit" className="hidden" />
        </form>
      </Modal>
    </section>
  );
}
