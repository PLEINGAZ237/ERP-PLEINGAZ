-- ============================================================
-- MODULE COMMERCIAL — PHASE 1 : DONNÉES DE BASE
-- À exécuter dans le SQL Editor de Supabase
-- ============================================================

-- ── 1. Enrichir la table MAGASINS ──────────────────────────
ALTER TABLE magasins
  ADD COLUMN IF NOT EXISTS agence_id uuid REFERENCES agences(id),
  ADD COLUMN IF NOT EXISTS est_centre_enfuteur boolean DEFAULT false;

COMMENT ON COLUMN magasins.est_centre_enfuteur IS 'MAGZI et DIBAMBA sont des centres enfûteurs avec prix spécifiques';

-- ── 2. Enrichir la table CAISSES ───────────────────────────
ALTER TABLE caisses
  ADD COLUMN IF NOT EXISTS agence_id uuid REFERENCES agences(id);

-- ── 3. Table ARTICLES ──────────────────────────────────────
CREATE TABLE IF NOT EXISTS articles (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  nom text NOT NULL,
  categorie text NOT NULL CHECK (categorie IN ('GPL', 'CONSIGNE', 'ACCESSOIRE')),
  poids_tonne numeric(10,6) DEFAULT 0,
  statut text DEFAULT 'actif' CHECK (statut IN ('actif', 'bloque')),
  created_at timestamptz DEFAULT now()
);

COMMENT ON COLUMN articles.poids_tonne IS 'Poids en tonnes métriques pour le calcul de tonnage (ex: GPL 12.5KG = 0.0125 TM)';

-- Insertion des articles de base
INSERT INTO articles (nom, categorie, poids_tonne) VALUES
  -- GPL
  ('GPL 50KG',       'GPL',        0.050000),
  ('GPL 12.5KG',     'GPL',        0.012500),
  ('GPL 6KG',        'GPL',        0.006000),
  -- Consignes
  ('CONSIGNE 50KG',  'CONSIGNE',   0),
  ('CONSIGNE 12.5KG','CONSIGNE',   0),
  ('CONSIGNE 6KG',   'CONSIGNE',   0),
  -- Accessoires
  ('PLAQUE EN ACIER', 'ACCESSOIRE', 0),
  ('PLAQUE EN VERRE', 'ACCESSOIRE', 0),
  ('DET 12.5KG',      'ACCESSOIRE', 0),
  ('DET 6KG',         'ACCESSOIRE', 0),
  ('DET 50KG',        'ACCESSOIRE', 0),
  ('FLEXIBLE 1.5m',   'ACCESSOIRE', 0),
  ('BRULEUR',         'ACCESSOIRE', 0),
  ('CAMPING 190g',    'ACCESSOIRE', 0),
  ('CAMPING 230g',    'ACCESSOIRE', 0),
  ('CAMPING 450g',    'ACCESSOIRE', 0),
  ('PISTOLET',        'ACCESSOIRE', 0)
ON CONFLICT DO NOTHING;

-- ── 4. Table VÉHICULES ─────────────────────────────────────
CREATE TABLE IF NOT EXISTS vehicules (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  nom text,
  immatriculation text NOT NULL UNIQUE,
  agence_id uuid REFERENCES agences(id),
  statut text DEFAULT 'actif' CHECK (statut IN ('actif', 'bloque')),
  created_at timestamptz DEFAULT now()
);

COMMENT ON TABLE vehicules IS 'Véhicules de livraison — considérés comme magasins temporaires une fois chargés';

-- ── 5. Table CATÉGORIES CLIENTS ────────────────────────────
CREATE TABLE IF NOT EXISTS categories_clients (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  nom text NOT NULL UNIQUE,
  statut text DEFAULT 'actif' CHECK (statut IN ('actif', 'bloque')),
  created_at timestamptz DEFAULT now()
);

INSERT INTO categories_clients (nom) VALUES
  ('Grossiste'),
  ('Semi-grossiste'),
  ('Détaillant'),
  ('Client comptoir')
ON CONFLICT (nom) DO NOTHING;

-- ── 6. Table PRIX PAR CATÉGORIE ────────────────────────────
-- Prix général pour chaque article par catégorie de client
CREATE TABLE IF NOT EXISTS prix_categories (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  categorie_client_id uuid NOT NULL REFERENCES categories_clients(id) ON DELETE CASCADE,
  article_id uuid NOT NULL REFERENCES articles(id) ON DELETE CASCADE,
  prix numeric(12,2) NOT NULL CHECK (prix >= 0),
  created_at timestamptz DEFAULT now(),
  UNIQUE (categorie_client_id, article_id)
);

COMMENT ON TABLE prix_categories IS 'Prix par défaut de chaque article pour chaque catégorie de client';

-- ── 7. Table PRIX CENTRE ENFÛTEUR ─────────────────────────
-- Prix spécifiques pour les ventes directes aux centres enfûteurs (MAGZI, DIBAMBA)
CREATE TABLE IF NOT EXISTS prix_centre_enfuteur (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  article_id uuid NOT NULL REFERENCES articles(id) ON DELETE CASCADE UNIQUE,
  prix numeric(12,2) NOT NULL CHECK (prix >= 0),
  created_at timestamptz DEFAULT now()
);

-- Insertion des prix centre enfûteur pour le GPL
INSERT INTO prix_centre_enfuteur (article_id, prix)
SELECT id, CASE nom
  WHEN 'GPL 50KG'   THEN 22800
  WHEN 'GPL 12.5KG' THEN 5700
  WHEN 'GPL 6KG'    THEN 2850
END
FROM articles
WHERE nom IN ('GPL 50KG', 'GPL 12.5KG', 'GPL 6KG')
ON CONFLICT (article_id) DO NOTHING;

-- ── 8. RLS (Row Level Security) ────────────────────────────
ALTER TABLE articles ENABLE ROW LEVEL SECURITY;
ALTER TABLE vehicules ENABLE ROW LEVEL SECURITY;
ALTER TABLE categories_clients ENABLE ROW LEVEL SECURITY;
ALTER TABLE prix_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE prix_centre_enfuteur ENABLE ROW LEVEL SECURITY;

-- Policies de lecture pour les utilisateurs authentifiés
CREATE POLICY "articles_select" ON articles FOR SELECT TO authenticated USING (true);
CREATE POLICY "articles_all" ON articles FOR ALL TO authenticated USING (true) WITH CHECK (true);

CREATE POLICY "vehicules_select" ON vehicules FOR SELECT TO authenticated USING (true);
CREATE POLICY "vehicules_all" ON vehicules FOR ALL TO authenticated USING (true) WITH CHECK (true);

CREATE POLICY "categories_clients_select" ON categories_clients FOR SELECT TO authenticated USING (true);
CREATE POLICY "categories_clients_all" ON categories_clients FOR ALL TO authenticated USING (true) WITH CHECK (true);

CREATE POLICY "prix_categories_select" ON prix_categories FOR SELECT TO authenticated USING (true);
CREATE POLICY "prix_categories_all" ON prix_categories FOR ALL TO authenticated USING (true) WITH CHECK (true);

CREATE POLICY "prix_centre_enfuteur_select" ON prix_centre_enfuteur FOR SELECT TO authenticated USING (true);
CREATE POLICY "prix_centre_enfuteur_all" ON prix_centre_enfuteur FOR ALL TO authenticated USING (true) WITH CHECK (true);
