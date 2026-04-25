import { NavLink } from "react-router-dom";

const linkBase =
  "text-xs uppercase tracking-widest transition-colors";
const linkActive = "text-zinc-100 border-b border-zinc-100 pb-1";
const linkInactive = "text-zinc-500 hover:text-zinc-300 pb-1";

export default function DashboardNav() {
  return (
    <nav className="flex items-center gap-8">
      <NavLink
        to="/dashboard"
        className={({ isActive }) => `${linkBase} ${isActive ? linkActive : linkInactive}`}
      >
        Tableau de bord
      </NavLink>
      <NavLink
        to="/customers"
        className={({ isActive }) => `${linkBase} ${isActive ? linkActive : linkInactive}`}
      >
        Clients
      </NavLink>
      <NavLink
        to="/loyalty"
        className={({ isActive }) => `${linkBase} ${isActive ? linkActive : linkInactive}`}
      >
        Identité carte
      </NavLink>
      <NavLink
        to="/scanner"
        className={({ isActive }) => `${linkBase} ${isActive ? linkActive : linkInactive}`}
      >
        Scanner
      </NavLink>
    </nav>
  );
}
