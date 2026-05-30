import { useEffect, type ReactNode } from "react";
import { BottomNav } from "./BottomNav";
import { useStore } from "@/lib/store";

export function Shell({ children, title, subtitle, right }: { children: ReactNode; title?: string; subtitle?: string; right?: ReactNode }) {
  const theme = useStore((s) => s.profile.theme);
  useEffect(() => {
    document.documentElement.classList.toggle("dark", theme === "dark");
  }, [theme]);

  return (
    <div className="min-h-dvh bg-background text-foreground">
      <div className="mx-auto max-w-md pb-28">
        {(title || right) && (
          <header className="sticky top-0 z-30 border-b border-border bg-background/95 backdrop-blur">
            <div className="flex items-center justify-between px-5 py-4">
              <div>
                {subtitle && <div className="label-eyebrow">{subtitle}</div>}
                {title && <h1 className="text-2xl font-bold tracking-tight">{title}</h1>}
              </div>
              {right}
            </div>
          </header>
        )}
        {children}
      </div>
      <BottomNav />
    </div>
  );
}
