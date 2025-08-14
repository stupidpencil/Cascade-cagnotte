-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Enable pgcrypto for secure random generation
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- Pots table
CREATE TABLE pots (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  slug VARCHAR(50) UNIQUE NOT NULL,
  name VARCHAR(255) NOT NULL,
  objective_cents INTEGER NOT NULL, -- Objectif en centimes
  fixed_amount_cents INTEGER NOT NULL, -- Montant fixe en centimes
  ends_at TIMESTAMP WITH TIME ZONE NOT NULL,
  owner_token VARCHAR(100) UNIQUE NOT NULL,
  pin VARCHAR(10), -- Code PIN optionnel pour l'admin
  status VARCHAR(20) DEFAULT 'OPEN' CHECK (status IN ('OPEN', 'CLOSED')),
  closed_at TIMESTAMP WITH TIME ZONE, -- Date de clôture
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Contributions table
CREATE TABLE contributions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  pot_id UUID NOT NULL REFERENCES pots(id) ON DELETE CASCADE,
  amount_cents INTEGER NOT NULL, -- Toujours égal à fixed_amount_cents
  email VARCHAR(255),
  display_name VARCHAR(100), -- Nom à afficher publiquement
  is_anonymous BOOLEAN DEFAULT FALSE, -- Si la contribution est anonyme
  contrib_token VARCHAR(100) UNIQUE NOT NULL,
  stripe_session_id VARCHAR(255),
  paid_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Refunds table
CREATE TABLE refunds (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  contribution_id UUID NOT NULL REFERENCES contributions(id) ON DELETE CASCADE,
  pot_id UUID NOT NULL REFERENCES pots(id) ON DELETE CASCADE,
  amount_cents INTEGER NOT NULL, -- Montant remboursé en centimes
  status VARCHAR(20) DEFAULT 'PENDING' CHECK (status IN ('PENDING', 'PROCESSED', 'FAILED')),
  stripe_refund_id VARCHAR(255), -- ID du remboursement Stripe
  processed_at TIMESTAMP WITH TIME ZONE,
  failure_reason TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes for performance
CREATE INDEX idx_pots_slug ON pots(slug);
CREATE INDEX idx_pots_owner_token ON pots(owner_token);
CREATE INDEX idx_contributions_pot_id ON contributions(pot_id);
CREATE INDEX idx_contributions_contrib_token ON contributions(contrib_token);
CREATE INDEX idx_refunds_pot_id ON refunds(pot_id);
CREATE INDEX idx_refunds_contribution_id ON refunds(contribution_id);

-- Function to generate unique slug
CREATE OR REPLACE FUNCTION generate_unique_slug()
RETURNS VARCHAR(50) AS $$
DECLARE
  new_slug VARCHAR(50);
  counter INTEGER := 0;
BEGIN
  LOOP
    -- Generate a random 8-character slug
    new_slug := encode(gen_random_bytes(6), 'base64');
    new_slug := translate(new_slug, '/+', 'ab'); -- Replace URL-unsafe characters
    new_slug := substring(new_slug from 1 for 8);
    
    -- Check if slug already exists
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

-- Function to generate unique owner token
CREATE OR REPLACE FUNCTION generate_unique_token()
RETURNS VARCHAR(100) AS $$
DECLARE
  new_token VARCHAR(100);
  counter INTEGER := 0;
BEGIN
  LOOP
    -- Generate a random 20-character token
    new_token := encode(gen_random_bytes(15), 'base64');
    new_token := translate(new_token, '/+', 'ab'); -- Replace URL-unsafe characters
    new_token := substring(new_token from 1 for 20);
    
    -- Check if token already exists
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

-- Function to generate unique contribution token
CREATE OR REPLACE FUNCTION generate_contrib_token()
RETURNS VARCHAR(100) AS $$
DECLARE
  new_token VARCHAR(100);
  counter INTEGER := 0;
BEGIN
  LOOP
    -- Generate a random 20-character token
    new_token := encode(gen_random_bytes(15), 'base64');
    new_token := translate(new_token, '/+', 'ab'); -- Replace URL-unsafe characters
    new_token := substring(new_token from 1 for 20);
    
    -- Check if token already exists
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

-- Demo data for testing
INSERT INTO pots (
  slug, 
  name, 
  objective_cents, 
  fixed_amount_cents, 
  ends_at, 
  owner_token, 
  pin, 
  status
) VALUES (
  'demo123',
  'Cagnotte de démonstration',
  20000, -- 200€ objectif
  10000, -- 100€ montant fixe
  '2025-12-31T23:59:59.000Z',
  'demo-owner-token-123',
  '1234',
  'OPEN'
) ON CONFLICT (slug) DO NOTHING;

-- Demo contributions
INSERT INTO contributions (
  pot_id,
  amount_cents,
  email,
  display_name,
  is_anonymous,
  contrib_token,
  stripe_session_id,
  paid_at
) 
SELECT 
  p.id,
  p.fixed_amount_cents,
  'demo1@example.com',
  'Alice',
  FALSE,
  'demo-contrib-1',
  'mock_session_1',
  NOW() - INTERVAL '2 hours'
FROM pots p WHERE p.slug = 'demo123'
ON CONFLICT (contrib_token) DO NOTHING;

INSERT INTO contributions (
  pot_id,
  amount_cents,
  email,
  display_name,
  is_anonymous,
  contrib_token,
  stripe_session_id,
  paid_at
) 
SELECT 
  p.id,
  p.fixed_amount_cents,
  'demo2@example.com',
  NULL,
  TRUE,
  'demo-contrib-2',
  'mock_session_2',
  NOW() - INTERVAL '1 hour'
FROM pots p WHERE p.slug = 'demo123'
ON CONFLICT (contrib_token) DO NOTHING;
