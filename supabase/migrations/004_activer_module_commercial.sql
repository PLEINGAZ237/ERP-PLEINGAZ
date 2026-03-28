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
