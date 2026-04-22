# Design

Ce dossier contient les fichiers de design Pencil (`.pen`) de l'application.

Les `.pen` sont du JSON versionné dans Git. Ils sont **la source de vérité visuelle du produit**.

## Fichiers à créer

- `design-system.pen` — tokens (couleurs, typographie, spacing). Source unique.
- `dashboard.pen` — page d'accueil admin, KPIs + recommandations IA
- `stock.pen` — liste d'ingrédients, CRUD, modal scan code-barres
- `clients.pen` — liste clients, modal enregistrement visite (téléphone/scan + montant)
- `campaigns.pen` — liste des promos, création campagne, preview SMS/email
- `public-signup.pen` — formulaire public bilingue FR/EN (accessible par QR code resto)

## Règles

- **Un écran = un fichier `.pen`** (pas de méga-fichiers)
- **Tokens uniquement dans `design-system.pen`** — les autres fichiers référencent les variables
- **Avant de coder un nouvel écran dans `apps/web`**, le `.pen` doit exister et refléter la version voulue (règle 10 du `CLAUDE.md`)
- **Bilingue dès le design** : prévoir les labels en FR et EN (les textes français sont généralement les plus longs — valider que la mise en page tient avec la version FR)
- **Max 4h de design avant le premier composant codé** (règle anti-procrastination)

## Setup

1. Installer l'extension **Pencil** dans VS Code (Marketplace → "Pencil")
2. Auth Claude Code : `claude auth`
3. Ouvrir un fichier `.pen` dans VS Code → le canvas s'ouvre automatiquement

## Générer du code depuis un `.pen`

Dans VS Code avec Pencil installé :

1. Ouvrir le fichier `.pen` (ex. `stock.pen`)
2. `Cmd+K` (macOS) ou `Ctrl+K` (Windows/Linux) → prompt AI
3. Exemple de prompt :Export this screen as a React component in
apps/web/src/pages/Stock.tsx using shadcn/ui,
Tailwind, TanStack Query for data fetching, and
react-i18next for all user-facing labels.
4. Claude Code écrit le fichier dans le bon chemin
5. Brancher la logique métier (queries Supabase, state, handlers)

## Ordre recommandé de création

1. **`design-system.pen`** en premier — sans tokens, tout le reste est arbitraire
2. **`dashboard.pen`** — pour valider la navigation globale et la sidebar
3. **`stock.pen`** — le premier écran métier à coder au sprint 1
4. Le reste dans l'ordre de la roadmap du `CLAUDE.md` section 10

## Synchronisation avec Tailwind

Quand tu changes un token dans `design-system.pen` (ex. couleur primaire), tu dois aussi mettre à jour `apps/web/tailwind.config.ts` pour que les variables CSS correspondent. Claude Code peut faire cette synchronisation si tu le demandes explicitement : Update apps/web/tailwind.config.ts to match the tokens
defined in design/design-system.pen.