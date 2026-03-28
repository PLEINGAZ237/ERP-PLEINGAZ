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
