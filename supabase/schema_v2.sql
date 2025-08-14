-- Cascade Cagnotte V2 Schema
-- Extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- Pots table (étendue pour V2)
CREATE TABLE pots (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  slug VARCHAR(50) UNIQUE NOT NULL,
  name VARCHAR(255) NOT NULL,
  objective_cents INTEGER NOT NULL,
  fixed_amount_cents INTEGER NOT NULL, -- Gardé pour compatibilité V1
  ends_at TIMESTAMP WITH TIME ZONE NOT NULL,
  owner_token VARCHAR(100) UNIQUE NOT NULL,
  pin VARCHAR(10),
  status VARCHAR(20) DEFAULT 'OPEN' CHECK (status IN ('OPEN', 'CLOSED')),
  closed_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  -- Nouvelles colonnes V2
  amount_mode VARCHAR(20) DEFAULT 'FIXED' CHECK (amount_mode IN ('FIXED', 'TIERS', 'FREE')),
  frequency VARCHAR(20) DEFAULT 'ONE_TIME' CHECK (frequency IN ('ONE_TIME', 'RECURRING')),
  tiers JSONB, -- [{"amount_cents": 500, "label": "5€"}, {"amount_cents": 1000, "label": "10€"}, ...]
  solidarity_threshold_cents INTEGER, -- Seuil de solidarité (optionnel)
  solidarity_rate DECIMAL(3,2) DEFAULT 0.1, -- Taux de solidarité (10% par défaut)
  reserve_enabled BOOLEAN DEFAULT FALSE,
  reserve_target_cents INTEGER, -- Cible de la réserve
  reserve_balance_cents INTEGER DEFAULT 0,
  current_cycle INTEGER DEFAULT 1,
  cycle_duration_days INTEGER -- Pour récurrent (30 = mensuel, 90 = trimestriel, etc.)
);

-- Contributions table (étendue pour V2)
CREATE TABLE contributions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  pot_id UUID NOT NULL REFERENCES pots(id) ON DELETE CASCADE,
  amount_cents INTEGER NOT NULL, -- Montant suggéré (compatibilité V1)
  amount_paid_cents INTEGER NOT NULL, -- Montant réellement payé (nouveau)
  email VARCHAR(255),
  display_name VARCHAR(100),
  is_anonymous BOOLEAN DEFAULT FALSE,
  contrib_token VARCHAR(100) UNIQUE NOT NULL,
  stripe_session_id VARCHAR(255),
  paid_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  -- Nouvelles colonnes V2
  cycle_number INTEGER DEFAULT 1,
  tier_selected VARCHAR(50) -- Pour les paliers, garde la référence du palier choisi
);

-- Nouvelle table cycles (pour récurrent)
CREATE TABLE cycles (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  pot_id UUID NOT NULL REFERENCES pots(id) ON DELETE CASCADE,
  cycle_number INTEGER NOT NULL,
  objective_cents INTEGER NOT NULL,
  total_collected_cents INTEGER DEFAULT 0,
  surplus_deficit_cents INTEGER DEFAULT 0,
  reserve_used_cents INTEGER DEFAULT 0,
  reserve_added_cents INTEGER DEFAULT 0,
  contributors_count INTEGER DEFAULT 0,
  started_at TIMESTAMP WITH TIME ZONE NOT NULL,
  ended_at TIMESTAMP WITH TIME ZONE,
  status VARCHAR(20) DEFAULT 'ACTIVE' CHECK (status IN ('ACTIVE', 'CLOSED')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  UNIQUE(pot_id, cycle_number)
);

-- Nouvelle table equity_ledger (équité par contributeur)
CREATE TABLE equity_ledger (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  pot_id UUID NOT NULL REFERENCES pots(id) ON DELETE CASCADE,
  contribution_id UUID NOT NULL REFERENCES contributions(id) ON DELETE CASCADE,
  cycle_number INTEGER NOT NULL,
  balance_cents INTEGER NOT NULL, -- Solde après redistribution (peut être négatif)
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  UNIQUE(contribution_id, cycle_number)
);

-- Refunds table (gardée pour compatibilité)
CREATE TABLE refunds (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  contribution_id UUID NOT NULL REFERENCES contributions(id) ON DELETE CASCADE,
  pot_id UUID NOT NULL REFERENCES pots(id) ON DELETE CASCADE,
  amount_cents INTEGER NOT NULL,
  status VARCHAR(20) DEFAULT 'PENDING' CHECK (status IN ('PENDING', 'PROCESSED', 'FAILED')),
  stripe_refund_id VARCHAR(255),
  processed_at TIMESTAMP WITH TIME ZONE,
  failure_reason TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  -- Nouvelles colonnes V2
  cycle_number INTEGER DEFAULT 1
);

-- Indexes pour performance
CREATE INDEX idx_pots_slug ON pots(slug);
CREATE INDEX idx_pots_owner_token ON pots(owner_token);
CREATE INDEX idx_contributions_pot_id ON contributions(pot_id);
CREATE INDEX idx_contributions_contrib_token ON contributions(contrib_token);
CREATE INDEX idx_contributions_cycle ON contributions(pot_id, cycle_number);
CREATE INDEX idx_cycles_pot_id ON cycles(pot_id);
CREATE INDEX idx_cycles_number ON cycles(pot_id, cycle_number);
CREATE INDEX idx_equity_ledger_pot_id ON equity_ledger(pot_id);
CREATE INDEX idx_equity_ledger_contribution ON equity_ledger(contribution_id);
CREATE INDEX idx_refunds_pot_id ON refunds(pot_id);
CREATE INDEX idx_refunds_contribution_id ON refunds(contribution_id);

-- Fonctions utilitaires
CREATE OR REPLACE FUNCTION generate_unique_slug()
RETURNS VARCHAR(50) AS $$
DECLARE
  new_slug VARCHAR(50);
  counter INTEGER := 0;
BEGIN
  LOOP
    new_slug := encode(gen_random_bytes(6), 'base64');
    new_slug := translate(new_slug, '/+', 'ab');
    new_slug := substring(new_slug from 1 for 8);
    
    IF NOT EXISTS (SELECT 1 FROM pots WHERE slug = new_slug) THEN
      RETURN new_slug;
    END IF;
    
    counter := counter + 1;
    IF counter > 100 THEN
      RAISE EXCEPTION 'Unable to generate unique slug after 100 attempts';
    END IF;
  END LOOP;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION generate_unique_token()
RETURNS VARCHAR(100) AS $$
DECLARE
  new_token VARCHAR(100);
  counter INTEGER := 0;
BEGIN
  LOOP
    new_token := encode(gen_random_bytes(15), 'base64');
    new_token := translate(new_token, '/+', 'ab');
    new_token := substring(new_token from 1 for 20);
    
    IF NOT EXISTS (SELECT 1 FROM pots WHERE owner_token = new_token) THEN
      RETURN new_token;
    END IF;
    
    counter := counter + 1;
    IF counter > 100 THEN
      RAISE EXCEPTION 'Unable to generate unique token after 100 attempts';
    END IF;
  END LOOP;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION generate_contrib_token()
RETURNS VARCHAR(100) AS $$
DECLARE
  new_token VARCHAR(100);
  counter INTEGER := 0;
BEGIN
  LOOP
    new_token := encode(gen_random_bytes(15), 'base64');
    new_token := translate(new_token, '/+', 'ab');
    new_token := substring(new_token from 1 for 20);
    
    IF NOT EXISTS (SELECT 1 FROM contributions WHERE contrib_token = new_token) THEN
      RETURN new_token;
    END IF;
    
    counter := counter + 1;
    IF counter > 100 THEN
      RAISE EXCEPTION 'Unable to generate unique contribution token after 100 attempts';
    END IF;
  END LOOP;
END;
$$ LANGUAGE plpgsql;

-- Données de démonstration V2
INSERT INTO pots (
  slug, 
  name, 
  objective_cents, 
  fixed_amount_cents, 
  ends_at, 
  owner_token, 
  pin, 
  status,
  amount_mode,
  frequency,
  tiers,
  solidarity_threshold_cents,
  solidarity_rate,
  reserve_enabled,
  reserve_target_cents,
  reserve_balance_cents,
  current_cycle,
  cycle_duration_days
) VALUES (
  'demo123',
  'Cagnotte de démonstration V2',
  20000, -- 200€ objectif
  10000, -- 100€ montant fixe
  '2025-12-31T23:59:59.000Z',
  'demo-owner-token-123',
  '1234',
  'OPEN',
  'TIERS',
  'RECURRING',
  '[{"amount_cents": 500, "label": "5€"}, {"amount_cents": 1000, "label": "10€"}, {"amount_cents": 2000, "label": "20€"}, {"amount_cents": 5000, "label": "50€"}]',
  5000, -- 50€ seuil de solidarité
  0.1, -- 10% de solidarité
  TRUE,
  10000, -- 100€ cible de réserve
  0,
  1,
  30 -- Cycle mensuel
) ON CONFLICT (slug) DO NOTHING;

-- Cycle de démonstration
INSERT INTO cycles (
  pot_id,
  cycle_number,
  objective_cents,
  total_collected_cents,
  contributors_count,
  started_at,
  status
) 
SELECT 
  p.id,
  1,
  p.objective_cents,
  0,
  0,
  NOW(),
  'ACTIVE'
FROM pots p WHERE p.slug = 'demo123'
ON CONFLICT (pot_id, cycle_number) DO NOTHING;
