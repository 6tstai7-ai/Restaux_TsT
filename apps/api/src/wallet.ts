import type { Request, Response } from "express";
import type { SupabaseClient } from "@supabase/supabase-js";
import { PKPass } from "passkit-generator";
import { readFile } from "node:fs/promises";
import path from "node:path";

const CERTS_DIR = process.env.WALLET_CERTS_DIR ?? path.resolve("certs/apple");
const ASSETS_DIR = process.env.WALLET_ASSETS_DIR ?? path.resolve("assets/wallet");
const PASS_TYPE_ID = process.env.APPLE_PASS_TYPE_ID ?? "pass.ca.restaux.laboitejaune";
const TEAM_ID = process.env.APPLE_TEAM_ID ?? "TEAMID000";
const ORG_NAME = process.env.APPLE_ORG_NAME ?? "La Boîte Jaune";

function hexToRgb(hex: string | null | undefined): string | null {
  if (!hex) return null;
  const m = /^#?([0-9a-f]{6})$/i.exec(hex.trim());
  if (!m) return null;
  const n = parseInt(m[1], 16);
  return `rgb(${(n >> 16) & 255}, ${(n >> 8) & 255}, ${n & 255})`;
}

export function createWalletController(supabase: SupabaseClient) {
  return async (req: Request, res: Response) => {
    const { client_id } = req.body ?? {};
    if (!client_id || typeof client_id !== "string") {
      return res.status(400).json({ success: false, error: "client_id (string) requis" });
    }

    const { data: customer, error } = await supabase
      .from("customers")
      .select("id, restaurant_id, name, points_balance")
      .eq("id", client_id)
      .single();
    if (error || !customer) {
      return res.status(404).json({ success: false, error: error?.message ?? "client introuvable" });
    }

    const { data: restaurant, error: restoErr } = await supabase
      .from("restaurants")
      .select("name, card_bg_color, card_text_color, card_label_color, card_description")
      .eq("id", customer.restaurant_id)
      .single();
    if (restoErr || !restaurant) {
      return res.status(404).json({ success: false, error: restoErr?.message ?? "restaurant introuvable" });
    }

    const bgColor = hexToRgb(restaurant.card_bg_color) ?? "rgb(24, 24, 27)";
    const textColor = hexToRgb(restaurant.card_text_color) ?? "rgb(255, 255, 255)";
    const labelColor = hexToRgb(restaurant.card_label_color) ?? "rgb(161, 161, 170)";
    const orgName = (restaurant.name as string | null)?.trim() || ORG_NAME;
    const passDescription = (restaurant.card_description as string | null)?.trim() || `Carte fidélité ${orgName}`;

    try {
      const [wwdr, signerCert, signerKey, icon, icon2x, logo, logo2x] = await Promise.all([
        readFile(path.join(CERTS_DIR, "wwdr.pem")),
        readFile(path.join(CERTS_DIR, "signerCert.pem")),
        readFile(path.join(CERTS_DIR, "signerKey.pem")),
        readFile(path.join(ASSETS_DIR, "icon.png")),
        readFile(path.join(ASSETS_DIR, "icon@2x.png")),
        readFile(path.join(ASSETS_DIR, "logo.png")),
        readFile(path.join(ASSETS_DIR, "logo@2x.png"))
      ]);

      const pass = new PKPass(
        {
          "icon.png": icon,
          "icon@2x.png": icon2x,
          "logo.png": logo,
          "logo@2x.png": logo2x
        },
        {
          wwdr,
          signerCert,
          signerKey,
          signerKeyPassphrase: process.env.APPLE_SIGNER_KEY_PASSPHRASE
        },
        {
          formatVersion: 1,
          passTypeIdentifier: PASS_TYPE_ID,
          teamIdentifier: TEAM_ID,
          organizationName: orgName,
          serialNumber: customer.id,
          description: passDescription,
          foregroundColor: textColor,
          backgroundColor: bgColor,
          labelColor: labelColor
        }
      );

      pass.type = "storeCard";
      pass.headerFields.push({ key: "points", label: "Points", value: customer.points_balance ?? 0 });
      pass.primaryFields.push({ key: "name", label: "Membre", value: customer.name ?? "Client" });
      pass.secondaryFields.push({ key: "resto", label: "Resto", value: orgName });

      pass.setBarcodes({
        message: customer.id,
        format: "PKBarcodeFormatQR",
        messageEncoding: "iso-8859-1",
        altText: customer.id.slice(0, 8)
      });

      const buffer = pass.getAsBuffer();
      res.setHeader("Content-Type", "application/vnd.apple.pkpass");
      res.setHeader("Content-Disposition", `attachment; filename="laboitejaune-${customer.id}.pkpass"`);
      return res.send(buffer);
    } catch (err) {
      const msg = err instanceof Error ? err.message : "erreur inconnue";
      console.error(`[api] /api/wallet/generate failed: ${msg}`);
      return res.status(500).json({ success: false, error: msg });
    }
  };
}
