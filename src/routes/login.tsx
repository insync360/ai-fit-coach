import { useState } from "react";
import { createFileRoute, Link, useNavigate, useRouter } from "@tanstack/react-router";
import { z } from "zod";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";

const searchSchema = z.object({
  redirect: z.string().optional(),
});

export const Route = createFileRoute("/login")({
  head: () => ({
    meta: [
      { title: "Sign in — Calorie Tracker" },
      { name: "description", content: "Sign in to your account." },
    ],
  }),
  validateSearch: (search) => searchSchema.parse(search),
  component: LoginPage,
});

function LoginPage() {
  const { redirect } = Route.useSearch();
  const navigate = useNavigate();
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [submitting, setSubmitting] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (submitting) return;
    setSubmitting(true);
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    setSubmitting(false);
    if (error) {
      toast.error(error.message);
      return;
    }
    await router.invalidate();
    navigate({ to: redirect ?? "/" });
  }

  return (
    <AuthShell title="Sign in" subtitle="Welcome back">
      <form onSubmit={onSubmit} className="space-y-3">
        <AuthField label="Email" type="email" value={email} onChange={setEmail} autoComplete="email" required />
        <AuthField
          label="Password"
          type="password"
          value={password}
          onChange={setPassword}
          autoComplete="current-password"
          required
        />
        <button
          type="submit"
          disabled={submitting}
          className="mt-2 w-full border border-foreground bg-foreground py-3 text-xs font-bold uppercase tracking-wider text-background disabled:opacity-60"
        >
          {submitting ? "Signing in..." : "Sign in"}
        </button>
      </form>
      <p className="mt-6 text-center text-xs text-muted-foreground">
        No account?{" "}
        <Link to="/signup" className="font-semibold text-primary">
          Create one
        </Link>
      </p>
    </AuthShell>
  );
}

export function AuthShell({
  title,
  subtitle,
  children,
}: {
  title: string;
  subtitle?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-dvh bg-background text-foreground">
      <div className="mx-auto flex min-h-dvh max-w-md flex-col justify-center px-5 py-12">
        <div className="mb-8">
          {subtitle && <div className="label-eyebrow">{subtitle}</div>}
          <h1 className="mt-1 text-3xl font-bold tracking-tight">{title}</h1>
        </div>
        <div className="panel p-5">{children}</div>
      </div>
    </div>
  );
}

export function AuthField({
  label,
  type = "text",
  value,
  onChange,
  autoComplete,
  required,
}: {
  label: string;
  type?: string;
  value: string;
  onChange: (v: string) => void;
  autoComplete?: string;
  required?: boolean;
}) {
  return (
    <label className="block border border-border bg-surface p-3">
      <div className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">{label}</div>
      <input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        autoComplete={autoComplete}
        required={required}
        className="mt-1 w-full bg-transparent text-base font-semibold outline-none"
      />
    </label>
  );
}
