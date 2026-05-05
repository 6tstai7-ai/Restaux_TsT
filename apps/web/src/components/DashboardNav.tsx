import { useEffect, useState } from "react";
import { NavLink } from "react-router-dom";
import { Menu, X, LayoutDashboard, Users, CreditCard, ScanLine, Package } from "lucide-react";

const LINKS = [
  { to: "/dashboard", label: "Tableau de bord", Icon: LayoutDashboard },
  { to: "/stock", label: "Stock", Icon: Package },
  { to: "/customers", label: "Clients", Icon: Users },
  { to: "/loyalty", label: "Identité carte", Icon: CreditCard },
  { to: "/scanner", label: "Scanner", Icon: ScanLine }
];

const desktopBase =
  "relative pb-2 text-micro uppercase tracking-[0.08em] transition-colors duration-180 ease-out-punched";
const desktopActive = "text-[var(--color-text)]";
const desktopInactive = "text-[var(--color-text-muted)] hover:text-[var(--color-text)]";

const mobileBase =
  "flex items-center gap-3 w-full pl-4 pr-4 py-4 border-l-[3px] text-sm tracking-wide transition-colors duration-180 ease-out-punched min-h-[48px]";
const mobileActive =
  "border-l-[var(--tenant-accent)] text-[var(--color-text)] bg-[var(--color-surface-2)]";
const mobileInactive =
  "border-l-transparent text-[var(--color-text-muted)] hover:text-[var(--color-text)] hover:bg-[var(--color-surface-2)]";

export default function DashboardNav() {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open]);

  return (
    <>
      <nav className="hidden items-center gap-8 md:flex">
        {LINKS.map(({ to, label }) => (
          <NavLink
            key={to}
            to={to}
            className={({ isActive }) =>
              `${desktopBase} ${isActive ? desktopActive : desktopInactive}`
            }
          >
            {({ isActive }) => (
              <>
                <span>{label}</span>
                {isActive && (
                  <span
                    aria-hidden
                    className="absolute left-0 right-0 -bottom-0.5 h-0.5 bg-[var(--tenant-accent)]"
                  />
                )}
              </>
            )}
          </NavLink>
        ))}
      </nav>

      <button
        type="button"
        aria-label={open ? "Fermer le menu" : "Ouvrir le menu"}
        aria-expanded={open}
        onClick={() => setOpen((v) => !v)}
        className="flex h-11 w-11 items-center justify-center rounded-lg border border-[var(--color-border)] text-[var(--color-text)] hover:bg-[var(--color-surface-2)] transition-colors duration-180 ease-out-punched md:hidden"
      >
        <span className="sr-only">Menu</span>
        {open ? <X size={20} strokeWidth={1.75} /> : <Menu size={20} strokeWidth={1.75} />}
      </button>

      {open && (
        <div
          className="fixed inset-0 z-40 bg-black/70 md:hidden"
          onClick={() => setOpen(false)}
          aria-hidden
        />
      )}
      <div
        className={`fixed inset-x-0 top-0 z-50 transform border-b border-[var(--color-border)] bg-[var(--color-bg)] transition-transform duration-240 ease-out-punched md:hidden ${
          open ? "translate-y-0" : "-translate-y-full"
        }`}
        role="dialog"
        aria-modal="true"
      >
        <div className="flex items-center justify-between px-4 py-4 border-b border-[var(--color-border)]">
          <span className="font-display text-lg font-bold tracking-tight text-[var(--color-text)]">
            RESTAUX
          </span>
          <button
            type="button"
            aria-label="Fermer le menu"
            onClick={() => setOpen(false)}
            className="flex h-11 w-11 items-center justify-center rounded-lg border border-[var(--color-border)] text-[var(--color-text)] hover:bg-[var(--color-surface-2)]"
          >
            <X size={20} strokeWidth={1.75} />
          </button>
        </div>
        <nav className="flex flex-col py-2">
          {LINKS.map(({ to, label, Icon }) => (
            <NavLink
              key={to}
              to={to}
              onClick={() => setOpen(false)}
              className={({ isActive }) =>
                `${mobileBase} ${isActive ? mobileActive : mobileInactive}`
              }
            >
              <Icon size={20} strokeWidth={1.75} />
              <span>{label}</span>
            </NavLink>
          ))}
        </nav>
      </div>
    </>
  );
}
