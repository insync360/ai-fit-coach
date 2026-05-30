import { useState } from "react";
import { createFileRoute, Link, useNavigate, useRouter } from "@tanstack/react-router";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { AuthShell, AuthField } from "./login";

export const Route = createFileRoute("/signup")({
  head: () => ({
    meta: [
      { title: "Create account — Calorie Tracker" },
      { name: "description", content: "Create your account." },
    ],
  }),
  component: SignupPage,
});

function SignupPage() {
  const navigate = useNavigate();
  const router = useRouter();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [checkEmail, setCheckEmail] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (submitting) return;
    setSubmitting(true);
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: { data: { name: name || undefined } },
    });
    setSubmitting(false);
    if (error) {
      toast.error(error.message);
      return;
    }
    if (data.session) {
      await router.invalidate();
      navigate({ to: "/" });
    } else {
      setCheckEmail(true);
    }
  }

  if (checkEmail) {
    return (
      <AuthShell title="Check your email" subtitle="One more step">
        <p className="text-sm">
          We sent a confirmation link to <strong>{email}</strong>. Click it to activate your account, then sign in.
        </p>
        <Link
          to="/login"
          className="mt-5 block w-full border border-foreground bg-foreground py-3 text-center text-xs font-bold uppercase tracking-wider text-background"
        >
          Back to sign in
        </Link>
      </AuthShell>
    );
  }

  return (
    <AuthShell title="Create account" subtitle="Get started">
      <form onSubmit={onSubmit} className="space-y-3">
        <AuthField label="Name (optional)" value={name} onChange={setName} autoComplete="name" />
        <AuthField label="Email" type="email" value={email} onChange={setEmail} autoComplete="email" required />
        <AuthField
          label="Password"
          type="password"
          value={password}
          onChange={setPassword}
          autoComplete="new-password"
          required
        />
        <button
          type="submit"
          disabled={submitting}
          className="mt-2 w-full border border-foreground bg-foreground py-3 text-xs font-bold uppercase tracking-wider text-background disabled:opacity-60"
        >
          {submitting ? "Creating..." : "Create account"}
        </button>
      </form>
      <p className="mt-6 text-center text-xs text-muted-foreground">
        Already have an account?{" "}
        <Link to="/login" className="font-semibold text-primary">
          Sign in
        </Link>
      </p>
    </AuthShell>
  );
}
