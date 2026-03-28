-- ============================================================
-- MODULE COMMERCIAL — PHASE 2 : CLIENTS ET TARIFICATION
-- À exécuter dans le SQL Editor de Supabase (après Phase 1)
-- ============================================================

-- ── 1. Table CLIENTS ───────────────────────────────────────
CREATE TABLE IF NOT EXISTS clients (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  nom_interne text NOT NULL,
  nom_responsable text,
  telephone text,
  email text,
  localisation text,
  ville text,
  agence_id uuid REFERENCES agences(id),
  categorie_client_id uuid NOT NULL REFERENCES categories_clients(id),
  statut text DEFAULT 'actif' CHECK (statut IN ('actif', 'bloque')),
  notes text,
  created_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_clients_agence ON clients(agence_id);
CREATE INDEX IF NOT EXISTS idx_clients_categorie ON clients(categorie_client_id);

COMMENT ON TABLE clients IS 'Chaque client appartient à une agence et une catégorie. Peut être servi par n''importe quelle agence.';

-- ── 2. Table PRIX SPÉCIFIQUES PAR CLIENT ───────────────────
-- Surcharge du prix catégorie pour un client et un article donné
CREATE TABLE IF NOT EXISTS prix_clients (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  client_id uuid NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
  article_id uuid NOT NULL REFERENCES articles(id) ON DELETE CASCADE,
  prix numeric(12,2) NOT NULL CHECK (prix >= 0),
  created_at timestamptz DEFAULT now(),
  UNIQUE (client_id, article_id)
);

COMMENT ON TABLE prix_clients IS 'Prix spécifique par client et article. Si absent, le prix de sa catégorie s''applique.';

-- ── 3. Fonction pour obtenir le prix effectif d'un article pour un client ──
CREATE OR REPLACE FUNCTION get_prix_client(p_client_id uuid, p_article_id uuid)
RETURNS numeric AS $$
DECLARE
  v_prix numeric;
  v_cat_id uuid;
BEGIN
  -- 1. Chercher prix spécifique client
  SELECT prix INTO v_prix
  FROM prix_clients
  WHERE client_id = p_client_id AND article_id = p_article_id;

  IF FOUND THEN RETURN v_prix; END IF;

  -- 2. Sinon, prix de la catégorie du client
  SELECT categorie_client_id INTO v_cat_id
  FROM clients WHERE id = p_client_id;

  SELECT prix INTO v_prix
  FROM prix_categories
  WHERE categorie_client_id = v_cat_id AND article_id = p_article_id;

  RETURN COALESCE(v_prix, 0);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ── 4. RLS ─────────────────────────────────────────────────
ALTER TABLE clients ENABLE ROW LEVEL SECURITY;
ALTER TABLE prix_clients ENABLE ROW LEVEL SECURITY;

CREATE POLICY "clients_select" ON clients FOR SELECT TO authenticated USING (true);
CREATE POLICY "clients_all" ON clients FOR ALL TO authenticated USING (true) WITH CHECK (true);

CREATE POLICY "prix_clients_select" ON prix_clients FOR SELECT TO authenticated USING (true);
CREATE POLICY "prix_clients_all" ON prix_clients FOR ALL TO authenticated USING (true) WITH CHECK (true);
