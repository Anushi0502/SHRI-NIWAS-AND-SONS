import { useEffect, useMemo, useState } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import toast from "react-hot-toast";
import PageHeader from "../components/PageHeader";
import StatCard from "../components/StatCard";
import { resources } from "../api/resources";
import { useAuth } from "../context/AuthContext";
import { useCompany } from "../context/CompanyContext";

const gstSettingSchema = z.object({
  enabled: z.boolean().optional().default(true),
  gstin: z.string().optional().default(""),
  registrationType: z.enum(["REGULAR", "COMPOSITION", "UNREGISTERED"]),
  companyState: z.string().min(2, "Company state is required"),
  invoicePrefix: z.string().min(1, "Invoice prefix is required"),
  nextInvoiceNumber: z.coerce.number().int().positive(),
  placeOfSupplyLogic: z.enum(["STATE_BASED", "LEDGER_STATE", "MANUAL"]),
  reverseChargeEnabled: z.boolean().optional().default(false),
});

export default function GstPage() {
  const { hasRole } = useAuth();
  const { activeCompany } = useCompany();
  const canModify = hasRole("ADMIN", "ACCOUNTANT");
  const [setting, setSetting] = useState(null);
  const [loading, setLoading] = useState(true);

  const {
    register,
    handleSubmit,
    reset,
    formState: { isSubmitting },
  } = useForm({
    resolver: zodResolver(gstSettingSchema),
    defaultValues: {
      enabled: true,
      gstin: "",
      registrationType: "REGULAR",
      companyState: "",
      invoicePrefix: "INV",
      nextInvoiceNumber: 1,
      placeOfSupplyLogic: "STATE_BASED",
      reverseChargeEnabled: false,
    },
  });

  useEffect(() => {
    let mounted = true;
    async function loadSetting() {
      if (!activeCompany) {
        setSetting(null);
        setLoading(false);
        return;
      }
      setLoading(true);
      try {
        const data = await resources.gst.getSetting();
        if (mounted) {
          setSetting(data);
          reset({
            enabled: data.enabled,
            gstin: data.gstin || "",
            registrationType: data.registrationType || "REGULAR",
            companyState: data.companyState || activeCompany.state || "",
            invoicePrefix: data.invoicePrefix || "INV",
            nextInvoiceNumber: data.nextInvoiceNumber || 1,
            placeOfSupplyLogic: data.placeOfSupplyLogic || "STATE_BASED",
            reverseChargeEnabled: data.reverseChargeEnabled || false,
          });
        }
      } catch (error) {
        toast.error(error.response?.data?.message || "Unable to load tax settings");
      } finally {
        if (mounted) setLoading(false);
      }
    }

    loadSetting();
    return () => {
      mounted = false;
    };
  }, [activeCompany?.id, reset]);

  const detailCards = useMemo(
    () => [
      { label: "Sales Tax Enabled", value: setting?.enabled ? "Yes" : "No", tone: setting?.enabled ? "accent" : "danger" },
      { label: "Registration", value: setting?.registrationType || "REGULAR" },
      { label: "Invoice Prefix", value: setting?.invoicePrefix || "-" },
      { label: "Next Invoice", value: String(setting?.nextInvoiceNumber || 1) },
    ],
    [setting],
  );

  async function onSubmit(values) {
    try {
      const payload = {
        enabled: Boolean(values.enabled),
        gstin: values.gstin || "",
        registrationType: values.registrationType,
        companyState: values.companyState,
        invoicePrefix: values.invoicePrefix,
        nextInvoiceNumber: Number(values.nextInvoiceNumber),
        placeOfSupplyLogic: values.placeOfSupplyLogic,
        reverseChargeEnabled: Boolean(values.reverseChargeEnabled),
      };
      const updated = await resources.gst.updateSetting(payload);
      setSetting(updated);
      toast.success("Tax settings saved");
    } catch (error) {
      toast.error(error.response?.data?.message || "Unable to save tax settings");
    }
  }

  if (!activeCompany) {
    return (
      <div className="rounded-2xl border border-slate-200 bg-white p-8 text-sm text-slate-600 shadow-soft">
        Select an active company to manage sales tax settings.
      </div>
    );
  }

  const disabled = !canModify;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Sales Tax Settings"
        subtitle="Control tax handling, invoice sequencing, and state or local tax logic for the active company."
        actions={
          canModify
            ? [
                <button
                  key="save"
                  type="button"
                  onClick={handleSubmit(onSubmit)}
                  disabled={isSubmitting}
                  className="rounded-xl bg-slate-950 px-4 py-2 text-sm font-medium text-white disabled:opacity-60"
                >
                  {isSubmitting ? "Saving..." : "Save Settings"}
                </button>,
              ]
            : null
        }
      />

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {detailCards.map((card) => (
          <StatCard key={card.label} label={card.label} value={card.value} tone={card.tone} />
        ))}
      </div>

      <div className="grid gap-6 xl:grid-cols-[1.2fr_0.8fr]">
        <form className="rounded-3xl border border-slate-200 bg-white p-6 shadow-soft space-y-5">
          <div>
            <h3 className="text-lg font-semibold text-slate-950">Tax Profile</h3>
            <p className="text-sm text-slate-500">These settings drive invoice numbering and sales tax logic.</p>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <label className="flex items-center gap-2 pt-5 text-sm text-slate-700">
              <input type="checkbox" {...register("enabled")} disabled={disabled} className="h-4 w-4 rounded border-slate-300" />
              Sales Tax Enabled
            </label>
            <label>
              <span className="mb-1 block text-sm font-medium text-slate-700">Tax Profile</span>
              <select {...register("registrationType")} disabled={disabled} className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm">
                <option value="REGULAR">Regular</option>
                <option value="COMPOSITION">Small seller</option>
                <option value="UNREGISTERED">Not registered</option>
              </select>
            </label>
            <label>
              <span className="mb-1 block text-sm font-medium text-slate-700">Tax ID</span>
              <input {...register("gstin")} disabled={disabled} className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm" />
            </label>
            <label>
              <span className="mb-1 block text-sm font-medium text-slate-700">Nexus State</span>
              <input {...register("companyState")} disabled={disabled} className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm" />
            </label>
            <label>
              <span className="mb-1 block text-sm font-medium text-slate-700">Invoice Prefix</span>
              <input {...register("invoicePrefix")} disabled={disabled} className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm" />
            </label>
            <label>
              <span className="mb-1 block text-sm font-medium text-slate-700">Next Invoice Number</span>
              <input type="number" {...register("nextInvoiceNumber")} disabled={disabled} className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm" />
            </label>
            <label>
              <span className="mb-1 block text-sm font-medium text-slate-700">Tax Location Logic</span>
              <select {...register("placeOfSupplyLogic")} disabled={disabled} className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm">
                <option value="STATE_BASED">State-based</option>
                <option value="LEDGER_STATE">Customer state</option>
                <option value="MANUAL">Manual override</option>
              </select>
            </label>
            <label className="flex items-center gap-2 pt-5 text-sm text-slate-700">
              <input type="checkbox" {...register("reverseChargeEnabled")} disabled={disabled} className="h-4 w-4 rounded border-slate-300" />
              Purchase tax adjustment enabled
            </label>
          </div>
        </form>

        <div className="space-y-4">
          <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-soft">
            <h3 className="text-lg font-semibold text-slate-950">Tax Logic Notes</h3>
            <ul className="mt-4 space-y-3 text-sm text-slate-600">
              <li>Sales tax is calculated using the configured rate.</li>
              <li>Invoice numbers are auto-sequenced from the prefix and next number.</li>
              <li>Purchase tax adjustments are available when enabled.</li>
            </ul>
          </div>
          <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-soft">
            <h3 className="text-lg font-semibold text-slate-950">Active Company</h3>
            <div className="mt-4 space-y-2 text-sm text-slate-600">
              <div>Name: {activeCompany.name}</div>
              <div>State: {activeCompany.state || "-"}</div>
              <div>Tax ID: {activeCompany.gstin || "-"}</div>
            </div>
          </div>
        </div>
      </div>

      {loading ? <div className="text-sm text-slate-500">Loading tax settings...</div> : null}
    </div>
  );
}
