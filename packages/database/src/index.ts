// SERVER-ONLY. Do not import from apps/web or any browser bundle.
// This module reads SUPABASE_SERVICE_ROLE_KEY, which bypasses RLS and must
// never be shipped to the client. Vite would inline any env var imported
// by browser code, so we fail fast if this file is evaluated in a
// browser-like environment.
import { createClient, type SupabaseClient } from "@supabase/supabase-js";

function assertServerEnvironment(): void {
  if (typeof window !== "undefined" || typeof document !== "undefined") {
    throw new Error(
      "@app/database is server-only and must not be imported from the browser. " +
        "Use apps/api endpoints instead."
    );
  }
}

export function createServerClient(): SupabaseClient {
  assertServerEnvironment();

  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !key) {
    throw new Error(
      "Missing SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY in environment."
    );
  }

  return createClient(url, key, {
    auth: { persistSession: false }
  });
}
