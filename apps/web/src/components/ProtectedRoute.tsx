import { Navigate } from "react-router-dom";
import { useSession } from "@/hooks/useSession";

export function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { session, loading } = useSession();

  if (loading) {
    return (
      <div className="min-h-screen bg-black text-zinc-500 flex items-center justify-center">
        Chargement…
      </div>
    );
  }

  if (!session) {
    return <Navigate to="/login" replace />;
  }

  return <>{children}</>;
}
