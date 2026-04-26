import type { Request, Response } from "express";
import type { SupabaseClient } from "@supabase/supabase-js";
import { generateApplePass } from "./services/passkit.js";

const DEFAULT_BG = "#18181b";

type TenantRow = {
  name: string | null;
  card_bg_color: string | null;
  card_text_color: string | null;
  card_label_color: string | null;
  card_description: string | null;
};

type CustomerRow = {
  id: string;
  restaurant_id: string;
  name: string | null;
  points_balance: number | null;
};

async function buildAndSendPass(
  supabase: SupabaseClient,
  res: Response,
  clientId: string
): Promise<Response> {
  const { data: customer, error: custErr } = await supabase
    .from("customers")
    .select("id, restaurant_id, name, points_balance")
    .eq("id", clientId)
    .single<CustomerRow>();
  if (custErr || !customer) {
    return res
      .status(404)
      .json({ success: false, error: custErr?.message ?? "client introuvable" });
  }

  const { data: restaurant, error: restoErr } = await supabase
    .from("restaurants")
    .select("name, card_bg_color, card_text_color, card_label_color, card_description")
    .eq("id", customer.restaurant_id)
    .single<TenantRow>();
  if (restoErr || !restaurant) {
    return res
      .status(404)
      .json({ success: false, error: restoErr?.message ?? "restaurant introuvable" });
  }

  const tenantName = restaurant.name?.trim() || "Restaurant";
  const backgroundHex = restaurant.card_bg_color?.trim() || DEFAULT_BG;
  const description = restaurant.card_description?.trim() || `Carte fidélité ${tenantName}`;

  try {
    const buffer = await generateApplePass({
      tenant: {
        name: tenantName,
        description,
        backgroundHex,
        textHex: restaurant.card_text_color,
        labelHex: restaurant.card_label_color
      },
      client: {
        id: customer.id,
        name: customer.name ?? "Client",
        pointsBalance: customer.points_balance ?? 0
      }
    });

    res.setHeader("Content-Type", "application/vnd.apple.pkpass");
    res.setHeader(
      "Content-Disposition",
      `attachment; filename="${slug(tenantName)}-${customer.id}.pkpass"`
    );
    res.setHeader("Cache-Control", "no-store");
    return res.send(buffer);
  } catch (err) {
    const msg = err instanceof Error ? err.message : "erreur inconnue";
    console.error(`[api] wallet pass failed: ${msg}`);
    return res.status(500).json({ success: false, error: msg });
  }
}

function slug(s: string): string {
  return s
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 32) || "pass";
}

export function createWalletController(supabase: SupabaseClient) {
  return async (req: Request, res: Response) => {
    const id = (req.body?.client_id ?? "") as string;
    if (!id || typeof id !== "string") {
      return res.status(400).json({ success: false, error: "client_id (string) requis" });
    }
    return buildAndSendPass(supabase, res, id);
  };
}

export function createApplePassController(supabase: SupabaseClient) {
  return async (req: Request, res: Response) => {
    const raw = req.params.clientId;
    const id = Array.isArray(raw) ? raw[0] : raw;
    if (!id || typeof id !== "string") {
      return res.status(400).json({ success: false, error: "clientId requis" });
    }
    return buildAndSendPass(supabase, res, id);
  };
}
