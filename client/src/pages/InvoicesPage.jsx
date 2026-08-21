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
import { downloadBlob } from "../utils/download";
import { formatDateInput, formatMoney } from "../utils/format";

const invoiceTypes = [
  { label: "Sales", value: "SALES" },
  { label: "Purchase", value: "PURCHASE" },
  { label: "Sales Return", value: "SALES_RETURN" },
  { label: "Purchase Return", value: "PURCHASE_RETURN" },
];

const gstInvoiceTypes = [
  { label: "Tax Invoice", value: "TAX_INVOICE" },
  { label: "Bill of Supply", value: "BILL_OF_SUPPLY" },
];

const invoiceLineSchema = z.object({
  itemId: z.union([z.coerce.number().int().positive(), z.literal(""), z.null()]).optional().default(""),
  itemName: z.string().optional().default(""),
  hsnSacCode: z.string().optional().default(""),
  quantity: z.coerce.number().positive({ message: "Quantity must be positive" }),
  unitPriceAmount: z.coerce.number().nonnegative().default(0),
  discountPercent: z.coerce.number().nonnegative().default(0),
  gstRate: z.coerce.number().nonnegative().default(0),
  cessRate: z.coerce.number().nonnegative().default(0),
});

const invoiceFormSchema = z.object({
  invoiceNo: z.string().optional().default(""),
  invoiceDate: z.string().min(1, "Invoice date is required"),
  invoiceType: z.enum(invoiceTypes.map((type) => type.value)),
  gstInvoiceType: z.enum(gstInvoiceTypes.map((type) => type.value)),
  partyLedgerId: z.coerce.number().int().positive({ message: "Select a party ledger" }),
  placeOfSupply: z.string().optional().default(""),
  isReverseCharge: z.boolean().optional().default(false),
  notes: z.string().optional().default(""),
  items: z.array(invoiceLineSchema).min(1, "Add at least one invoice line"),
});

function createEmptyLine() {
  return {
    itemId: "",
    itemName: "",
    hsnSacCode: "",
    quantity: 1,
    unitPriceAmount: 0,
    discountPercent: 0,
    gstRate: 0,
    cessRate: 0,
  };
}

function invoiceToForm(invoice) {
  if (!invoice) {
    return {
      invoiceNo: "",
      invoiceDate: formatDateInput(new Date()),
      invoiceType: "SALES",
      gstInvoiceType: "TAX_INVOICE",
      partyLedgerId: "",
      placeOfSupply: "",
      isReverseCharge: false,
      notes: "",
      items: [createEmptyLine()],
    };
  }

  return {
    invoiceNo: invoice.invoiceNo || "",
    invoiceDate: formatDateInput(invoice.invoiceDate),
    invoiceType: invoice.invoiceType,
    gstInvoiceType: invoice.gstInvoiceType || "TAX_INVOICE",
    partyLedgerId: invoice.partyLedgerId,
    placeOfSupply: invoice.placeOfSupply || "",
    isReverseCharge: Boolean(invoice.isReverseCharge),
    notes: invoice.notes || "",
    items:
      invoice.items?.map((item) => ({
        itemId: item.itemId || "",
        itemName: item.itemName || "",
        hsnSacCode: item.hsnSacCode || "",
        quantity: Number(item.quantity || 0),
        unitPriceAmount: Number(item.unitPricePaisa || 0) / 100,
        discountPercent: Number(item.discountPercent || 0),
        gstRate: Number(item.igstRate || item.cgstRate * 2 || 0),
        cessRate: Number(item.cessRate || 0),
      })) || [createEmptyLine()],
  };
}

function InvoiceEditor({ open, invoice, ledgers, items, saving, onClose, onSave }) {
  const defaultValues = useMemo(() => invoiceToForm(invoice), [invoice]);
  const {
    register,
    control,
    handleSubmit,
    setValue,
    reset,
    watch,
    formState: { errors },
  } = useForm({
    resolver: zodResolver(invoiceFormSchema),
    defaultValues,
  });
  const { fields, append, remove } = useFieldArray({ control, name: "items" });
  const watchedItems = watch("items") || [];
  const invoiceType = watch("invoiceType");

  useEffect(() => {
    if (open && invoiceType === "PURCHASE") {
      setValue("gstInvoiceType", "TAX_INVOICE");
    }
  }, [open, invoiceType, setValue]);

  useEffect(() => {
    if (open) {
      reset(defaultValues);
    }
  }, [open, defaultValues, reset]);

  function applyItem(index, itemId) {
    const selectedItem = items.find((entry) => String(entry.id) === String(itemId));
    if (!selectedItem) return;
    const unitPricePaisa = invoiceType === "PURCHASE" || invoiceType === "PURCHASE_RETURN" ? selectedItem.purchaseRatePaisa : selectedItem.salesRatePaisa;
    setValue(`items.${index}.itemName`, selectedItem.name || "");
    setValue(`items.${index}.hsnSacCode`, selectedItem.hsnSac?.code || "");
    setValue(`items.${index}.unitPriceAmount`, Number(unitPricePaisa || 0) / 100);
    setValue(`items.${index}.gstRate`, Number(selectedItem.hsnSac?.gstRate || 0));
    setValue(`items.${index}.cessRate`, Number(selectedItem.hsnSac?.cessRate || 0));
  }

  const totals = useMemo(() => {
    const subtotal = watchedItems.reduce((sum, item) => sum + Math.round(Number(item?.quantity || 0) * Number(item?.unitPriceAmount || 0) * 100), 0);
    return subtotal;
  }, [watchedItems]);

  async function submit(values) {
    const payload = {
      invoiceNo: values.invoiceNo?.trim() || undefined,
      invoiceDate: values.invoiceDate,
      invoiceType: values.invoiceType,
      gstInvoiceType: values.gstInvoiceType,
      partyLedgerId: Number(values.partyLedgerId),
      placeOfSupply: values.placeOfSupply || "",
      isReverseCharge: Boolean(values.isReverseCharge),
      notes: values.notes || "",
      items: values.items.map((item) => ({
        itemId: item.itemId ? Number(item.itemId) : undefined,
        itemName: item.itemName || "",
        hsnSacCode: item.hsnSacCode || "",
        quantity: Number(item.quantity),
        unitPricePaisa: Math.round(Number(item.unitPriceAmount || 0) * 100),
        discountPercent: Number(item.discountPercent || 0),
        gstRate: Number(item.gstRate || 0),
        cessRate: Number(item.cessRate || 0),
      })),
    };

    await onSave(payload);
  }

  return (
    <Modal
      open={open}
      title={invoice ? "Edit Invoice" : "Create Invoice"}
      onClose={onClose}
      footer={
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="text-sm text-slate-600">Approx. subtotal: {formatMoney(totals)}</div>
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
              {saving ? "Saving..." : "Save Invoice"}
            </button>
          </div>
        </div>
      }
    >
      <form className="space-y-5" onSubmit={handleSubmit(submit)}>
        <div className="grid gap-4 md:grid-cols-2">
          <label>
            <span className="mb-1 block text-sm font-medium text-slate-700">Invoice Type</span>
            <select {...register("invoiceType")} className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm">
              {invoiceTypes.map((type) => (
                <option key={type.value} value={type.value}>
                  {type.label}
                </option>
              ))}
            </select>
          </label>
          <label>
            <span className="mb-1 block text-sm font-medium text-slate-700">Tax Document Type</span>
            <select {...register("gstInvoiceType")} className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm">
              {gstInvoiceTypes.map((type) => (
                <option key={type.value} value={type.value}>
                  {type.label}
                </option>
              ))}
            </select>
          </label>
          <label>
            <span className="mb-1 block text-sm font-medium text-slate-700">Invoice Date</span>
            <input type="date" {...register("invoiceDate")} className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm" />
            {errors.invoiceDate ? <span className="mt-1 block text-xs text-rose-600">{errors.invoiceDate.message}</span> : null}
          </label>
          <label>
            <span className="mb-1 block text-sm font-medium text-slate-700">Party Ledger</span>
            <select {...register("partyLedgerId")} className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm">
              <option value="">Select ledger</option>
              {ledgers.map((ledger) => (
                <option key={ledger.id} value={ledger.id}>
                  {ledger.name} {ledger.accountGroup ? `(${ledger.accountGroup.name})` : ""}
                </option>
              ))}
            </select>
            {errors.partyLedgerId ? <span className="mt-1 block text-xs text-rose-600">{errors.partyLedgerId.message}</span> : null}
          </label>
          <label>
            <span className="mb-1 block text-sm font-medium text-slate-700">Invoice No</span>
            <input {...register("invoiceNo")} className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm" />
          </label>
          <label>
            <span className="mb-1 block text-sm font-medium text-slate-700">Place of Supply</span>
            <input {...register("placeOfSupply")} className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm" />
          </label>
          <label className="flex items-center gap-2 pt-6 text-sm text-slate-700">
            <input type="checkbox" {...register("isReverseCharge")} className="h-4 w-4 rounded border-slate-300" />
            Reverse charge
          </label>
          <label className="md:col-span-2">
            <span className="mb-1 block text-sm font-medium text-slate-700">Notes</span>
            <textarea {...register("notes")} rows={3} className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm" />
          </label>
        </div>

        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h4 className="text-sm font-semibold text-slate-900">Line Items</h4>
            <button
              type="button"
              onClick={() => append(createEmptyLine())}
              className="rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-medium text-slate-700"
            >
              Add item
            </button>
          </div>

          <div className="overflow-x-auto rounded-2xl border border-slate-200">
            <table className="min-w-[1100px] w-full divide-y divide-slate-200 bg-white">
              <thead className="bg-slate-50 text-left text-xs uppercase tracking-wide text-slate-500">
                <tr>
                  <th className="px-3 py-2">Item</th>
                  <th className="px-3 py-2">Name</th>
                  <th className="px-3 py-2">Tax Code</th>
                  <th className="px-3 py-2">Qty</th>
                  <th className="px-3 py-2">Rate</th>
                  <th className="px-3 py-2">Discount %</th>
                  <th className="px-3 py-2">Sales Tax %</th>
                  <th className="px-3 py-2">Cess %</th>
                  <th className="px-3 py-2">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {fields.map((field, index) => (
                  <tr key={field.id}>
                    <td className="px-3 py-2">
                      <select
                        {...register(`items.${index}.itemId`)}
                        onChange={(event) => {
                          register(`items.${index}.itemId`).onChange(event);
                          applyItem(index, event.target.value);
                        }}
                        className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm"
                      >
                        <option value="">Manual</option>
                        {items.map((item) => (
                          <option key={item.id} value={item.id}>
                            {item.name} ({item.sku})
                          </option>
                        ))}
                      </select>
                    </td>
                    <td className="px-3 py-2">
                      <input {...register(`items.${index}.itemName`)} className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm" />
                    </td>
                    <td className="px-3 py-2">
                      <input {...register(`items.${index}.hsnSacCode`)} className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm" />
                    </td>
                    <td className="px-3 py-2">
                      <input type="number" step="0.01" {...register(`items.${index}.quantity`)} className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm" />
                    </td>
                    <td className="px-3 py-2">
                      <input type="number" step="0.01" {...register(`items.${index}.unitPriceAmount`)} className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm" />
                    </td>
                    <td className="px-3 py-2">
                      <input type="number" step="0.01" {...register(`items.${index}.discountPercent`)} className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm" />
                    </td>
                    <td className="px-3 py-2">
                      <input type="number" step="0.01" {...register(`items.${index}.gstRate`)} className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm" />
                    </td>
                    <td className="px-3 py-2">
                      <input type="number" step="0.01" {...register(`items.${index}.cessRate`)} className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm" />
                    </td>
                    <td className="px-3 py-2">
                      <button
                        type="button"
                        onClick={() => remove(index)}
                        disabled={fields.length <= 1}
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
          {errors.items ? <span className="block text-xs text-rose-600">{errors.items.message}</span> : null}
        </div>
      </form>
    </Modal>
  );
}

export default function InvoicesPage() {
  const { hasRole } = useAuth();
  const { activeCompany } = useCompany();
  const canModify = hasRole("ADMIN", "ACCOUNTANT");
  const [invoices, setInvoices] = useState([]);
  const [ledgers, setLedgers] = useState([]);
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [editorOpen, setEditorOpen] = useState(false);
  const [editingInvoice, setEditingInvoice] = useState(null);
  const [filters, setFilters] = useState({
    startDate: "",
    endDate: "",
    invoiceType: "",
  });

  useEffect(() => {
    if (!activeCompany) return;
    setFilters({
      startDate: formatDateInput(activeCompany.financialYearStart),
      endDate: formatDateInput(activeCompany.financialYearEnd),
      invoiceType: "",
    });
  }, [activeCompany?.id]);

  useEffect(() => {
    let mounted = true;
    async function loadData() {
      if (!activeCompany) {
        setLoading(false);
        setInvoices([]);
        setLedgers([]);
        setItems([]);
        return;
      }
      setLoading(true);
      try {
        const [invoiceList, ledgerList, itemList] = await Promise.all([
          resources.invoices.list(filters),
          resources.ledgers.list(),
          resources.inventory.items.list(),
        ]);
        if (mounted) {
          setInvoices(invoiceList);
          setLedgers(ledgerList);
          setItems(itemList);
        }
      } catch (error) {
        toast.error(error.response?.data?.message || "Unable to load invoices");
      } finally {
        if (mounted) setLoading(false);
      }
    }
    loadData();
    return () => {
      mounted = false;
    };
  }, [activeCompany?.id, filters.startDate, filters.endDate, filters.invoiceType]);

  function openCreate() {
    setEditingInvoice(null);
    setEditorOpen(true);
  }

  function openEdit(invoice) {
    setEditingInvoice(invoice);
    setEditorOpen(true);
  }

  async function handleSave(payload) {
    setSaving(true);
    try {
      if (editingInvoice) {
        await resources.invoices.update(editingInvoice.id, payload);
        toast.success("Invoice updated");
      } else {
        await resources.invoices.create(payload);
        toast.success("Invoice created");
      }
      setEditorOpen(false);
      setEditingInvoice(null);
      const list = await resources.invoices.list(filters);
      setInvoices(list);
    } catch (error) {
      toast.error(error.response?.data?.message || "Unable to save invoice");
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(invoice) {
    if (!window.confirm(`Delete invoice ${invoice.invoiceNo}?`)) return;
    try {
      await resources.invoices.remove(invoice.id);
      toast.success("Invoice deleted");
      setInvoices(await resources.invoices.list(filters));
    } catch (error) {
      toast.error(error.response?.data?.message || "Unable to delete invoice");
    }
  }

  async function handlePdf(invoice) {
    try {
      const response = await resources.invoices.pdf(invoice.id);
      await downloadBlob(response, `invoice-${invoice.invoiceNo}.pdf`);
    } catch (error) {
      toast.error(error.response?.data?.message || "Unable to generate PDF");
    }
  }

  if (!activeCompany) {
    return (
      <div className="rounded-2xl border border-slate-200 bg-white p-8 text-sm text-slate-600 shadow-soft">
        Select an active company to manage invoices.
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Invoices"
        subtitle="Sales and purchase invoices with stock and accounting visibility."
        actions={
          canModify
            ? [
                <button
                  key="new"
                  type="button"
                  onClick={openCreate}
                  className="rounded-xl bg-slate-950 px-4 py-2 text-sm font-medium text-white"
                >
                  Create Invoice
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
          <span className="mb-1 block text-sm font-medium text-slate-700">Invoice Type</span>
          <select
            value={filters.invoiceType}
            onChange={(event) => setFilters((current) => ({ ...current, invoiceType: event.target.value }))}
            className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm"
          >
            <option value="">All types</option>
            {invoiceTypes.map((type) => (
              <option key={type.value} value={type.value}>
                {type.label}
              </option>
            ))}
          </select>
        </label>
        <div className="flex items-end">
          <button
            type="button"
            onClick={async () => setInvoices(await resources.invoices.list(filters))}
            className="w-full rounded-xl border border-slate-200 px-4 py-2 text-sm font-medium text-slate-700"
          >
            Refresh
          </button>
        </div>
      </div>

      <DataTable
        columns={[
          { key: "invoiceDate", label: "Date", type: "date" },
          { key: "invoiceNo", label: "No" },
          { key: "invoiceType", label: "Type" },
          { key: "partyLedger", label: "Party", render: (row) => row.partyLedger?.name || "" },
          { key: "subtotalPaisa", label: "Taxable", type: "money" },
          { key: "grandTotalPaisa", label: "Grand Total", type: "money" },
          { key: "voucher", label: "Voucher", render: (row) => row.voucher?.voucherNo || "-" },
        ]}
        rows={invoices}
        emptyText={loading ? "Loading invoices..." : "No invoices found."}
      />

      <div className="grid gap-3 md:grid-cols-3">
        {invoices.slice(0, 3).map((invoice) => (
          <div key={invoice.id} className="rounded-2xl border border-slate-200 bg-white p-4 shadow-soft">
            <div className="text-sm font-semibold text-slate-900">{invoice.invoiceNo}</div>
            <div className="mt-1 text-xs uppercase tracking-[0.2em] text-slate-500">{invoice.invoiceType}</div>
            <div className="mt-3 text-sm text-slate-600">{invoice.partyLedger?.name || "Party"}</div>
            <div className="mt-4 flex items-center justify-between text-sm">
              <span className="text-slate-500">Total</span>
              <span className="font-semibold text-slate-950">{formatMoney(invoice.grandTotalPaisa)}</span>
            </div>
          </div>
        ))}
      </div>

      <InvoiceEditor
        key={editingInvoice?.id || "new"}
        open={editorOpen}
        invoice={editingInvoice}
        ledgers={ledgers}
        items={items}
        saving={saving}
        onClose={() => setEditorOpen(false)}
        onSave={handleSave}
      />

      <div className="space-y-2 text-xs text-slate-500">
        <div>Invoice PDF exports are generated locally for this browser-based workspace.</div>
        <div>Invoice creation keeps the matching accounting and inventory entries together.</div>
      </div>
    </div>
  );
}
