-- ============================================================
-- ERP PLEINGAZ — SQL COMPLET (avec modifications du 01/04/2026)
-- Module Commercial — Toutes les phases + corrections + fix
-- 
-- Si Supabase timeout, exécutez en 3 parties :
--   PARTIE 1 (ligne 1 → "PARTIE 2")
--   PARTIE 2 ("PARTIE 2" → "PARTIE 3")
--   PARTIE 3 ("PARTIE 3" → fin)
-- ============================================================


-- === PARTIE 1 : TABLES (Phases 1-6) ===

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

-- ============================================================
-- MODULE COMMERCIAL — PHASE 3 : VENTE
-- À exécuter dans le SQL Editor de Supabase (après Phase 1 & 2)
-- ============================================================

-- ── 1. Nouveaux rôles pour le module commercial ────────────
INSERT INTO roles (nom) VALUES
  ('COMM'),
  ('RESP_AGENCE'),
  ('VENTE'),
  ('MAGASIN')
ON CONFLICT DO NOTHING;

-- ── 2. Module commercial dans la table modules ─────────────
INSERT INTO modules (code, nom) VALUES
  ('commercial', 'Module Commercial')
ON CONFLICT DO NOTHING;

-- ── 3. Table ITINÉRAIRES ───────────────────────────────────
CREATE TABLE IF NOT EXISTS itineraires (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  nom text NOT NULL,
  zone text,
  ville text,
  agence_id uuid REFERENCES agences(id),
  statut text DEFAULT 'actif' CHECK (statut IN ('actif', 'bloque')),
  created_at timestamptz DEFAULT now()
);

ALTER TABLE itineraires ENABLE ROW LEVEL SECURITY;
CREATE POLICY "itineraires_auth" ON itineraires FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- ── 4. Table COMMANDES ─────────────────────────────────────
CREATE TABLE IF NOT EXISTS commandes (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  numero text UNIQUE,
  client_id uuid NOT NULL REFERENCES clients(id),
  agence_id uuid REFERENCES agences(id),
  cree_par uuid REFERENCES auth.users(id),
  statut text DEFAULT 'BROUILLON' CHECK (statut IN (
    'BROUILLON', 'A_FACTURER', 'FACTUREE', 'LIVREE', 'ANNULEE'
  )),
  notes text,
  created_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_commandes_client ON commandes(client_id);
CREATE INDEX IF NOT EXISTS idx_commandes_statut ON commandes(statut);

ALTER TABLE commandes ENABLE ROW LEVEL SECURITY;
CREATE POLICY "commandes_auth" ON commandes FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- ── 5. Table LIGNES DE COMMANDE ────────────────────────────
CREATE TABLE IF NOT EXISTS lignes_commande (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  commande_id uuid NOT NULL REFERENCES commandes(id) ON DELETE CASCADE,
  article_id uuid NOT NULL REFERENCES articles(id),
  quantite integer NOT NULL CHECK (quantite > 0),
  created_at timestamptz DEFAULT now()
);

ALTER TABLE lignes_commande ENABLE ROW LEVEL SECURITY;
CREATE POLICY "lignes_commande_auth" ON lignes_commande FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- ── 6. Table FACTURES ──────────────────────────────────────
CREATE TABLE IF NOT EXISTS factures (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  numero text UNIQUE,
  commande_id uuid NOT NULL REFERENCES commandes(id),
  client_id uuid NOT NULL REFERENCES clients(id),
  magasin_id uuid REFERENCES magasins(id),
  facture_par uuid REFERENCES auth.users(id),
  montant_total numeric(14,2) NOT NULL DEFAULT 0,
  montant_paye numeric(14,2) NOT NULL DEFAULT 0,
  montant_reste numeric(14,2) NOT NULL DEFAULT 0,
  type_reglement text DEFAULT 'total' CHECK (type_reglement IN ('total', 'partiel')),
  statut text DEFAULT 'EN_ATTENTE' CHECK (statut IN (
    'EN_ATTENTE', 'PAYEE', 'PARTIELLE', 'DETTE_EN_ATTENTE_DG', 'DETTE_VALIDEE', 'DETTE_REJETEE', 'ANNULEE'
  )),
  pdf_url text,
  created_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_factures_commande ON factures(commande_id);
CREATE INDEX IF NOT EXISTS idx_factures_client ON factures(client_id);
CREATE INDEX IF NOT EXISTS idx_factures_statut ON factures(statut);

ALTER TABLE factures ENABLE ROW LEVEL SECURITY;
CREATE POLICY "factures_auth" ON factures FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- ── 7. Table LIGNES DE FACTURE ─────────────────────────────
CREATE TABLE IF NOT EXISTS lignes_facture (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  facture_id uuid NOT NULL REFERENCES factures(id) ON DELETE CASCADE,
  article_id uuid NOT NULL REFERENCES articles(id),
  quantite integer NOT NULL CHECK (quantite > 0),
  prix_unitaire numeric(12,2) NOT NULL,
  montant numeric(14,2) NOT NULL,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE lignes_facture ENABLE ROW LEVEL SECURITY;
CREATE POLICY "lignes_facture_auth" ON lignes_facture FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- ── 8. Table RÈGLEMENTS ────────────────────────────────────
CREATE TABLE IF NOT EXISTS reglements (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  facture_id uuid NOT NULL REFERENCES factures(id) ON DELETE CASCADE,
  mode text NOT NULL CHECK (mode IN ('cash', 'cheque', 'banque')),
  montant numeric(14,2) NOT NULL CHECK (montant > 0),
  banque_id uuid REFERENCES banques(id),
  reference_cheque text,
  justificatif_url text,
  encaisse_par uuid REFERENCES auth.users(id),
  caisse_id uuid REFERENCES caisses(id),
  est_caisse_temporaire boolean DEFAULT false,
  created_at timestamptz DEFAULT now()
);

COMMENT ON COLUMN reglements.est_caisse_temporaire IS 'true si encaissé par quelqu''un d''autre que la caissière principale';

ALTER TABLE reglements ENABLE ROW LEVEL SECURITY;
CREATE POLICY "reglements_auth" ON reglements FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- ── 9. Table BONS DE LIVRAISON ─────────────────────────────
CREATE TABLE IF NOT EXISTS bons_livraison (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  numero text UNIQUE,
  facture_id uuid NOT NULL REFERENCES factures(id),
  magasin_id uuid NOT NULL REFERENCES magasins(id),
  livre_par uuid REFERENCES auth.users(id),
  statut text DEFAULT 'A_LIVRER' CHECK (statut IN ('A_LIVRER', 'LIVRE', 'PARTIEL')),
  created_at timestamptz DEFAULT now(),
  livre_at timestamptz
);

ALTER TABLE bons_livraison ENABLE ROW LEVEL SECURITY;
CREATE POLICY "bons_livraison_auth" ON bons_livraison FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- ── 10. Table SORTIES VÉHICULE ─────────────────────────────
CREATE TABLE IF NOT EXISTS sorties_vehicule (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  numero text UNIQUE,
  vehicule_id uuid NOT NULL REFERENCES vehicules(id),
  vendeur_id uuid NOT NULL REFERENCES auth.users(id),
  initie_par uuid REFERENCES auth.users(id),
  agence_id uuid REFERENCES agences(id),
  magasin_id uuid REFERENCES magasins(id),
  itineraire_id uuid REFERENCES itineraires(id),
  hors_ville boolean DEFAULT false,
  statut text DEFAULT 'EN_COURS' CHECK (statut IN (
    'EN_COURS', 'VENDU', 'CLOTURE'
  )),
  notes text,
  created_at timestamptz DEFAULT now(),
  cloture_at timestamptz
);

ALTER TABLE sorties_vehicule ENABLE ROW LEVEL SECURITY;
CREATE POLICY "sorties_vehicule_auth" ON sorties_vehicule FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- ── 11. Table STOCK VÉHICULE (magasin temporaire) ──────────
CREATE TABLE IF NOT EXISTS stock_vehicule (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  sortie_id uuid NOT NULL REFERENCES sorties_vehicule(id) ON DELETE CASCADE,
  article_id uuid NOT NULL REFERENCES articles(id),
  quantite_chargee integer NOT NULL DEFAULT 0,
  quantite_vendue integer NOT NULL DEFAULT 0,
  quantite_restante integer NOT NULL DEFAULT 0,
  created_at timestamptz DEFAULT now(),
  UNIQUE (sortie_id, article_id)
);

ALTER TABLE stock_vehicule ENABLE ROW LEVEL SECURITY;
CREATE POLICY "stock_vehicule_auth" ON stock_vehicule FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- ── 12. Table CAISSE TEMPORAIRE COMMERCIAL ─────────────────
CREATE TABLE IF NOT EXISTS caisse_commercial (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  sortie_id uuid NOT NULL REFERENCES sorties_vehicule(id) ON DELETE CASCADE,
  montant_total numeric(14,2) NOT NULL DEFAULT 0,
  montant_verse numeric(14,2) NOT NULL DEFAULT 0,
  montant_restant numeric(14,2) NOT NULL DEFAULT 0,
  statut text DEFAULT 'OUVERT' CHECK (statut IN ('OUVERT', 'VERSE', 'CLOTURE')),
  created_at timestamptz DEFAULT now()
);

ALTER TABLE caisse_commercial ENABLE ROW LEVEL SECURITY;
CREATE POLICY "caisse_commercial_auth" ON caisse_commercial FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- ── 13. Fonctions utilitaires ──────────────────────────────

-- Générer un numéro de commande (CMD-YYYYMMDD-XXXX)
CREATE OR REPLACE FUNCTION generate_numero_commande()
RETURNS text AS $$
DECLARE
  v_date text;
  v_seq integer;
BEGIN
  v_date := to_char(now(), 'YYYYMMDD');
  SELECT COALESCE(MAX(
    CAST(SPLIT_PART(numero, '-', 3) AS integer)
  ), 0) + 1 INTO v_seq
  FROM commandes
  WHERE numero LIKE 'CMD-' || v_date || '-%';
  RETURN 'CMD-' || v_date || '-' || LPAD(v_seq::text, 4, '0');
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Générer un numéro de facture (FAC-YYYYMMDD-XXXX)
CREATE OR REPLACE FUNCTION generate_numero_facture()
RETURNS text AS $$
DECLARE
  v_date text;
  v_seq integer;
BEGIN
  v_date := to_char(now(), 'YYYYMMDD');
  SELECT COALESCE(MAX(
    CAST(SPLIT_PART(numero, '-', 3) AS integer)
  ), 0) + 1 INTO v_seq
  FROM factures
  WHERE numero LIKE 'FAC-' || v_date || '-%';
  RETURN 'FAC-' || v_date || '-' || LPAD(v_seq::text, 4, '0');
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Générer un numéro de BL (BL-YYYYMMDD-XXXX)
CREATE OR REPLACE FUNCTION generate_numero_bl()
RETURNS text AS $$
DECLARE
  v_date text;
  v_seq integer;
BEGIN
  v_date := to_char(now(), 'YYYYMMDD');
  SELECT COALESCE(MAX(
    CAST(SPLIT_PART(numero, '-', 3) AS integer)
  ), 0) + 1 INTO v_seq
  FROM bons_livraison
  WHERE numero LIKE 'BL-' || v_date || '-%';
  RETURN 'BL-' || v_date || '-' || LPAD(v_seq::text, 4, '0');
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Vérifier la règle consigne : pas de consigne sans GPL du même type
CREATE OR REPLACE FUNCTION valider_commande_consigne(p_commande_id uuid)
RETURNS json AS $$
DECLARE
  v_consigne record;
  v_gpl_qty integer;
  v_type text;
BEGIN
  FOR v_consigne IN
    SELECT lc.quantite, a.nom
    FROM lignes_commande lc
    JOIN articles a ON a.id = lc.article_id
    WHERE lc.commande_id = p_commande_id AND a.categorie = 'CONSIGNE'
  LOOP
    v_type := REPLACE(v_consigne.nom, 'CONSIGNE ', '');
    SELECT COALESCE(SUM(lc.quantite), 0) INTO v_gpl_qty
    FROM lignes_commande lc
    JOIN articles a ON a.id = lc.article_id
    WHERE lc.commande_id = p_commande_id
      AND a.categorie = 'GPL'
      AND a.nom LIKE '%' || v_type;

    IF v_gpl_qty < v_consigne.quantite THEN
      RETURN json_build_object(
        'valide', false,
        'erreur', 'Consigne ' || v_type || ' : il faut au moins ' || v_consigne.quantite || ' GPL ' || v_type || ' (actuellement ' || v_gpl_qty || ')'
      );
    END IF;
  END LOOP;

  RETURN json_build_object('valide', true);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Déterminer le prix applicable selon les règles métier
CREATE OR REPLACE FUNCTION get_prix_facture(
  p_client_id uuid,
  p_article_id uuid,
  p_magasin_id uuid,
  p_quantite_gpl_12 integer DEFAULT 0
)
RETURNS numeric AS $$
DECLARE
  v_prix numeric;
  v_est_centre boolean;
  v_agence_nom text;
  v_cat_comptoir_id uuid;
  v_cat_detail_id uuid;
BEGIN
  SELECT est_centre_enfuteur INTO v_est_centre FROM magasins WHERE id = p_magasin_id;
  SELECT a.nom INTO v_agence_nom FROM magasins m JOIN agences a ON a.id = m.agence_id WHERE m.id = p_magasin_id;

  -- Si centre enfûteur et article GPL → prix enfûteur
  IF v_est_centre THEN
    SELECT prix INTO v_prix FROM prix_centre_enfuteur WHERE article_id = p_article_id;
    IF FOUND THEN
      -- Seuil client comptoir (< 5 GPL 12.5KG au centre)
      IF p_quantite_gpl_12 < 5 AND p_quantite_gpl_12 > 0 THEN
        SELECT id INTO v_cat_comptoir_id FROM categories_clients WHERE nom = 'Client comptoir' LIMIT 1;
        IF v_cat_comptoir_id IS NOT NULL THEN
          SELECT pc.prix INTO v_prix FROM prix_categories pc WHERE pc.categorie_client_id = v_cat_comptoir_id AND pc.article_id = p_article_id;
        END IF;
      END IF;
      IF v_prix IS NOT NULL THEN RETURN v_prix; END IF;
    END IF;
  END IF;

  -- Seuils quantité pour véhicules agence (prix détail forcé)
  IF v_agence_nom ILIKE '%MAGZI%' AND p_quantite_gpl_12 < 30 AND p_quantite_gpl_12 > 0 THEN
    SELECT id INTO v_cat_detail_id FROM categories_clients WHERE nom = 'Détaillant' LIMIT 1;
    IF v_cat_detail_id IS NOT NULL THEN
      SELECT pc.prix INTO v_prix FROM prix_categories pc WHERE pc.categorie_client_id = v_cat_detail_id AND pc.article_id = p_article_id;
      IF v_prix IS NOT NULL THEN RETURN v_prix; END IF;
    END IF;
  END IF;

  IF v_agence_nom ILIKE '%DIBAMBA%' AND p_quantite_gpl_12 < 20 AND p_quantite_gpl_12 > 0 THEN
    SELECT id INTO v_cat_detail_id FROM categories_clients WHERE nom = 'Détaillant' LIMIT 1;
    IF v_cat_detail_id IS NOT NULL THEN
      SELECT pc.prix INTO v_prix FROM prix_categories pc WHERE pc.categorie_client_id = v_cat_detail_id AND pc.article_id = p_article_id;
      IF v_prix IS NOT NULL THEN RETURN v_prix; END IF;
    END IF;
  END IF;

  -- Sinon, prix client spécifique ou catégorie
  RETURN get_prix_client(p_client_id, p_article_id);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================
-- ACTIVATION MODULE COMMERCIAL
-- Crée le département, les services et lie les rôles au module
-- À exécuter après les scripts 001, 002 et 003
-- ============================================================

-- 1. Département Commercial
INSERT INTO departements (nom)
SELECT 'Commercial'
WHERE NOT EXISTS (SELECT 1 FROM departements WHERE nom = 'Commercial');

-- 2. Module commercial
INSERT INTO modules (code, nom)
VALUES ('commercial', 'Module Commercial')
ON CONFLICT DO NOTHING;

-- 3. Rôles
INSERT INTO roles (nom) VALUES ('COMM') ON CONFLICT DO NOTHING;
INSERT INTO roles (nom) VALUES ('RESP_AGENCE') ON CONFLICT DO NOTHING;
INSERT INTO roles (nom) VALUES ('VENTE') ON CONFLICT DO NOTHING;
INSERT INTO roles (nom) VALUES ('CAISSE') ON CONFLICT DO NOTHING;
INSERT INTO roles (nom) VALUES ('MAGASIN') ON CONFLICT DO NOTHING;

-- 4. Créer les services et lier aux rôles/modules
DO $$
DECLARE
  v_dept_id uuid;
  v_mod_comm uuid;
  v_mod_besoins uuid;
  v_sid uuid;
BEGIN
  SELECT id INTO v_dept_id FROM departements WHERE nom = 'Commercial' LIMIT 1;
  SELECT id INTO v_mod_comm FROM modules WHERE code = 'commercial' LIMIT 1;
  SELECT id INTO v_mod_besoins FROM modules WHERE code = 'besoins' LIMIT 1;

  -- Service COMM
  IF NOT EXISTS (SELECT 1 FROM services WHERE nom = 'COMM' AND departement_id = v_dept_id) THEN
    INSERT INTO services (nom, departement_id) VALUES ('COMM', v_dept_id) RETURNING id INTO v_sid;
    INSERT INTO service_role_module (service_id, role_id, module_id)
      SELECT v_sid, r.id, v_mod_comm FROM roles r WHERE r.nom = 'COMM';
    IF v_mod_besoins IS NOT NULL THEN
      INSERT INTO service_role_module (service_id, role_id, module_id)
        SELECT v_sid, r.id, v_mod_besoins FROM roles r WHERE r.nom = 'emet_besoin';
    END IF;
  END IF;

  -- Service RESP AGENCE
  IF NOT EXISTS (SELECT 1 FROM services WHERE nom = 'RESP AGENCE' AND departement_id = v_dept_id) THEN
    INSERT INTO services (nom, departement_id) VALUES ('RESP AGENCE', v_dept_id) RETURNING id INTO v_sid;
    INSERT INTO service_role_module (service_id, role_id, module_id)
      SELECT v_sid, r.id, v_mod_comm FROM roles r WHERE r.nom = 'RESP_AGENCE';
  END IF;

  -- Service VENTE
  IF NOT EXISTS (SELECT 1 FROM services WHERE nom = 'VENTE' AND departement_id = v_dept_id) THEN
    INSERT INTO services (nom, departement_id) VALUES ('VENTE', v_dept_id) RETURNING id INTO v_sid;
    INSERT INTO service_role_module (service_id, role_id, module_id)
      SELECT v_sid, r.id, v_mod_comm FROM roles r WHERE r.nom = 'VENTE';
  END IF;

  -- Service CAISSE COMMERCIALE
  IF NOT EXISTS (SELECT 1 FROM services WHERE nom = 'CAISSE COMMERCIALE' AND departement_id = v_dept_id) THEN
    INSERT INTO services (nom, departement_id) VALUES ('CAISSE COMMERCIALE', v_dept_id) RETURNING id INTO v_sid;
    INSERT INTO service_role_module (service_id, role_id, module_id)
      SELECT v_sid, r.id, v_mod_comm FROM roles r WHERE r.nom = 'CAISSE';
    IF v_mod_besoins IS NOT NULL THEN
      INSERT INTO service_role_module (service_id, role_id, module_id)
        SELECT v_sid, r.id, v_mod_besoins FROM roles r WHERE r.nom = 'decaissement';
    END IF;
  END IF;

  -- Service MAGASIN
  IF NOT EXISTS (SELECT 1 FROM services WHERE nom = 'MAGASIN' AND departement_id = v_dept_id) THEN
    INSERT INTO services (nom, departement_id) VALUES ('MAGASIN', v_dept_id) RETURNING id INTO v_sid;
    INSERT INTO service_role_module (service_id, role_id, module_id)
      SELECT v_sid, r.id, v_mod_comm FROM roles r WHERE r.nom = 'MAGASIN';
  END IF;

  -- DG : ajouter module commercial aux services DG existants
  INSERT INTO service_role_module (service_id, role_id, module_id)
    SELECT DISTINCT srm.service_id, srm.role_id, v_mod_comm
    FROM service_role_module srm
    JOIN roles r ON r.id = srm.role_id
    WHERE r.nom = 'DG' AND srm.module_id != v_mod_comm
  ON CONFLICT DO NOTHING;

END $$;

-- ============================================================
-- PHASE 4 : GESTION DE CAISSE ET STOCK
-- À exécuter après la Phase 3
-- ============================================================


-- ═══════════════════════════════════════════════════════════
-- BLOC 1 : GESTION DE CAISSE
-- ═══════════════════════════════════════════════════════════

-- Journée de caisse (ouverture / clôture)
CREATE TABLE IF NOT EXISTS journees_caisse (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  caisse_id uuid NOT NULL REFERENCES caisses(id),
  date_journee date NOT NULL DEFAULT CURRENT_DATE,
  solde_ouverture numeric(14,2) NOT NULL DEFAULT 0,
  solde_cloture numeric(14,2),
  total_encaissements numeric(14,2) DEFAULT 0,
  total_decaissements numeric(14,2) DEFAULT 0,
  total_versements numeric(14,2) DEFAULT 0,
  total_transferts_in numeric(14,2) DEFAULT 0,
  total_transferts_out numeric(14,2) DEFAULT 0,
  ecart numeric(14,2) DEFAULT 0,
  statut text DEFAULT 'OUVERTE' CHECK (statut IN ('OUVERTE', 'CLOTUREE')),
  ouverte_par uuid NOT NULL REFERENCES profiles(id),
  cloturee_par uuid REFERENCES profiles(id),
  notes text,
  created_at timestamptz DEFAULT now(),
  UNIQUE (caisse_id, date_journee)
);

ALTER TABLE journees_caisse ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "journees_caisse_all" ON journees_caisse;
CREATE POLICY "journees_caisse_all" ON journees_caisse FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- Mouvements de caisse
CREATE TABLE IF NOT EXISTS mouvements_caisse (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  journee_caisse_id uuid NOT NULL REFERENCES journees_caisse(id),
  type text NOT NULL CHECK (type IN ('encaissement', 'decaissement', 'versement_banque', 'transfert_in', 'transfert_out')),
  montant numeric(14,2) NOT NULL CHECK (montant > 0),
  mode text CHECK (mode IN ('cash', 'cheque', 'banque', 'autre')),
  description text,
  reference text,
  -- Liens optionnels
  facture_id uuid REFERENCES factures(id),
  besoin_id uuid,
  banque_id uuid REFERENCES banques(id),
  caisse_destination_id uuid REFERENCES caisses(id),
  caisse_source_id uuid REFERENCES caisses(id),
  effectue_par uuid NOT NULL REFERENCES profiles(id),
  created_at timestamptz DEFAULT now()
);

ALTER TABLE mouvements_caisse ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "mouvements_caisse_all" ON mouvements_caisse;
CREATE POLICY "mouvements_caisse_all" ON mouvements_caisse FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- Fonction : Ouvrir une journée de caisse
CREATE OR REPLACE FUNCTION ouvrir_journee_caisse(p_caisse_id uuid)
RETURNS jsonb AS $$
DECLARE
  v_solde numeric;
  v_jc_id uuid;
BEGIN
  -- Vérifier qu'il n'y a pas déjà une journée ouverte
  IF EXISTS (SELECT 1 FROM journees_caisse WHERE caisse_id = p_caisse_id AND statut = 'OUVERTE') THEN
    RAISE EXCEPTION 'Une journée est déjà ouverte pour cette caisse';
  END IF;

  -- Récupérer le solde de clôture de la veille
  SELECT solde_cloture INTO v_solde
  FROM journees_caisse
  WHERE caisse_id = p_caisse_id AND statut = 'CLOTUREE'
  ORDER BY date_journee DESC LIMIT 1;

  v_solde := COALESCE(v_solde, 0);

  INSERT INTO journees_caisse (caisse_id, solde_ouverture, ouverte_par)
  VALUES (p_caisse_id, v_solde, auth.uid())
  RETURNING id INTO v_jc_id;

  RETURN jsonb_build_object('id', v_jc_id, 'solde_ouverture', v_solde);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Fonction : Enregistrer un mouvement de caisse
CREATE OR REPLACE FUNCTION enregistrer_mouvement_caisse(
  p_journee_caisse_id uuid,
  p_type text,
  p_montant numeric,
  p_description text DEFAULT NULL,
  p_reference text DEFAULT NULL,
  p_mode text DEFAULT 'cash',
  p_facture_id uuid DEFAULT NULL,
  p_banque_id uuid DEFAULT NULL,
  p_caisse_destination_id uuid DEFAULT NULL
)
RETURNS jsonb AS $$
DECLARE
  v_mvt_id uuid;
  v_jc record;
BEGIN
  -- Vérifier que la journée est ouverte
  SELECT * INTO v_jc FROM journees_caisse WHERE id = p_journee_caisse_id AND statut = 'OUVERTE';
  IF NOT FOUND THEN RAISE EXCEPTION 'Journée de caisse non ouverte'; END IF;

  INSERT INTO mouvements_caisse (journee_caisse_id, type, montant, mode, description, reference, facture_id, banque_id, caisse_destination_id, effectue_par)
  VALUES (p_journee_caisse_id, p_type, p_montant, p_mode, p_description, p_reference, p_facture_id, p_banque_id, p_caisse_destination_id, auth.uid())
  RETURNING id INTO v_mvt_id;

  -- Mettre à jour les totaux de la journée
  IF p_type = 'encaissement' THEN
    UPDATE journees_caisse SET total_encaissements = total_encaissements + p_montant WHERE id = p_journee_caisse_id;
  ELSIF p_type = 'decaissement' THEN
    UPDATE journees_caisse SET total_decaissements = total_decaissements + p_montant WHERE id = p_journee_caisse_id;
  ELSIF p_type = 'versement_banque' THEN
    UPDATE journees_caisse SET total_versements = total_versements + p_montant WHERE id = p_journee_caisse_id;
  ELSIF p_type = 'transfert_out' THEN
    UPDATE journees_caisse SET total_transferts_out = total_transferts_out + p_montant WHERE id = p_journee_caisse_id;
  ELSIF p_type = 'transfert_in' THEN
    UPDATE journees_caisse SET total_transferts_in = total_transferts_in + p_montant WHERE id = p_journee_caisse_id;
  END IF;

  RETURN jsonb_build_object('id', v_mvt_id, 'type', p_type, 'montant', p_montant);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Fonction : Clôturer une journée de caisse
CREATE OR REPLACE FUNCTION cloturer_journee_caisse(p_journee_caisse_id uuid, p_solde_physique numeric DEFAULT NULL)
RETURNS jsonb AS $$
DECLARE
  v_jc record;
  v_solde_theorique numeric;
  v_ecart numeric;
BEGIN
  SELECT * INTO v_jc FROM journees_caisse WHERE id = p_journee_caisse_id AND statut = 'OUVERTE';
  IF NOT FOUND THEN RAISE EXCEPTION 'Journée non ouverte'; END IF;

  v_solde_theorique := v_jc.solde_ouverture
    + v_jc.total_encaissements
    - v_jc.total_decaissements
    - v_jc.total_versements
    + v_jc.total_transferts_in
    - v_jc.total_transferts_out;

  v_ecart := COALESCE(p_solde_physique, v_solde_theorique) - v_solde_theorique;

  UPDATE journees_caisse SET
    statut = 'CLOTUREE',
    solde_cloture = COALESCE(p_solde_physique, v_solde_theorique),
    ecart = v_ecart,
    cloturee_par = auth.uid()
  WHERE id = p_journee_caisse_id;

  RETURN jsonb_build_object(
    'solde_theorique', v_solde_theorique,
    'solde_physique', COALESCE(p_solde_physique, v_solde_theorique),
    'ecart', v_ecart
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;


-- ═══════════════════════════════════════════════════════════
-- BLOC 2 : GESTION DE STOCK
-- ═══════════════════════════════════════════════════════════

-- Journée de stock (ouverture / clôture)
CREATE TABLE IF NOT EXISTS journees_stock (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  magasin_id uuid NOT NULL REFERENCES magasins(id),
  date_journee date NOT NULL DEFAULT CURRENT_DATE,
  statut text DEFAULT 'OUVERTE' CHECK (statut IN ('OUVERTE', 'CLOTUREE')),
  ouverte_par uuid NOT NULL REFERENCES profiles(id),
  cloturee_par uuid REFERENCES profiles(id),
  notes text,
  created_at timestamptz DEFAULT now(),
  UNIQUE (magasin_id, date_journee)
);

ALTER TABLE journees_stock ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "journees_stock_all" ON journees_stock;
CREATE POLICY "journees_stock_all" ON journees_stock FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- Lignes de stock journalier (une par article)
CREATE TABLE IF NOT EXISTS lignes_journee_stock (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  journee_stock_id uuid NOT NULL REFERENCES journees_stock(id) ON DELETE CASCADE,
  article_id uuid NOT NULL REFERENCES articles(id),
  stock_ouverture integer NOT NULL DEFAULT 0,
  total_entrees integer DEFAULT 0,
  total_sorties integer DEFAULT 0,
  stock_theorique integer GENERATED ALWAYS AS (stock_ouverture + total_entrees - total_sorties) STORED,
  stock_physique integer,
  ecart integer GENERATED ALWAYS AS (COALESCE(stock_physique, stock_ouverture + total_entrees - total_sorties) - (stock_ouverture + total_entrees - total_sorties)) STORED,
  created_at timestamptz DEFAULT now(),
  UNIQUE (journee_stock_id, article_id)
);

ALTER TABLE lignes_journee_stock ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "lignes_journee_stock_all" ON lignes_journee_stock;
CREATE POLICY "lignes_journee_stock_all" ON lignes_journee_stock FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- Mouvements de stock
CREATE TABLE IF NOT EXISTS mouvements_stock (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  journee_stock_id uuid NOT NULL REFERENCES journees_stock(id),
  article_id uuid NOT NULL REFERENCES articles(id),
  type text NOT NULL CHECK (type IN ('entree', 'sortie')),
  motif text NOT NULL CHECK (motif IN (
    'approvisionnement', 'retour_vehicule', 'retour_client', 'ajustement_plus',
    'vente', 'livraison', 'chargement_vehicule', 'casse', 'ajustement_moins'
  )),
  quantite integer NOT NULL CHECK (quantite > 0),
  description text,
  reference text,
  -- Liens optionnels
  bon_livraison_id uuid REFERENCES bons_livraison(id),
  sortie_vehicule_id uuid REFERENCES sorties_vehicules(id),
  effectue_par uuid NOT NULL REFERENCES profiles(id),
  created_at timestamptz DEFAULT now()
);

ALTER TABLE mouvements_stock ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "mouvements_stock_all" ON mouvements_stock;
CREATE POLICY "mouvements_stock_all" ON mouvements_stock FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- Fonction : Ouvrir une journée de stock
CREATE OR REPLACE FUNCTION ouvrir_journee_stock(p_magasin_id uuid)
RETURNS jsonb AS $$
DECLARE
  v_js_id uuid;
  v_prev_id uuid;
  v_art record;
  v_stock_init integer;
BEGIN
  IF EXISTS (SELECT 1 FROM journees_stock WHERE magasin_id = p_magasin_id AND statut = 'OUVERTE') THEN
    RAISE EXCEPTION 'Une journée de stock est déjà ouverte pour ce magasin';
  END IF;

  INSERT INTO journees_stock (magasin_id, ouverte_par)
  VALUES (p_magasin_id, auth.uid())
  RETURNING id INTO v_js_id;

  -- Récupérer la dernière journée clôturée
  SELECT id INTO v_prev_id
  FROM journees_stock
  WHERE magasin_id = p_magasin_id AND statut = 'CLOTUREE'
  ORDER BY date_journee DESC LIMIT 1;

  -- Initialiser les lignes pour chaque article actif
  FOR v_art IN SELECT id FROM articles WHERE statut = 'actif' LOOP
    v_stock_init := 0;
    IF v_prev_id IS NOT NULL THEN
      SELECT COALESCE(stock_physique, stock_theorique) INTO v_stock_init
      FROM lignes_journee_stock
      WHERE journee_stock_id = v_prev_id AND article_id = v_art.id;
      v_stock_init := COALESCE(v_stock_init, 0);
    END IF;

    INSERT INTO lignes_journee_stock (journee_stock_id, article_id, stock_ouverture)
    VALUES (v_js_id, v_art.id, v_stock_init);
  END LOOP;

  RETURN jsonb_build_object('id', v_js_id);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Fonction : Enregistrer un mouvement de stock
CREATE OR REPLACE FUNCTION enregistrer_mouvement_stock(
  p_journee_stock_id uuid,
  p_article_id uuid,
  p_type text,
  p_motif text,
  p_quantite integer,
  p_description text DEFAULT NULL,
  p_bon_livraison_id uuid DEFAULT NULL,
  p_sortie_vehicule_id uuid DEFAULT NULL
)
RETURNS jsonb AS $$
DECLARE
  v_mvt_id uuid;
BEGIN
  IF NOT EXISTS (SELECT 1 FROM journees_stock WHERE id = p_journee_stock_id AND statut = 'OUVERTE') THEN
    RAISE EXCEPTION 'Journée de stock non ouverte';
  END IF;

  INSERT INTO mouvements_stock (journee_stock_id, article_id, type, motif, quantite, description, bon_livraison_id, sortie_vehicule_id, effectue_par)
  VALUES (p_journee_stock_id, p_article_id, p_type, p_motif, p_quantite, p_description, p_bon_livraison_id, p_sortie_vehicule_id, auth.uid())
  RETURNING id INTO v_mvt_id;

  -- Mettre à jour les totaux dans la ligne
  IF p_type = 'entree' THEN
    UPDATE lignes_journee_stock SET total_entrees = total_entrees + p_quantite
    WHERE journee_stock_id = p_journee_stock_id AND article_id = p_article_id;
  ELSE
    UPDATE lignes_journee_stock SET total_sorties = total_sorties + p_quantite
    WHERE journee_stock_id = p_journee_stock_id AND article_id = p_article_id;
  END IF;

  RETURN jsonb_build_object('id', v_mvt_id);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Fonction : Clôturer une journée de stock
CREATE OR REPLACE FUNCTION cloturer_journee_stock(p_journee_stock_id uuid, p_stocks_physiques jsonb DEFAULT NULL)
RETURNS jsonb AS $$
DECLARE
  v_item jsonb;
  v_total_ecarts integer := 0;
  v_art_id uuid;
  v_qty integer;
  v_ecart integer;
BEGIN
  IF NOT EXISTS (SELECT 1 FROM journees_stock WHERE id = p_journee_stock_id AND statut = 'OUVERTE') THEN
    RAISE EXCEPTION 'Journée non ouverte';
  END IF;

  -- Mettre à jour les stocks physiques si fournis
  IF p_stocks_physiques IS NOT NULL THEN
    FOR v_item IN SELECT * FROM jsonb_array_elements(p_stocks_physiques) LOOP
      v_art_id := (v_item->>'article_id')::uuid;
      v_qty := (v_item->>'stock_physique')::integer;

      UPDATE lignes_journee_stock SET stock_physique = v_qty
      WHERE journee_stock_id = p_journee_stock_id AND article_id = v_art_id;
    END LOOP;
  ELSE
    -- Si pas de stock physique, on prend le théorique
    UPDATE lignes_journee_stock SET stock_physique = stock_ouverture + total_entrees - total_sorties
    WHERE journee_stock_id = p_journee_stock_id AND stock_physique IS NULL;
  END IF;

  -- Calculer les écarts totaux
  SELECT COALESCE(SUM(ABS(COALESCE(stock_physique, stock_ouverture + total_entrees - total_sorties) - (stock_ouverture + total_entrees - total_sorties))), 0)
  INTO v_total_ecarts
  FROM lignes_journee_stock WHERE journee_stock_id = p_journee_stock_id;

  UPDATE journees_stock SET statut = 'CLOTUREE', cloturee_par = auth.uid()
  WHERE id = p_journee_stock_id;

  RETURN jsonb_build_object('total_ecarts', v_total_ecarts);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;


-- ═══════════════════════════════════════════════════════════
-- TERMINÉ ! Les tables et fonctions sont prêtes.
-- ═══════════════════════════════════════════════════════════

-- ============================================================
-- PHASE 5 : AUDIT ET CONTRÔLE
-- À exécuter après la Phase 4
-- ============================================================


-- ═══════════════════════════════════════════════════════════
-- 1. JOURNAL D'AUDIT (traçabilité complète)
-- ═══════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS journal_audit (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  action text NOT NULL,
  module text,
  table_cible text,
  enregistrement_id uuid,
  details jsonb,
  effectue_par uuid REFERENCES profiles(id),
  ip_address text,
  created_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_audit_module ON journal_audit(module);
CREATE INDEX IF NOT EXISTS idx_audit_date ON journal_audit(created_at);
CREATE INDEX IF NOT EXISTS idx_audit_user ON journal_audit(effectue_par);

ALTER TABLE journal_audit ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "journal_audit_all" ON journal_audit;
CREATE POLICY "journal_audit_all" ON journal_audit FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- Fonction helper pour logger une action
CREATE OR REPLACE FUNCTION log_audit(
  p_action text,
  p_module text,
  p_table text,
  p_record_id uuid,
  p_details jsonb DEFAULT NULL
)
RETURNS void AS $$
BEGIN
  INSERT INTO journal_audit (action, module, table_cible, enregistrement_id, details, effectue_par)
  VALUES (p_action, p_module, p_table, p_record_id, p_details, auth.uid());
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;


-- ═══════════════════════════════════════════════════════════
-- 2. INVENTAIRES PHYSIQUES
-- ═══════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS inventaires (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  numero text NOT NULL UNIQUE,
  magasin_id uuid NOT NULL REFERENCES magasins(id),
  date_inventaire date NOT NULL DEFAULT CURRENT_DATE,
  initie_par uuid NOT NULL REFERENCES profiles(id),
  valide_par uuid REFERENCES profiles(id),
  statut text DEFAULT 'EN_COURS' CHECK (statut IN ('EN_COURS', 'TERMINE', 'VALIDE', 'ANNULE')),
  notes text,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE inventaires ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "inventaires_all" ON inventaires;
CREATE POLICY "inventaires_all" ON inventaires FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- Lignes d'inventaire (une par article)
CREATE TABLE IF NOT EXISTS lignes_inventaire (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  inventaire_id uuid NOT NULL REFERENCES inventaires(id) ON DELETE CASCADE,
  article_id uuid NOT NULL REFERENCES articles(id),
  stock_theorique integer NOT NULL DEFAULT 0,
  stock_physique integer,
  ecart integer GENERATED ALWAYS AS (COALESCE(stock_physique, 0) - stock_theorique) STORED,
  justification text,
  created_at timestamptz DEFAULT now(),
  UNIQUE (inventaire_id, article_id)
);

ALTER TABLE lignes_inventaire ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "lignes_inventaire_all" ON lignes_inventaire;
CREATE POLICY "lignes_inventaire_all" ON lignes_inventaire FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- Fonction : Créer un inventaire
CREATE OR REPLACE FUNCTION creer_inventaire(p_magasin_id uuid)
RETURNS jsonb AS $$
DECLARE
  v_inv_id uuid;
  v_numero text;
  v_date text;
  v_seq int;
  v_art record;
  v_stock int;
  v_js_id uuid;
BEGIN
  v_date := to_char(now(), 'YYYYMMDD');
  SELECT COALESCE(MAX(CAST(SUBSTRING(numero FROM 'INV-' || v_date || '-(\d+)') AS int)), 0) + 1
  INTO v_seq FROM inventaires WHERE numero LIKE 'INV-' || v_date || '-%';
  v_numero := 'INV-' || v_date || '-' || LPAD(v_seq::text, 4, '0');

  INSERT INTO inventaires (numero, magasin_id, initie_par)
  VALUES (v_numero, p_magasin_id, auth.uid())
  RETURNING id INTO v_inv_id;

  -- Récupérer le stock théorique depuis la dernière journée clôturée
  SELECT id INTO v_js_id FROM journees_stock
  WHERE magasin_id = p_magasin_id AND statut = 'CLOTUREE'
  ORDER BY date_journee DESC LIMIT 1;

  FOR v_art IN SELECT id FROM articles WHERE statut = 'actif' LOOP
    v_stock := 0;
    IF v_js_id IS NOT NULL THEN
      SELECT COALESCE(stock_physique, stock_ouverture + total_entrees - total_sorties) INTO v_stock
      FROM lignes_journee_stock
      WHERE journee_stock_id = v_js_id AND article_id = v_art.id;
      v_stock := COALESCE(v_stock, 0);
    END IF;

    INSERT INTO lignes_inventaire (inventaire_id, article_id, stock_theorique)
    VALUES (v_inv_id, v_art.id, v_stock);
  END LOOP;

  RETURN jsonb_build_object('id', v_inv_id, 'numero', v_numero);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Fonction : Valider un inventaire (DG)
CREATE OR REPLACE FUNCTION valider_inventaire(p_inventaire_id uuid, p_action text)
RETURNS jsonb AS $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM inventaires WHERE id = p_inventaire_id AND statut = 'TERMINE') THEN
    RAISE EXCEPTION 'Inventaire non terminé';
  END IF;

  IF p_action = 'valide' THEN
    UPDATE inventaires SET statut = 'VALIDE', valide_par = auth.uid() WHERE id = p_inventaire_id;
    RETURN jsonb_build_object('statut', 'VALIDE');
  ELSE
    UPDATE inventaires SET statut = 'ANNULE' WHERE id = p_inventaire_id;
    RETURN jsonb_build_object('statut', 'ANNULE');
  END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;


-- ═══════════════════════════════════════════════════════════
-- 3. VUES POUR RAPPORTS ET TABLEAUX DE BORD
-- ═══════════════════════════════════════════════════════════

-- Vue : Résumé des ventes par agence
CREATE OR REPLACE VIEW v_resume_ventes AS
SELECT
  a.id as agence_id,
  a.nom as agence_nom,
  COUNT(DISTINCT c.id) as nb_commandes,
  COUNT(DISTINCT f.id) as nb_factures,
  COALESCE(SUM(f.montant_total), 0) as ca_total,
  COALESCE(SUM(f.montant_regle), 0) as total_regle,
  COALESCE(SUM(f.montant_total - f.montant_regle), 0) as total_dettes,
  COUNT(DISTINCT CASE WHEN f.statut = 'EN_ATTENTE_DG' THEN f.id END) as nb_dettes_attente
FROM agences a
LEFT JOIN commandes c ON c.agence_id = a.id
LEFT JOIN factures f ON f.commande_id = c.id
GROUP BY a.id, a.nom;

-- Vue : Résumé caisse par jour
CREATE OR REPLACE VIEW v_resume_caisse AS
SELECT
  jc.id,
  jc.date_journee,
  cs.nom as caisse_nom,
  jc.solde_ouverture,
  jc.total_encaissements,
  jc.total_decaissements,
  jc.total_versements,
  jc.total_transferts_in,
  jc.total_transferts_out,
  jc.solde_cloture,
  jc.ecart,
  jc.statut,
  p_ouv.prenom || ' ' || p_ouv.nom as ouvert_par,
  p_clo.prenom || ' ' || p_clo.nom as cloture_par
FROM journees_caisse jc
JOIN caisses cs ON cs.id = jc.caisse_id
JOIN profiles p_ouv ON p_ouv.id = jc.ouverte_par
LEFT JOIN profiles p_clo ON p_clo.id = jc.cloturee_par;

-- Vue : Résumé stock par jour
CREATE OR REPLACE VIEW v_resume_stock AS
SELECT
  js.id,
  js.date_journee,
  mg.nom as magasin_nom,
  js.statut,
  COUNT(ljs.id) as nb_articles,
  COALESCE(SUM(ljs.total_entrees), 0) as total_entrees,
  COALESCE(SUM(ljs.total_sorties), 0) as total_sorties,
  COALESCE(SUM(ABS(COALESCE(ljs.stock_physique, ljs.stock_ouverture + ljs.total_entrees - ljs.total_sorties) - (ljs.stock_ouverture + ljs.total_entrees - ljs.total_sorties))), 0) as total_ecarts,
  p_ouv.prenom || ' ' || p_ouv.nom as ouvert_par
FROM journees_stock js
JOIN magasins mg ON mg.id = js.magasin_id
JOIN profiles p_ouv ON p_ouv.id = js.ouverte_par
LEFT JOIN lignes_journee_stock ljs ON ljs.journee_stock_id = js.id
GROUP BY js.id, js.date_journee, mg.nom, js.statut, p_ouv.prenom, p_ouv.nom;


-- ═══════════════════════════════════════════════════════════
-- TERMINÉ !
-- ═══════════════════════════════════════════════════════════

-- === PARTIE 2 : FIX RLS + LIAISONS + LOT 1 ===

-- ============================================================
-- FIX RLS — Débloquer toutes les tables pour le client React
-- ============================================================

ALTER TABLE services ENABLE ROW LEVEL SECURITY;
ALTER TABLE roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE modules ENABLE ROW LEVEL SECURITY;
ALTER TABLE departements ENABLE ROW LEVEL SECURITY;
ALTER TABLE service_role_module ENABLE ROW LEVEL SECURITY;
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE agences ENABLE ROW LEVEL SECURITY;
ALTER TABLE entreprises ENABLE ROW LEVEL SECURITY;
ALTER TABLE caisses ENABLE ROW LEVEL SECURITY;
ALTER TABLE magasins ENABLE ROW LEVEL SECURITY;
ALTER TABLE banques ENABLE ROW LEVEL SECURITY;
ALTER TABLE utilisateur_roles ENABLE ROW LEVEL SECURITY;

-- Supprimer toutes les anciennes policies
DO $$ 
DECLARE r record;
BEGIN
  FOR r IN
    SELECT schemaname, tablename, policyname
    FROM pg_policies
    WHERE tablename IN ('services','roles','modules','departements',
      'service_role_module','profiles','agences','entreprises',
      'caisses','magasins','banques','utilisateur_roles')
  LOOP
    EXECUTE format('DROP POLICY %I ON %I.%I', r.policyname, r.schemaname, r.tablename);
  END LOOP;
END $$;

-- Recréer les policies proprement
CREATE POLICY "auth_all" ON services FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "auth_all" ON roles FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "auth_all" ON modules FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "auth_all" ON departements FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "auth_all" ON service_role_module FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "auth_all" ON profiles FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "auth_all" ON agences FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "auth_all" ON entreprises FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "auth_all" ON caisses FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "auth_all" ON magasins FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "auth_all" ON banques FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "auth_all" ON utilisateur_roles FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- Vérifier les liaisons COMM et CAISSE COMMERCIALE
SELECT s.nom as service, r.nom as role, m.code as module
FROM service_role_module srm
JOIN services s ON s.id = srm.service_id
JOIN roles r ON r.id = srm.role_id
JOIN modules m ON m.id = srm.module_id
WHERE s.nom IN ('COMM', 'CAISSE COMMERCIALE')
ORDER BY s.nom, m.code;

-- ============================================================
-- FIX : 6 LIAISONS AUTOMATIQUES ENTRE MODULES
-- À exécuter après toutes les phases
-- ============================================================


-- ═══════════════════════════════════════════════════════════
-- FIX 1 : Règlement facture → mouvement caisse auto
-- Quand on règle une facture en cash, ça crée auto un
-- encaissement dans la journée de caisse ouverte
-- ═══════════════════════════════════════════════════════════

CREATE OR REPLACE FUNCTION enregistrer_reglement(p_facture_id uuid, p_reglements jsonb)
RETURNS jsonb AS $$
DECLARE
  v_regl jsonb; v_total_regle numeric := 0; v_montant_total numeric;
  v_facture_statut text; v_commande_id uuid;
  v_jc_id uuid; v_caisse_id uuid;
BEGIN
  SELECT montant_total, commande_id INTO v_montant_total, v_commande_id
  FROM factures WHERE id = p_facture_id AND statut IN ('EN_ATTENTE', 'PARTIELLE');
  IF NOT FOUND THEN RAISE EXCEPTION 'Facture non réglable'; END IF;

  FOR v_regl IN SELECT * FROM jsonb_array_elements(p_reglements) LOOP
    v_caisse_id := NULLIF(v_regl->>'caisse_id', '')::uuid;

    INSERT INTO reglements (facture_id, mode, montant, banque_id, reference_cheque, encaisse_par, caisse_id, est_caisse_temporaire)
    VALUES (
      p_facture_id, v_regl->>'mode', (v_regl->>'montant')::numeric,
      NULLIF(v_regl->>'banque_id', '')::uuid, NULLIF(v_regl->>'reference_cheque', ''),
      auth.uid(), v_caisse_id,
      COALESCE((v_regl->>'est_caisse_temporaire')::boolean, false)
    );
    v_total_regle := v_total_regle + (v_regl->>'montant')::numeric;

    -- FIX 1 : Auto-créer mouvement caisse si cash et caisse spécifiée
    IF (v_regl->>'mode') = 'cash' AND v_caisse_id IS NOT NULL THEN
      SELECT id INTO v_jc_id FROM journees_caisse
      WHERE caisse_id = v_caisse_id AND statut = 'OUVERTE' LIMIT 1;

      IF v_jc_id IS NOT NULL THEN
        INSERT INTO mouvements_caisse (journee_caisse_id, type, montant, mode, description, facture_id, effectue_par)
        VALUES (v_jc_id, 'encaissement', (v_regl->>'montant')::numeric, 'cash',
          'Règlement facture (auto)', p_facture_id, auth.uid());

        UPDATE journees_caisse SET total_encaissements = total_encaissements + (v_regl->>'montant')::numeric
        WHERE id = v_jc_id;
      END IF;
    END IF;
  END LOOP;

  UPDATE factures SET montant_regle = montant_regle + v_total_regle WHERE id = p_facture_id;
  SELECT montant_regle INTO v_total_regle FROM factures WHERE id = p_facture_id;

  IF v_total_regle >= v_montant_total THEN
    UPDATE factures SET statut = 'REGLEE' WHERE id = p_facture_id;
    UPDATE commandes SET statut = 'REGLEE' WHERE id = v_commande_id;
    INSERT INTO bons_livraison (numero, facture_id, magasin_id)
    SELECT generer_numero_bl(), p_facture_id, magasin_id FROM factures WHERE id = p_facture_id;
    v_facture_statut := 'REGLEE';
  ELSE
    UPDATE factures SET statut = 'EN_ATTENTE_DG', type_reglement = 'partiel' WHERE id = p_facture_id;
    UPDATE commandes SET statut = 'EN_ATTENTE_DG' WHERE id = v_commande_id;
    v_facture_statut := 'EN_ATTENTE_DG';
  END IF;

  -- FIX 6 : Log audit
  PERFORM log_audit('Règlement enregistré', 'commercial', 'reglements', p_facture_id,
    jsonb_build_object('statut', v_facture_statut, 'montant', v_total_regle));

  RETURN jsonb_build_object('statut', v_facture_statut, 'montant_regle', v_total_regle);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;


-- ═══════════════════════════════════════════════════════════
-- FIX 2 : Livraison confirmée → sortie stock auto
-- Fonction appelée quand le magasinier confirme un BL
-- ═══════════════════════════════════════════════════════════

CREATE OR REPLACE FUNCTION confirmer_livraison(p_bl_id uuid)
RETURNS jsonb AS $$
DECLARE
  v_bl record;
  v_facture record;
  v_commande record;
  v_js_id uuid;
  v_ligne record;
BEGIN
  SELECT * INTO v_bl FROM bons_livraison WHERE id = p_bl_id AND statut = 'A_LIVRER';
  IF NOT FOUND THEN RAISE EXCEPTION 'Bon de livraison non trouvé ou déjà livré'; END IF;

  -- Mettre à jour le BL
  UPDATE bons_livraison SET statut = 'LIVRE', livre_par = auth.uid(), date_livraison = now()
  WHERE id = p_bl_id;

  -- Récupérer la facture et la commande
  SELECT * INTO v_facture FROM factures WHERE id = v_bl.facture_id;
  SELECT * INTO v_commande FROM commandes WHERE id = v_facture.commande_id;

  -- Mettre à jour statut commande
  UPDATE commandes SET statut = 'LIVREE' WHERE id = v_commande.id;

  -- FIX 2 : Auto-créer mouvements stock sortie
  SELECT id INTO v_js_id FROM journees_stock
  WHERE magasin_id = v_bl.magasin_id AND statut = 'OUVERTE' LIMIT 1;

  IF v_js_id IS NOT NULL THEN
    FOR v_ligne IN
      SELECT lc.article_id, lc.quantite
      FROM lignes_commande lc WHERE lc.commande_id = v_commande.id
    LOOP
      INSERT INTO mouvements_stock (journee_stock_id, article_id, type, motif, quantite, description, bon_livraison_id, effectue_par)
      VALUES (v_js_id, v_ligne.article_id, 'sortie', 'livraison', v_ligne.quantite,
        'Livraison ' || v_bl.numero || ' (auto)', p_bl_id, auth.uid());

      UPDATE lignes_journee_stock SET total_sorties = total_sorties + v_ligne.quantite
      WHERE journee_stock_id = v_js_id AND article_id = v_ligne.article_id;
    END LOOP;
  END IF;

  -- FIX 6 : Log audit
  PERFORM log_audit('Livraison confirmée', 'commercial', 'bons_livraison', p_bl_id,
    jsonb_build_object('commande', v_commande.numero, 'magasin_id', v_bl.magasin_id));

  RETURN jsonb_build_object('statut', 'LIVRE', 'bl_numero', v_bl.numero);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;


-- ═══════════════════════════════════════════════════════════
-- FIX 3 : Transfert caisse out → transfert in auto
-- Modifier enregistrer_mouvement_caisse pour gérer ça
-- ═══════════════════════════════════════════════════════════

CREATE OR REPLACE FUNCTION enregistrer_mouvement_caisse(
  p_journee_caisse_id uuid,
  p_type text,
  p_montant numeric,
  p_description text DEFAULT NULL,
  p_reference text DEFAULT NULL,
  p_mode text DEFAULT 'cash',
  p_facture_id uuid DEFAULT NULL,
  p_banque_id uuid DEFAULT NULL,
  p_caisse_destination_id uuid DEFAULT NULL
)
RETURNS jsonb AS $$
DECLARE
  v_mvt_id uuid;
  v_jc record;
  v_jc_dest_id uuid;
BEGIN
  SELECT * INTO v_jc FROM journees_caisse WHERE id = p_journee_caisse_id AND statut = 'OUVERTE';
  IF NOT FOUND THEN RAISE EXCEPTION 'Journée de caisse non ouverte'; END IF;

  INSERT INTO mouvements_caisse (journee_caisse_id, type, montant, mode, description, reference, facture_id, banque_id, caisse_destination_id, effectue_par)
  VALUES (p_journee_caisse_id, p_type, p_montant, p_mode, p_description, p_reference, p_facture_id, p_banque_id, p_caisse_destination_id, auth.uid())
  RETURNING id INTO v_mvt_id;

  -- Mettre à jour les totaux
  IF p_type = 'encaissement' THEN
    UPDATE journees_caisse SET total_encaissements = total_encaissements + p_montant WHERE id = p_journee_caisse_id;
  ELSIF p_type = 'decaissement' THEN
    UPDATE journees_caisse SET total_decaissements = total_decaissements + p_montant WHERE id = p_journee_caisse_id;
  ELSIF p_type = 'versement_banque' THEN
    UPDATE journees_caisse SET total_versements = total_versements + p_montant WHERE id = p_journee_caisse_id;
  ELSIF p_type = 'transfert_out' THEN
    UPDATE journees_caisse SET total_transferts_out = total_transferts_out + p_montant WHERE id = p_journee_caisse_id;

    -- FIX 3 : Auto-créer transfert entrant sur la caisse destination
    IF p_caisse_destination_id IS NOT NULL THEN
      SELECT id INTO v_jc_dest_id FROM journees_caisse
      WHERE caisse_id = p_caisse_destination_id AND statut = 'OUVERTE' LIMIT 1;

      IF v_jc_dest_id IS NOT NULL THEN
        INSERT INTO mouvements_caisse (journee_caisse_id, type, montant, mode, description, caisse_source_id, effectue_par)
        VALUES (v_jc_dest_id, 'transfert_in', p_montant, 'cash',
          'Transfert reçu de ' || (SELECT nom FROM caisses WHERE id = v_jc.caisse_id) || ' (auto)',
          v_jc.caisse_id, auth.uid());

        UPDATE journees_caisse SET total_transferts_in = total_transferts_in + p_montant
        WHERE id = v_jc_dest_id;
      END IF;
    END IF;

  ELSIF p_type = 'transfert_in' THEN
    UPDATE journees_caisse SET total_transferts_in = total_transferts_in + p_montant WHERE id = p_journee_caisse_id;
  END IF;

  -- FIX 6 : Log audit
  PERFORM log_audit('Mouvement caisse: ' || p_type, 'commercial', 'mouvements_caisse', v_mvt_id,
    jsonb_build_object('montant', p_montant, 'type', p_type));

  RETURN jsonb_build_object('id', v_mvt_id, 'type', p_type, 'montant', p_montant);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;


-- ═══════════════════════════════════════════════════════════
-- FIX 4 : Sortie véhicule → mouvement stock sortie auto
-- Nouvelle fonction pour créer une sortie véhicule proprement
-- ═══════════════════════════════════════════════════════════

CREATE OR REPLACE FUNCTION creer_sortie_vehicule(
  p_vehicule_id uuid,
  p_vendeur_id uuid,
  p_itineraire_id uuid,
  p_magasin_source_id uuid,
  p_hors_ville boolean,
  p_lignes jsonb  -- [{article_id, quantite}]
)
RETURNS jsonb AS $$
DECLARE
  v_numero text;
  v_sv_id uuid;
  v_ligne jsonb;
  v_art_id uuid;
  v_qty int;
  v_js_id uuid;
BEGIN
  v_numero := generer_numero_sortie();

  INSERT INTO sorties_vehicules (numero, vehicule_id, vendeur_id, initie_par, itineraire_id, magasin_source_id, hors_ville, statut)
  VALUES (v_numero, p_vehicule_id, p_vendeur_id, auth.uid(), p_itineraire_id, p_magasin_source_id, p_hors_ville, 'EN_COURS')
  RETURNING id INTO v_sv_id;

  -- Trouver la journée de stock ouverte du magasin source
  SELECT id INTO v_js_id FROM journees_stock
  WHERE magasin_id = p_magasin_source_id AND statut = 'OUVERTE' LIMIT 1;

  FOR v_ligne IN SELECT * FROM jsonb_array_elements(p_lignes) LOOP
    v_art_id := (v_ligne->>'article_id')::uuid;
    v_qty := (v_ligne->>'quantite')::int;

    IF v_qty > 0 THEN
      INSERT INTO lignes_sortie_vehicule (sortie_vehicule_id, article_id, quantite_sortie)
      VALUES (v_sv_id, v_art_id, v_qty);

      -- FIX 4 : Auto-créer mouvement stock sortie
      IF v_js_id IS NOT NULL THEN
        INSERT INTO mouvements_stock (journee_stock_id, article_id, type, motif, quantite, description, sortie_vehicule_id, effectue_par)
        VALUES (v_js_id, v_art_id, 'sortie', 'chargement_vehicule', v_qty,
          'Chargement ' || v_numero || ' (auto)', v_sv_id, auth.uid());

        UPDATE lignes_journee_stock SET total_sorties = total_sorties + v_qty
        WHERE journee_stock_id = v_js_id AND article_id = v_art_id;
      END IF;
    END IF;
  END LOOP;

  -- FIX 6 : Log audit
  PERFORM log_audit('Sortie véhicule créée', 'commercial', 'sorties_vehicules', v_sv_id,
    jsonb_build_object('numero', v_numero, 'vehicule_id', p_vehicule_id, 'vendeur_id', p_vendeur_id));

  RETURN jsonb_build_object('id', v_sv_id, 'numero', v_numero);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;


-- ═══════════════════════════════════════════════════════════
-- FIX 5 : Décaissement besoin → mouvement caisse auto
-- Trigger sur la table des besoins quand statut passe à décaissé
-- ═══════════════════════════════════════════════════════════

CREATE OR REPLACE FUNCTION on_besoin_decaisse()
RETURNS trigger AS $$
DECLARE
  v_jc_id uuid;
  v_caisse_id uuid;
  v_montant numeric;
BEGIN
  -- Seulement quand le statut passe à "decaisse" ou similaire
  IF NEW.statut IN ('decaisse', 'Décaissé', 'DECAISSE') AND
     (OLD.statut IS NULL OR OLD.statut NOT IN ('decaisse', 'Décaissé', 'DECAISSE')) THEN

    v_montant := COALESCE(NEW.montant, NEW.montant_accorde, 0);

    -- Trouver la caisse de l'utilisateur qui décaisse
    SELECT caisse_id INTO v_caisse_id FROM profiles WHERE id = auth.uid();

    IF v_caisse_id IS NOT NULL AND v_montant > 0 THEN
      SELECT id INTO v_jc_id FROM journees_caisse
      WHERE caisse_id = v_caisse_id AND statut = 'OUVERTE' LIMIT 1;

      IF v_jc_id IS NOT NULL THEN
        INSERT INTO mouvements_caisse (journee_caisse_id, type, montant, mode, description, effectue_par)
        VALUES (v_jc_id, 'decaissement', v_montant, 'cash',
          'Décaissement besoin ' || COALESCE(NEW.numero, NEW.id::text) || ' (auto)', auth.uid());

        UPDATE journees_caisse SET total_decaissements = total_decaissements + v_montant
        WHERE id = v_jc_id;
      END IF;
    END IF;

    -- FIX 6 : Log audit
    PERFORM log_audit('Besoin décaissé', 'besoins', 'besoins', NEW.id,
      jsonb_build_object('montant', v_montant));
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Créer le trigger seulement s'il n'existe pas
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'trg_besoin_decaisse') THEN
    -- Vérifier que la table besoins existe avant de créer le trigger
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'besoins') THEN
      EXECUTE 'CREATE TRIGGER trg_besoin_decaisse AFTER UPDATE ON besoins FOR EACH ROW EXECUTE FUNCTION on_besoin_decaisse()';
    END IF;
  END IF;
END $$;


-- ═══════════════════════════════════════════════════════════
-- FIX 6 : Ajouter log_audit dans les autres fonctions RPC
-- (déjà intégré ci-dessus dans les fonctions modifiées)
-- On ajoute ici les logs pour les fonctions non modifiées
-- ═══════════════════════════════════════════════════════════

-- Créer commande avec log
CREATE OR REPLACE FUNCTION creer_commande(p_client_id uuid, p_agence_id uuid, p_lignes jsonb)
RETURNS jsonb AS $$
DECLARE
  v_numero text; v_commande_id uuid; v_ligne jsonb; v_art_id uuid; v_qty int; v_prix numeric;
BEGIN
  v_numero := generer_numero_commande();
  INSERT INTO commandes (numero, client_id, agence_id, cree_par, statut)
  VALUES (v_numero, p_client_id, p_agence_id, auth.uid(), 'BROUILLON')
  RETURNING id INTO v_commande_id;

  FOR v_ligne IN SELECT * FROM jsonb_array_elements(p_lignes) LOOP
    v_art_id := (v_ligne->>'article_id')::uuid;
    v_qty := (v_ligne->>'quantite')::int;
    v_prix := get_prix_client(p_client_id, v_art_id);
    INSERT INTO lignes_commande (commande_id, article_id, quantite, prix_unitaire)
    VALUES (v_commande_id, v_art_id, v_qty, v_prix);
  END LOOP;

  PERFORM log_audit('Commande créée', 'commercial', 'commandes', v_commande_id,
    jsonb_build_object('numero', v_numero, 'client_id', p_client_id));

  RETURN jsonb_build_object('id', v_commande_id, 'numero', v_numero);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Facturer commande avec log
CREATE OR REPLACE FUNCTION facturer_commande(p_commande_id uuid, p_magasin_id uuid)
RETURNS jsonb AS $$
DECLARE
  v_numero text; v_facture_id uuid; v_total numeric; v_client_id uuid;
  v_est_centre boolean; v_ligne record; v_prix numeric;
BEGIN
  SELECT client_id INTO v_client_id FROM commandes WHERE id = p_commande_id AND statut IN ('BROUILLON', 'A_FACTURER');
  IF NOT FOUND THEN RAISE EXCEPTION 'Commande non facturable'; END IF;
  SELECT est_centre_enfuteur INTO v_est_centre FROM magasins WHERE id = p_magasin_id;
  IF v_est_centre THEN
    FOR v_ligne IN SELECT lc.id, lc.article_id, a.categorie
      FROM lignes_commande lc JOIN articles a ON a.id = lc.article_id WHERE lc.commande_id = p_commande_id
    LOOP
      IF v_ligne.categorie = 'GPL' THEN
        SELECT prix INTO v_prix FROM prix_centre_enfuteur WHERE article_id = v_ligne.article_id;
        IF FOUND THEN UPDATE lignes_commande SET prix_unitaire = v_prix WHERE id = v_ligne.id; END IF;
      END IF;
    END LOOP;
  END IF;
  SELECT COALESCE(SUM(quantite * prix_unitaire), 0) INTO v_total FROM lignes_commande WHERE commande_id = p_commande_id;
  v_numero := generer_numero_facture();
  INSERT INTO factures (numero, commande_id, magasin_id, facture_par, montant_total, statut)
  VALUES (v_numero, p_commande_id, p_magasin_id, auth.uid(), v_total, 'EN_ATTENTE')
  RETURNING id INTO v_facture_id;
  UPDATE commandes SET statut = 'FACTUREE' WHERE id = p_commande_id;

  PERFORM log_audit('Commande facturée', 'commercial', 'factures', v_facture_id,
    jsonb_build_object('numero', v_numero, 'montant', v_total));

  RETURN jsonb_build_object('facture_id', v_facture_id, 'numero', v_numero, 'montant_total', v_total);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Valider dette DG avec log
CREATE OR REPLACE FUNCTION valider_dette_dg(p_facture_id uuid, p_action text)
RETURNS jsonb AS $$
DECLARE v_commande_id uuid;
BEGIN
  SELECT commande_id INTO v_commande_id FROM factures WHERE id = p_facture_id AND statut = 'EN_ATTENTE_DG';
  IF NOT FOUND THEN RAISE EXCEPTION 'Facture non en attente DG'; END IF;
  IF p_action = 'valide' THEN
    UPDATE factures SET statut = 'DETTE_VALIDEE' WHERE id = p_facture_id;
    UPDATE commandes SET statut = 'REGLEE' WHERE id = v_commande_id;
    INSERT INTO bons_livraison (numero, facture_id, magasin_id)
    SELECT generer_numero_bl(), p_facture_id, magasin_id FROM factures WHERE id = p_facture_id;

    PERFORM log_audit('Dette validée par DG', 'commercial', 'factures', p_facture_id, jsonb_build_object('action', 'valide'));
    RETURN jsonb_build_object('statut', 'DETTE_VALIDEE');
  ELSE
    UPDATE factures SET statut = 'ANNULEE' WHERE id = p_facture_id;
    UPDATE commandes SET statut = 'ANNULEE' WHERE id = v_commande_id;

    PERFORM log_audit('Dette rejetée par DG', 'commercial', 'factures', p_facture_id, jsonb_build_object('action', 'rejete'));
    RETURN jsonb_build_object('statut', 'ANNULEE');
  END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Ouvrir/clôturer caisse avec log
CREATE OR REPLACE FUNCTION ouvrir_journee_caisse(p_caisse_id uuid)
RETURNS jsonb AS $$
DECLARE v_solde numeric; v_jc_id uuid;
BEGIN
  IF EXISTS (SELECT 1 FROM journees_caisse WHERE caisse_id = p_caisse_id AND statut = 'OUVERTE') THEN
    RAISE EXCEPTION 'Une journée est déjà ouverte pour cette caisse';
  END IF;
  SELECT solde_cloture INTO v_solde FROM journees_caisse
  WHERE caisse_id = p_caisse_id AND statut = 'CLOTUREE' ORDER BY date_journee DESC LIMIT 1;
  v_solde := COALESCE(v_solde, 0);
  INSERT INTO journees_caisse (caisse_id, solde_ouverture, ouverte_par)
  VALUES (p_caisse_id, v_solde, auth.uid()) RETURNING id INTO v_jc_id;

  PERFORM log_audit('Caisse ouverte', 'commercial', 'journees_caisse', v_jc_id,
    jsonb_build_object('caisse_id', p_caisse_id, 'solde_ouverture', v_solde));

  RETURN jsonb_build_object('id', v_jc_id, 'solde_ouverture', v_solde);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION cloturer_journee_caisse(p_journee_caisse_id uuid, p_solde_physique numeric DEFAULT NULL)
RETURNS jsonb AS $$
DECLARE v_jc record; v_solde_theorique numeric; v_ecart numeric;
BEGIN
  SELECT * INTO v_jc FROM journees_caisse WHERE id = p_journee_caisse_id AND statut = 'OUVERTE';
  IF NOT FOUND THEN RAISE EXCEPTION 'Journée non ouverte'; END IF;
  v_solde_theorique := v_jc.solde_ouverture + v_jc.total_encaissements - v_jc.total_decaissements
    - v_jc.total_versements + v_jc.total_transferts_in - v_jc.total_transferts_out;
  v_ecart := COALESCE(p_solde_physique, v_solde_theorique) - v_solde_theorique;
  UPDATE journees_caisse SET statut = 'CLOTUREE',
    solde_cloture = COALESCE(p_solde_physique, v_solde_theorique),
    ecart = v_ecart, cloturee_par = auth.uid()
  WHERE id = p_journee_caisse_id;

  PERFORM log_audit('Caisse clôturée', 'commercial', 'journees_caisse', p_journee_caisse_id,
    jsonb_build_object('solde_theorique', v_solde_theorique, 'solde_physique', COALESCE(p_solde_physique, v_solde_theorique), 'ecart', v_ecart));

  RETURN jsonb_build_object('solde_theorique', v_solde_theorique,
    'solde_physique', COALESCE(p_solde_physique, v_solde_theorique), 'ecart', v_ecart);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Ouvrir/clôturer stock avec log
CREATE OR REPLACE FUNCTION ouvrir_journee_stock(p_magasin_id uuid)
RETURNS jsonb AS $$
DECLARE v_js_id uuid; v_prev_id uuid; v_art record; v_stock_init integer;
BEGIN
  IF EXISTS (SELECT 1 FROM journees_stock WHERE magasin_id = p_magasin_id AND statut = 'OUVERTE') THEN
    RAISE EXCEPTION 'Une journée de stock est déjà ouverte pour ce magasin';
  END IF;
  INSERT INTO journees_stock (magasin_id, ouverte_par)
  VALUES (p_magasin_id, auth.uid()) RETURNING id INTO v_js_id;
  SELECT id INTO v_prev_id FROM journees_stock
  WHERE magasin_id = p_magasin_id AND statut = 'CLOTUREE' ORDER BY date_journee DESC LIMIT 1;
  FOR v_art IN SELECT id FROM articles WHERE statut = 'actif' LOOP
    v_stock_init := 0;
    IF v_prev_id IS NOT NULL THEN
      SELECT COALESCE(stock_physique, stock_ouverture + total_entrees - total_sorties) INTO v_stock_init
      FROM lignes_journee_stock WHERE journee_stock_id = v_prev_id AND article_id = v_art.id;
      v_stock_init := COALESCE(v_stock_init, 0);
    END IF;
    INSERT INTO lignes_journee_stock (journee_stock_id, article_id, stock_ouverture)
    VALUES (v_js_id, v_art.id, v_stock_init);
  END LOOP;

  PERFORM log_audit('Stock ouvert', 'commercial', 'journees_stock', v_js_id,
    jsonb_build_object('magasin_id', p_magasin_id));

  RETURN jsonb_build_object('id', v_js_id);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION enregistrer_mouvement_stock(
  p_journee_stock_id uuid, p_article_id uuid, p_type text, p_motif text,
  p_quantite integer, p_description text DEFAULT NULL,
  p_bon_livraison_id uuid DEFAULT NULL, p_sortie_vehicule_id uuid DEFAULT NULL
)
RETURNS jsonb AS $$
DECLARE v_mvt_id uuid;
BEGIN
  IF NOT EXISTS (SELECT 1 FROM journees_stock WHERE id = p_journee_stock_id AND statut = 'OUVERTE') THEN
    RAISE EXCEPTION 'Journée de stock non ouverte';
  END IF;
  INSERT INTO mouvements_stock (journee_stock_id, article_id, type, motif, quantite, description, bon_livraison_id, sortie_vehicule_id, effectue_par)
  VALUES (p_journee_stock_id, p_article_id, p_type, p_motif, p_quantite, p_description, p_bon_livraison_id, p_sortie_vehicule_id, auth.uid())
  RETURNING id INTO v_mvt_id;
  IF p_type = 'entree' THEN
    UPDATE lignes_journee_stock SET total_entrees = total_entrees + p_quantite
    WHERE journee_stock_id = p_journee_stock_id AND article_id = p_article_id;
  ELSE
    UPDATE lignes_journee_stock SET total_sorties = total_sorties + p_quantite
    WHERE journee_stock_id = p_journee_stock_id AND article_id = p_article_id;
  END IF;

  PERFORM log_audit('Mouvement stock: ' || p_type, 'commercial', 'mouvements_stock', v_mvt_id,
    jsonb_build_object('article_id', p_article_id, 'quantite', p_quantite, 'motif', p_motif));

  RETURN jsonb_build_object('id', v_mvt_id);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Inventaire avec log
CREATE OR REPLACE FUNCTION creer_inventaire(p_magasin_id uuid)
RETURNS jsonb AS $$
DECLARE v_inv_id uuid; v_numero text; v_date text; v_seq int; v_art record; v_stock int; v_js_id uuid;
BEGIN
  v_date := to_char(now(), 'YYYYMMDD');
  SELECT COALESCE(MAX(CAST(SUBSTRING(numero FROM 'INV-' || v_date || '-(\d+)') AS int)), 0) + 1
  INTO v_seq FROM inventaires WHERE numero LIKE 'INV-' || v_date || '-%';
  v_numero := 'INV-' || v_date || '-' || LPAD(v_seq::text, 4, '0');
  INSERT INTO inventaires (numero, magasin_id, initie_par)
  VALUES (v_numero, p_magasin_id, auth.uid()) RETURNING id INTO v_inv_id;
  SELECT id INTO v_js_id FROM journees_stock
  WHERE magasin_id = p_magasin_id AND statut = 'CLOTUREE' ORDER BY date_journee DESC LIMIT 1;
  FOR v_art IN SELECT id FROM articles WHERE statut = 'actif' LOOP
    v_stock := 0;
    IF v_js_id IS NOT NULL THEN
      SELECT COALESCE(stock_physique, stock_ouverture + total_entrees - total_sorties) INTO v_stock
      FROM lignes_journee_stock WHERE journee_stock_id = v_js_id AND article_id = v_art.id;
      v_stock := COALESCE(v_stock, 0);
    END IF;
    INSERT INTO lignes_inventaire (inventaire_id, article_id, stock_theorique) VALUES (v_inv_id, v_art.id, v_stock);
  END LOOP;

  PERFORM log_audit('Inventaire créé', 'commercial', 'inventaires', v_inv_id,
    jsonb_build_object('numero', v_numero, 'magasin_id', p_magasin_id));

  RETURN jsonb_build_object('id', v_inv_id, 'numero', v_numero);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;


-- ═══════════════════════════════════════════════════════════
-- TERMINÉ ! Les 6 liaisons automatiques sont en place.
-- ═══════════════════════════════════════════════════════════

-- ============================================================
-- LOT 1 : CORRECTIONS ET AMÉLIORATIONS PRIORITAIRES
-- ============================================================


-- ═══════════════════════════════════════════════════════════
-- 1. RÈGLES DE SEUIL COMMANDE
-- < 30 GPL 12.5KG pour véhicules agence Magzi → prix détail
-- < 20 GPL 12.5KG pour véhicules agence Dibamba → prix détail
-- < 5 GPL 12.5KG pour centre enfûteur → prix client comptoir
-- ═══════════════════════════════════════════════════════════

CREATE OR REPLACE FUNCTION appliquer_seuils_commande(
  p_commande_id uuid,
  p_magasin_id uuid
)
RETURNS void AS $$
DECLARE
  v_agence_nom text;
  v_est_centre boolean;
  v_qty_gpl_12 integer;
  v_cat_detail_id uuid;
  v_cat_comptoir_id uuid;
  v_ligne record;
  v_prix numeric;
BEGIN
  -- Récupérer l'agence et le type du magasin
  SELECT a.nom, m.est_centre_enfuteur INTO v_agence_nom, v_est_centre
  FROM magasins m
  LEFT JOIN agences a ON a.id = m.agence_id
  WHERE m.id = p_magasin_id;

  -- Compter le GPL 12.5KG dans la commande
  SELECT COALESCE(SUM(lc.quantite), 0) INTO v_qty_gpl_12
  FROM lignes_commande lc
  JOIN articles a ON a.id = lc.article_id
  WHERE lc.commande_id = p_commande_id AND a.nom = 'GPL 12.5KG';

  -- Récupérer les catégories
  SELECT id INTO v_cat_detail_id FROM categories_clients WHERE nom = 'Détaillant' LIMIT 1;
  SELECT id INTO v_cat_comptoir_id FROM categories_clients WHERE nom = 'Client comptoir' LIMIT 1;

  -- Appliquer les seuils
  IF v_agence_nom ILIKE '%magzi%' AND v_qty_gpl_12 < 30 AND v_cat_detail_id IS NOT NULL THEN
    -- Appliquer prix détail pour tous les articles GPL
    FOR v_ligne IN SELECT lc.id, lc.article_id FROM lignes_commande lc
      JOIN articles a ON a.id = lc.article_id WHERE lc.commande_id = p_commande_id AND a.categorie = 'GPL'
    LOOP
      SELECT prix INTO v_prix FROM prix_categories WHERE categorie_client_id = v_cat_detail_id AND article_id = v_ligne.article_id;
      IF FOUND THEN UPDATE lignes_commande SET prix_unitaire = v_prix WHERE id = v_ligne.id; END IF;
    END LOOP;

  ELSIF v_agence_nom ILIKE '%dibamba%' AND v_qty_gpl_12 < 20 AND v_cat_detail_id IS NOT NULL THEN
    FOR v_ligne IN SELECT lc.id, lc.article_id FROM lignes_commande lc
      JOIN articles a ON a.id = lc.article_id WHERE lc.commande_id = p_commande_id AND a.categorie = 'GPL'
    LOOP
      SELECT prix INTO v_prix FROM prix_categories WHERE categorie_client_id = v_cat_detail_id AND article_id = v_ligne.article_id;
      IF FOUND THEN UPDATE lignes_commande SET prix_unitaire = v_prix WHERE id = v_ligne.id; END IF;
    END LOOP;

  ELSIF v_est_centre AND v_qty_gpl_12 < 5 AND v_cat_comptoir_id IS NOT NULL THEN
    FOR v_ligne IN SELECT lc.id, lc.article_id FROM lignes_commande lc
      JOIN articles a ON a.id = lc.article_id WHERE lc.commande_id = p_commande_id AND a.categorie = 'GPL'
    LOOP
      SELECT prix INTO v_prix FROM prix_categories WHERE categorie_client_id = v_cat_comptoir_id AND article_id = v_ligne.article_id;
      IF FOUND THEN UPDATE lignes_commande SET prix_unitaire = v_prix WHERE id = v_ligne.id; END IF;
    END LOOP;
  END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Intégrer les seuils dans facturer_commande
CREATE OR REPLACE FUNCTION facturer_commande(p_commande_id uuid, p_magasin_id uuid)
RETURNS jsonb AS $$
DECLARE
  v_numero text; v_facture_id uuid; v_total numeric; v_client_id uuid;
  v_est_centre boolean; v_ligne record; v_prix numeric;
BEGIN
  SELECT client_id INTO v_client_id FROM commandes WHERE id = p_commande_id AND statut IN ('BROUILLON', 'A_FACTURER');
  IF NOT FOUND THEN RAISE EXCEPTION 'Commande non facturable'; END IF;
  SELECT est_centre_enfuteur INTO v_est_centre FROM magasins WHERE id = p_magasin_id;

  -- Prix centre enfûteur
  IF v_est_centre THEN
    FOR v_ligne IN SELECT lc.id, lc.article_id, a.categorie
      FROM lignes_commande lc JOIN articles a ON a.id = lc.article_id WHERE lc.commande_id = p_commande_id
    LOOP
      IF v_ligne.categorie = 'GPL' THEN
        SELECT prix INTO v_prix FROM prix_centre_enfuteur WHERE article_id = v_ligne.article_id;
        IF FOUND THEN UPDATE lignes_commande SET prix_unitaire = v_prix WHERE id = v_ligne.id; END IF;
      END IF;
    END LOOP;
  END IF;

  -- Appliquer les seuils (après les prix centre)
  PERFORM appliquer_seuils_commande(p_commande_id, p_magasin_id);

  SELECT COALESCE(SUM(quantite * prix_unitaire), 0) INTO v_total FROM lignes_commande WHERE commande_id = p_commande_id;
  v_numero := generer_numero_facture();
  INSERT INTO factures (numero, commande_id, magasin_id, facture_par, montant_total, statut)
  VALUES (v_numero, p_commande_id, p_magasin_id, auth.uid(), v_total, 'EN_ATTENTE')
  RETURNING id INTO v_facture_id;
  UPDATE commandes SET statut = 'FACTUREE' WHERE id = p_commande_id;

  PERFORM log_audit('Commande facturée', 'commercial', 'factures', v_facture_id,
    jsonb_build_object('numero', v_numero, 'montant', v_total));

  RETURN jsonb_build_object('facture_id', v_facture_id, 'numero', v_numero, 'montant_total', v_total);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;


-- ═══════════════════════════════════════════════════════════
-- 2. BLOCAGE ÉCART À L'OUVERTURE + DOUBLE SIGNATURE CLÔTURE
-- ═══════════════════════════════════════════════════════════

-- Ajouter les colonnes de double signature
ALTER TABLE journees_caisse
  ADD COLUMN IF NOT EXISTS validee_par_chef uuid REFERENCES profiles(id),
  ADD COLUMN IF NOT EXISTS date_validation_chef timestamptz,
  ADD COLUMN IF NOT EXISTS ecart_bloque boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS ecart_justification text,
  ADD COLUMN IF NOT EXISTS ecart_valide_par uuid REFERENCES profiles(id);

ALTER TABLE journees_stock
  ADD COLUMN IF NOT EXISTS validee_par_chef uuid REFERENCES profiles(id),
  ADD COLUMN IF NOT EXISTS date_validation_chef timestamptz,
  ADD COLUMN IF NOT EXISTS ecart_bloque boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS ecart_justification text,
  ADD COLUMN IF NOT EXISTS ecart_valide_par uuid REFERENCES profiles(id);

-- Modifier statut clôture : CLOTUREE → EN_ATTENTE_CHEF → VALIDEE
ALTER TABLE journees_caisse DROP CONSTRAINT IF EXISTS journees_caisse_statut_check;
ALTER TABLE journees_caisse ADD CONSTRAINT journees_caisse_statut_check
  CHECK (statut IN ('OUVERTE', 'CLOTUREE', 'EN_ATTENTE_CHEF', 'VALIDEE'));

ALTER TABLE journees_stock DROP CONSTRAINT IF EXISTS journees_stock_statut_check;
ALTER TABLE journees_stock ADD CONSTRAINT journees_stock_statut_check
  CHECK (statut IN ('OUVERTE', 'CLOTUREE', 'EN_ATTENTE_CHEF', 'VALIDEE'));

-- Fonction : Chef d'agence valide la clôture caisse
CREATE OR REPLACE FUNCTION valider_cloture_caisse(p_journee_caisse_id uuid)
RETURNS jsonb AS $$
BEGIN
  UPDATE journees_caisse SET
    statut = 'VALIDEE',
    validee_par_chef = auth.uid(),
    date_validation_chef = now()
  WHERE id = p_journee_caisse_id AND statut IN ('CLOTUREE', 'EN_ATTENTE_CHEF');

  IF NOT FOUND THEN RAISE EXCEPTION 'Journée non en attente de validation'; END IF;

  PERFORM log_audit('Clôture caisse validée par chef', 'commercial', 'journees_caisse', p_journee_caisse_id, NULL);
  RETURN jsonb_build_object('statut', 'VALIDEE');
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Fonction : Chef d'agence valide la clôture stock
CREATE OR REPLACE FUNCTION valider_cloture_stock(p_journee_stock_id uuid)
RETURNS jsonb AS $$
BEGIN
  UPDATE journees_stock SET
    statut = 'VALIDEE',
    validee_par_chef = auth.uid(),
    date_validation_chef = now()
  WHERE id = p_journee_stock_id AND statut IN ('CLOTUREE', 'EN_ATTENTE_CHEF');

  IF NOT FOUND THEN RAISE EXCEPTION 'Journée non en attente de validation'; END IF;

  PERFORM log_audit('Clôture stock validée par chef', 'commercial', 'journees_stock', p_journee_stock_id, NULL);
  RETURN jsonb_build_object('statut', 'VALIDEE');
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Fonction : DG valide un écart bloquant
CREATE OR REPLACE FUNCTION valider_ecart(p_type text, p_journee_id uuid, p_justification text)
RETURNS jsonb AS $$
BEGIN
  IF p_type = 'caisse' THEN
    UPDATE journees_caisse SET ecart_bloque = false, ecart_justification = p_justification, ecart_valide_par = auth.uid()
    WHERE id = p_journee_id;
  ELSIF p_type = 'stock' THEN
    UPDATE journees_stock SET ecart_bloque = false, ecart_justification = p_justification, ecart_valide_par = auth.uid()
    WHERE id = p_journee_id;
  END IF;

  PERFORM log_audit('Écart validé par DG', 'commercial', p_type, p_journee_id,
    jsonb_build_object('justification', p_justification));
  RETURN jsonb_build_object('statut', 'ecart_valide');
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Modifier clôturer caisse pour mettre EN_ATTENTE_CHEF au lieu de CLOTUREE
CREATE OR REPLACE FUNCTION cloturer_journee_caisse(p_journee_caisse_id uuid, p_solde_physique numeric DEFAULT NULL)
RETURNS jsonb AS $$
DECLARE v_jc record; v_solde_theorique numeric; v_ecart numeric;
BEGIN
  SELECT * INTO v_jc FROM journees_caisse WHERE id = p_journee_caisse_id AND statut = 'OUVERTE';
  IF NOT FOUND THEN RAISE EXCEPTION 'Journée non ouverte'; END IF;
  v_solde_theorique := v_jc.solde_ouverture + v_jc.total_encaissements - v_jc.total_decaissements
    - v_jc.total_versements + v_jc.total_transferts_in - v_jc.total_transferts_out;
  v_ecart := COALESCE(p_solde_physique, v_solde_theorique) - v_solde_theorique;

  UPDATE journees_caisse SET
    statut = 'CLOTUREE',
    solde_cloture = COALESCE(p_solde_physique, v_solde_theorique),
    ecart = v_ecart,
    ecart_bloque = (v_ecart != 0),
    cloturee_par = auth.uid()
  WHERE id = p_journee_caisse_id;

  PERFORM log_audit('Caisse clôturée', 'commercial', 'journees_caisse', p_journee_caisse_id,
    jsonb_build_object('solde_theorique', v_solde_theorique, 'ecart', v_ecart));

  RETURN jsonb_build_object('solde_theorique', v_solde_theorique,
    'solde_physique', COALESCE(p_solde_physique, v_solde_theorique), 'ecart', v_ecart);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Modifier ouvrir caisse pour vérifier écart bloquant
CREATE OR REPLACE FUNCTION ouvrir_journee_caisse(p_caisse_id uuid)
RETURNS jsonb AS $$
DECLARE v_solde numeric; v_jc_id uuid; v_last record;
BEGIN
  IF EXISTS (SELECT 1 FROM journees_caisse WHERE caisse_id = p_caisse_id AND statut = 'OUVERTE') THEN
    RAISE EXCEPTION 'Une journée est déjà ouverte pour cette caisse';
  END IF;

  -- Vérifier écart bloquant de la veille
  SELECT * INTO v_last FROM journees_caisse
  WHERE caisse_id = p_caisse_id ORDER BY date_journee DESC LIMIT 1;

  IF v_last IS NOT NULL AND v_last.ecart_bloque = true THEN
    RAISE EXCEPTION 'Écart non validé sur la journée précédente. Contactez le DG.';
  END IF;

  v_solde := COALESCE(v_last.solde_cloture, 0);

  INSERT INTO journees_caisse (caisse_id, solde_ouverture, ouverte_par)
  VALUES (p_caisse_id, v_solde, auth.uid()) RETURNING id INTO v_jc_id;

  PERFORM log_audit('Caisse ouverte', 'commercial', 'journees_caisse', v_jc_id,
    jsonb_build_object('caisse_id', p_caisse_id, 'solde_ouverture', v_solde));

  RETURN jsonb_build_object('id', v_jc_id, 'solde_ouverture', v_solde);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;


-- ═══════════════════════════════════════════════════════════
-- 3. VERSEMENT COMMERCIAL → CAISSE PRINCIPALE
-- ═══════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS versements_commerciaux (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  commercial_id uuid NOT NULL REFERENCES profiles(id),
  caisse_id uuid NOT NULL REFERENCES caisses(id),
  montant numeric(14,2) NOT NULL CHECK (montant > 0),
  statut text DEFAULT 'EN_ATTENTE' CHECK (statut IN ('EN_ATTENTE', 'VALIDE', 'REJETE')),
  valide_par uuid REFERENCES profiles(id),
  date_validation timestamptz,
  notes text,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE versements_commerciaux ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "versements_commerciaux_all" ON versements_commerciaux;
CREATE POLICY "versements_commerciaux_all" ON versements_commerciaux FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- Fonction : Commercial verse à la caisse
CREATE OR REPLACE FUNCTION verser_en_caisse(p_caisse_id uuid, p_montant numeric, p_notes text DEFAULT NULL)
RETURNS jsonb AS $$
DECLARE v_id uuid;
BEGIN
  INSERT INTO versements_commerciaux (commercial_id, caisse_id, montant, notes)
  VALUES (auth.uid(), p_caisse_id, p_montant, p_notes)
  RETURNING id INTO v_id;

  PERFORM log_audit('Versement commercial en caisse', 'commercial', 'versements_commerciaux', v_id,
    jsonb_build_object('montant', p_montant, 'caisse_id', p_caisse_id));

  RETURN jsonb_build_object('id', v_id);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Fonction : Caissière valide le versement
CREATE OR REPLACE FUNCTION valider_versement_commercial(p_versement_id uuid, p_action text)
RETURNS jsonb AS $$
DECLARE v_vc record; v_jc_id uuid;
BEGIN
  SELECT * INTO v_vc FROM versements_commerciaux WHERE id = p_versement_id AND statut = 'EN_ATTENTE';
  IF NOT FOUND THEN RAISE EXCEPTION 'Versement non trouvé'; END IF;

  IF p_action = 'valide' THEN
    UPDATE versements_commerciaux SET statut = 'VALIDE', valide_par = auth.uid(), date_validation = now()
    WHERE id = p_versement_id;

    -- Auto-créer mouvement caisse encaissement
    SELECT id INTO v_jc_id FROM journees_caisse
    WHERE caisse_id = v_vc.caisse_id AND statut = 'OUVERTE' LIMIT 1;

    IF v_jc_id IS NOT NULL THEN
      INSERT INTO mouvements_caisse (journee_caisse_id, type, montant, mode, description, effectue_par)
      VALUES (v_jc_id, 'encaissement', v_vc.montant, 'cash',
        'Versement commercial ' || (SELECT prenom || ' ' || nom FROM profiles WHERE id = v_vc.commercial_id) || ' (validé)',
        auth.uid());
      UPDATE journees_caisse SET total_encaissements = total_encaissements + v_vc.montant WHERE id = v_jc_id;
    END IF;

    RETURN jsonb_build_object('statut', 'VALIDE');
  ELSE
    UPDATE versements_commerciaux SET statut = 'REJETE', valide_par = auth.uid(), date_validation = now()
    WHERE id = p_versement_id;
    RETURN jsonb_build_object('statut', 'REJETE');
  END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;


-- ═══════════════════════════════════════════════════════════
-- 4. RETOUR STOCK VÉHICULE AU MAGASIN
-- ═══════════════════════════════════════════════════════════

CREATE OR REPLACE FUNCTION retour_vehicule(
  p_sortie_vehicule_id uuid,
  p_retours jsonb  -- [{article_id, quantite}]
)
RETURNS jsonb AS $$
DECLARE
  v_sv record;
  v_item jsonb;
  v_art_id uuid;
  v_qty int;
  v_js_id uuid;
BEGIN
  SELECT * INTO v_sv FROM sorties_vehicules WHERE id = p_sortie_vehicule_id AND statut IN ('EN_COURS', 'EN_VENTE');
  IF NOT FOUND THEN RAISE EXCEPTION 'Sortie véhicule non trouvée ou déjà bouclée'; END IF;

  -- Trouver journée stock du magasin source
  SELECT id INTO v_js_id FROM journees_stock
  WHERE magasin_id = v_sv.magasin_source_id AND statut = 'OUVERTE' LIMIT 1;

  FOR v_item IN SELECT * FROM jsonb_array_elements(p_retours) LOOP
    v_art_id := (v_item->>'article_id')::uuid;
    v_qty := (v_item->>'quantite')::int;

    IF v_qty > 0 THEN
      -- Mettre à jour les lignes sortie véhicule
      UPDATE lignes_sortie_vehicule SET quantite_retour = quantite_retour + v_qty
      WHERE sortie_vehicule_id = p_sortie_vehicule_id AND article_id = v_art_id;

      -- Créer mouvement stock entrée (retour véhicule)
      IF v_js_id IS NOT NULL THEN
        INSERT INTO mouvements_stock (journee_stock_id, article_id, type, motif, quantite, description, sortie_vehicule_id, effectue_par)
        VALUES (v_js_id, v_art_id, 'entree', 'retour_vehicule', v_qty,
          'Retour véhicule ' || v_sv.numero || ' (auto)', p_sortie_vehicule_id, auth.uid());
        UPDATE lignes_journee_stock SET total_entrees = total_entrees + v_qty
        WHERE journee_stock_id = v_js_id AND article_id = v_art_id;
      END IF;
    END IF;
  END LOOP;

  -- Mettre à jour le statut de la sortie
  UPDATE sorties_vehicules SET statut = 'RETOUR', date_retour = now()
  WHERE id = p_sortie_vehicule_id;

  PERFORM log_audit('Retour véhicule', 'commercial', 'sorties_vehicules', p_sortie_vehicule_id, NULL);
  RETURN jsonb_build_object('statut', 'RETOUR');
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Fonction : Boucler une sortie véhicule (après versement + retour stock)
CREATE OR REPLACE FUNCTION boucler_sortie_vehicule(p_sortie_vehicule_id uuid)
RETURNS jsonb AS $$
BEGIN
  UPDATE sorties_vehicules SET statut = 'BOUCLEE'
  WHERE id = p_sortie_vehicule_id AND statut = 'RETOUR';
  IF NOT FOUND THEN RAISE EXCEPTION 'Sortie non en statut RETOUR'; END IF;

  PERFORM log_audit('Sortie véhicule bouclée', 'commercial', 'sorties_vehicules', p_sortie_vehicule_id, NULL);
  RETURN jsonb_build_object('statut', 'BOUCLEE');
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;


-- ═══════════════════════════════════════════════════════════
-- 5. CONTRÔLE STOCK VÉHICULE AVANT COMMANDE
-- Commercial ne peut vendre que ce qu'il a
-- ═══════════════════════════════════════════════════════════

CREATE OR REPLACE FUNCTION verifier_stock_vehicule(p_vendeur_id uuid, p_article_id uuid, p_quantite integer)
RETURNS boolean AS $$
DECLARE v_restant integer;
BEGIN
  SELECT COALESCE(SUM(lsv.quantite_sortie - lsv.quantite_vendue - lsv.quantite_retour), 0) INTO v_restant
  FROM lignes_sortie_vehicule lsv
  JOIN sorties_vehicules sv ON sv.id = lsv.sortie_vehicule_id
  WHERE sv.vendeur_id = p_vendeur_id AND sv.statut IN ('EN_COURS', 'EN_VENTE')
    AND lsv.article_id = p_article_id;

  RETURN v_restant >= p_quantite;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;


-- ═══════════════════════════════════════════════════════════
-- 6. COMMERCIAL NON BOUCLÉ → BLOCAGE
-- ═══════════════════════════════════════════════════════════

CREATE OR REPLACE FUNCTION verifier_commercial_disponible(p_vendeur_id uuid)
RETURNS boolean AS $$
BEGIN
  RETURN NOT EXISTS (
    SELECT 1 FROM sorties_vehicules
    WHERE vendeur_id = p_vendeur_id AND statut NOT IN ('BOUCLEE', 'ANNULEE')
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;


-- ═══════════════════════════════════════════════════════════
-- 7. SERVICE AUDIT
-- ═══════════════════════════════════════════════════════════

INSERT INTO roles (nom) VALUES ('AUDIT') ON CONFLICT DO NOTHING;

DO $$
DECLARE v_dept_id uuid; v_mod_comm uuid; v_sid uuid;
BEGIN
  SELECT id INTO v_dept_id FROM departements WHERE nom = 'Commercial' LIMIT 1;
  SELECT id INTO v_mod_comm FROM modules WHERE code = 'commercial' LIMIT 1;

  IF NOT EXISTS (SELECT 1 FROM services WHERE nom = 'AUDIT' AND departement_id = v_dept_id) THEN
    INSERT INTO services (nom, departement_id) VALUES ('AUDIT', v_dept_id) RETURNING id INTO v_sid;
    INSERT INTO service_role_module (service_id, role_id, module_id)
      SELECT v_sid, r.id, v_mod_comm FROM roles r WHERE r.nom = 'AUDIT';
  END IF;
END $$;


-- ═══════════════════════════════════════════════════════════
-- 8. TRANSFERTS INTER-MAGASINS
-- ═══════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS transferts_stock (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  numero text NOT NULL UNIQUE,
  magasin_source_id uuid NOT NULL REFERENCES magasins(id),
  magasin_destination_id uuid NOT NULL REFERENCES magasins(id),
  initie_par uuid NOT NULL REFERENCES profiles(id),
  confirme_par uuid REFERENCES profiles(id),
  statut text DEFAULT 'EN_ATTENTE' CHECK (statut IN ('EN_ATTENTE', 'CONFIRME', 'REJETE', 'ANNULE')),
  notes text,
  created_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS lignes_transfert_stock (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  transfert_id uuid NOT NULL REFERENCES transferts_stock(id) ON DELETE CASCADE,
  article_id uuid NOT NULL REFERENCES articles(id),
  quantite integer NOT NULL CHECK (quantite > 0),
  created_at timestamptz DEFAULT now()
);

ALTER TABLE transferts_stock ENABLE ROW LEVEL SECURITY;
ALTER TABLE lignes_transfert_stock ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "transferts_stock_all" ON transferts_stock;
DROP POLICY IF EXISTS "lignes_transfert_stock_all" ON lignes_transfert_stock;
CREATE POLICY "transferts_stock_all" ON transferts_stock FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "lignes_transfert_stock_all" ON lignes_transfert_stock FOR ALL TO authenticated USING (true) WITH CHECK (true);

CREATE OR REPLACE FUNCTION generer_numero_transfert()
RETURNS text AS $$
DECLARE v_date text; v_seq int;
BEGIN
  v_date := to_char(now(), 'YYYYMMDD');
  SELECT COALESCE(MAX(CAST(SUBSTRING(numero FROM 'TR-' || v_date || '-(\d+)') AS int)), 0) + 1
  INTO v_seq FROM transferts_stock WHERE numero LIKE 'TR-' || v_date || '-%';
  RETURN 'TR-' || v_date || '-' || LPAD(v_seq::text, 4, '0');
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION creer_transfert_stock(
  p_magasin_source_id uuid,
  p_magasin_destination_id uuid,
  p_lignes jsonb  -- [{article_id, quantite}]
)
RETURNS jsonb AS $$
DECLARE
  v_numero text; v_tr_id uuid; v_item jsonb; v_js_id uuid;
BEGIN
  v_numero := generer_numero_transfert();
  INSERT INTO transferts_stock (numero, magasin_source_id, magasin_destination_id, initie_par)
  VALUES (v_numero, p_magasin_source_id, p_magasin_destination_id, auth.uid())
  RETURNING id INTO v_tr_id;

  -- Sortie du magasin source
  SELECT id INTO v_js_id FROM journees_stock WHERE magasin_id = p_magasin_source_id AND statut = 'OUVERTE' LIMIT 1;

  FOR v_item IN SELECT * FROM jsonb_array_elements(p_lignes) LOOP
    INSERT INTO lignes_transfert_stock (transfert_id, article_id, quantite)
    VALUES (v_tr_id, (v_item->>'article_id')::uuid, (v_item->>'quantite')::int);

    IF v_js_id IS NOT NULL THEN
      INSERT INTO mouvements_stock (journee_stock_id, article_id, type, motif, quantite, description, effectue_par)
      VALUES (v_js_id, (v_item->>'article_id')::uuid, 'sortie', 'ajustement_moins', (v_item->>'quantite')::int,
        'Transfert ' || v_numero || ' vers ' || (SELECT nom FROM magasins WHERE id = p_magasin_destination_id), auth.uid());
      UPDATE lignes_journee_stock SET total_sorties = total_sorties + (v_item->>'quantite')::int
      WHERE journee_stock_id = v_js_id AND article_id = (v_item->>'article_id')::uuid;
    END IF;
  END LOOP;

  PERFORM log_audit('Transfert stock créé', 'commercial', 'transferts_stock', v_tr_id,
    jsonb_build_object('numero', v_numero));
  RETURN jsonb_build_object('id', v_tr_id, 'numero', v_numero);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION confirmer_transfert_stock(p_transfert_id uuid)
RETURNS jsonb AS $$
DECLARE v_tr record; v_ligne record; v_js_id uuid;
BEGIN
  SELECT * INTO v_tr FROM transferts_stock WHERE id = p_transfert_id AND statut = 'EN_ATTENTE';
  IF NOT FOUND THEN RAISE EXCEPTION 'Transfert non trouvé'; END IF;

  SELECT id INTO v_js_id FROM journees_stock
  WHERE magasin_id = v_tr.magasin_destination_id AND statut = 'OUVERTE' LIMIT 1;

  FOR v_ligne IN SELECT * FROM lignes_transfert_stock WHERE transfert_id = p_transfert_id LOOP
    IF v_js_id IS NOT NULL THEN
      INSERT INTO mouvements_stock (journee_stock_id, article_id, type, motif, quantite, description, effectue_par)
      VALUES (v_js_id, v_ligne.article_id, 'entree', 'approvisionnement', v_ligne.quantite,
        'Transfert ' || v_tr.numero || ' reçu de ' || (SELECT nom FROM magasins WHERE id = v_tr.magasin_source_id), auth.uid());
      UPDATE lignes_journee_stock SET total_entrees = total_entrees + v_ligne.quantite
      WHERE journee_stock_id = v_js_id AND article_id = v_ligne.article_id;
    END IF;
  END LOOP;

  UPDATE transferts_stock SET statut = 'CONFIRME', confirme_par = auth.uid() WHERE id = p_transfert_id;
  RETURN jsonb_build_object('statut', 'CONFIRME');
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;


-- ═══════════════════════════════════════════════════════════
-- TERMINÉ ! Lot 1 complet.
-- ═══════════════════════════════════════════════════════════

-- === PARTIE 3 : LOT 2 + LOT 3 + FIX FINAUX ===

-- ============================================================
-- LOT 2 : BOUTEILLES + ANALYSES VENTES
-- ============================================================

-- 1. TABLES BOUTEILLES
CREATE TABLE IF NOT EXISTS stock_bouteilles (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  magasin_id uuid NOT NULL REFERENCES magasins(id),
  type_bouteille text NOT NULL CHECK (type_bouteille IN ('50KG', '12.5KG', '6KG')),
  pleines integer NOT NULL DEFAULT 0,
  vides integer NOT NULL DEFAULT 0,
  updated_at timestamptz DEFAULT now(),
  UNIQUE (magasin_id, type_bouteille)
);
ALTER TABLE stock_bouteilles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "stock_bouteilles_all" ON stock_bouteilles FOR ALL TO authenticated USING (true) WITH CHECK (true);

CREATE TABLE IF NOT EXISTS mouvements_bouteilles (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  magasin_id uuid NOT NULL REFERENCES magasins(id),
  type_bouteille text NOT NULL CHECK (type_bouteille IN ('50KG', '12.5KG', '6KG')),
  type text NOT NULL CHECK (type IN ('entree', 'sortie')),
  pleines integer NOT NULL DEFAULT 0,
  vides integer NOT NULL DEFAULT 0,
  motif text, reference_id uuid, description text,
  effectue_par uuid REFERENCES profiles(id),
  created_at timestamptz DEFAULT now()
);
ALTER TABLE mouvements_bouteilles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "mouvements_bouteilles_all" ON mouvements_bouteilles FOR ALL TO authenticated USING (true) WITH CHECK (true);

INSERT INTO stock_bouteilles (magasin_id, type_bouteille)
SELECT m.id, t.type FROM magasins m
CROSS JOIN (VALUES ('50KG'), ('12.5KG'), ('6KG')) AS t(type)
WHERE m.statut = 'actif' ON CONFLICT DO NOTHING;

CREATE OR REPLACE FUNCTION enregistrer_mouvement_bouteilles(
  p_magasin_id uuid, p_type_bouteille text, p_type text,
  p_pleines integer DEFAULT 0, p_vides integer DEFAULT 0,
  p_motif text DEFAULT NULL, p_reference_id uuid DEFAULT NULL, p_description text DEFAULT NULL
) RETURNS jsonb AS $$
DECLARE v_id uuid;
BEGIN
  INSERT INTO mouvements_bouteilles (magasin_id, type_bouteille, type, pleines, vides, motif, reference_id, description, effectue_par)
  VALUES (p_magasin_id, p_type_bouteille, p_type, p_pleines, p_vides, p_motif, p_reference_id, p_description, auth.uid())
  RETURNING id INTO v_id;
  IF p_type = 'entree' THEN
    UPDATE stock_bouteilles SET pleines = pleines + p_pleines, vides = vides + p_vides, updated_at = now()
    WHERE magasin_id = p_magasin_id AND type_bouteille = p_type_bouteille;
  ELSE
    UPDATE stock_bouteilles SET pleines = pleines - p_pleines, vides = vides - p_vides, updated_at = now()
    WHERE magasin_id = p_magasin_id AND type_bouteille = p_type_bouteille;
  END IF;
  RETURN jsonb_build_object('id', v_id);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION calculer_bouteilles_livraison(p_commande_id uuid)
RETURNS jsonb AS $$
DECLARE v_result jsonb := '[]'::jsonb; v_type text; v_gpl_qty int; v_consigne_qty int;
BEGIN
  FOR v_type IN VALUES ('50KG'), ('12.5KG'), ('6KG') LOOP
    SELECT COALESCE(SUM(lc.quantite), 0) INTO v_gpl_qty
    FROM lignes_commande lc JOIN articles a ON a.id = lc.article_id
    WHERE lc.commande_id = p_commande_id AND a.nom = 'GPL ' || v_type;
    SELECT COALESCE(SUM(lc.quantite), 0) INTO v_consigne_qty
    FROM lignes_commande lc JOIN articles a ON a.id = lc.article_id
    WHERE lc.commande_id = p_commande_id AND a.nom = 'CONSIGNE ' || v_type;
    IF v_gpl_qty > 0 THEN
      v_result := v_result || jsonb_build_object('type', v_type,
        'pleines_a_donner', v_gpl_qty, 'vides_a_recevoir', GREATEST(v_gpl_qty - v_consigne_qty, 0), 'consignes', v_consigne_qty);
    END IF;
  END LOOP;
  RETURN v_result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 2. VUES ANALYSES VENTES (avec tonnage TM)
CREATE OR REPLACE VIEW v_ventes_par_client AS
SELECT cl.id as client_id, cl.nom_interne, cc.nom as categorie, ag.nom as agence_nom,
  COUNT(DISTINCT c.id) as nb_commandes, COUNT(DISTINCT f.id) as nb_factures,
  COALESCE(SUM(f.montant_total), 0) as ca_total, COALESCE(SUM(f.montant_regle), 0) as total_regle,
  COALESCE(SUM(f.montant_total - f.montant_regle), 0) as total_dettes,
  COALESCE(SUM(CASE WHEN a.nom='GPL 50KG' THEN lc.quantite*0.050 WHEN a.nom='GPL 12.5KG' THEN lc.quantite*0.0125 WHEN a.nom='GPL 6KG' THEN lc.quantite*0.006 ELSE 0 END), 0) as tonnage_tm
FROM clients cl LEFT JOIN categories_clients cc ON cc.id = cl.categorie_client_id LEFT JOIN agences ag ON ag.id = cl.agence_id
LEFT JOIN commandes c ON c.client_id = cl.id LEFT JOIN factures f ON f.commande_id = c.id
LEFT JOIN lignes_commande lc ON lc.commande_id = c.id LEFT JOIN articles a ON a.id = lc.article_id
GROUP BY cl.id, cl.nom_interne, cc.nom, ag.nom;

CREATE OR REPLACE VIEW v_ventes_par_agence AS
SELECT ag.id as agence_id, ag.nom as agence_nom, COUNT(DISTINCT c.id) as nb_commandes,
  COALESCE(SUM(f.montant_total), 0) as ca_total, COALESCE(SUM(f.montant_regle), 0) as total_regle,
  COALESCE(SUM(f.montant_total - f.montant_regle), 0) as total_dettes,
  COALESCE(SUM(CASE WHEN a.nom='GPL 50KG' THEN lc.quantite*0.050 WHEN a.nom='GPL 12.5KG' THEN lc.quantite*0.0125 WHEN a.nom='GPL 6KG' THEN lc.quantite*0.006 ELSE 0 END), 0) as tonnage_tm
FROM agences ag LEFT JOIN commandes c ON c.agence_id = ag.id LEFT JOIN factures f ON f.commande_id = c.id
LEFT JOIN lignes_commande lc ON lc.commande_id = c.id LEFT JOIN articles a ON a.id = lc.article_id
GROUP BY ag.id, ag.nom;

CREATE OR REPLACE VIEW v_ventes_par_article AS
SELECT a.id as article_id, a.nom as article_nom, a.categorie,
  COALESCE(SUM(lc.quantite), 0) as total_quantite,
  COALESCE(SUM(lc.quantite * lc.prix_unitaire), 0) as ca_total,
  COALESCE(SUM(CASE WHEN a.nom='GPL 50KG' THEN lc.quantite*0.050 WHEN a.nom='GPL 12.5KG' THEN lc.quantite*0.0125 WHEN a.nom='GPL 6KG' THEN lc.quantite*0.006 ELSE 0 END), 0) as tonnage_tm
FROM articles a LEFT JOIN lignes_commande lc ON lc.article_id = a.id
GROUP BY a.id, a.nom, a.categorie;

CREATE OR REPLACE VIEW v_ventes_par_jour AS
SELECT f.created_at::date as jour, COUNT(DISTINCT f.id) as nb_factures,
  COALESCE(SUM(f.montant_total), 0) as ca_total, COALESCE(SUM(f.montant_regle), 0) as total_regle,
  COALESCE(SUM(CASE WHEN a.nom='GPL 50KG' THEN lc.quantite*0.050 WHEN a.nom='GPL 12.5KG' THEN lc.quantite*0.0125 WHEN a.nom='GPL 6KG' THEN lc.quantite*0.006 ELSE 0 END), 0) as tonnage_tm
FROM factures f LEFT JOIN lignes_commande lc ON lc.commande_id = f.commande_id LEFT JOIN articles a ON a.id = lc.article_id
GROUP BY f.created_at::date ORDER BY jour DESC;

-- ============================================================
-- LOT 3 : WORKFLOWS + NOTIFICATIONS + PIÈCES JOINTES
-- ============================================================


-- ═══════════════════════════════════════════════════════════
-- 1. TABLE NOTIFICATIONS
-- ═══════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS notifications (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  destinataire_id uuid NOT NULL REFERENCES profiles(id),
  titre text NOT NULL,
  message text,
  type text DEFAULT 'info' CHECK (type IN ('info', 'action', 'alerte', 'succes')),
  module text,
  lien text,
  reference_id uuid,
  lu boolean DEFAULT false,
  created_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_notif_dest ON notifications(destinataire_id, lu);
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;
CREATE POLICY "notifications_all" ON notifications FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- Fonction helper : envoyer une notification
CREATE OR REPLACE FUNCTION envoyer_notification(
  p_dest_id uuid, p_titre text, p_message text DEFAULT NULL,
  p_type text DEFAULT 'info', p_module text DEFAULT 'commercial',
  p_lien text DEFAULT NULL, p_ref_id uuid DEFAULT NULL
) RETURNS uuid AS $$
DECLARE v_id uuid;
BEGIN
  INSERT INTO notifications (destinataire_id, titre, message, type, module, lien, reference_id)
  VALUES (p_dest_id, p_titre, p_message, p_type, p_module, p_lien, p_ref_id)
  RETURNING id INTO v_id;
  RETURN v_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Fonction helper : notifier tous les utilisateurs d'un rôle dans un module
CREATE OR REPLACE FUNCTION notifier_role(
  p_role_nom text, p_module_code text, p_titre text,
  p_message text DEFAULT NULL, p_type text DEFAULT 'action',
  p_lien text DEFAULT NULL, p_ref_id uuid DEFAULT NULL
) RETURNS void AS $$
DECLARE v_user_id uuid;
BEGIN
  FOR v_user_id IN
    SELECT DISTINCT p.id FROM profiles p
    JOIN service_role_module srm ON srm.service_id = p.service_id
    JOIN roles r ON r.id = srm.role_id
    JOIN modules m ON m.id = srm.module_id
    WHERE r.nom = p_role_nom AND m.code = p_module_code
  LOOP
    PERFORM envoyer_notification(v_user_id, p_titre, p_message, p_type, p_module_code, p_lien, p_ref_id);
  END LOOP;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Marquer comme lu
CREATE OR REPLACE FUNCTION marquer_notification_lue(p_notif_id uuid)
RETURNS void AS $$
BEGIN
  UPDATE notifications SET lu = true WHERE id = p_notif_id AND destinataire_id = auth.uid();
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;


-- ═══════════════════════════════════════════════════════════
-- 2. TABLE PIÈCES JOINTES
-- ═══════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS pieces_jointes (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  table_ref text NOT NULL,
  enregistrement_id uuid NOT NULL,
  nom_fichier text NOT NULL,
  url text NOT NULL,
  type_mime text,
  taille integer,
  uploade_par uuid REFERENCES profiles(id),
  created_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_pj_ref ON pieces_jointes(table_ref, enregistrement_id);
ALTER TABLE pieces_jointes ENABLE ROW LEVEL SECURITY;
CREATE POLICY "pieces_jointes_all" ON pieces_jointes FOR ALL TO authenticated USING (true) WITH CHECK (true);


-- ═══════════════════════════════════════════════════════════
-- 3. WORKFLOW RETOUR PRODUIT GPL
-- Chef agence initie → DG valide/rejette → magasinier sort
-- ═══════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS retours_produits (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  numero text NOT NULL UNIQUE,
  type_retour text NOT NULL CHECK (type_retour IN ('GPL', 'ACCESSOIRE')),
  agence_id uuid NOT NULL REFERENCES agences(id),
  magasin_id uuid NOT NULL REFERENCES magasins(id),
  client_id uuid REFERENCES clients(id),
  -- Infos GPL
  type_bouteille text CHECK (type_bouteille IN ('50KG', '12.5KG', '6KG')),
  poids_constate numeric(8,2),
  -- Infos communes
  numero_facture_achat text,
  date_achat date,
  motif_retour text NOT NULL,
  constat text,
  quantite integer NOT NULL DEFAULT 1,
  -- Workflow
  initie_par uuid NOT NULL REFERENCES profiles(id),
  statut text DEFAULT 'EN_ATTENTE_DG' CHECK (statut IN (
    'EN_ATTENTE_DG', 'VALIDE', 'REJETE', 'REMPLACEMENT_EFFECTUE', 'ANNULE'
  )),
  decision_dg text,
  valide_par uuid REFERENCES profiles(id),
  date_decision timestamptz,
  -- Pour accessoire rejeté : montant à payer pour correction
  montant_correction numeric(14,2),
  correction_payee boolean DEFAULT false,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE retours_produits ENABLE ROW LEVEL SECURITY;
CREATE POLICY "retours_produits_all" ON retours_produits FOR ALL TO authenticated USING (true) WITH CHECK (true);

CREATE OR REPLACE FUNCTION generer_numero_retour()
RETURNS text AS $$
DECLARE v_date text; v_seq int;
BEGIN
  v_date := to_char(now(), 'YYYYMMDD');
  SELECT COALESCE(MAX(CAST(SUBSTRING(numero FROM 'RET-' || v_date || '-(\d+)') AS int)), 0) + 1
  INTO v_seq FROM retours_produits WHERE numero LIKE 'RET-' || v_date || '-%';
  RETURN 'RET-' || v_date || '-' || LPAD(v_seq::text, 4, '0');
END;
$$ LANGUAGE plpgsql;

-- Chef d'agence initie un retour produit
CREATE OR REPLACE FUNCTION initier_retour_produit(
  p_type_retour text, p_agence_id uuid, p_magasin_id uuid, p_client_id uuid,
  p_type_bouteille text DEFAULT NULL, p_poids numeric DEFAULT NULL,
  p_numero_facture text DEFAULT NULL, p_date_achat date DEFAULT NULL,
  p_motif text DEFAULT '', p_constat text DEFAULT NULL, p_quantite integer DEFAULT 1
) RETURNS jsonb AS $$
DECLARE v_id uuid; v_numero text;
BEGIN
  v_numero := generer_numero_retour();
  INSERT INTO retours_produits (numero, type_retour, agence_id, magasin_id, client_id,
    type_bouteille, poids_constate, numero_facture_achat, date_achat,
    motif_retour, constat, quantite, initie_par)
  VALUES (v_numero, p_type_retour, p_agence_id, p_magasin_id, p_client_id,
    p_type_bouteille, p_poids, p_numero_facture, p_date_achat,
    p_motif, p_constat, p_quantite, auth.uid())
  RETURNING id INTO v_id;

  -- Notifier le DG
  PERFORM notifier_role('DG', 'commercial', 'Retour produit à valider',
    'Retour ' || v_numero || ' (' || p_type_retour || ') en attente de votre validation.',
    'action', '/commercial/dg/retours', v_id);

  PERFORM log_audit('Retour produit initié', 'commercial', 'retours_produits', v_id,
    jsonb_build_object('numero', v_numero, 'type', p_type_retour));

  RETURN jsonb_build_object('id', v_id, 'numero', v_numero);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- DG valide ou rejette le retour
CREATE OR REPLACE FUNCTION traiter_retour_produit(
  p_retour_id uuid, p_action text, p_decision text DEFAULT NULL, p_montant_correction numeric DEFAULT NULL
) RETURNS jsonb AS $$
DECLARE v_ret record;
BEGIN
  SELECT * INTO v_ret FROM retours_produits WHERE id = p_retour_id AND statut = 'EN_ATTENTE_DG';
  IF NOT FOUND THEN RAISE EXCEPTION 'Retour non trouvé ou déjà traité'; END IF;

  IF p_action = 'valide' THEN
    UPDATE retours_produits SET statut = 'VALIDE', decision_dg = p_decision,
      valide_par = auth.uid(), date_decision = now() WHERE id = p_retour_id;

    -- Notifier le magasinier pour sortir le remplacement
    PERFORM notifier_role('MAGASIN', 'commercial', 'Remplacement produit à effectuer',
      'Retour ' || v_ret.numero || ' validé par le DG. Préparez le remplacement.',
      'action', '/commercial/magasin/livraisons', p_retour_id);

    RETURN jsonb_build_object('statut', 'VALIDE');
  ELSE
    UPDATE retours_produits SET statut = 'REJETE', decision_dg = p_decision,
      valide_par = auth.uid(), date_decision = now(),
      montant_correction = p_montant_correction WHERE id = p_retour_id;

    -- Notifier le chef d'agence du rejet
    PERFORM envoyer_notification(v_ret.initie_par, 'Retour produit rejeté',
      'Retour ' || v_ret.numero || ' rejeté. ' || COALESCE(p_decision, ''),
      'alerte', 'commercial', '/commercial/agence/retours', p_retour_id);

    RETURN jsonb_build_object('statut', 'REJETE');
  END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;


-- ═══════════════════════════════════════════════════════════
-- 4. WORKFLOW DÉCONSIGNATION
-- Chef agence initie → DG valide → besoin auto → caisse décaisse → magasinier
-- ═══════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS deconsignations (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  numero text NOT NULL UNIQUE,
  agence_id uuid NOT NULL REFERENCES agences(id),
  magasin_id uuid NOT NULL REFERENCES magasins(id),
  client_id uuid NOT NULL REFERENCES clients(id),
  type_bouteille text NOT NULL CHECK (type_bouteille IN ('50KG', '12.5KG', '6KG')),
  quantite integer NOT NULL DEFAULT 1,
  montant_rachat numeric(14,2) NOT NULL,
  initie_par uuid NOT NULL REFERENCES profiles(id),
  statut text DEFAULT 'EN_ATTENTE_DG' CHECK (statut IN (
    'EN_ATTENTE_DG', 'VALIDE_DG', 'BESOIN_EMIS', 'DECAISSE', 'TERMINE', 'REJETE'
  )),
  valide_par uuid REFERENCES profiles(id),
  besoin_id uuid,
  date_decision timestamptz,
  notes text,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE deconsignations ENABLE ROW LEVEL SECURITY;
CREATE POLICY "deconsignations_all" ON deconsignations FOR ALL TO authenticated USING (true) WITH CHECK (true);

CREATE OR REPLACE FUNCTION generer_numero_deconsignation()
RETURNS text AS $$
DECLARE v_date text; v_seq int;
BEGIN
  v_date := to_char(now(), 'YYYYMMDD');
  SELECT COALESCE(MAX(CAST(SUBSTRING(numero FROM 'DEC-' || v_date || '-(\d+)') AS int)), 0) + 1
  INTO v_seq FROM deconsignations WHERE numero LIKE 'DEC-' || v_date || '-%';
  RETURN 'DEC-' || v_date || '-' || LPAD(v_seq::text, 4, '0');
END;
$$ LANGUAGE plpgsql;

-- Chef d'agence initie une déconsignation
CREATE OR REPLACE FUNCTION initier_deconsignation(
  p_agence_id uuid, p_magasin_id uuid, p_client_id uuid,
  p_type_bouteille text, p_quantite integer, p_montant numeric, p_notes text DEFAULT NULL
) RETURNS jsonb AS $$
DECLARE v_id uuid; v_numero text;
BEGIN
  v_numero := generer_numero_deconsignation();
  INSERT INTO deconsignations (numero, agence_id, magasin_id, client_id, type_bouteille, quantite, montant_rachat, initie_par, notes)
  VALUES (v_numero, p_agence_id, p_magasin_id, p_client_id, p_type_bouteille, p_quantite, p_montant, auth.uid(), p_notes)
  RETURNING id INTO v_id;

  PERFORM notifier_role('DG', 'commercial', 'Déconsignation à valider',
    'Déconsignation ' || v_numero || ' (' || p_quantite || 'x ' || p_type_bouteille || ') montant: ' || p_montant || 'F',
    'action', '/commercial/dg/deconsignations', v_id);

  PERFORM log_audit('Déconsignation initiée', 'commercial', 'deconsignations', v_id,
    jsonb_build_object('numero', v_numero, 'montant', p_montant));

  RETURN jsonb_build_object('id', v_id, 'numero', v_numero);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- DG valide → notifie le COMM pour émettre le besoin
CREATE OR REPLACE FUNCTION valider_deconsignation(p_deconsignation_id uuid, p_action text)
RETURNS jsonb AS $$
DECLARE v_dec record;
BEGIN
  SELECT * INTO v_dec FROM deconsignations WHERE id = p_deconsignation_id AND statut = 'EN_ATTENTE_DG';
  IF NOT FOUND THEN RAISE EXCEPTION 'Déconsignation non trouvée'; END IF;

  IF p_action = 'valide' THEN
    UPDATE deconsignations SET statut = 'VALIDE_DG', valide_par = auth.uid(), date_decision = now()
    WHERE id = p_deconsignation_id;

    -- Notifier COMM pour émettre le besoin
    PERFORM notifier_role('COMM', 'commercial', 'Besoin à émettre pour déconsignation',
      'Déconsignation ' || v_dec.numero || ' validée. Montant: ' || v_dec.montant_rachat || 'F. Émettez le besoin.',
      'action', '/besoins/employe/creer-besoin', p_deconsignation_id);

    RETURN jsonb_build_object('statut', 'VALIDE_DG');
  ELSE
    UPDATE deconsignations SET statut = 'REJETE', valide_par = auth.uid(), date_decision = now()
    WHERE id = p_deconsignation_id;

    PERFORM envoyer_notification(v_dec.initie_par, 'Déconsignation rejetée',
      'Déconsignation ' || v_dec.numero || ' rejetée par le DG.',
      'alerte', 'commercial', NULL, p_deconsignation_id);

    RETURN jsonb_build_object('statut', 'REJETE');
  END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;


-- ═══════════════════════════════════════════════════════════
-- 5. ORDRE DE PUBLICITÉ (DG → Audit → Magasinier)
-- ═══════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS ordres_publicite (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  numero text NOT NULL UNIQUE,
  magasin_id uuid NOT NULL REFERENCES magasins(id),
  initie_par uuid NOT NULL REFERENCES profiles(id),
  valide_par_audit uuid REFERENCES profiles(id),
  statut text DEFAULT 'EN_ATTENTE_AUDIT' CHECK (statut IN (
    'EN_ATTENTE_AUDIT', 'VALIDE_AUDIT', 'LIVRE', 'REJETE', 'ANNULE'
  )),
  motif text NOT NULL,
  beneficiaire text,
  notes text,
  date_validation timestamptz,
  date_livraison timestamptz,
  created_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS lignes_ordre_publicite (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  ordre_id uuid NOT NULL REFERENCES ordres_publicite(id) ON DELETE CASCADE,
  article_id uuid NOT NULL REFERENCES articles(id),
  quantite integer NOT NULL CHECK (quantite > 0),
  created_at timestamptz DEFAULT now()
);

ALTER TABLE ordres_publicite ENABLE ROW LEVEL SECURITY;
ALTER TABLE lignes_ordre_publicite ENABLE ROW LEVEL SECURITY;
CREATE POLICY "ordres_publicite_all" ON ordres_publicite FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "lignes_ordre_publicite_all" ON lignes_ordre_publicite FOR ALL TO authenticated USING (true) WITH CHECK (true);

CREATE OR REPLACE FUNCTION generer_numero_pub()
RETURNS text AS $$
DECLARE v_date text; v_seq int;
BEGIN
  v_date := to_char(now(), 'YYYYMMDD');
  SELECT COALESCE(MAX(CAST(SUBSTRING(numero FROM 'PUB-' || v_date || '-(\d+)') AS int)), 0) + 1
  INTO v_seq FROM ordres_publicite WHERE numero LIKE 'PUB-' || v_date || '-%';
  RETURN 'PUB-' || v_date || '-' || LPAD(v_seq::text, 4, '0');
END;
$$ LANGUAGE plpgsql;

-- DG crée un ordre de publicité
CREATE OR REPLACE FUNCTION creer_ordre_publicite(
  p_magasin_id uuid, p_motif text, p_beneficiaire text, p_lignes jsonb
) RETURNS jsonb AS $$
DECLARE v_id uuid; v_numero text; v_item jsonb;
BEGIN
  v_numero := generer_numero_pub();
  INSERT INTO ordres_publicite (numero, magasin_id, initie_par, motif, beneficiaire)
  VALUES (v_numero, p_magasin_id, auth.uid(), p_motif, p_beneficiaire)
  RETURNING id INTO v_id;

  FOR v_item IN SELECT * FROM jsonb_array_elements(p_lignes) LOOP
    INSERT INTO lignes_ordre_publicite (ordre_id, article_id, quantite)
    VALUES (v_id, (v_item->>'article_id')::uuid, (v_item->>'quantite')::int);
  END LOOP;

  -- Notifier l'audit pour validation
  PERFORM notifier_role('AUDIT', 'commercial', 'Ordre de publicité à valider',
    'Ordre ' || v_numero || ' créé par le DG pour ' || COALESCE(p_beneficiaire, '—'),
    'action', '/commercial/audit/publicites', v_id);

  PERFORM log_audit('Ordre publicité créé', 'commercial', 'ordres_publicite', v_id,
    jsonb_build_object('numero', v_numero));

  RETURN jsonb_build_object('id', v_id, 'numero', v_numero);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Audit valide → transfert au magasinier
CREATE OR REPLACE FUNCTION valider_ordre_publicite(p_ordre_id uuid, p_action text)
RETURNS jsonb AS $$
DECLARE v_op record;
BEGIN
  SELECT * INTO v_op FROM ordres_publicite WHERE id = p_ordre_id AND statut = 'EN_ATTENTE_AUDIT';
  IF NOT FOUND THEN RAISE EXCEPTION 'Ordre non trouvé'; END IF;

  IF p_action = 'valide' THEN
    UPDATE ordres_publicite SET statut = 'VALIDE_AUDIT', valide_par_audit = auth.uid(), date_validation = now()
    WHERE id = p_ordre_id;

    PERFORM notifier_role('MAGASIN', 'commercial', 'Ordre de publicité à livrer',
      'Ordre ' || v_op.numero || ' validé par l''audit. Préparez la livraison.',
      'action', '/commercial/magasin/livraisons', p_ordre_id);

    RETURN jsonb_build_object('statut', 'VALIDE_AUDIT');
  ELSE
    UPDATE ordres_publicite SET statut = 'REJETE', valide_par_audit = auth.uid(), date_validation = now()
    WHERE id = p_ordre_id;
    RETURN jsonb_build_object('statut', 'REJETE');
  END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;


-- ═══════════════════════════════════════════════════════════
-- 6. CONFIRMATION TRANSFERT CAISSE PAR RÉCEPTRICE
-- ═══════════════════════════════════════════════════════════

-- Ajouter colonnes de confirmation sur mouvements_caisse
ALTER TABLE mouvements_caisse
  ADD COLUMN IF NOT EXISTS confirmation_statut text DEFAULT NULL CHECK (confirmation_statut IN ('EN_ATTENTE', 'CONFIRME', 'REJETE')),
  ADD COLUMN IF NOT EXISTS confirme_par uuid REFERENCES profiles(id),
  ADD COLUMN IF NOT EXISTS date_confirmation timestamptz,
  ADD COLUMN IF NOT EXISTS caisse_source_id uuid REFERENCES caisses(id);

-- Modifier enregistrer_mouvement_caisse pour les transferts avec confirmation
CREATE OR REPLACE FUNCTION enregistrer_mouvement_caisse(
  p_journee_caisse_id uuid, p_type text, p_montant numeric,
  p_description text DEFAULT NULL, p_reference text DEFAULT NULL,
  p_mode text DEFAULT 'cash', p_facture_id uuid DEFAULT NULL,
  p_banque_id uuid DEFAULT NULL, p_caisse_destination_id uuid DEFAULT NULL
) RETURNS jsonb AS $$
DECLARE v_mvt_id uuid; v_jc record; v_jc_dest_id uuid; v_mvt_in_id uuid;
BEGIN
  SELECT * INTO v_jc FROM journees_caisse WHERE id = p_journee_caisse_id AND statut = 'OUVERTE';
  IF NOT FOUND THEN RAISE EXCEPTION 'Journée de caisse non ouverte'; END IF;

  INSERT INTO mouvements_caisse (journee_caisse_id, type, montant, mode, description, reference, facture_id, banque_id, caisse_destination_id, effectue_par)
  VALUES (p_journee_caisse_id, p_type, p_montant, p_mode, p_description, p_reference, p_facture_id, p_banque_id, p_caisse_destination_id, auth.uid())
  RETURNING id INTO v_mvt_id;

  IF p_type = 'encaissement' THEN
    UPDATE journees_caisse SET total_encaissements = total_encaissements + p_montant WHERE id = p_journee_caisse_id;
  ELSIF p_type = 'decaissement' THEN
    UPDATE journees_caisse SET total_decaissements = total_decaissements + p_montant WHERE id = p_journee_caisse_id;
  ELSIF p_type = 'versement_banque' THEN
    UPDATE journees_caisse SET total_versements = total_versements + p_montant WHERE id = p_journee_caisse_id;
  ELSIF p_type = 'transfert_out' THEN
    UPDATE journees_caisse SET total_transferts_out = total_transferts_out + p_montant WHERE id = p_journee_caisse_id;

    -- Créer transfert_in EN ATTENTE de confirmation sur la caisse destination
    IF p_caisse_destination_id IS NOT NULL THEN
      SELECT id INTO v_jc_dest_id FROM journees_caisse
      WHERE caisse_id = p_caisse_destination_id AND statut = 'OUVERTE' LIMIT 1;

      IF v_jc_dest_id IS NOT NULL THEN
        INSERT INTO mouvements_caisse (journee_caisse_id, type, montant, mode, description, caisse_source_id, effectue_par, confirmation_statut)
        VALUES (v_jc_dest_id, 'transfert_in', p_montant, 'cash',
          'Transfert reçu de ' || (SELECT nom FROM caisses WHERE id = v_jc.caisse_id),
          v_jc.caisse_id, auth.uid(), 'EN_ATTENTE')
        RETURNING id INTO v_mvt_in_id;

        -- NE PAS mettre à jour le total_transferts_in ici — attendre la confirmation
      END IF;
    END IF;

  ELSIF p_type = 'transfert_in' THEN
    UPDATE journees_caisse SET total_transferts_in = total_transferts_in + p_montant WHERE id = p_journee_caisse_id;
  END IF;

  PERFORM log_audit('Mouvement caisse: ' || p_type, 'commercial', 'mouvements_caisse', v_mvt_id,
    jsonb_build_object('montant', p_montant, 'type', p_type));

  RETURN jsonb_build_object('id', v_mvt_id, 'type', p_type, 'montant', p_montant);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Caisse réceptrice confirme ou rejette le transfert
CREATE OR REPLACE FUNCTION confirmer_transfert_caisse(p_mouvement_id uuid, p_action text, p_montant_recu numeric DEFAULT NULL)
RETURNS jsonb AS $$
DECLARE v_mvt record; v_jc_id uuid; v_src_caisse_id uuid; v_jc_src_id uuid;
BEGIN
  SELECT * INTO v_mvt FROM mouvements_caisse
  WHERE id = p_mouvement_id AND type = 'transfert_in' AND confirmation_statut = 'EN_ATTENTE';
  IF NOT FOUND THEN RAISE EXCEPTION 'Transfert non trouvé ou déjà traité'; END IF;

  IF p_action = 'confirme' THEN
    UPDATE mouvements_caisse SET confirmation_statut = 'CONFIRME', confirme_par = auth.uid(), date_confirmation = now()
    WHERE id = p_mouvement_id;

    -- Mettre à jour le total_transferts_in maintenant
    UPDATE journees_caisse SET total_transferts_in = total_transferts_in + v_mvt.montant
    WHERE id = v_mvt.journee_caisse_id;

    RETURN jsonb_build_object('statut', 'CONFIRME');
  ELSE
    -- Rejet : retourner l'argent à la caisse source
    UPDATE mouvements_caisse SET confirmation_statut = 'REJETE', confirme_par = auth.uid(), date_confirmation = now()
    WHERE id = p_mouvement_id;

    -- Trouver la caisse source et ajouter un encaissement "transfert rejeté"
    v_src_caisse_id := v_mvt.caisse_source_id;
    IF v_src_caisse_id IS NOT NULL THEN
      SELECT id INTO v_jc_src_id FROM journees_caisse
      WHERE caisse_id = v_src_caisse_id AND statut = 'OUVERTE' LIMIT 1;

      IF v_jc_src_id IS NOT NULL THEN
        -- Annuler le transfert_out en ajoutant un encaissement retour
        INSERT INTO mouvements_caisse (journee_caisse_id, type, montant, mode, description, effectue_par)
        VALUES (v_jc_src_id, 'encaissement', v_mvt.montant, 'cash',
          'Transfert rejeté — retour automatique', auth.uid());
        UPDATE journees_caisse SET total_encaissements = total_encaissements + v_mvt.montant WHERE id = v_jc_src_id;
      END IF;
    END IF;

    RETURN jsonb_build_object('statut', 'REJETE');
  END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;


-- ═══════════════════════════════════════════════════════════
-- 7. AJOUTER NOTIFICATIONS DANS LES FONCTIONS EXISTANTES
-- ═══════════════════════════════════════════════════════════

-- Quand une commande est facturée → notifier CAISSE et MAGASIN
CREATE OR REPLACE FUNCTION facturer_commande(p_commande_id uuid, p_magasin_id uuid)
RETURNS jsonb AS $$
DECLARE
  v_numero text; v_facture_id uuid; v_total numeric; v_client_id uuid;
  v_est_centre boolean; v_ligne record; v_prix numeric;
BEGIN
  SELECT client_id INTO v_client_id FROM commandes WHERE id = p_commande_id AND statut IN ('BROUILLON', 'A_FACTURER');
  IF NOT FOUND THEN RAISE EXCEPTION 'Commande non facturable'; END IF;
  SELECT est_centre_enfuteur INTO v_est_centre FROM magasins WHERE id = p_magasin_id;
  IF v_est_centre THEN
    FOR v_ligne IN SELECT lc.id, lc.article_id, a.categorie
      FROM lignes_commande lc JOIN articles a ON a.id = lc.article_id WHERE lc.commande_id = p_commande_id
    LOOP
      IF v_ligne.categorie = 'GPL' THEN
        SELECT prix INTO v_prix FROM prix_centre_enfuteur WHERE article_id = v_ligne.article_id;
        IF FOUND THEN UPDATE lignes_commande SET prix_unitaire = v_prix WHERE id = v_ligne.id; END IF;
      END IF;
    END LOOP;
  END IF;
  PERFORM appliquer_seuils_commande(p_commande_id, p_magasin_id);
  SELECT COALESCE(SUM(quantite * prix_unitaire), 0) INTO v_total FROM lignes_commande WHERE commande_id = p_commande_id;
  v_numero := generer_numero_facture();
  INSERT INTO factures (numero, commande_id, magasin_id, facture_par, montant_total, statut)
  VALUES (v_numero, p_commande_id, p_magasin_id, auth.uid(), v_total, 'EN_ATTENTE')
  RETURNING id INTO v_facture_id;
  UPDATE commandes SET statut = 'FACTUREE' WHERE id = p_commande_id;

  PERFORM log_audit('Commande facturée', 'commercial', 'factures', v_facture_id,
    jsonb_build_object('numero', v_numero, 'montant', v_total));

  RETURN jsonb_build_object('facture_id', v_facture_id, 'numero', v_numero, 'montant_total', v_total);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Quand le DG valide une dette → notifier MAGASIN
CREATE OR REPLACE FUNCTION valider_dette_dg(p_facture_id uuid, p_action text)
RETURNS jsonb AS $$
DECLARE v_commande_id uuid; v_facture record;
BEGIN
  SELECT * INTO v_facture FROM factures WHERE id = p_facture_id AND statut = 'EN_ATTENTE_DG';
  IF NOT FOUND THEN RAISE EXCEPTION 'Facture non en attente DG'; END IF;
  v_commande_id := v_facture.commande_id;

  IF p_action = 'valide' THEN
    UPDATE factures SET statut = 'DETTE_VALIDEE' WHERE id = p_facture_id;
    UPDATE commandes SET statut = 'REGLEE' WHERE id = v_commande_id;
    INSERT INTO bons_livraison (numero, facture_id, magasin_id)
    SELECT generer_numero_bl(), p_facture_id, magasin_id FROM factures WHERE id = p_facture_id;

    -- Notifier le magasinier
    PERFORM notifier_role('MAGASIN', 'commercial', 'Commande à livrer',
      'Facture ' || v_facture.numero || ' validée par le DG. BL généré.',
      'action', '/commercial/magasin/livraisons', p_facture_id);

    PERFORM log_audit('Dette validée par DG', 'commercial', 'factures', p_facture_id, jsonb_build_object('action', 'valide'));
    RETURN jsonb_build_object('statut', 'DETTE_VALIDEE');
  ELSE
    UPDATE factures SET statut = 'ANNULEE' WHERE id = p_facture_id;
    UPDATE commandes SET statut = 'ANNULEE' WHERE id = v_commande_id;

    PERFORM log_audit('Dette rejetée par DG', 'commercial', 'factures', p_facture_id, jsonb_build_object('action', 'rejete'));
    RETURN jsonb_build_object('statut', 'ANNULEE');
  END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;


-- ═══════════════════════════════════════════════════════════
-- TERMINÉ ! Lot 3 complet.
-- ═══════════════════════════════════════════════════════════

-- ============================================================
-- FIX : VALIDATION CONSIGNE + CONTRÔLE SERVEUR
-- ============================================================

-- Ajouter la validation consigne dans creer_commande
CREATE OR REPLACE FUNCTION creer_commande(p_client_id uuid, p_agence_id uuid, p_lignes jsonb)
RETURNS jsonb AS $$
DECLARE
  v_numero text; v_commande_id uuid; v_ligne jsonb; v_art_id uuid; v_qty int; v_prix numeric;
  v_type text; v_gpl_qty int; v_consigne_qty int;
BEGIN
  v_numero := generer_numero_commande();
  INSERT INTO commandes (numero, client_id, agence_id, cree_par, statut)
  VALUES (v_numero, p_client_id, p_agence_id, auth.uid(), 'BROUILLON')
  RETURNING id INTO v_commande_id;

  FOR v_ligne IN SELECT * FROM jsonb_array_elements(p_lignes) LOOP
    v_art_id := (v_ligne->>'article_id')::uuid;
    v_qty := (v_ligne->>'quantite')::int;
    v_prix := get_prix_client(p_client_id, v_art_id);
    INSERT INTO lignes_commande (commande_id, article_id, quantite, prix_unitaire)
    VALUES (v_commande_id, v_art_id, v_qty, v_prix);
  END LOOP;

  -- Validation consigne : pas de consigne sans GPL du même type en quantité >= 
  FOR v_type IN VALUES ('50KG'), ('12.5KG'), ('6KG') LOOP
    SELECT COALESCE(SUM(lc.quantite), 0) INTO v_consigne_qty
    FROM lignes_commande lc JOIN articles a ON a.id = lc.article_id
    WHERE lc.commande_id = v_commande_id AND a.nom = 'CONSIGNE ' || v_type;

    IF v_consigne_qty > 0 THEN
      SELECT COALESCE(SUM(lc.quantite), 0) INTO v_gpl_qty
      FROM lignes_commande lc JOIN articles a ON a.id = lc.article_id
      WHERE lc.commande_id = v_commande_id AND a.nom = 'GPL ' || v_type;

      IF v_gpl_qty < v_consigne_qty THEN
        RAISE EXCEPTION 'Impossible de vendre % CONSIGNE % sans au moins % GPL %. La vente d''une bouteille vide est interdite.', v_consigne_qty, v_type, v_consigne_qty, v_type;
      END IF;
    END IF;
  END LOOP;

  PERFORM log_audit('Commande créée', 'commercial', 'commandes', v_commande_id,
    jsonb_build_object('numero', v_numero, 'client_id', p_client_id));

  RETURN jsonb_build_object('id', v_commande_id, 'numero', v_numero);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================
-- FIX : CAISSE TEMPORAIRE + STOCK CHECK + NOTIF MAGASIN
-- ============================================================

-- 1. Modifier enregistrer_reglement pour :
--    a) Marquer cash comme caisse temporaire si pas CAISSE
--    b) Notifier le MAGASIN quand BL est généré
CREATE OR REPLACE FUNCTION enregistrer_reglement(p_facture_id uuid, p_reglements jsonb)
RETURNS jsonb AS $$
DECLARE
  v_regl jsonb; v_total_regle numeric := 0; v_montant_total numeric;
  v_facture_statut text; v_commande_id uuid;
  v_jc_id uuid; v_caisse_id uuid;
  v_user_is_caisse boolean := false;
  v_magasin_id uuid;
BEGIN
  SELECT montant_total, commande_id INTO v_montant_total, v_commande_id
  FROM factures WHERE id = p_facture_id AND statut IN ('EN_ATTENTE', 'PARTIELLE');
  IF NOT FOUND THEN RAISE EXCEPTION 'Facture non réglable'; END IF;

  -- Vérifier si l'utilisateur a le rôle CAISSE
  SELECT EXISTS (
    SELECT 1 FROM service_role_module srm
    JOIN roles r ON r.id = srm.role_id
    JOIN modules m ON m.id = srm.module_id
    JOIN profiles p ON p.service_id = srm.service_id
    WHERE p.id = auth.uid() AND r.nom = 'CAISSE' AND m.code = 'commercial'
  ) INTO v_user_is_caisse;

  FOR v_regl IN SELECT * FROM jsonb_array_elements(p_reglements) LOOP
    v_caisse_id := NULLIF(v_regl->>'caisse_id', '')::uuid;

    INSERT INTO reglements (facture_id, mode, montant, banque_id, reference_cheque, encaisse_par, caisse_id, est_caisse_temporaire)
    VALUES (
      p_facture_id, v_regl->>'mode', (v_regl->>'montant')::numeric,
      NULLIF(v_regl->>'banque_id', '')::uuid, NULLIF(v_regl->>'reference_cheque', ''),
      auth.uid(), v_caisse_id,
      -- Cash va en caisse temporaire si l'opération n'est pas faite par la caissière
      CASE WHEN (v_regl->>'mode') = 'cash' AND NOT v_user_is_caisse THEN true ELSE false END
    );
    v_total_regle := v_total_regle + (v_regl->>'montant')::numeric;

    -- Mouvement caisse auto si cash + caisse spécifiée + caissière
    IF (v_regl->>'mode') = 'cash' AND v_caisse_id IS NOT NULL AND v_user_is_caisse THEN
      SELECT id INTO v_jc_id FROM journees_caisse
      WHERE caisse_id = v_caisse_id AND statut = 'OUVERTE' LIMIT 1;

      IF v_jc_id IS NOT NULL THEN
        INSERT INTO mouvements_caisse (journee_caisse_id, type, montant, mode, description, facture_id, effectue_par)
        VALUES (v_jc_id, 'encaissement', (v_regl->>'montant')::numeric, 'cash',
          'Règlement facture (auto)', p_facture_id, auth.uid());
        UPDATE journees_caisse SET total_encaissements = total_encaissements + (v_regl->>'montant')::numeric
        WHERE id = v_jc_id;
      END IF;
    END IF;
  END LOOP;

  UPDATE factures SET montant_regle = montant_regle + v_total_regle WHERE id = p_facture_id;
  SELECT montant_regle, magasin_id INTO v_total_regle, v_magasin_id FROM factures WHERE id = p_facture_id;

  IF v_total_regle >= v_montant_total THEN
    UPDATE factures SET statut = 'REGLEE' WHERE id = p_facture_id;
    UPDATE commandes SET statut = 'REGLEE' WHERE id = v_commande_id;
    INSERT INTO bons_livraison (numero, facture_id, magasin_id)
    SELECT generer_numero_bl(), p_facture_id, v_magasin_id;
    v_facture_statut := 'REGLEE';

    -- Notifier le MAGASIN
    PERFORM notifier_role('MAGASIN', 'commercial', 'Commande à livrer',
      'Facture réglée — bon de livraison généré. Préparez la livraison.',
      'action', '/commercial/magasin/livraisons', p_facture_id);
  ELSE
    UPDATE factures SET statut = 'EN_ATTENTE_DG', type_reglement = 'partiel' WHERE id = p_facture_id;
    UPDATE commandes SET statut = 'EN_ATTENTE_DG' WHERE id = v_commande_id;
    v_facture_statut := 'EN_ATTENTE_DG';

    -- Notifier le DG
    PERFORM notifier_role('DG', 'commercial', 'Dette client à valider',
      'Facture avec paiement partiel en attente de votre validation.',
      'action', '/commercial/dg', p_facture_id);
  END IF;

  PERFORM log_audit('Règlement enregistré', 'commercial', 'reglements', p_facture_id,
    jsonb_build_object('statut', v_facture_statut, 'montant', v_total_regle));

  RETURN jsonb_build_object('statut', v_facture_statut, 'montant_regle', v_total_regle);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;


-- 2. Modifier confirmer_livraison pour vérifier le stock
CREATE OR REPLACE FUNCTION confirmer_livraison(p_bl_id uuid)
RETURNS jsonb AS $$
DECLARE
  v_bl record;
  v_facture record;
  v_commande record;
  v_js_id uuid;
  v_ligne record;
  v_stock_dispo integer;
BEGIN
  SELECT * INTO v_bl FROM bons_livraison WHERE id = p_bl_id AND statut = 'A_LIVRER';
  IF NOT FOUND THEN RAISE EXCEPTION 'Bon de livraison non trouvé ou déjà livré'; END IF;

  SELECT * INTO v_facture FROM factures WHERE id = v_bl.facture_id;
  SELECT * INTO v_commande FROM commandes WHERE id = v_facture.commande_id;

  -- Trouver la journée de stock ouverte
  SELECT id INTO v_js_id FROM journees_stock
  WHERE magasin_id = v_bl.magasin_id AND statut = 'OUVERTE' LIMIT 1;

  -- Vérifier le stock pour chaque article AVANT de livrer
  IF v_js_id IS NOT NULL THEN
    FOR v_ligne IN
      SELECT lc.article_id, lc.quantite, a.nom as article_nom
      FROM lignes_commande lc
      JOIN articles a ON a.id = lc.article_id
      WHERE lc.commande_id = v_commande.id
    LOOP
      SELECT COALESCE(stock_ouverture + total_entrees - total_sorties, 0) INTO v_stock_dispo
      FROM lignes_journee_stock
      WHERE journee_stock_id = v_js_id AND article_id = v_ligne.article_id;

      v_stock_dispo := COALESCE(v_stock_dispo, 0);

      IF v_stock_dispo < v_ligne.quantite THEN
        RAISE EXCEPTION 'Stock insuffisant pour % : disponible %, demandé %. Livraison impossible.',
          v_ligne.article_nom, v_stock_dispo, v_ligne.quantite;
      END IF;
    END LOOP;
  END IF;

  -- Stock OK → confirmer la livraison
  UPDATE bons_livraison SET statut = 'LIVRE', livre_par = auth.uid(), date_livraison = now()
  WHERE id = p_bl_id;
  UPDATE commandes SET statut = 'LIVREE' WHERE id = v_commande.id;

  -- Créer les mouvements stock sortie
  IF v_js_id IS NOT NULL THEN
    FOR v_ligne IN
      SELECT lc.article_id, lc.quantite
      FROM lignes_commande lc WHERE lc.commande_id = v_commande.id
    LOOP
      INSERT INTO mouvements_stock (journee_stock_id, article_id, type, motif, quantite, description, bon_livraison_id, effectue_par)
      VALUES (v_js_id, v_ligne.article_id, 'sortie', 'livraison', v_ligne.quantite,
        'Livraison ' || v_bl.numero || ' (auto)', p_bl_id, auth.uid());

      UPDATE lignes_journee_stock SET total_sorties = total_sorties + v_ligne.quantite
      WHERE journee_stock_id = v_js_id AND article_id = v_ligne.article_id;
    END LOOP;
  END IF;

  PERFORM log_audit('Livraison confirmée', 'commercial', 'bons_livraison', p_bl_id,
    jsonb_build_object('commande', v_commande.numero, 'magasin_id', v_bl.magasin_id));

  RETURN jsonb_build_object('statut', 'LIVRE', 'bl_numero', v_bl.numero);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- === FIN ===
-- ============================================================
-- FIX : NOTIFICATIONS À CHAQUE ÉTAPE DU WORKFLOW
-- ============================================================

-- 1. Facture créée → CAISSE notifiée "Facture à encaisser"
CREATE OR REPLACE FUNCTION facturer_commande(p_commande_id uuid, p_magasin_id uuid)
RETURNS jsonb AS $$
DECLARE
  v_numero text; v_facture_id uuid; v_total numeric; v_client_id uuid;
  v_est_centre boolean; v_ligne record; v_prix numeric;
BEGIN
  SELECT client_id INTO v_client_id FROM commandes WHERE id = p_commande_id AND statut IN ('BROUILLON', 'A_FACTURER');
  IF NOT FOUND THEN RAISE EXCEPTION 'Commande non facturable'; END IF;
  SELECT est_centre_enfuteur INTO v_est_centre FROM magasins WHERE id = p_magasin_id;
  IF v_est_centre THEN
    FOR v_ligne IN SELECT lc.id, lc.article_id, a.categorie
      FROM lignes_commande lc JOIN articles a ON a.id = lc.article_id WHERE lc.commande_id = p_commande_id
    LOOP
      IF v_ligne.categorie = 'GPL' THEN
        SELECT prix INTO v_prix FROM prix_centre_enfuteur WHERE article_id = v_ligne.article_id;
        IF FOUND THEN UPDATE lignes_commande SET prix_unitaire = v_prix WHERE id = v_ligne.id; END IF;
      END IF;
    END LOOP;
  END IF;
  PERFORM appliquer_seuils_commande(p_commande_id, p_magasin_id);
  SELECT COALESCE(SUM(quantite * prix_unitaire), 0) INTO v_total FROM lignes_commande WHERE commande_id = p_commande_id;
  v_numero := generer_numero_facture();
  INSERT INTO factures (numero, commande_id, magasin_id, facture_par, montant_total, statut)
  VALUES (v_numero, p_commande_id, p_magasin_id, auth.uid(), v_total, 'EN_ATTENTE')
  RETURNING id INTO v_facture_id;
  UPDATE commandes SET statut = 'FACTUREE' WHERE id = p_commande_id;

  -- ★ NOTIFIER LA CAISSE qu'une facture est prête à encaisser
  PERFORM notifier_role('CAISSE', 'commercial', 'Facture à encaisser',
    'Facture ' || v_numero || ' — Montant: ' || v_total || ' F. En attente de règlement.',
    'action', '/commercial/caisse/encaissements', v_facture_id);

  PERFORM log_audit('Commande facturée', 'commercial', 'factures', v_facture_id,
    jsonb_build_object('numero', v_numero, 'montant', v_total));

  RETURN jsonb_build_object('facture_id', v_facture_id, 'numero', v_numero, 'montant_total', v_total);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;


-- 2. Livraison confirmée → notifier celui qui a créé la commande
CREATE OR REPLACE FUNCTION confirmer_livraison(p_bl_id uuid)
RETURNS jsonb AS $$
DECLARE
  v_bl record; v_facture record; v_commande record;
  v_js_id uuid; v_ligne record; v_stock_dispo integer;
BEGIN
  SELECT * INTO v_bl FROM bons_livraison WHERE id = p_bl_id AND statut = 'A_LIVRER';
  IF NOT FOUND THEN RAISE EXCEPTION 'Bon de livraison non trouvé ou déjà livré'; END IF;

  SELECT * INTO v_facture FROM factures WHERE id = v_bl.facture_id;
  SELECT * INTO v_commande FROM commandes WHERE id = v_facture.commande_id;

  SELECT id INTO v_js_id FROM journees_stock
  WHERE magasin_id = v_bl.magasin_id AND statut = 'OUVERTE' LIMIT 1;

  -- Vérifier stock suffisant
  IF v_js_id IS NOT NULL THEN
    FOR v_ligne IN
      SELECT lc.article_id, lc.quantite, a.nom as article_nom
      FROM lignes_commande lc JOIN articles a ON a.id = lc.article_id
      WHERE lc.commande_id = v_commande.id
    LOOP
      SELECT COALESCE(stock_ouverture + total_entrees - total_sorties, 0) INTO v_stock_dispo
      FROM lignes_journee_stock WHERE journee_stock_id = v_js_id AND article_id = v_ligne.article_id;
      v_stock_dispo := COALESCE(v_stock_dispo, 0);
      IF v_stock_dispo < v_ligne.quantite THEN
        RAISE EXCEPTION 'Stock insuffisant pour % : disponible %, demandé %', v_ligne.article_nom, v_stock_dispo, v_ligne.quantite;
      END IF;
    END LOOP;
  END IF;

  -- Confirmer
  UPDATE bons_livraison SET statut = 'LIVRE', livre_par = auth.uid(), date_livraison = now() WHERE id = p_bl_id;
  UPDATE commandes SET statut = 'LIVREE' WHERE id = v_commande.id;

  -- Sortie stock auto
  IF v_js_id IS NOT NULL THEN
    FOR v_ligne IN SELECT lc.article_id, lc.quantite FROM lignes_commande lc WHERE lc.commande_id = v_commande.id LOOP
      INSERT INTO mouvements_stock (journee_stock_id, article_id, type, motif, quantite, description, bon_livraison_id, effectue_par)
      VALUES (v_js_id, v_ligne.article_id, 'sortie', 'livraison', v_ligne.quantite, 'Livraison ' || v_bl.numero || ' (auto)', p_bl_id, auth.uid());
      UPDATE lignes_journee_stock SET total_sorties = total_sorties + v_ligne.quantite
      WHERE journee_stock_id = v_js_id AND article_id = v_ligne.article_id;
    END LOOP;
  END IF;

  -- ★ NOTIFIER celui qui a créé la commande
  PERFORM envoyer_notification(v_commande.cree_par, 'Commande livrée',
    'La commande ' || v_commande.numero || ' a été livrée par le magasinier.',
    'succes', 'commercial', NULL, v_commande.id);

  PERFORM log_audit('Livraison confirmée', 'commercial', 'bons_livraison', p_bl_id,
    jsonb_build_object('commande', v_commande.numero, 'magasin_id', v_bl.magasin_id));

  RETURN jsonb_build_object('statut', 'LIVRE', 'bl_numero', v_bl.numero);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;


-- 3. Sortie véhicule créée → VENTE (commercial terrain) notifié
CREATE OR REPLACE FUNCTION creer_sortie_vehicule(
  p_vehicule_id uuid, p_vendeur_id uuid, p_itineraire_id uuid,
  p_magasin_id uuid, p_agence_id uuid, p_hors_ville boolean, p_articles jsonb
) RETURNS jsonb AS $$
DECLARE
  v_numero text; v_sv_id uuid; v_item jsonb; v_js_id uuid;
BEGIN
  -- Vérifier que le vendeur n'a pas de sortie non bouclée
  IF EXISTS (SELECT 1 FROM sorties_vehicules WHERE vendeur_id = p_vendeur_id AND statut IN ('EN_COURS', 'RETOUR_PARTIEL')) THEN
    RAISE EXCEPTION 'Ce commercial a déjà une sortie non bouclée. Il doit boucler sa sortie avant d''en recevoir une nouvelle.';
  END IF;

  v_numero := generer_numero_sv();
  INSERT INTO sorties_vehicules (numero, vehicule_id, vendeur_id, itineraire_id, magasin_id, agence_id, hors_ville, cree_par)
  VALUES (v_numero, p_vehicule_id, p_vendeur_id, p_itineraire_id, p_magasin_id, p_agence_id, COALESCE(p_hors_ville, false), auth.uid())
  RETURNING id INTO v_sv_id;

  -- Journée stock ouverte
  SELECT id INTO v_js_id FROM journees_stock WHERE magasin_id = p_magasin_id AND statut = 'OUVERTE' LIMIT 1;

  FOR v_item IN SELECT * FROM jsonb_array_elements(p_articles) LOOP
    INSERT INTO lignes_sortie_vehicule (sortie_vehicule_id, article_id, quantite_sortie)
    VALUES (v_sv_id, (v_item->>'article_id')::uuid, (v_item->>'quantite')::int);

    -- Sortie stock auto
    IF v_js_id IS NOT NULL THEN
      INSERT INTO mouvements_stock (journee_stock_id, article_id, type, motif, quantite, description, effectue_par)
      VALUES (v_js_id, (v_item->>'article_id')::uuid, 'sortie', 'chargement_vehicule',
        (v_item->>'quantite')::int, 'Chargement ' || v_numero, auth.uid());
      UPDATE lignes_journee_stock SET total_sorties = total_sorties + (v_item->>'quantite')::int
      WHERE journee_stock_id = v_js_id AND article_id = (v_item->>'article_id')::uuid;
    END IF;
  END LOOP;

  -- ★ NOTIFIER LE VENDEUR que sa sortie est prête
  PERFORM envoyer_notification(p_vendeur_id, 'Sortie véhicule assignée',
    'Sortie ' || v_numero || ' créée pour vous. Votre stock véhicule est prêt.',
    'action', 'commercial', '/commercial/vente/stock', v_sv_id);

  PERFORM log_audit('Sortie véhicule créée', 'commercial', 'sorties_vehicules', v_sv_id,
    jsonb_build_object('numero', v_numero, 'vendeur_id', p_vendeur_id));

  RETURN jsonb_build_object('id', v_sv_id, 'numero', v_numero);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;


-- 4. Versement commercial → CAISSE notifiée
CREATE OR REPLACE FUNCTION verser_en_caisse(p_sortie_id uuid, p_caisse_id uuid, p_montant numeric)
RETURNS jsonb AS $$
DECLARE v_id uuid; v_sv record;
BEGIN
  SELECT * INTO v_sv FROM sorties_vehicules WHERE id = p_sortie_id AND vendeur_id = auth.uid();
  IF NOT FOUND THEN RAISE EXCEPTION 'Sortie non trouvée'; END IF;

  INSERT INTO versements_commerciaux (sortie_vehicule_id, caisse_id, montant, verse_par)
  VALUES (p_sortie_id, p_caisse_id, p_montant, auth.uid())
  RETURNING id INTO v_id;

  -- ★ NOTIFIER LA CAISSE
  PERFORM notifier_role('CAISSE', 'commercial', 'Versement commercial à valider',
    'Le commercial a versé ' || p_montant || ' F. En attente de validation.',
    'action', '/commercial/caisse/versements', v_id);

  PERFORM log_audit('Versement en caisse', 'commercial', 'versements_commerciaux', v_id,
    jsonb_build_object('montant', p_montant));

  RETURN jsonb_build_object('id', v_id);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;


-- 5. Clôture caisse → RESP AGENCE notifié pour double signature
CREATE OR REPLACE FUNCTION cloturer_journee_caisse(p_journee_caisse_id uuid, p_solde_physique numeric)
RETURNS jsonb AS $$
DECLARE v_jc record; v_theo numeric; v_ecart numeric;
BEGIN
  SELECT * INTO v_jc FROM journees_caisse WHERE id = p_journee_caisse_id AND statut = 'OUVERTE';
  IF NOT FOUND THEN RAISE EXCEPTION 'Journée de caisse non ouverte'; END IF;

  v_theo := v_jc.solde_ouverture + v_jc.total_encaissements - v_jc.total_decaissements
    - v_jc.total_versements + v_jc.total_transferts_in - v_jc.total_transferts_out;
  v_ecart := COALESCE(p_solde_physique, v_theo) - v_theo;

  UPDATE journees_caisse SET
    statut = 'CLOTUREE', solde_cloture = v_theo, solde_physique = COALESCE(p_solde_physique, v_theo),
    ecart = v_ecart, cloturee_par = auth.uid(),
    ecart_bloque = CASE WHEN v_ecart != 0 THEN true ELSE false END
  WHERE id = p_journee_caisse_id;

  -- ★ NOTIFIER LE CHEF D'AGENCE pour validation (double signature)
  PERFORM notifier_role('RESP_AGENCE', 'commercial', 'Clôture caisse à valider',
    'La caissière a clôturé sa caisse. Écart: ' || v_ecart || ' F. En attente de validation.',
    'action', '/commercial/agence/validations', p_journee_caisse_id);

  PERFORM log_audit('Caisse clôturée (attente chef)', 'commercial', 'journees_caisse', p_journee_caisse_id,
    jsonb_build_object('ecart', v_ecart, 'solde_theorique', v_theo));

  RETURN jsonb_build_object('solde_theorique', v_theo, 'solde_physique', COALESCE(p_solde_physique, v_theo), 'ecart', v_ecart);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;


-- 6. Clôture stock → RESP AGENCE notifié pour double signature
-- (Note: la clôture stock se fait manuellement dans GestionStock.jsx,
--  on ajoute la notification après le UPDATE)
-- Pour cela on crée une fonction dédiée:
CREATE OR REPLACE FUNCTION notifier_cloture_stock(p_journee_stock_id uuid)
RETURNS void AS $$
BEGIN
  PERFORM notifier_role('RESP_AGENCE', 'commercial', 'Clôture stock à valider',
    'Le magasinier a clôturé son stock. En attente de validation.',
    'action', '/commercial/agence/validations', p_journee_stock_id);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;


-- 7. Chef d'agence valide clôture → notifier DG si écart
CREATE OR REPLACE FUNCTION valider_cloture_caisse(p_journee_caisse_id uuid)
RETURNS jsonb AS $$
DECLARE v_jc record;
BEGIN
  SELECT * INTO v_jc FROM journees_caisse WHERE id = p_journee_caisse_id AND statut = 'CLOTUREE';
  IF NOT FOUND THEN RAISE EXCEPTION 'Journée non en attente de validation'; END IF;

  UPDATE journees_caisse SET statut = 'VALIDEE', validee_par_chef = auth.uid() WHERE id = p_journee_caisse_id;

  -- ★ Si écart, notifier le DG
  IF v_jc.ecart != 0 THEN
    PERFORM notifier_role('DG', 'commercial', 'Écart caisse à traiter',
      'Écart de ' || v_jc.ecart || ' F sur la caisse. Clôture validée par le chef d''agence.',
      'alerte', '/commercial/dg', p_journee_caisse_id);
  END IF;

  PERFORM log_audit('Clôture caisse validée par chef', 'commercial', 'journees_caisse', p_journee_caisse_id, '{}'::jsonb);
  RETURN jsonb_build_object('statut', 'VALIDEE');
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;


-- 8. Chef d'agence valide clôture stock → notifier DG si écart
CREATE OR REPLACE FUNCTION valider_cloture_stock(p_journee_stock_id uuid)
RETURNS jsonb AS $$
DECLARE v_js record; v_total_ecart numeric;
BEGIN
  SELECT * INTO v_js FROM journees_stock WHERE id = p_journee_stock_id AND statut = 'CLOTUREE';
  IF NOT FOUND THEN RAISE EXCEPTION 'Journée non en attente de validation'; END IF;

  UPDATE journees_stock SET statut = 'VALIDEE', validee_par_chef = auth.uid() WHERE id = p_journee_stock_id;

  -- Calculer écart total
  SELECT COALESCE(SUM(ABS(COALESCE(stock_physique, stock_ouverture + total_entrees - total_sorties) - (stock_ouverture + total_entrees - total_sorties))), 0)
  INTO v_total_ecart FROM lignes_journee_stock WHERE journee_stock_id = p_journee_stock_id;

  -- ★ Si écart, notifier le DG
  IF v_total_ecart > 0 THEN
    PERFORM notifier_role('DG', 'commercial', 'Écart stock à traiter',
      'Écart total de ' || v_total_ecart || ' unités. Clôture stock validée par le chef d''agence.',
      'alerte', '/commercial/dg', p_journee_stock_id);
  END IF;

  PERFORM log_audit('Clôture stock validée par chef', 'commercial', 'journees_stock', p_journee_stock_id, '{}'::jsonb);
  RETURN jsonb_build_object('statut', 'VALIDEE');
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;


-- ============================================================
-- RÉSUMÉ DES NOTIFICATIONS
-- ============================================================
-- Commande facturée         → CAISSE notifiée
-- Règlement total           → MAGASIN notifié (BL généré)
-- Règlement partiel         → DG notifié (dette à valider)
-- DG valide dette           → MAGASIN notifié (BL généré)
-- DG rejette dette          → créateur notifié
-- Livraison confirmée       → créateur de la commande notifié
-- Sortie véhicule créée     → VENTE (vendeur) notifié
-- Versement commercial      → CAISSE notifiée
-- Clôture caisse            → RESP AGENCE notifié
-- Clôture stock             → RESP AGENCE notifié
-- Chef valide clôture caisse + écart → DG notifié
-- Chef valide clôture stock + écart  → DG notifié
-- Retour produit initié     → DG notifié
-- DG valide retour          → MAGASIN notifié
-- DG rejette retour         → initiateur notifié
-- Déconsignation initiée    → DG notifié
-- DG valide déconsignation  → COMM notifié
-- Ordre publicité créé      → AUDIT notifié
-- AUDIT valide publicité    → MAGASIN notifié
-- ============================================================
-- ============================================================
-- FIX CAISSE : MOTIFS AUTO + DEX + COMPTABLE
-- ============================================================

-- 1. Motifs auto avec nom client dans enregistrer_reglement
CREATE OR REPLACE FUNCTION enregistrer_reglement(p_facture_id uuid, p_reglements jsonb)
RETURNS jsonb AS $$
DECLARE
  v_regl jsonb; v_total_regle numeric := 0; v_montant_total numeric;
  v_facture_statut text; v_commande_id uuid;
  v_jc_id uuid; v_caisse_id uuid;
  v_user_is_caisse boolean := false;
  v_magasin_id uuid;
  v_client_nom text;
BEGIN
  SELECT f.montant_total, f.commande_id, f.magasin_id INTO v_montant_total, v_commande_id, v_magasin_id
  FROM factures f WHERE f.id = p_facture_id AND f.statut IN ('EN_ATTENTE', 'PARTIELLE');
  IF NOT FOUND THEN RAISE EXCEPTION 'Facture non réglable'; END IF;

  -- Nom du client pour le motif
  SELECT c.nom_interne INTO v_client_nom
  FROM commandes cmd JOIN clients c ON c.id = cmd.client_id
  WHERE cmd.id = v_commande_id;

  -- Vérifier si l'utilisateur a le rôle CAISSE
  SELECT EXISTS (
    SELECT 1 FROM service_role_module srm
    JOIN roles r ON r.id = srm.role_id
    JOIN modules m ON m.id = srm.module_id
    JOIN profiles p ON p.service_id = srm.service_id
    WHERE p.id = auth.uid() AND r.nom = 'CAISSE' AND m.code = 'commercial'
  ) INTO v_user_is_caisse;

  FOR v_regl IN SELECT * FROM jsonb_array_elements(p_reglements) LOOP
    v_caisse_id := NULLIF(v_regl->>'caisse_id', '')::uuid;

    INSERT INTO reglements (facture_id, mode, montant, banque_id, reference_cheque, encaisse_par, caisse_id, est_caisse_temporaire)
    VALUES (
      p_facture_id, v_regl->>'mode', (v_regl->>'montant')::numeric,
      NULLIF(v_regl->>'banque_id', '')::uuid, NULLIF(v_regl->>'reference_cheque', ''),
      auth.uid(), v_caisse_id,
      CASE WHEN (v_regl->>'mode') = 'cash' AND NOT v_user_is_caisse THEN true ELSE false END
    );
    v_total_regle := v_total_regle + (v_regl->>'montant')::numeric;

    -- Mouvement caisse auto si cash + caisse + caissière
    IF (v_regl->>'mode') = 'cash' AND v_caisse_id IS NOT NULL AND v_user_is_caisse THEN
      SELECT id INTO v_jc_id FROM journees_caisse
      WHERE caisse_id = v_caisse_id AND statut = 'OUVERTE' LIMIT 1;

      IF v_jc_id IS NOT NULL THEN
        INSERT INTO mouvements_caisse (journee_caisse_id, type, montant, mode, description, facture_id, effectue_par)
        VALUES (v_jc_id, 'encaissement', (v_regl->>'montant')::numeric, 'cash',
          'Vente client ' || COALESCE(v_client_nom, '—'), p_facture_id, auth.uid());
        UPDATE journees_caisse SET total_encaissements = total_encaissements + (v_regl->>'montant')::numeric
        WHERE id = v_jc_id;
      END IF;
    END IF;
  END LOOP;

  UPDATE factures SET montant_regle = montant_regle + v_total_regle WHERE id = p_facture_id;
  SELECT montant_regle INTO v_total_regle FROM factures WHERE id = p_facture_id;

  IF v_total_regle >= v_montant_total THEN
    UPDATE factures SET statut = 'REGLEE' WHERE id = p_facture_id;
    UPDATE commandes SET statut = 'REGLEE' WHERE id = v_commande_id;
    INSERT INTO bons_livraison (numero, facture_id, magasin_id)
    SELECT generer_numero_bl(), p_facture_id, v_magasin_id;
    v_facture_statut := 'REGLEE';

    PERFORM notifier_role('MAGASIN', 'commercial', 'Commande à livrer',
      'Commande ' || COALESCE(v_client_nom, '') || ' — BL généré.',
      'action', '/commercial/magasin/livraisons', p_facture_id);
  ELSE
    UPDATE factures SET statut = 'EN_ATTENTE_DG' WHERE id = p_facture_id;
    UPDATE commandes SET statut = 'EN_ATTENTE_DG' WHERE id = v_commande_id;
    v_facture_statut := 'EN_ATTENTE_DG';

    PERFORM notifier_role('DG', 'commercial', 'Dette client à valider',
      'Client ' || COALESCE(v_client_nom, '') || ' — paiement partiel.',
      'action', '/commercial/dg', p_facture_id);
  END IF;

  PERFORM log_audit('Règlement enregistré', 'commercial', 'reglements', p_facture_id,
    jsonb_build_object('statut', v_facture_statut, 'montant', v_total_regle));

  RETURN jsonb_build_object('statut', v_facture_statut, 'montant_regle', v_total_regle);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;


-- 2. Motif auto avec nom commercial dans valider_versement_commercial
DROP FUNCTION IF EXISTS valider_versement_commercial(uuid);
CREATE OR REPLACE FUNCTION valider_versement_commercial(p_versement_id uuid)
RETURNS jsonb AS $$
DECLARE v_vc record; v_jc_id uuid; v_commercial_nom text;
BEGIN
  SELECT * INTO v_vc FROM versements_commerciaux WHERE id = p_versement_id AND statut = 'EN_ATTENTE';
  IF NOT FOUND THEN RAISE EXCEPTION 'Versement non trouvé'; END IF;

  -- Nom du commercial
  SELECT (prenom || ' ' || nom) INTO v_commercial_nom FROM profiles WHERE id = v_vc.verse_par;

  UPDATE versements_commerciaux SET statut = 'VALIDE', valide_par = auth.uid(), date_validation = now()
  WHERE id = p_versement_id;

  -- Créer encaissement en caisse avec motif "Vente commercial xxx"
  SELECT id INTO v_jc_id FROM journees_caisse WHERE caisse_id = v_vc.caisse_id AND statut = 'OUVERTE' LIMIT 1;
  IF v_jc_id IS NOT NULL THEN
    INSERT INTO mouvements_caisse (journee_caisse_id, type, montant, mode, description, effectue_par)
    VALUES (v_jc_id, 'encaissement', v_vc.montant, 'cash',
      'Vente commercial ' || COALESCE(v_commercial_nom, '—'), auth.uid());
    UPDATE journees_caisse SET total_encaissements = total_encaissements + v_vc.montant WHERE id = v_jc_id;
  END IF;

  PERFORM log_audit('Versement commercial validé', 'commercial', 'versements_commerciaux', p_versement_id,
    jsonb_build_object('montant', v_vc.montant, 'commercial', v_commercial_nom));

  RETURN jsonb_build_object('statut', 'VALIDE');
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;


-- 3. Créer rôles DEX et COMPTABLE + services
DO $$
DECLARE v_dept_id uuid; v_module_id uuid; v_role_dex_id uuid; v_role_compta_id uuid;
BEGIN
  SELECT id INTO v_dept_id FROM departements WHERE nom ILIKE '%commercial%' LIMIT 1;
  SELECT id INTO v_module_id FROM modules WHERE code = 'commercial' LIMIT 1;

  IF v_dept_id IS NULL OR v_module_id IS NULL THEN RETURN; END IF;

  -- Rôle DEX
  INSERT INTO roles (nom, description) VALUES ('DEX', 'Directeur d''exploitation')
  ON CONFLICT DO NOTHING;
  SELECT id INTO v_role_dex_id FROM roles WHERE nom = 'DEX';

  -- Rôle COMPTABLE
  INSERT INTO roles (nom, description) VALUES ('COMPTABLE', 'Comptable')
  ON CONFLICT DO NOTHING;
  SELECT id INTO v_role_compta_id FROM roles WHERE nom = 'COMPTABLE';

  -- Service DEX
  IF NOT EXISTS (SELECT 1 FROM services WHERE nom = 'DEX' AND departement_id = v_dept_id) THEN
    INSERT INTO services (nom, departement_id) VALUES ('DEX', v_dept_id);
  END IF;

  -- Service COMPTABILITE
  IF NOT EXISTS (SELECT 1 FROM services WHERE nom = 'COMPTABILITE' AND departement_id = v_dept_id) THEN
    INSERT INTO services (nom, departement_id) VALUES ('COMPTABILITE', v_dept_id);
  END IF;

  -- Liaisons service_role_module
  INSERT INTO service_role_module (service_id, role_id, module_id)
  SELECT s.id, v_role_dex_id, v_module_id FROM services s WHERE s.nom = 'DEX' AND s.departement_id = v_dept_id
  ON CONFLICT DO NOTHING;

  INSERT INTO service_role_module (service_id, role_id, module_id)
  SELECT s.id, v_role_compta_id, v_module_id FROM services s WHERE s.nom = 'COMPTABILITE' AND s.departement_id = v_dept_id
  ON CONFLICT DO NOTHING;
END $$;
-- ============================================================
-- SUPABASE STORAGE : Bucket justificatifs
-- À exécuter dans Supabase SQL Editor
-- ============================================================

-- Créer le bucket
INSERT INTO storage.buckets (id, name, public)
VALUES ('justificatifs', 'justificatifs', true)
ON CONFLICT (id) DO NOTHING;

-- Policy upload pour authenticated
CREATE POLICY "upload_justificatifs" ON storage.objects
FOR INSERT TO authenticated
WITH CHECK (bucket_id = 'justificatifs');

-- Policy lecture pour authenticated
CREATE POLICY "read_justificatifs" ON storage.objects
FOR SELECT TO authenticated
USING (bucket_id = 'justificatifs');

-- Policy suppression pour authenticated
CREATE POLICY "delete_justificatifs" ON storage.objects
FOR DELETE TO authenticated
USING (bucket_id = 'justificatifs');
