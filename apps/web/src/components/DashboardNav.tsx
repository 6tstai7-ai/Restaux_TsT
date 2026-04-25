import { useEffect, useState } from "react";
import { NavLink } from "react-router-dom";

const LINKS = [
  { to: "/dashboard", label: "Tableau de bord" },
  { to: "/customers", label: "Clients" },
  { to: "/loyalty", label: "Identité carte" },
  { to: "/scanner", label: "Scanner" }
];

const linkBase = "text-xs uppercase tracking-widest transition-colors";
const linkActive = "text-zinc-100 border-b border-zinc-100 pb-1";
const linkInactive = "text-zinc-500 hover:text-zinc-300 pb-1";

const mobileLinkBase =
  "block w-full px-4 py-4 text-sm uppercase tracking-widest transition-colors min-h-[44px]";
const mobileLinkActive = "text-zinc-100 bg-zinc-900";
const mobileLinkInactive = "text-zinc-400 hover:text-zinc-100 hover:bg-zinc-900";

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
        {LINKS.map((l) => (
          <NavLink
            key={l.to}
            to={l.to}
            className={({ isActive }) =>
              `${linkBase} ${isActive ? linkActive : linkInactive}`
            }
          >
            {l.label}
          </NavLink>
        ))}
      </nav>

      <button
        type="button"
        aria-label={open ? "Fermer le menu" : "Ouvrir le menu"}
        aria-expanded={open}
        onClick={() => setOpen((v) => !v)}
        className="flex h-11 w-11 items-center justify-center border border-zinc-800 text-zinc-200 md:hidden"
      >
        <span className="sr-only">Menu</span>
        {open ? (
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
            <path d="M6 6l12 12M18 6L6 18" />
          </svg>
        ) : (
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
            <path d="M4 7h16M4 12h16M4 17h16" />
          </svg>
        )}
      </button>

      {open && (
        <div
          className="fixed inset-0 z-40 bg-black/70 md:hidden"
          onClick={() => setOpen(false)}
          aria-hidden
        />
      )}
      <div
        className={`fixed inset-x-0 top-0 z-50 transform border-b border-zinc-800 bg-black transition-transform md:hidden ${
          open ? "translate-y-0" : "-translate-y-full"
        }`}
        role="dialog"
        aria-modal="true"
      >
        <div className="flex items-center justify-between px-4 py-4 border-b border-zinc-900">
          <span className="text-lg font-extrabold tracking-tighter italic text-white">
            RESTAUX.
          </span>
          <button
            type="button"
            aria-label="Fermer le menu"
            onClick={() => setOpen(false)}
            className="flex h-11 w-11 items-center justify-center border border-zinc-800 text-zinc-200"
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
              <path d="M6 6l12 12M18 6L6 18" />
            </svg>
          </button>
        </div>
        <nav className="flex flex-col py-2">
          {LINKS.map((l) => (
            <NavLink
              key={l.to}
              to={l.to}
              onClick={() => setOpen(false)}
              className={({ isActive }) =>
                `${mobileLinkBase} ${isActive ? mobileLinkActive : mobileLinkInactive}`
              }
            >
              {l.label}
            </NavLink>
          ))}
        </nav>
      </div>
    </>
  );
}
