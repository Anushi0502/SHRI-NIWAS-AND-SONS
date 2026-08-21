import { useEffect } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { useLocation, useNavigate } from "react-router-dom";
import toast from "react-hot-toast";
import { useAuth } from "../context/AuthContext";

const loginSchema = z.object({
  email: z.string().email("Enter a valid email"),
  password: z.string().min(8, "Password must be at least 8 characters"),
});

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
    defaultValues: {
      email: "admin@shreenivas.local",
      password: "Admin@12345",
    },
  });

  useEffect(() => {
    if (!loading && isAuthenticated) {
      navigate(from, { replace: true });
    }
  }, [loading, isAuthenticated, from, navigate]);

  async function onSubmit(values) {
    try {
      await login(values);
      navigate(from, { replace: true });
    } catch (error) {
      toast.error(error.response?.data?.message || "Unable to sign in");
    }
  }

  return (
    <div className="min-h-screen grid lg:grid-cols-[1.1fr_0.9fr]">
      <section className="hidden lg:flex flex-col justify-between bg-[#0b1220] px-12 py-10 text-white">
        <div>
          <div className="inline-flex items-center gap-3 rounded-full border border-white/10 bg-white/5 px-4 py-2 text-sm text-slate-300">
            <span className="h-2 w-2 rounded-full bg-accent-400" />
            Secure accounting platform
          </div>
          <h1 className="mt-10 max-w-xl text-5xl font-semibold leading-tight">
            Original accounting software for a company that needs control, traceability, and real reports.
          </h1>
          <p className="mt-5 max-w-2xl text-lg text-slate-300">
            Multi-company ledgers, GST, inventory, invoices, exports, and audit logs in one secure browser app.
          </p>
        </div>

        <div className="grid max-w-2xl grid-cols-2 gap-4 text-sm text-slate-300">
          <div className="rounded-2xl border border-white/10 bg-white/5 p-4">JWT access token + rotated refresh cookie</div>
          <div className="rounded-2xl border border-white/10 bg-white/5 p-4">Double-entry voucher posting with transactions</div>
          <div className="rounded-2xl border border-white/10 bg-white/5 p-4">GST-ready invoices and tax reports</div>
          <div className="rounded-2xl border border-white/10 bg-white/5 p-4">PDF and Excel exports for reports</div>
        </div>
      </section>

      <section className="flex items-center justify-center px-4 py-10">
        <div className="w-full max-w-md rounded-3xl border border-slate-200 bg-white p-8 shadow-soft">
          <div className="mb-8">
            <div className="text-xs font-semibold uppercase tracking-[0.25em] text-accent-700">Global Creative Services</div>
            <h2 className="mt-2 text-3xl font-semibold text-slate-950">Sign in</h2>
            <p className="mt-2 text-sm text-slate-500">Use your approved account to continue.</p>
          </div>

          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <label className="block">
              <span className="mb-1 block text-sm font-medium text-slate-700">Email</span>
              <input
                type="email"
                {...register("email")}
                className="w-full rounded-xl border border-slate-200 px-4 py-3 outline-none focus:border-accent-400"
              />
              {errors.email ? <span className="mt-1 block text-xs text-rose-600">{errors.email.message}</span> : null}
            </label>
            <label className="block">
              <span className="mb-1 block text-sm font-medium text-slate-700">Password</span>
              <input
                type="password"
                {...register("password")}
                className="w-full rounded-xl border border-slate-200 px-4 py-3 outline-none focus:border-accent-400"
              />
              {errors.password ? <span className="mt-1 block text-xs text-rose-600">{errors.password.message}</span> : null}
            </label>
            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full rounded-xl bg-slate-950 px-4 py-3 font-medium text-white hover:bg-slate-800 disabled:opacity-60"
            >
              {isSubmitting ? "Signing in..." : "Sign in"}
            </button>
          </form>

          <div className="mt-6 rounded-2xl bg-slate-50 p-4 text-xs text-slate-500">
            Demo users: admin@shreenivas.local / Admin@12345, accountant@shreenivas.local / Accountant@12345,
            viewer@shreenivas.local / Viewer@12345.
          </div>
        </div>
      </section>
    </div>
  );
}
