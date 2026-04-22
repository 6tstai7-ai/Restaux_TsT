# Restaurant SaaS

> SaaS bilingue (FR/EN) de gestion de stock + marketing pour restaurants indépendants.
> Transforme les surplus de stock en promos ciblées via une carte de fidélité Apple/Google Wallet.

**⚠️ Avant de toucher au code, lire `CLAUDE.md` à la racine. C'est la source de vérité.**

---

## Structure du monorepo

```
restaurant-saas/
├── apps/
│   ├── web/                    # Frontend Vite + React (dashboard admin + formulaire public)
│   └── api/                    # Backend Express + TS (webhooks, intégrations, IA)
├── packages/
│   ├── shared/                 # Types + schémas Zod partagés
│   ├── database/               # Migrations Supabase + types générés
│   └── config/                 # Configs partagées (eslint, tsconfig)
├── design/                     # Fichiers Pencil (.pen) — source de vérité visuelle
├── docs/                       # Documentation technique
├── CLAUDE.md                   # Source de vérité du projet
├── README.md                   # Ce fichier
├── BACKLOG.md                  # Idées parkées pour phase 2
├── .env.example                # Template variables d'environnement
├── .gitignore
├── package.json                # Racine pnpm workspace
├── pnpm-workspace.yaml
└── turbo.json                  # Configuration Turborepo (cache de builds)
```

## Stack

- **Monorepo** : pnpm workspaces + Turborepo
- **Frontend** : Vite + React 18 + TypeScript + Tailwind + shadcn/ui + TanStack Query + react-i18next
- **Backend** : Express + TypeScript + Zod
- **Base de données + Auth** : Supabase (Postgres + RLS)
- **Design** : pencil.dev (extension VS Code, fichiers `.pen` versionnés dans `/design`)
- **IA** : Anthropic SDK (Claude API, appels directs)
- **SMS** : Twilio (10DLC)
- **Email** : Resend
- **Wallet** : passkit-generator (Apple) + Google Wallet REST API
- **Paiements** : Stripe
- **Déploiement** : Railway

## Prérequis

- Node.js >= 20
- pnpm >= 9 (`npm install -g pnpm`)
- VS Code + extension **Pencil** (pour le workflow de design)
- Compte Supabase (projet créé, clés en main)
- Compte Anthropic (clé API)
- Compte Twilio (pour sprint 4+)
- Compte Resend (pour sprint 4+)
- Compte Apple Developer (pour sprint 2, 99 USD/an)
- Compte Google Wallet Issuer (pour sprint 2)

## Démarrage

```bash
# 1. Cloner le repo
git clone <url>
cd restaurant-saas

# 2. Installer les dépendances
pnpm install

# 3. Copier le template d'environnement
cp .env.example .env
# Puis remplir les vraies valeurs dans .env

# 4. Lancer les migrations Supabase
pnpm --filter @app/database migrate

# 5. Démarrer en dev
pnpm dev
```

## Commandes utiles

| Commande | Description |
|---|---|
| `pnpm dev` | Démarre web + api en parallèle |
| `pnpm build` | Build tous les packages |
| `pnpm test` | Lance les tests sur tous les packages |
| `pnpm lint` | Lint tout le repo |
| `pnpm --filter @app/web dev` | Démarre seulement le frontend |
| `pnpm --filter @app/api dev` | Démarre seulement le backend |

## Workflow de design avec pencil.dev

Le design vit dans `/design/*.pen` et est versionné avec le code.

### Setup
1. Installer l'extension **Pencil** dans VS Code (VS Code Marketplace → rechercher "Pencil")
2. S'authentifier avec Claude Code CLI si pas déjà fait : `claude auth`
3. Ouvrir un fichier `.pen` dans VS Code → le canvas s'ouvre

### Conventions
- **`design-system.pen`** : source de vérité des tokens (couleurs, typo, spacing). Tout changement ici doit se refléter dans `apps/web/tailwind.config.ts`.
- **Un `.pen` par écran majeur** : pas un gros fichier avec 15 écrans. Un écran = un fichier.
- **Les exports de code atterrissent dans `apps/web/src/`** : dans `components/` pour les composants réutilisables, dans `pages/` pour les écrans complets.
- **Pas de nouvel écran dans `apps/web` sans `.pen` correspondant** (règle 10 du `CLAUDE.md`).
- **Bilingue dès le design** : prévoir les labels en FR et EN (les textes français sont généralement les plus longs, valider que la mise en page tient).

### Workflow type
1. Ouvrir `/design/stock.pen` dans VS Code
2. `Cmd+K` (ou `Ctrl+K`) → décrire l'écran ou le changement en langage naturel
3. Reviewer le rendu sur canvas, ajuster
4. Export → "Export this screen as a React component in apps/web/src/pages/Stock.tsx using shadcn/ui, Tailwind, TanStack Query, and react-i18next for labels"
5. Claude Code écrit le fichier
6. Brancher la logique métier (queries Supabase, state, handlers)

### Règle de temps
**Max 4h de design avant d'écrire le premier composant codé.** Si tu dépasses, tu procrastines. Le pilote ne signera pas à cause d'un beau design, il signera à cause de la valeur.

## Philosophie

- **Scope-first** : aucune feature hors `CLAUDE.md` section 4
- **Pilote-driven** : le pilote dicte les priorités, pas les idées cool
- **Design-first par écran** : `.pen` avant code (règle 10)
- **Bilingue dès jour 1** : i18n est un pré-requis, pas un add-on
- **KISS** : appel direct Claude > orchestration multi-agents. Points-par-dollar simple > tiers Bronze/Argent. Carte wallet > app native.
- **Compliance intégrée** : CASL, Loi 25, 10DLC ne sont pas optionnels

## Documentation

- `CLAUDE.md` — spécification complète du projet (scope, stack, modèle de données, roadmap)
- `BACKLOG.md` — idées parkées pour plus tard
- `design/README.md` — conventions d'utilisation des fichiers Pencil
- `docs/` — documentation technique détaillée (à remplir au fur et à mesure)

## Licence

Propriétaire — tous droits réservés.
