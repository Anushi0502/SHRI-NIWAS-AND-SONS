import { useEffect, useMemo, useState } from "react";
import { useFieldArray, useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import toast from "react-hot-toast";
import DataTable from "../components/DataTable";
import Modal from "../components/Modal";
import PageHeader from "../components/PageHeader";
import { resources } from "../api/resources";
import { useAuth } from "../context/AuthContext";
import { useCompany } from "../context/CompanyContext";
import { formatDateInput, formatMoney } from "../utils/format";

const voucherTypes = [
  { label: "Payment", value: "PAYMENT" },
  { label: "Receipt", value: "RECEIPT" },
  { label: "Contra", value: "CONTRA" },
  { label: "Journal", value: "JOURNAL" },
  { label: "Sales", value: "SALES" },
  { label: "Purchase", value: "PURCHASE" },
  { label: "Debit Note", value: "DEBIT_NOTE" },
  { label: "Credit Note", value: "CREDIT_NOTE" },
  { label: "Sales Return", value: "SALES_RETURN" },
  { label: "Purchase Return", value: "PURCHASE_RETURN" },
];

const voucherEntrySchema = z
  .object({
    ledgerId: z.coerce.number().int().positive({ message: "Select a ledger" }),
    debitAmount: z.coerce.number().nonnegative().default(0),
    creditAmount: z.coerce.number().nonnegative().default(0),
    narration: z.string().optional().default(""),
  })
  .refine((value) => value.debitAmount > 0 || value.creditAmount > 0, "Enter a debit or credit amount")
  .refine((value) => !(value.debitAmount > 0 && value.creditAmount > 0), "Use only debit or credit on a row");

const voucherFormSchema = z.object({
  voucherNo: z.string().optional().default(""),
  voucherType: z.enum(voucherTypes.map((type) => type.value)),
  voucherDate: z.string().min(1, "Voucher date is required"),
  narration: z.string().optional().default(""),
  referenceNo: z.string().optional().default(""),
  sourceType: z.string().optional().default(""),
  sourceId: z.union([z.coerce.number().int().positive(), z.literal("")]).optional().default(""),
  entries: z.array(voucherEntrySchema).min(2, "Add at least two voucher rows"),
});

function createEmptyRow() {
  return {
    ledgerId: "",
    debitAmount: 0,
    creditAmount: 0,
    narration: "",
  };
}

function voucherToForm(voucher) {
  if (!voucher) {
    return {
      voucherNo: "",
      voucherType: "JOURNAL",
      voucherDate: formatDateInput(new Date()),
      narration: "",
      referenceNo: "",
      sourceType: "",
      sourceId: "",
      entries: [createEmptyRow(), createEmptyRow()],
    };
  }

  return {
    voucherNo: voucher.voucherNo || "",
    voucherType: voucher.voucherType,
    voucherDate: formatDateInput(voucher.voucherDate),
    narration: voucher.narration || "",
    referenceNo: voucher.referenceNo || "",
    sourceType: voucher.sourceType || "",
    sourceId: voucher.sourceId || "",
    entries:
      voucher.entries?.map((entry) => ({
        ledgerId: entry.ledgerId,
        debitAmount: Number(entry.debitPaisa || 0) / 100,
        creditAmount: Number(entry.creditPaisa || 0) / 100,
        narration: entry.narration || "",
      })) || [createEmptyRow(), createEmptyRow()],
  };
}

function VoucherEditor({ open, voucher, ledgers, saving, onClose, onSave }) {
  const defaultValues = useMemo(() => voucherToForm(voucher), [voucher]);
  const {
    register,
    control,
    handleSubmit,
    reset,
    watch,
    formState: { errors },
  } = useForm({
    resolver: zodResolver(voucherFormSchema),
    defaultValues,
  });
  const { fields, append, remove } = useFieldArray({ control, name: "entries" });
  const entries = watch("entries") || [];

  useEffect(() => {
    if (open) {
      reset(defaultValues);
    }
  }, [open, defaultValues, reset]);

  const totals = useMemo(() => {
    const debitPaisa = entries.reduce((sum, entry) => sum + Math.round(Number(entry?.debitAmount || 0) * 100), 0);
    const creditPaisa = entries.reduce((sum, entry) => sum + Math.round(Number(entry?.creditAmount || 0) * 100), 0);
    return { debitPaisa, creditPaisa };
  }, [entries]);

  async function submit(values) {
    const debitPaisa = values.entries.reduce((sum, entry) => sum + Math.round(Number(entry.debitAmount || 0) * 100), 0);
    const creditPaisa = values.entries.reduce((sum, entry) => sum + Math.round(Number(entry.creditAmount || 0) * 100), 0);

    if (debitPaisa !== creditPaisa) {
      toast.error("Total debit must equal total credit");
      return;
    }

    const payload = {
      voucherNo: values.voucherNo?.trim() || undefined,
      voucherType: values.voucherType,
      voucherDate: values.voucherDate,
      narration: values.narration || "",
      referenceNo: values.referenceNo?.trim() || undefined,
      sourceType: values.sourceType?.trim() || undefined,
      sourceId: values.sourceId ? Number(values.sourceId) : undefined,
      entries: values.entries.map((entry) => ({
        ledgerId: Number(entry.ledgerId),
        debitPaisa: Math.round(Number(entry.debitAmount || 0) * 100),
        creditPaisa: Math.round(Number(entry.creditAmount || 0) * 100),
        narration: entry.narration || "",
      })),
    };

    await onSave(payload);
  }

  return (
    <Modal
      open={open}
      title={voucher ? "Edit Voucher" : "Create Voucher"}
      onClose={onClose}
      footer={
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="text-sm text-slate-600">
            Debit: {formatMoney(totals.debitPaisa)} | Credit: {formatMoney(totals.creditPaisa)}
          </div>
          <div className="flex gap-2">
            <button type="button" onClick={onClose} className="rounded-xl border border-slate-200 px-4 py-2 text-sm">
              Cancel
            </button>
            <button
              type="button"
              onClick={handleSubmit(submit)}
              disabled={saving}
              className="rounded-xl bg-slate-950 px-4 py-2 text-sm font-medium text-white disabled:opacity-60"
            >
              {saving ? "Saving..." : "Save Voucher"}
            </button>
          </div>
        </div>
      }
    >
      <form className="space-y-5" onSubmit={handleSubmit(submit)}>
        <div className="grid gap-4 md:grid-cols-2">
          <label>
            <span className="mb-1 block text-sm font-medium text-slate-700">Voucher Type</span>
            <select {...register("voucherType")} className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm">
              {voucherTypes.map((type) => (
                <option key={type.value} value={type.value}>
                  {type.label}
                </option>
              ))}
            </select>
          </label>
          <label>
            <span className="mb-1 block text-sm font-medium text-slate-700">Voucher Date</span>
            <input type="date" {...register("voucherDate")} className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm" />
            {errors.voucherDate ? <span className="mt-1 block text-xs text-rose-600">{errors.voucherDate.message}</span> : null}
          </label>
          <label>
            <span className="mb-1 block text-sm font-medium text-slate-700">Voucher No</span>
            <input {...register("voucherNo")} className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm" />
          </label>
          <label>
            <span className="mb-1 block text-sm font-medium text-slate-700">Reference No</span>
            <input {...register("referenceNo")} className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm" />
          </label>
          <label className="md:col-span-2">
            <span className="mb-1 block text-sm font-medium text-slate-700">Narration</span>
            <textarea {...register("narration")} rows={3} className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm" />
          </label>
          <label>
            <span className="mb-1 block text-sm font-medium text-slate-700">Source Type</span>
            <input {...register("sourceType")} className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm" />
          </label>
          <label>
            <span className="mb-1 block text-sm font-medium text-slate-700">Source ID</span>
            <input type="number" {...register("sourceId")} className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm" />
          </label>
        </div>

        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h4 className="text-sm font-semibold text-slate-900">Entries</h4>
            <button
              type="button"
              onClick={() => append(createEmptyRow())}
              className="rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-medium text-slate-700"
            >
              Add row
            </button>
          </div>

          <div className="overflow-x-auto rounded-2xl border border-slate-200">
            <table className="min-w-[900px] w-full divide-y divide-slate-200 bg-white">
              <thead className="bg-slate-50 text-left text-xs uppercase tracking-wide text-slate-500">
                <tr>
                  <th className="px-3 py-2">Ledger</th>
                  <th className="px-3 py-2">Debit</th>
                  <th className="px-3 py-2">Credit</th>
                  <th className="px-3 py-2">Narration</th>
                  <th className="px-3 py-2">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {fields.map((field, index) => (
                  <tr key={field.id}>
                    <td className="px-3 py-2">
                      <select
                        {...register(`entries.${index}.ledgerId`)}
                        className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm"
                      >
                        <option value="">Select ledger</option>
                        {ledgers.map((ledger) => (
                          <option key={ledger.id} value={ledger.id}>
                            {ledger.name} {ledger.accountGroup ? `(${ledger.accountGroup.name})` : ""}
                          </option>
                        ))}
                      </select>
                      {errors.entries?.[index]?.ledgerId ? (
                        <span className="mt-1 block text-xs text-rose-600">{errors.entries[index].ledgerId.message}</span>
                      ) : null}
                    </td>
                    <td className="px-3 py-2">
                      <input
                        type="number"
                        step="0.01"
                        {...register(`entries.${index}.debitAmount`)}
                        className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm"
                      />
                    </td>
                    <td className="px-3 py-2">
                      <input
                        type="number"
                        step="0.01"
                        {...register(`entries.${index}.creditAmount`)}
                        className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm"
                      />
                    </td>
                    <td className="px-3 py-2">
                      <input
                        {...register(`entries.${index}.narration`)}
                        className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm"
                      />
                    </td>
                    <td className="px-3 py-2">
                      <button
                        type="button"
                        onClick={() => remove(index)}
                        disabled={fields.length <= 2}
                        className="rounded-lg border border-rose-200 px-3 py-1.5 text-xs font-medium text-rose-700 disabled:opacity-40"
                      >
                        Remove
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {errors.entries ? <span className="block text-xs text-rose-600">{errors.entries.message}</span> : null}
        </div>
      </form>
    </Modal>
  );
}

export default function VouchersPage() {
  const { hasRole } = useAuth();
  const { activeCompany } = useCompany();
  const canModify = hasRole("ADMIN", "ACCOUNTANT");
  const [vouchers, setVouchers] = useState([]);
  const [ledgers, setLedgers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [editorOpen, setEditorOpen] = useState(false);
  const [editingVoucher, setEditingVoucher] = useState(null);
  const [filters, setFilters] = useState({
    startDate: "",
    endDate: "",
    voucherType: "",
  });

  useEffect(() => {
    if (!activeCompany) return;
    setFilters({
      startDate: formatDateInput(activeCompany.financialYearStart),
      endDate: formatDateInput(activeCompany.financialYearEnd),
      voucherType: "",
    });
  }, [activeCompany?.id]);

  useEffect(() => {
    let mounted = true;
    async function loadData() {
      if (!activeCompany) {
        setLoading(false);
        setVouchers([]);
        setLedgers([]);
        return;
      }
      setLoading(true);
      try {
        const [voucherList, ledgerList] = await Promise.all([
          resources.vouchers.list(filters),
          resources.ledgers.list(),
        ]);
        if (mounted) {
          setVouchers(voucherList);
          setLedgers(ledgerList);
        }
      } catch (error) {
        toast.error(error.response?.data?.message || "Unable to load vouchers");
      } finally {
        if (mounted) setLoading(false);
      }
    }
    loadData();
    return () => {
      mounted = false;
    };
  }, [activeCompany?.id, filters.startDate, filters.endDate, filters.voucherType]);

  function openCreate() {
    setEditingVoucher(null);
    setEditorOpen(true);
  }

  function openEdit(voucher) {
    setEditingVoucher(voucher);
    setEditorOpen(true);
  }

  async function handleSave(payload) {
    setSaving(true);
    try {
      if (editingVoucher) {
        await resources.vouchers.update(editingVoucher.id, payload);
        toast.success("Voucher updated");
      } else {
        await resources.vouchers.create(payload);
        toast.success("Voucher created");
      }
      setEditorOpen(false);
      setEditingVoucher(null);
      const list = await resources.vouchers.list(filters);
      setVouchers(list);
    } catch (error) {
      toast.error(error.response?.data?.message || "Unable to save voucher");
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(voucher) {
    if (!window.confirm(`Delete voucher ${voucher.voucherNo}?`)) return;
    try {
      await resources.vouchers.remove(voucher.id);
      toast.success("Voucher deleted");
      setVouchers(await resources.vouchers.list(filters));
    } catch (error) {
      toast.error(error.response?.data?.message || "Unable to delete voucher");
    }
  }

  if (!activeCompany) {
    return (
      <div className="rounded-2xl border border-slate-200 bg-white p-8 text-sm text-slate-600 shadow-soft">
        Select an active company to manage vouchers.
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Vouchers"
        subtitle="Double-entry payments, receipts, journal entries, and adjustment vouchers."
        actions={
          canModify
            ? [
                <button
                  key="new"
                  type="button"
                  onClick={openCreate}
                  className="rounded-xl bg-slate-950 px-4 py-2 text-sm font-medium text-white"
                >
                  Create Voucher
                </button>,
              ]
            : null
        }
      />

      <div className="grid gap-4 rounded-2xl border border-slate-200 bg-white p-5 shadow-soft md:grid-cols-4">
        <label>
          <span className="mb-1 block text-sm font-medium text-slate-700">Start Date</span>
          <input
            type="date"
            value={filters.startDate}
            onChange={(event) => setFilters((current) => ({ ...current, startDate: event.target.value }))}
            className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm"
          />
        </label>
        <label>
          <span className="mb-1 block text-sm font-medium text-slate-700">End Date</span>
          <input
            type="date"
            value={filters.endDate}
            onChange={(event) => setFilters((current) => ({ ...current, endDate: event.target.value }))}
            className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm"
          />
        </label>
        <label>
          <span className="mb-1 block text-sm font-medium text-slate-700">Voucher Type</span>
          <select
            value={filters.voucherType}
            onChange={(event) => setFilters((current) => ({ ...current, voucherType: event.target.value }))}
            className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm"
          >
            <option value="">All types</option>
            {voucherTypes.map((type) => (
              <option key={type.value} value={type.value}>
                {type.label}
              </option>
            ))}
          </select>
        </label>
        <div className="flex items-end">
          <button
            type="button"
            onClick={async () => setVouchers(await resources.vouchers.list(filters))}
            className="w-full rounded-xl border border-slate-200 px-4 py-2 text-sm font-medium text-slate-700"
          >
            Refresh
          </button>
        </div>
      </div>

      <DataTable
        columns={[
          { key: "voucherDate", label: "Date", type: "date" },
          { key: "voucherNo", label: "No" },
          { key: "voucherType", label: "Type" },
          { key: "narration", label: "Narration" },
          { key: "totalDebitPaisa", label: "Debit", type: "money" },
          { key: "totalCreditPaisa", label: "Credit", type: "money" },
          { key: "entries", label: "Rows", render: (row) => row.entries?.length || 0 },
        ]}
        rows={vouchers}
        emptyText={loading ? "Loading vouchers..." : "No vouchers found."}
      />

      <VoucherEditor
        key={editingVoucher?.id || "new"}
        open={editorOpen}
        voucher={editingVoucher}
        ledgers={ledgers}
        saving={saving}
        onClose={() => setEditorOpen(false)}
        onSave={handleSave}
      />

      <div className="text-xs text-slate-500">
        Viewers can inspect vouchers, while create/edit/delete actions remain restricted to admin and accountant roles.
      </div>
    </div>
  );
}
