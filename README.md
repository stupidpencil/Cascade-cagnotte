# Cascade Cagnotte

Une application de cagnottes contributives adaptatives construite avec Next.js 14, Supabase et Stripe.

## 🎯 Fonctionnalités

- **Cagnottes adaptatives** : Le montant suggéré s'ajuste automatiquement selon le nombre de participants
- **Paiements sécurisés** : Intégration Stripe pour les paiements
- **Temps réel** : Mise à jour en direct des contributions via Supabase Realtime
- **Interface moderne** : Design responsive avec TailwindCSS
- **QR Codes** : Partage facile via QR codes
- **Administration** : Liens privés pour gérer les cagnottes

## 🏗️ Architecture

- **Frontend** : Next.js 14 (App Router) + TailwindCSS
- **Backend** : API Routes Next.js
- **Base de données** : Supabase (PostgreSQL)
- **Paiements** : Stripe
- **Temps réel** : Supabase Realtime
- **Hébergement** : Vercel

## 🚀 Installation

### Prérequis

- Node.js 18+
- Compte Supabase
- Compte Stripe

### 1. Cloner le projet

```bash
git clone <repository-url>
cd cascade-cagnotte
npm install
```

### 2. Configuration Supabase

1. Créez un projet Supabase
2. Exécutez le script SQL dans `supabase/schema.sql`
3. Activez les Realtime pour les tables `pots` et `contributions`

### 3. Configuration Stripe

1. Créez un compte Stripe
2. Récupérez vos clés API (test et production)
3. Configurez un webhook pointant vers `/api/webhooks/stripe`

### 4. Variables d'environnement

Copiez `env.example` vers `.env.local` et configurez :

```bash
# Supabase
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key

# Stripe
STRIPE_SECRET_KEY=sk_test_...
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_test_...
STRIPE_WEBHOOK_SECRET=whsec_...

# Application
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

### 5. Lancer en développement

```bash
npm run dev
```

L'application sera disponible sur `http://localhost:3000`

## 📦 Déploiement sur Vercel

### 1. Préparer le déploiement

```bash
npm run build
```

### 2. Déployer sur Vercel

1. Connectez votre repository GitHub à Vercel
2. Configurez les variables d'environnement dans Vercel
3. Déployez !

### 3. Configuration du webhook Stripe

Dans votre dashboard Stripe, configurez le webhook :
- URL : `https://your-domain.vercel.app/api/webhooks/stripe`
- Événements : `checkout.session.completed`, `checkout.session.expired`

## 🗄️ Structure de la base de données

### Table `pots`
- `id` : UUID (clé primaire)
- `slug` : TEXT (unique, URL publique)
- `name` : TEXT (nom de la cagnotte)
- `target_amount_cents` : INTEGER (objectif en centimes)
- `initial_amount_cents` : INTEGER (montant initial)
- `floor_cents` : INTEGER (plancher)
- `cap_cents` : INTEGER (plafond)
- `end_date` : TIMESTAMP (date de fin)
- `owner_token` : TEXT (token d'administration)
- `pin` : TEXT (code PIN optionnel)
- `status` : TEXT ('active' | 'closed')
- `collected_amount_cents` : INTEGER (montant collecté)

### Table `contributions`
- `id` : UUID (clé primaire)
- `pot_id` : UUID (référence vers pots)
- `amount_cents` : INTEGER (montant en centimes)
- `email` : TEXT (email du contributeur)
- `status` : TEXT ('pending' | 'confirmed')
- `contrib_token` : TEXT (token de contribution)
- `stripe_session_id` : TEXT (ID session Stripe)

## 🔧 API Endpoints

### `POST /api/pots`
Crée une nouvelle cagnotte

### `GET /api/pots/[slug]`
Récupère les informations publiques d'une cagnotte

### `POST /api/pots/[slug]/contribute`
Crée une contribution et génère un lien de paiement

### `POST /api/pots/[slug]/close`
Clôture une cagnotte (nécessite le token propriétaire)

### `POST /api/webhooks/stripe`
Webhook Stripe pour confirmer les paiements

## 🧮 Logique de calcul

La fonction `getSuggestedAmount` calcule le montant suggéré :

1. **Avant l'objectif** : Montant initial fixe
2. **Après l'objectif** : `max(plancher, min(plafond, total_collecté / (participants + 1)))`

## 🎨 Pages

- `/` : Page d'accueil
- `/create` : Création de cagnotte
- `/c/[slug]` : Page publique de la cagnotte
- `/c/[slug]/thanks` : Page de remerciements
- `/c/[slug]?owner=TOKEN` : Vue administrateur

## 🔒 Sécurité

- Tokens uniques pour l'administration
- Codes PIN optionnels
- Validation des données côté serveur
- Webhooks Stripe signés

## 🧪 Mode développement

Pour tester sans Stripe, activez le mode mock :

```bash
STRIPE_MOCK=true npm run dev
```

## 📝 Licence

MIT

## 🤝 Contribution

Les contributions sont les bienvenues ! N'hésitez pas à ouvrir une issue ou une pull request.
