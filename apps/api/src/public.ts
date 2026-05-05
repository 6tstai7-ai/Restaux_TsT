import type { Request, Response } from "express";
import type { SupabaseClient } from "@supabase/supabase-js";

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export function createPublicRestaurantController(supabase: SupabaseClient) {
  return async (req: Request, res: Response) => {
    const idParam = req.params.id;
    const id = typeof idParam === "string" ? idParam : "";
    if (!id || !UUID_RE.test(id)) {
      return res.status(400).json({ success: false, error: "id invalide" });
    }
    const { data, error } = await supabase
      .from("restaurants")
      .select("id, name, card_bg_color, card_text_color, card_label_color, card_description")
      .eq("id", id)
      .single();
    if (error || !data) {
      return res.status(404).json({ success: false, error: error?.message ?? "restaurant introuvable" });
    }
    return res.json({ success: true, restaurant: data });
  };
}

export function createPublicEnrollController(supabase: SupabaseClient) {
  return async (req: Request, res: Response) => {
    const { restaurant_id, name, phone, opt_in_sms } = req.body ?? {};

    if (!restaurant_id || typeof restaurant_id !== "string" || !UUID_RE.test(restaurant_id)) {
      return res.status(400).json({ success: false, error: "restaurant_id (uuid) requis" });
    }
    const cleanName = typeof name === "string" ? name.trim() : "";
    const cleanPhone = typeof phone === "string" ? phone.trim() : "";
    if (!cleanName || !cleanPhone) {
      return res.status(400).json({ success: false, error: "nom et téléphone requis" });
    }
    if (opt_in_sms !== true) {
      return res.status(400).json({
        success: false,
        error: "consentement SMS explicite requis"
      });
    }
    const optIn = true;

    const { data: resto, error: restoErr } = await supabase
      .from("restaurants")
      .select("id")
      .eq("id", restaurant_id)
      .single();
    if (restoErr || !resto) {
      return res.status(404).json({ success: false, error: "restaurant introuvable" });
    }

    const now = new Date().toISOString();
    const { data: customer, error: custErr } = await supabase
      .from("customers")
      .insert({
        restaurant_id,
        name: cleanName,
        phone: cleanPhone,
        opt_in_sms: optIn,
        opt_in_sms_at: optIn ? now : null
      })
      .select("id")
      .single();
    if (custErr || !customer) {
      const msg = custErr?.message ?? "insertion client échouée";
      const isDup = /duplicate|unique/i.test(msg);
      return res.status(isDup ? 409 : 500).json({
        success: false,
        error: isDup ? "ce numéro est déjà inscrit" : msg
      });
    }

    const forwarded = req.headers["x-forwarded-for"];
    const ipRaw = Array.isArray(forwarded) ? forwarded[0] : (forwarded ?? req.socket.remoteAddress ?? null);
    const ip = typeof ipRaw === "string" ? ipRaw.split(",")[0]!.trim() || null : null;
    const userAgent = typeof req.headers["user-agent"] === "string" ? req.headers["user-agent"] : null;

    const { error: consentErr } = await supabase.from("consent_log").insert({
      customer_id: customer.id,
      type: "sms",
      action: optIn ? "opt_in" : "opt_out",
      source: "public_enrollment",
      ip,
      user_agent: userAgent
    });
    if (consentErr) {
      console.warn(`[api] consent_log insert échoué: ${consentErr.message}`);
      const { error: rollbackErr } = await supabase
        .from("customers")
        .delete()
        .eq("id", customer.id);
      if (rollbackErr) {
        console.warn(`[api] rollback customer échoué: ${rollbackErr.message}`);
      }
      return res.status(500).json({
        success: false,
        error: "consentement non enregistré, inscription annulée"
      });
    }

    return res.json({ success: true, customer_id: customer.id });
  };
}
