import { createFileRoute, Outlet, redirect } from "@tanstack/react-router";
import { Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useHydrated } from "@/lib/store";

export const Route = createFileRoute("/_authed")({
  beforeLoad: async ({ location }) => {
    if (typeof window === "undefined") return;

    const {
      data: { session },
    } = await supabase.auth.getSession();

    if (!session) {
      throw redirect({
        to: "/login",
        search: { redirect: location.href },
      });
    }
  },
  component: AuthedShell,
});

function AuthedShell() {
  const hydrated = useHydrated();
  if (!hydrated) {
    return (
      <div className="flex min-h-dvh items-center justify-center bg-background text-muted-foreground">
        <Loader2 className="h-6 w-6 animate-spin" />
      </div>
    );
  }
  return <Outlet />;
}
