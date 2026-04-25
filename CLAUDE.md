# CLAUDE.md — Restaux (War Room Edition)

> Source de vérité pour Claude Code et tout contributeur.
> Si une décision dans le repo contredit ce fichier, ce fichier gagne.
> v5 — pivot War Room, deadline 14 jours — 2026-04-22

---

## 1. Projet en une phrase

Un SaaS **100% français (FR-CA)** pour restos indépendants québécois qui transforme les surplus en revenu : **chaque semaine le système questionne le chef sur ses produits à écouler → l'IA rédige promo + SMS + contenu wallet → envoi en masse à la base fidélisée, matérialisée par une carte Apple/Google Wallet avec points par dollar dépensé.**

## 2. Modèle d'affaires

- **Prix pilote** : facturation **manuelle** (pas de Stripe au MVP). Grille à valider après La Boîte Jaune.
- **Cible pivot** : restaurants indépendants francophones au Québec. L'anglais est reporté après pilote.
- **Proposition de valeur** : « On transforme ton stock en revenu. »

## 3. Pilote

- **Pilote** : **La Boîte Jaune** (menu créole/casse-croûte : ailes de poulet, Mac n Cheese, griot)
- **Deadline absolue** : **14 jours à partir de 2026-04-22** (livraison ciblée **2026-05-06**)
- **Règle** : aucune feature ne rentre si elle n'est pas sur le chemin critique de la démo au pilote

## 4. Scope — ce qui est dedans (14 jours)

### 4.1 Audit proactif — « Option C » (workflow CENTRAL)

1. Chaque semaine (cron), le système insère un enregistrement `audits` avec une question type : *« Bonjour, quels sont vos 2-3 surplus ou produits à écouler cette semaine ? »*
2. Le chef est notifié (SMS ou email, dashboard suffit pour démo) et **répond en texte libre** directement dans le dashboard : *« Ailes de poulet (12 mcx), macaroni au fromage »*
3. L'IA (Claude API, appel direct) lit la réponse + le contexte resto et génère **une promo** avec `content_sms` + `content_wallet`
4. Le chef relit, approuve → la promotion passe `status = 'sent'` → diffusion SMS à la base opt-in
5. Tout est tracé : `audits` → `promotions`

**Pas d'inventaire, pas de scan, pas de ingrédients, pas de par_level.** Le texte libre du chef remplace toute modélisation de stock.

### 4.2 CRM clients
- `customers` : nom, téléphone, email, opt-ins (SMS/email) horodatés, `points_balance` dénormalisé
- Inscription : gérant depuis le dashboard, OU formulaire web public (QR code au comptoir)
- Opt-in explicite tracé dans `consent_log` (CASL/Loi 25 — **non négociable**)
- Pass wallet envoyé automatiquement après inscription

### 4.3 Enregistrement des visites
1. Gérant clique « Enregistrer une visite »
2. Identifie le client par téléphone (auto-complete) ou scan du barcode du pass wallet
3. Saisit le **montant dépensé** (CAD)
4. Système insère une ligne dans `visits` ET une ligne dans `points_transactions` (reason=`visit`, delta=+points) dans la même transaction
5. `customers.points_balance` mis à jour
6. Push wallet → solde à jour sur la carte

### 4.4 Fidélité
- Modèle simple : **points par dollar dépensé**, taux configurable par resto (défaut 1 pt / 1 $ CAD)
- Pas d'expiration, pas de tiers, pas de codes de rédemption uniques
- Rédemption manuelle à la caisse : le gérant clique « Rédemption », saisit la raison, insert dans `points_transactions` avec `delta` négatif

### 4.5 Diffusion
- SMS via Twilio (10DLC enregistré)
- STOP/désabonnement obligatoire dans chaque message
- Email Resend en bonus seulement si temps

### 4.6 Dashboard admin
- Un seul rôle : le gérant (owner du resto)
- Pages essentielles : **Audit du jour, Promotions, Clients, Paramètres**. C'est tout.

## 5. Scope — ce qui est HORS MVP (non négociable)

- ❌ Bilingue / i18next / locales (reporté post-pilote)
- ❌ Stripe / paiements automatiques (facturation manuelle)
- ❌ Scan de code-barres fournisseur / saisie d'inventaire / par_level / ingrédients
- ❌ Décrément automatique du stock par plat / recettes
- ❌ Segmentation individuelle, tiers de fidélité, expiration, codes de rédemption
- ❌ Intégration POS (Toast, Square, Lightspeed)
- ❌ Instagram DM / réseaux sociaux
- ❌ App mobile native (la carte wallet suffit)
- ❌ Multi-location / chaînes
- ❌ Portail client web distinct
- ❌ CrewAI / multi-agent

## 6. Stack technique

| Couche | Technologie | Note |
|---|---|---|
| Monorepo | pnpm workspaces + Turborepo | |
| Frontend | Vite + React + TypeScript | `apps/web` |
| UI | Tailwind CSS + shadcn/ui (stubs minimaux dans `src/components/ui`) | |
| Strings | **Français en dur, pas d'i18n** | |
| Data fetching | TanStack Query | |
| Routing | React Router v6 | |
| Backend | Express + TypeScript | `apps/api` |
| Validation | Zod | shared via `packages/shared` |
| DB + Auth + Storage | Supabase (Postgres + RLS) | `packages/database/supabase` |
| IA | `@anthropic-ai/sdk` — appel direct Claude | |
| SMS | Twilio (10DLC) | |
| Email | Resend (stretch) | |
| Wallet Apple | `passkit-generator` | |
| Wallet Google | Google Wallet REST API | |
| Paiements | **manuel** (post-pilote: Stripe) | |
| Deploy | Railway (API) + Vercel (web) | |
| Observabilité | Sentry + `/health` uptime | |
| Design | pencil.dev `.pen` dans `/design` | |

## 7. Architecture de données

Tables (voir `packages/database/supabase/migrations/20260422120000_initial_schema.sql` pour SQL complet) :

- **`restaurants`** : id, **owner_id → auth.users(id)**, name, timezone, points_per_dollar
- **`audits`** : id, restaurant_id, question, response, status (`pending`|`completed`), asked_at, responded_at
- **`promotions`** : id, restaurant_id, audit_id (FK), content_sms, content_wallet, status (`draft`|`sent`), created_at, sent_at
- **`customers`** : id, restaurant_id, name, phone, email, opt_in_sms(+at), opt_in_email(+at), points_balance, created_at
- **`visits`** : id, restaurant_id, customer_id, amount_cents, registered_by, registered_at
- **`points_transactions`** : id, restaurant_id, customer_id, delta (±), reason (`visit`|`redemption`|`adjustment`), visit_id, note, created_at
- **`consent_log`** : id, customer_id, type (`sms`|`email`), action (`opt_in`|`opt_out`), source, ip, user_agent, timestamp

### Règles
- RLS activée sur **toutes** les tables. Policy : `restaurant_id in (select id from restaurants where owner_id = auth.uid())`.
- `points_balance` est dénormalisé mais **toujours recalculable** via `sum(delta) from points_transactions where customer_id = X`
- **Tout changement de points = insert dans `points_transactions`**, jamais UPDATE direct de `customers.points_balance` sans ligne correspondante
- Tout opt-in/opt-out SMS ou email = insert dans `consent_log` au même moment que la mise à jour du flag sur `customers`

## 8. Compliance — non négociable

1. **CASL** : opt-in explicite traçable (`consent_log`), STOP/désabo dans chaque message
2. **A2P 10DLC** : enregistrement Twilio **avant** premier SMS (1-3 sem d'approbation — démarche J+0)
3. **Apple Developer** : Pass Type ID requis avant sprint wallet (99 USD/an — démarche J+0)
4. **Google Wallet Issuer** : demande soumise J+0
5. **Loi 25** : `consent_log`, politique confidentialité FR, DPO désigné

## 9. Règles pour Claude Code

1. **Aucune feature hors section 4.** Idée qui surgit → `BACKLOG.md`.
2. **Chaque PR cite** la section 4 ou l'usage pilote qui la motive.
3. **Français en dur** côté frontend. Pas d'i18n, pas de `useTranslation`, pas de fichiers `locales/`. Prompts IA en FR.
4. **Pas de mocks cachés** : tout mock derrière un flag `USE_MOCK_*` logué au démarrage.
5. **Tests critical path seulement** : calcul des points (`points_transactions` → `points_balance`), génération wallet pass, prompt IA audit → promo.
6. **Secrets** : jamais commit. `.env.example` à jour.
7. **RLS d'abord** : aucune table avec `restaurant_id` en prod sans policy RLS vérifiée.
8. **Points uniquement via `points_transactions`** : INSERT de la ligne + UPDATE du `points_balance` doivent être dans la même transaction Postgres.
9. **Pas de nouvelle lib sans justification** dans le commit. YAGNI.
10. **Design-first pour toute nouvelle page** : le `.pen` correspondant doit exister dans `/design` avant le code.
11. **Tokens de design dans `design/design-system.pen` uniquement** : couleurs, typo, spacing définis là et propagés au code via variables Tailwind.

## 10. Feuille de route — 14 jours (Sprint unique)

| Jour | Focus | Livrable |
|---|---|---|
| J+0 (aujourd'hui) | Démarches externes + schema | Apple Dev + Google Wallet + Twilio 10DLC **soumis**, migration Supabase appliquée, RLS vérifiée |
| J+1→J+3 | Auth + CRUD resto + CRM clients | Login owner, création resto, ajout client depuis dashboard, formulaire public FR, opt-ins + `consent_log` |
| J+4→J+6 | Option C + IA | Cron hebdo → insertion `audits`, UI réponse texte libre, appel Claude API → promo générée (SMS + wallet) |
| J+7→J+9 | Wallet + visites | Pass Apple + Google générés, enregistrement visite + `points_transactions`, push wallet |
| J+10→J+11 | Campagnes SMS | Envoi Twilio, STOP, journal dans `promotions.status = 'sent'` |
| J+12→J+13 | Durcissement | Bugs, Sentry, `/health`, démo test interne, ajustements visuels |
| **J+14 (2026-05-06)** | **Démo pilote La Boîte Jaune** | **Installation, première promo envoyée en vrai** |

**Règle d'or du sprint** : si au jour J un item du chemin critique déborde, on coupe la feature la moins essentielle (dans l'ordre : email, formulaire public, Google Wallet si Apple marche). **On ne décale pas le J+14.**

## 11. Questions ouvertes

- [ ] Nom du produit + domaine (actuellement "Restaux." de placeholder)
- [ ] Nom légal de l'entité qui facture
- [ ] Montant et modalités de la facture manuelle pilote (validé avant J+7)
- [ ] Tokens `design-system.pen` finaux (couleur primaire : jaune La Boîte Jaune ?)

---

**Règle d'or** : si ce document et ton instinct divergent, pause, relis §1 et §5. Ton instinct veut probablement ajouter une feature. **Tu as 14 jours.** Ne le fais pas.
