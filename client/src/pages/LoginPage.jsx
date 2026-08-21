import { useEffect } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { Check, LockKeyhole, ShieldCheck } from "lucide-react";
import { useLocation, useNavigate } from "react-router-dom";
import toast from "react-hot-toast";
import BrandMark from "../components/BrandMark";
import { brand } from "../brand";
import { useAuth } from "../context/AuthContext";

const loginSchema = z.object({
  email: z.string().email("Enter a valid email"),
  password: z.string().min(8, "Password must be at least 8 characters"),
});

const highlights = ["Multi-company books and cash visibility", "Sales tax, invoices, inventory, and reports", "A calm, organized workspace for the whole team"];

export default function LoginPage() {
  const { login, isAuthenticated, loading } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const from = location.state?.from?.pathname || "/";

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm({
    resolver: zodResolver(loginSchema),
    defaultValues: { email: "admin@globalcreative.local", password: "Admin@12345" },
  });

  useEffect(() => {
    if (!loading && isAuthenticated) navigate(from, { replace: true });
  }, [loading, isAuthenticated, from, navigate]);

  async function onSubmit(values) {
    try {
      await login(values);
      navigate(from, { replace: true });
    } catch (error) {
      toast.error(error.response?.data?.message || error.message || "Unable to sign in");
    }
  }

  return (
    <div className="min-h-screen bg-[#f5f8f4] lg:grid lg:grid-cols-[1.05fr_0.95fr]">
      <section className="relative hidden overflow-hidden bg-[#132a2b] px-10 py-10 text-white lg:flex lg:flex-col lg:justify-between xl:px-16">
        <div className="absolute -right-28 -top-28 h-80 w-80 rounded-full border-[28px] border-white/5" />
        <div className="absolute -bottom-40 -left-24 h-96 w-96 rounded-full bg-[#e6a67c]/10 blur-3xl" />
        <div className="relative">
          <BrandMark inverse />
          <div className="mt-24 max-w-2xl">
            <div className="mb-5 inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3 py-2 text-xs font-semibold uppercase tracking-[0.18em] text-emerald-100">
              <ShieldCheck className="h-4 w-4 text-[#e6a67c]" />
              GCS operations workspace
            </div>
            <h1 className="max-w-xl font-serif text-5xl font-semibold leading-[1.05] tracking-[-0.05em] xl:text-6xl">
              Keep the numbers clear. Keep the team moving.
            </h1>
            <p className="mt-6 max-w-xl text-lg leading-8 text-slate-300">{brand.tagline} One friendly place for the records, decisions, and follow-through behind the work.</p>
          </div>
        </div>

        <div className="relative grid max-w-2xl gap-3 sm:grid-cols-3">
          {highlights.map((item) => (
            <div key={item} className="rounded-2xl border border-white/10 bg-white/[0.06] p-4 text-sm leading-6 text-slate-300">
              <Check className="mb-3 h-4 w-4 text-[#e6a67c]" />
              {item}
            </div>
          ))}
        </div>
      </section>

      <section className="flex min-h-screen items-center justify-center px-4 py-8 sm:px-8">
        <div className="w-full max-w-md">
          <div className="mb-7 lg:hidden"><BrandMark /></div>
          <div className="surface-card rounded-3xl border border-slate-200 bg-white p-6 sm:p-9">
            <div className="mb-8">
              <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-2xl bg-[#e9f7f1] text-[#0f6b63]"><LockKeyhole className="h-5 w-5" /></div>
              <h2 className="font-serif text-4xl font-semibold tracking-[-0.05em] text-slate-950">Welcome back</h2>
              <p className="mt-2 text-sm leading-6 text-slate-500">Sign in to continue to your GCS workspace.</p>
            </div>

            <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
              <label className="block">
                <span className="mb-2 block text-sm font-semibold text-slate-700">Work email</span>
                <input type="email" {...register("email")} className="w-full rounded-xl border px-4 py-3 outline-none" autoComplete="email" />
                {errors.email ? <span className="mt-1 block text-xs text-rose-600">{errors.email.message}</span> : null}
              </label>
              <label className="block">
                <span className="mb-2 block text-sm font-semibold text-slate-700">Password</span>
                <input type="password" {...register("password")} className="w-full rounded-xl border px-4 py-3 outline-none" autoComplete="current-password" />
                {errors.password ? <span className="mt-1 block text-xs text-rose-600">{errors.password.message}</span> : null}
              </label>
              <button type="submit" disabled={isSubmitting} className="w-full rounded-xl bg-[#132a2b] px-4 py-3.5 font-semibold text-white shadow-lg shadow-[#132a2b]/15 transition hover:bg-[#1d4142] disabled:opacity-60">
                {isSubmitting ? "Signing in..." : "Enter workspace"}
              </button>
            </form>

            <div className="mt-6 rounded-2xl border border-[#dce8e3] bg-[#f4faf6] p-4 text-xs leading-5 text-slate-600">
              <div className="font-semibold text-[#0f6b63]">Demo access</div>
              <div className="mt-1">admin@globalcreative.local / Admin@12345</div>
              <div>Accountant and viewer accounts are also available in the demo.</div>
            </div>
          </div>
          <p className="mt-5 text-center text-xs text-slate-500">{brand.legalName} · {brand.headOffice}</p>
        </div>
      </section>
    </div>
  );
}
