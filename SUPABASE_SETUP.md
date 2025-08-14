# Configuration Supabase pour Cascade Cagnotte

## Problème actuel
Le mode mock a des problèmes de partage d'état entre les APIs. Supabase offre un stockage plus fiable.

## Configuration actuelle
✅ Variables d'environnement configurées :
- NEXT_PUBLIC_SUPABASE_URL=https://svzrcderxphkthonyefm.supabase.co
- NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...

## Étapes pour activer Supabase

### 1. Appliquer le schéma de base de données
1. Allez sur [supabase.com](https://supabase.com) et connectez-vous
2. Ouvrez votre projet : https://supabase.com/dashboard/project/svzrcderxphkthonyefm
3. Allez dans "SQL Editor" (éditeur SQL)
4. Copiez le contenu complet de `supabase/schema.sql`
5. Exécutez le script

### 2. Vérifier les tables créées
Dans Supabase, allez dans "Table Editor" et vérifiez que vous avez :
- ✅ Table `pots`
- ✅ Table `contributions` 
- ✅ Table `refunds`
- ✅ Indexes créés
- ✅ Fonctions `generate_unique_slug` et `generate_unique_token`

### 3. Activer Supabase
Une fois le schéma appliqué, modifiez `.env.local` :
```bash
# Remplacez cette ligne :
FORCE_MOCK=true
# Par :
FORCE_MOCK=false
```

### 4. Redémarrer et tester
```bash
# Arrêter le serveur
pkill -f "next dev"

# Redémarrer
npm run dev

# Tester
curl -X POST http://localhost:3000/api/pots -H "Content-Type: application/json" -d '{"name": "Test Supabase", "objective_cents": 20000, "fixed_amount_cents": 2000, "ends_at": "2025-12-31T23:59:59.000Z"}'
```

## Avantages de Supabase
- ✅ Stockage persistant
- ✅ Pas de problème de partage d'état
- ✅ Base de données PostgreSQL robuste
- ✅ Authentification intégrée (pour plus tard)
- ✅ Temps réel avec les subscriptions

## Mode de fallback
Si Supabase n'est pas configuré, l'application bascule automatiquement en mode mock.

## Dépannage
Si vous avez des erreurs :
1. Vérifiez que le schéma est bien appliqué
2. Vérifiez les permissions RLS (Row Level Security)
3. Vérifiez que les fonctions sont créées
4. Consultez les logs dans Supabase > Logs
