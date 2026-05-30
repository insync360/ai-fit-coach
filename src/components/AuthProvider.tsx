import { useEffect, type ReactNode } from "react";
import { useRouter } from "@tanstack/react-router";
import { supabase } from "@/integrations/supabase/client";
import { clearStore, hydrate } from "@/lib/store";

export function AuthProvider({ children }: { children: ReactNode }) {
  const router = useRouter();

  useEffect(() => {
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === "SIGNED_OUT") {
        clearStore();
        router.invalidate();
        return;
      }
      if (event === "INITIAL_SESSION" || event === "SIGNED_IN" || event === "TOKEN_REFRESHED") {
        if (session?.user?.id) {
          void hydrate(session.user.id);
        } else {
          clearStore();
        }
        if (event === "SIGNED_IN") router.invalidate();
      }
    });
    return () => subscription.unsubscribe();
  }, [router]);

  return <>{children}</>;
}
