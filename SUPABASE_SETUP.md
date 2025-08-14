# Configuration Supabase pour Cascade Cagnotte

## Problème actuel
Le mode mock a des problèmes de partage d'état entre les APIs. Supabase offre un stockage plus fiable.

## Étapes de configuration

### 1. Créer un projet Supabase
1. Allez sur [supabase.com](https://supabase.com)
2. Créez un nouveau projet
3. Notez l'URL et la clé anonyme

### 2. Configurer les variables d'environnement
Créez un fichier `.env.local` à la racine du projet :

```bash
# Configuration Supabase
NEXT_PUBLIC_SUPABASE_URL=https://your-project-id.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key_here

# URL de l'application
NEXT_PUBLIC_APP_URL=http://localhost:3000

# Mode de développement (false pour utiliser Supabase)
FORCE_MOCK=false
```

### 3. Appliquer le schéma de base de données
1. Dans votre projet Supabase, allez dans "SQL Editor"
2. Copiez le contenu de `supabase/schema.sql`
3. Exécutez le script

### 4. Tester l'application
1. Redémarrez le serveur de développement
2. Testez la création d'une cagnotte
3. Vérifiez que les données sont bien sauvegardées dans Supabase

## Avantages de Supabase
- ✅ Stockage persistant
- ✅ Pas de problème de partage d'état
- ✅ Base de données PostgreSQL robuste
- ✅ Authentification intégrée (pour plus tard)
- ✅ Temps réel avec les subscriptions

## Mode de fallback
Si Supabase n'est pas configuré, l'application bascule automatiquement en mode mock.
