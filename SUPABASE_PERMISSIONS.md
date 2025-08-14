# Configuration des permissions Supabase

## Problème actuel
L'API retourne "Erreur lors de la vérification du slug" car les permissions RLS (Row Level Security) bloquent l'accès.

## Solution : Configurer les permissions RLS

### 1. Désactiver RLS temporairement (pour le développement)

Dans votre projet Supabase (https://supabase.com/dashboard/project/svzrcderxphkthonyefm) :

1. **Allez dans "Authentication" > "Policies"**
2. **Pour chaque table (`pots`, `contributions`, `refunds`) :**
   - Cliquez sur la table
   - Désactivez RLS en cliquant sur le toggle "Enable RLS"

### 2. Ou créer des politiques permissives

Si vous voulez garder RLS activé, créez ces politiques dans "SQL Editor" :

```sql
-- Politique pour la table pots (lecture publique)
CREATE POLICY "Enable read access for all users" ON pots
FOR SELECT USING (true);

-- Politique pour la table pots (insertion publique)
CREATE POLICY "Enable insert access for all users" ON pots
FOR INSERT WITH CHECK (true);

-- Politique pour la table contributions (lecture publique)
CREATE POLICY "Enable read access for all users" ON contributions
FOR SELECT USING (true);

-- Politique pour la table contributions (insertion publique)
CREATE POLICY "Enable insert access for all users" ON contributions
FOR INSERT WITH CHECK (true);

-- Politique pour la table refunds (lecture publique)
CREATE POLICY "Enable read access for all users" ON refunds
FOR SELECT USING (true);

-- Politique pour la table refunds (insertion publique)
CREATE POLICY "Enable insert access for all users" ON refunds
FOR INSERT WITH CHECK (true);
```

### 3. Tester l'application

Une fois les permissions configurées :

1. **Modifiez `.env.local` :**
   ```bash
   FORCE_MOCK=false
   ```

2. **Redémarrez le serveur :**
   ```bash
   pkill -f "next dev"
   npm run dev
   ```

3. **Testez l'API :**
   ```bash
   curl -X POST http://localhost:3000/api/pots -H "Content-Type: application/json" -d '{"name": "Test Supabase", "objective_cents": 20000, "fixed_amount_cents": 2000, "ends_at": "2025-12-31T23:59:59.000Z"}'
   ```

## Recommandation pour la production

Pour la production, vous devriez :
1. Garder RLS activé
2. Créer des politiques plus restrictives
3. Implémenter l'authentification utilisateur
4. Limiter l'accès aux données sensibles

## Vérification

Pour vérifier que tout fonctionne :
1. Créez une cagnotte via l'interface web
2. Vérifiez dans Supabase > Table Editor que les données sont bien sauvegardées
3. Testez la récupération de la cagnotte
