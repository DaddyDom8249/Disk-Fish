import { Link, useRouterState } from "@tanstack/react-router";
import { History, House, Library, ScanLine, UserRound } from "lucide-react";
import type { ReactNode } from "react";
import { PRODUCT } from "@/lib/product";
import { cn } from "@/lib/utils";

const NAV = [
  { to: "/", label: "Home", icon: House },
  { to: "/analyze", label: "Analyze", icon: ScanLine },
  { to: "/history", label: "History", icon: History },
  { to: "/pros", label: "Pros", icon: Library },
  { to: "/profile", label: "Profile", icon: UserRound },
] as const;

export function AppShell({ children }: { children: ReactNode }) {
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  return (
    <div className="mx-auto flex min-h-dvh max-w-lg flex-col">
      <header className="sticky top-0 z-20 flex items-center justify-between border-b border-border/80 bg-background/90 px-4 py-3 backdrop-blur-sm">
        <Link to="/" className="flex items-center gap-2.5">
          <Logo />
          <span className="font-display text-sm font-medium uppercase tracking-[0.14em] text-foreground">
            {PRODUCT.shortName}
          </span>
        </Link>
        <Link
          to="/methodology"
          className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground hover:text-foreground"
        >
          Method
        </Link>
      </header>
      <main className="flex-1 px-4 pb-[calc(5.25rem+env(safe-area-inset-bottom))] pt-4">{children}</main>
      <nav
        aria-label="Main"
        className="fixed inset-x-0 bottom-0 z-30 mx-auto max-w-lg border-t border-border bg-background/95 pb-[env(safe-area-inset-bottom)] backdrop-blur-sm"
      >
        <ul className="grid grid-cols-5">
          {NAV.map((item) => {
            const active = item.to === "/" ? pathname === "/" : pathname.startsWith(item.to);
            const Icon = item.icon;
            return (
              <li key={item.to}>
                <Link
                  to={item.to}
                  className={cn(
                    "flex min-h-14 flex-col items-center justify-center gap-1 text-[10px] font-medium uppercase tracking-wider",
                    active ? "text-foreground" : "text-muted-foreground",
                  )}
                >
                  <Icon className="size-5" strokeWidth={active ? 2.2 : 1.8} />
                  {item.label}
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>
    </div>
  );
}

function Logo() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" aria-hidden className="text-accent">
      <circle cx="8" cy="12" r="4.2" fill="none" stroke="currentColor" strokeWidth="1.6" />
      <path d="M12.2 12h9.2" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
      <path d="M18.4 9.2 21.4 12l-3 2.8" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}
