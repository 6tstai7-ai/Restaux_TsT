# CLAUDE.md — Restaurant SaaS (Working Title)

> Ce fichier est la **source de vérité** pour Claude Code et tout contributeur.
> Si une décision dans le repo contredit ce fichier, ce fichier gagne.
> v4 — intégration pencil.dev — 2026-04-21

---

## 1. Projet en une phrase

Un SaaS bilingue (FR/EN) pour restaurants indépendants qui transforme les données de stock en revenu : **scan de code-barres à la réception → agent IA détecte les surplus → génère des promos → envoyées par SMS/email à la base de clients fidélisés, matérialisée par une carte Apple/Google Wallet avec points par dollar dépensé.**

## 2. Modèle d'affaires

- **Prix de départ** : 800 $ CAD setup + 500 $ CAD/mois (à valider avec pilote)
- **Cible** : restaurants indépendants francophones et anglophones au Québec (étendue Canada en phase 2)
- **Proposition de valeur** : « On transforme ton stock en revenu. » Pas un POS, pas un CRM générique, un outil de récupération de marge + rétention client.

## 3. Pilote

- **Statut** : 1 pilote prêt, identifié
- **Objectif pilote** : définir un critère mesurable avec lui (ex. réduire le gaspillage de X%, augmenter visites répétées de Y%) avant d'écrire du code
- **Règle absolue** : aucune feature ne rentre dans le sprint courant si elle n'est pas demandée ou validée par le pilote

## 4. Scope — ce qui est dedans

### 4.1 Inventaire
- Saisie manuelle OU scan de code-barres sur emballage fournisseur (EAN/UPC)
- Niveaux de stock, seuil par_level par ingrédient
- Historique des comptages

### 4.2 Agent IA de recommandations
- Analyse du stock en continu
- Détection : surplus, péremption à risque, sous-rotation
- Génère des suggestions d'actions (promos, plats du jour) dans le dashboard
- Le gérant approuve → devient une campagne

### 4.3 Moteur de promotions
- Création manuelle OU déclenchée par l'IA (avec approbation gérant)
- Chaque promo a : titre, description, durée, canal(aux)
- **Diffusion en masse à tous les clients opt-in** (pas de segmentation individuelle au MVP)

### 4.4 Programme de fidélité
- **Modèle** : points par dollar dépensé
- **Taux configurable par resto** (défaut : 1 point / 1 $ CAD)
- **Récompenses définies par le resto** : table `rewards` avec nom + coût en points
- **Carte virtuelle** : Apple Wallet + Google Wallet, affiche solde en temps réel via push updates
- **Pas de tiers/statuts** au MVP (phase 2)
- **Pas d'expiration de points** au MVP

### 4.5 Enregistrement des visites
1. Gérant ouvre le dashboard admin
2. Clique « Enregistrer une visite »
3. Identifie le client par : **numéro de téléphone** (recherche auto-complete) OU **scan du code-barres** du pass wallet
4. Saisit le **montant dépensé** (CAD)
5. Système calcule `points = floor(montant × points_per_dollar)` et les ajoute
6. Push notification vers le pass wallet du client → solde mis à jour
7. Transaction loguée dans `visits`

### 4.6 Récompenses / rédemption
- Solde visible au moment de l'enregistrement d'une visite
- Bouton « Échanger une récompense » → sélection dans rewards actives → points débités → log dans `redemptions`
- Pas de code unique au MVP : le gérant applique la réduction manuellement à la caisse

### 4.7 CRM client
- Base clients : téléphone, email, opt-ins SMS/email (horodatés), solde points, dépense à vie, nombre de visites
- Inscription : **2 chemins**
  1. Gérant ajoute depuis le dashboard (collecte verbale)
  2. Formulaire web public bilingue (QR code sur table/comptoir)
- Opt-in SMS et email explicites et tracés (CASL)
- Pass wallet envoyé automatiquement par SMS ou email après inscription

### 4.8 Diffusion des campagnes
- SMS via Twilio (10DLC enregistré)
- Email via Resend
- Gérant choisit le canal (ou les deux)
- Mécanisme STOP/désabonnement obligatoire
- Journal dans `campaigns` avec sent/delivered/failed

### 4.9 Dashboard admin
- Un seul rôle au MVP : le gérant
- Pages : Stock, Recommandations IA, Promotions, Clients, Campagnes, Paramètres

## 5. Scope — ce qui est dehors (explicitement)

- ❌ Segmentation individuelle des promos (« Marie aime le poisson »)
- ❌ Tiers de fidélité (Bronze/Argent/Or)
- ❌ Expiration des points
- ❌ Codes de rédemption uniques
- ❌ Intégration POS (Toast, Square, Lightspeed) — phase 2
- ❌ Recettes / décrément automatique du stock par plat — phase 2
- ❌ Instagram DM / réseaux sociaux — phase 2
- ❌ App mobile native — la carte wallet suffit
- ❌ Multi-location / chaînes — MVP un resto = un compte
- ❌ Portail client web distinct — la carte wallet EST l'interface client
- ❌ CrewAI / multi-agent orchestration — appel direct Claude API suffit au MVP

## 6. Stack technique — décisions finales

| Couche | Technologie | Note |
|---|---|---|
| Monorepo | pnpm workspaces + Turborepo | |
| Frontend | Vite + React + TypeScript | `apps/web` |
| UI | Tailwind CSS + shadcn/ui | |
| **Design** | **pencil.dev (extension VS Code + MCP avec Claude Code)** | **Fichiers `.pen` dans `/design`, versionnés** |
| Data fetching | TanStack Query | |
| Routing | React Router v6 | |
| i18n | react-i18next (FR par défaut) | |
| Backend | Express + TypeScript | `apps/api` |
| Validation | Zod | shared via `packages/shared` |
| DB + Auth + Storage | Supabase (Postgres + RLS) | |
| IA | `@anthropic-ai/sdk` — appel direct Claude | |
| Scan code-barres | `@zxing/browser` | côté frontend |
| SMS | Twilio (10DLC) | |
| Email | Resend | |
| Wallet Apple | `passkit-generator` | |
| Wallet Google | Google Wallet REST API | |
| Paiements | Stripe (Subscriptions + Invoices) | |
| Deploy | Railway (API) + Vercel ou Railway (web) | |
| Observabilité | Sentry + `/health` uptime check | |

## 7. Architecture de données

### Tables principales
- **`restaurants`** : id, name, locale (`fr-CA`|`en-CA`), timezone, stripe_customer_id, plan_status, points_per_dollar (default 1), branding_json
- **`users`** : id, restaurant_id, email, role (`admin`)
- **`ingredients`** : id, restaurant_id, name, unit, ean_barcode, par_level, cost_per_unit
- **`inventory_counts`** : id, restaurant_id, ingredient_id, quantity, counted_at, source (`manual`|`scan`)
- **`recommendations`** : id, restaurant_id, type (`surplus`|`expiring`|`slow_moving`), ingredient_id, payload_json, status, created_at
- **`promotions`** : id, restaurant_id, triggered_by_recommendation_id, title, description, discount_type, discount_value, starts_at, ends_at, status
- **`customers`** : id, restaurant_id, phone, email, first_name, opt_in_sms, opt_in_sms_at, opt_in_email, opt_in_email_at, points_balance, lifetime_spend_cents, visit_count, wallet_pass_serial, wallet_platform, created_at
- **`visits`** : id, restaurant_id, customer_id, amount_cents, points_awarded, registered_by_user_id, registered_at, method (`phone_lookup`|`barcode_scan`)
- **`rewards`** : id, restaurant_id, name, description, points_cost, active
- **`redemptions`** : id, restaurant_id, customer_id, reward_id, points_debited, redeemed_at, registered_by_user_id
- **`campaigns`** : id, restaurant_id, promotion_id, channel, target_audience, sent_count, delivered_count, failed_count, started_at, finished_at
- **`consent_log`** : id, customer_id, type, action, source, ip, user_agent, timestamp — **obligatoire CASL/Loi 25**

### Règles
- RLS activée sur toutes les tables avec `restaurant_id`
- `points_balance` et `lifetime_spend_cents` dénormalisés mais **toujours recalculables** depuis `visits` + `redemptions`
- Tout changement de points passe par une insertion dans `visits` ou `redemptions`, jamais modification directe

## 8. Compliance — non négociable

1. **CASL** : opt-in explicite traçable (`consent_log`), STOP/désabo dans chaque message
2. **A2P 10DLC** : enregistrement marque + campagne Twilio avant premier SMS (1-3 semaines d'approbation)
3. **Apple Developer** : compte + Pass Type ID avant sprint wallet (99 USD/an)
4. **Google Wallet Issuer** : application soumise tôt
5. **Loi 25 (Québec)** : `consent_log`, politique de confidentialité bilingue, DPO désigné

## 9. Règles pour Claude Code

1. **Ne jamais coder une feature non listée dans la section 4.** Idée qui surgit → `BACKLOG.md`.
2. **Chaque PR cite** la section du pilote qui l'a demandée OU la section 4.
3. **Bilingue dès le départ** : aucun string en dur côté frontend. Tout via i18n. Prompts IA prennent `locale`.
4. **Pas de mocks cachés** : tout mock derrière un flag `USE_MOCK_*` logué au démarrage.
5. **Tests critical path seulement** au MVP : calcul des points, génération wallet pass, logique IA recommandations.
6. **Secrets** : jamais commit. `.env.example` à jour à chaque variable.
7. **RLS d'abord** : aucune table avec `restaurant_id` en prod sans policy RLS vérifiée.
8. **Points jamais modifiés directement** : toujours via `visits` ou `redemptions` + update transactionnel.
9. **Pas de nouvelle lib sans justification** dans le commit message. YAGNI.
10. **Design-first pour toute nouvelle page** : avant de coder un nouvel écran dans `apps/web`, le `.pen` correspondant doit exister dans `/design` et refléter la version finale voulue.
11. **Tokens de design dans `design/design-system.pen` uniquement** : couleurs, typographie, spacing sont définis là et propagés au code via variables Tailwind. Pas de valeurs magiques hardcodées dans les composants.

## 10. Feuille de route — 6 semaines

| Semaine | Focus | Livrable |
|---|---|---|
| 0 | Setup repo + meeting pilote + démarches admin + design-system.pen | Scaffolding monorepo, Apple Dev + Google Wallet Issuer soumis, Twilio 10DLC soumis, meeting pilote fait, tokens de design posés |
| 1 | Auth + Stock | Login admin Supabase, CRUD ingrédients, scan code-barres, i18n en place, `stock.pen` codé |
| 2 | Clients + Fidélité + Wallet | Flow inscription, enregistrement visite, génération pass Apple + Google, points affichés |
| 3 | Agent IA + onboarding pilote | Détection surplus → suggestion promo, pilote installé, **première facture manuelle** |
| 4 | Campagnes SMS + Email | Premier envoi via promo IA, mécanisme STOP, log CASL |
| 5 | Itération + tests critical path + 2e pilote pitché | Bugs fix, tests stock+wallet+IA, 3-5 démos faites |
| 6 | Productisation | Stripe subscription, landing bilingue, Sentry, prix validé |

## 11. Questions ouvertes

- [ ] Nom du produit + domaine
- [ ] Nom légal de l'entité qui facture
- [ ] Prix validé par pilote
- [ ] Définir les tokens de `design-system.pen` (couleurs primaire/secondaire, typo) — bloquant pour cohérence visuelle

---

**Règle d'or** : si ce document et ton instinct divergent, pause, relis la section 1 et la section 5. Ton instinct veut probablement ajouter une feature. Ne le fais pas.
