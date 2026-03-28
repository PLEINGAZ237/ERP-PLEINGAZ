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
