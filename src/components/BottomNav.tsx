import { Link, useRouterState } from "@tanstack/react-router";
import { LayoutDashboard, Camera, TrendingUp, BarChart3, Settings } from "lucide-react";

type Tab = { to: string; label: string; Icon: typeof LayoutDashboard; primary?: boolean };
const tabs: Tab[] = [
  { to: "/", label: "Today", Icon: LayoutDashboard },
  { to: "/add", label: "Add", Icon: Camera, primary: true },
  { to: "/progress", label: "Progress", Icon: TrendingUp },
  { to: "/analytics", label: "Stats", Icon: BarChart3 },
  { to: "/settings", label: "Profile", Icon: Settings },
];

export function BottomNav() {
  const path = useRouterState({ select: (s) => s.location.pathname });
  return (
    <nav className="fixed bottom-0 left-0 right-0 z-40 border-t border-border bg-surface">
      <div className="mx-auto grid max-w-md grid-cols-5">
        {tabs.map(({ to, label, Icon, primary }) => {
          const active = to === "/" ? path === "/" : path.startsWith(to);
          return (
            <Link
              key={to}
              to={to as "/"}
              className="flex flex-col items-center justify-center gap-1 py-2.5 text-[10px] font-semibold tracking-wider uppercase"
            >
              <div
                className={
                  primary
                    ? `flex h-10 w-10 items-center justify-center border ${active ? "border-primary bg-primary text-primary-foreground" : "border-foreground bg-foreground text-background"}`
                    : `flex h-7 items-center justify-center ${active ? "text-primary" : "text-muted-foreground"}`
                }
              >
                <Icon className={primary ? "h-5 w-5" : "h-5 w-5"} strokeWidth={2.2} />
              </div>
              <span className={active ? "text-foreground" : "text-muted-foreground"}>{label}</span>
            </Link>
          );
        })}
      </div>
      <div style={{ height: "env(safe-area-inset-bottom)" }} />
    </nav>
  );
}
