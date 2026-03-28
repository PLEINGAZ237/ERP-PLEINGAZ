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
