import 'dotenv/config';
import express, { type Express, type Request, type Response } from "express";
import cors from "cors";
import Anthropic from "@anthropic-ai/sdk";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import twilio, { type Twilio } from "twilio";
import { createWalletController } from "./wallet.js";
import { createPublicEnrollController, createPublicRestaurantController } from "./public.js";

let twilioClient: Twilio | null = null;
function getTwilioClient(): Twilio {
  if (twilioClient) return twilioClient;
  const sid = process.env.TWILIO_ACCOUNT_SID;
  const token = process.env.TWILIO_AUTH_TOKEN;
  if (!sid || !token) {
    throw new Error("TWILIO_ACCOUNT_SID / TWILIO_AUTH_TOKEN manquants");
  }
  twilioClient = twilio(sid, token);
  return twilioClient;
}

const SYSTEM_PROMPT =
  "Tu es un expert en marketing pour un restaurant québécois décontracté nommé 'La Boîte Jaune'. " +
  "Ton but est d'écrire un SEUL texto (SMS) percutant (max 150 caractères) pour attirer les clients ce soir. " +
  "Reçois les surplus du chef et crée une offre irrésistible. " +
  "Ton: Énergique, familier, expressions québécoises légères (ex: 'On lâche pas la patate', 'C'est pas pire'). " +
  "Termine toujours par 'Présentez votre Wallet.'. AUCUN emoji.";

export function createServer(): Express {
  const app = express();

  const staticAllowed = new Set<string>([
    "http://localhost:5173",
    "https://restaux-ts-t.vercel.app"
  ]);
  const extraOrigin = process.env.FRONTEND_URL ?? process.env.WEB_BASE_URL;
  if (extraOrigin) staticAllowed.add(extraOrigin);
  const vercelPreview = /^https:\/\/restaux-ts-t-[a-z0-9-]+\.vercel\.app$/;

  app.use(
    cors({
      origin: (origin, cb) => {
        if (!origin) return cb(null, true);
        if (staticAllowed.has(origin)) return cb(null, true);
        if (vercelPreview.test(origin)) return cb(null, true);
        console.warn(`[cors] origine refusée: ${origin}`);
        return cb(new Error(`Origin not allowed: ${origin}`));
      }
    })
  );
  app.use(express.json());

  app.use((req, _res, next) => {
    console.log(`[req] ${req.method} ${req.url}`);
    next();
  });

  const supabaseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !supabaseServiceKey) {
    console.error("MANQUANT:", { url: !!supabaseUrl, key: !!supabaseServiceKey });
    throw new Error("Clés Supabase manquantes");
  }
  const supabase: SupabaseClient = createClient(supabaseUrl, supabaseServiceKey, {
    auth: { persistSession: false, autoRefreshToken: false }
  });

  const anthropic = new Anthropic();
  const model = process.env.CLAUDE_MODEL ?? "claude-sonnet-4-6";

  app.get("/health", (_req, res) => {
    res.json({ status: "ok" });
  });

  app.post("/api/wallet/generate", createWalletController(supabase));
  app.get("/api/public/restaurant/:id", createPublicRestaurantController(supabase));
  app.post("/api/public/enroll", createPublicEnrollController(supabase));

  app.post("/api/generate-promo", async (req: Request, res: Response) => {
    const { audit_id } = req.body ?? {};
    if (!audit_id || typeof audit_id !== "string") {
      return res.status(400).json({ success: false, error: "audit_id (string) requis" });
    }
    console.log(`[api] /api/generate-promo audit_id=${audit_id}`);

    const { data: audit, error: auditErr } = await supabase
      .from("audits")
      .select("id, restaurant_id, response")
      .eq("id", audit_id)
      .single();
    if (auditErr || !audit) {
      return res
        .status(404)
        .json({ success: false, error: auditErr?.message ?? "audit introuvable" });
    }
    if (!audit.response) {
      return res.status(400).json({ success: false, error: "audit sans réponse" });
    }

    let sms = "";
    try {
      const message = await anthropic.messages.create({
        model,
        max_tokens: 300,
        system: SYSTEM_PROMPT,
        messages: [{ role: "user", content: `Surplus du chef: ${audit.response}` }]
      });
      sms = message.content
        .filter((b): b is Anthropic.TextBlock => b.type === "text")
        .map((b) => b.text)
        .join("")
        .trim();
      if (!sms) {
        return res.status(502).json({ success: false, error: "réponse IA vide" });
      }
    } catch (err) {
      if (err instanceof Anthropic.RateLimitError) {
        return res.status(429).json({ success: false, error: "rate limit Anthropic" });
      }
      if (err instanceof Anthropic.APIError) {
        return res
          .status(502)
          .json({ success: false, error: `Anthropic ${err.status}: ${err.message}` });
      }
      const msg = err instanceof Error ? err.message : "erreur inconnue";
      return res.status(500).json({ success: false, error: msg });
    }

    const { data: promo, error: promoErr } = await supabase
      .from("promotions")
      .insert({
        restaurant_id: audit.restaurant_id,
        audit_id: audit.id,
        content_sms: sms,
        content_wallet: sms,
        status: "draft"
      })
      .select("id")
      .single();
    if (promoErr || !promo) {
      return res
        .status(500)
        .json({ success: false, error: `insertion promo échouée: ${promoErr?.message}` });
    }

    const { error: updateErr } = await supabase
      .from("audits")
      .update({ status: "completed", responded_at: new Date().toISOString() })
      .eq("id", audit.id);
    if (updateErr) {
      console.warn(`[api] audit update échoué (non-fatal): ${updateErr.message}`);
    }

    return res.json({ success: true, sms, promotion_id: promo.id });
  });

  app.post("/api/promotions/:id/send", async (req: Request, res: Response) => {
    const id = req.params.id;
    if (!id) {
      return res.status(400).json({ success: false, error: "id requis" });
    }
    console.log(`[api] /api/promotions/${id}/send`);

    const { data: promo, error: promoErr } = await supabase
      .from("promotions")
      .select("id, restaurant_id, content_sms, status")
      .eq("id", id)
      .single();
    if (promoErr || !promo) {
      return res
        .status(404)
        .json({ success: false, error: promoErr?.message ?? "promotion introuvable" });
    }
    if (promo.status === "sent") {
      return res.status(409).json({ success: false, error: "promotion déjà envoyée" });
    }
    if (!promo.content_sms) {
      return res.status(400).json({ success: false, error: "promotion sans contenu SMS" });
    }

    const fromNumber = process.env.TWILIO_PHONE_NUMBER ?? process.env.TWILIO_FROM_NUMBER;
    if (!fromNumber) {
      return res
        .status(500)
        .json({ success: false, error: "TWILIO_PHONE_NUMBER manquant" });
    }

    const { data: customers, error: custErr } = await supabase
      .from("customers")
      .select("id, phone")
      .eq("restaurant_id", promo.restaurant_id)
      .eq("opt_in_sms", true)
      .not("phone", "is", null);
    if (custErr) {
      return res.status(500).json({ success: false, error: custErr.message });
    }

    const recipients = (customers ?? []).filter((c) => !!c.phone);
    if (recipients.length === 0) {
      return res
        .status(400)
        .json({ success: false, error: "aucun client opt-in SMS" });
    }

    let client: Twilio;
    try {
      client = getTwilioClient();
    } catch (err) {
      const msg = err instanceof Error ? err.message : "erreur Twilio";
      return res.status(500).json({ success: false, error: msg });
    }

    const body = `${promo.content_sms}\n\nRépondez STOP pour vous désabonner.`;

    const results = await Promise.allSettled(
      recipients.map((c) =>
        client.messages.create({ to: c.phone as string, from: fromNumber, body })
      )
    );
    let sent = 0;
    let failed = 0;
    results.forEach((r, i) => {
      if (r.status === "fulfilled") {
        sent += 1;
      } else {
        failed += 1;
        const msg = r.reason instanceof Error ? r.reason.message : String(r.reason);
        console.warn(`[twilio] échec envoi customer=${recipients[i]?.id}: ${msg}`);
      }
    });

    const { error: updErr } = await supabase
      .from("promotions")
      .update({ status: "sent", sent_at: new Date().toISOString() })
      .eq("id", id);
    if (updErr) {
      console.warn(`[api] update promo status échoué (non-fatal): ${updErr.message}`);
    }

    return res.json({ success: true, sent, failed, total: recipients.length });
  });

  return app;
}
