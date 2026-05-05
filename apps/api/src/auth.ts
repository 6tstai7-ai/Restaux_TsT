import type { Request, Response } from "express";
import type { SupabaseClient } from "@supabase/supabase-js";

export function getBearerToken(req: Request): string | null {
  const header = req.headers.authorization;
  if (typeof header !== "string") return null;
  const match = header.match(/^Bearer\s+(.+)$/i);
  return match?.[1]?.trim() || null;
}

export async function requireUserId(
  supabase: SupabaseClient,
  req: Request,
  res: Response
): Promise<string | null> {
  const token = getBearerToken(req);
  if (!token) {
    res.status(401).json({ success: false, error: "authentification requise" });
    return null;
  }

  const { data, error } = await supabase.auth.getUser(token);
  const userId = data.user?.id;
  if (error || !userId) {
    res.status(401).json({ success: false, error: "session invalide" });
    return null;
  }
  return userId;
}

export async function requireRestaurantOwner(
  supabase: SupabaseClient,
  restaurantId: string,
  userId: string,
  res: Response
): Promise<boolean> {
  const { data, error } = await supabase
    .from("restaurants")
    .select("owner_id")
    .eq("id", restaurantId)
    .single<{ owner_id: string | null }>();

  if (error || !data) {
    res.status(404).json({ success: false, error: error?.message ?? "restaurant introuvable" });
    return false;
  }
  if (data.owner_id !== userId) {
    res.status(403).json({ success: false, error: "accès refusé" });
    return false;
  }
  return true;
}
