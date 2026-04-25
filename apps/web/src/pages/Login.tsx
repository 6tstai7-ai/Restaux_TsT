import { useState, type FormEvent } from "react";
import { Navigate, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { supabase } from "@/lib/supabase";
import { useSession } from "@/hooks/useSession";

export default function Login() {
  const { session, loading } = useSession();
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  if (loading) {
    return (
      <div className="min-h-screen bg-black text-zinc-500 flex items-center justify-center">
        Chargement…
      </div>
    );
  }
  if (session) return <Navigate to="/dashboard" replace />;

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    const { error: signInError } = await supabase.auth.signInWithPassword({ email, password });
    setSubmitting(false);
    if (signInError) {
      setError(signInError.message);
      return;
    }
    navigate("/dashboard", { replace: true });
  }

  return (
    <div className="min-h-screen bg-black text-white font-sans flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="mb-10 border-b border-zinc-800 pb-6">
          <h1 className="text-4xl font-extrabold tracking-tighter italic">RESTAUX.</h1>
          <p className="text-zinc-500 text-sm mt-2">Connexion gérant</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <label htmlFor="email" className="block text-xs font-bold uppercase tracking-widest text-zinc-500 mb-2">
              Courriel
            </label>
            <input
              id="email"
              type="email"
              required
              autoComplete="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full bg-black border border-zinc-700 rounded-md p-4 text-lg text-white focus:border-yellow-500 outline-none"
            />
          </div>

          <div>
            <label htmlFor="password" className="block text-xs font-bold uppercase tracking-widest text-zinc-500 mb-2">
              Mot de passe
            </label>
            <input
              id="password"
              type="password"
              required
              autoComplete="current-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full bg-black border border-zinc-700 rounded-md p-4 text-lg text-white focus:border-yellow-500 outline-none"
            />
          </div>

          {error && (
            <div className="border border-red-500/60 bg-red-500/10 text-red-400 text-sm p-3 rounded-md">
              {error}
            </div>
          )}

          <Button
            type="submit"
            disabled={submitting}
            className="w-full bg-yellow-500 hover:bg-yellow-400 text-black font-bold py-6 text-lg tracking-tight disabled:opacity-60"
          >
            {submitting ? "Connexion…" : "SE CONNECTER"}
          </Button>
        </form>
      </div>
    </div>
  );
}
