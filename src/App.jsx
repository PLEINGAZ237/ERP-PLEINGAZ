import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { AuthProvider }    from './contexts/AuthContext'
import ProtectedRoute      from './components/ProtectedRoute'

// ── Pages publiques ──────────────────────────────────────────────────────────
import Login               from './pages/Login'
import ChangePassword      from './pages/ChangePassword'
import CompleteProfile     from './pages/CompleteProfile'

// ── Portail ──────────────────────────────────────────────────────────────────
import PortailDashboard    from './pages/portails/Dashboard'

// ── Module Besoins : routeur de rôle ─────────────────────────────────────────
import BesoinsDashboard    from './pages/besoins/BesoinsDashboard'

// ── Admin (rôle global) ──────────────────────────────────────────────────────
import AdminDashboard      from './pages/admin/AdminDashboard'
import Entreprises         from './pages/admin/Entreprises'
import Departements        from './pages/admin/Departements'
import Services            from './pages/admin/Services'
import Modules             from './pages/admin/Modules'
import Caisses             from './pages/admin/Caisses'
import Agences             from './pages/admin/Agences'
import Magasins            from './pages/admin/Magasins'
import Citernes            from './pages/admin/Citernes'
import Banques             from './pages/admin/Banques'
import Virements           from './pages/admin/Virements'
import Roles               from './pages/admin/Roles'
import Utilisateurs        from './pages/admin/Utilisateurs'
import Articles            from './pages/admin/Articles'
import Vehicules           from './pages/admin/Vehicules'
import CategoriesClients   from './pages/admin/CategoriesClients'
import PrixCategories      from './pages/admin/PrixCategories'
import Clients             from './pages/admin/Clients'
import Itineraires         from './pages/admin/Itineraires'

// ── Module Commercial : routeur + layouts ───────────────────────────────────
import CommercialDashboard from './pages/commercial/CommercialDashboard'
import CommDashboard       from './pages/commercial/comm/CommDashboard'
import CreerCommande       from './pages/commercial/shared/CreerCommande'
import ListeCommandes      from './pages/commercial/shared/ListeCommandes'
import DetailCommande      from './pages/commercial/shared/DetailCommande'
import AgenceDashboard     from './pages/commercial/agence/AgenceDashboard'
import CreerSortie         from './pages/commercial/agence/CreerSortie'
import ListeSorties        from './pages/commercial/agence/ListeSorties'
import VenteDashboard      from './pages/commercial/vente/VenteDashboard'
import MagasinDashboard    from './pages/commercial/magasin/MagasinDashboard'
import Livraisons          from './pages/commercial/magasin/Livraisons'
import CaisseDashboard     from './pages/commercial/caisse/CaisseDashboard'
import DGCommDashboard     from './pages/commercial/dg/DGCommDashboard'
import RapportsCaisse      from './pages/commercial/dg/RapportsCaisse'
import RapportsStock       from './pages/commercial/dg/RapportsStock'
import InventairesPage     from './pages/commercial/dg/Inventaires'
import JournalAudit        from './pages/commercial/dg/JournalAudit'
import GestionCaisse       from './pages/commercial/caisse/GestionCaisse'
import Encaissements       from './pages/commercial/caisse/Encaissements'
import GestionStock        from './pages/commercial/magasin/GestionStock'
import StockMagasin        from './pages/commercial/magasin/StockMagasin'
import StockVehicule       from './pages/commercial/vente/StockVehicule'
import CaisseVente         from './pages/commercial/vente/CaisseVente'
import BouclerVente        from './pages/commercial/vente/BouclerVente'
import ListeFactures       from './pages/commercial/shared/ListeFactures'
import ListeClientsComm    from './pages/commercial/shared/ListeClientsComm'
import ValidationsClotures from './pages/commercial/agence/ValidationsClotures'
import VersementsCommerciaux from './pages/commercial/caisse/VersementsCommerciaux'
import MesRapportsCaisse   from './pages/commercial/caisse/MesRapportsCaisse'
import MesRapportsStock    from './pages/commercial/magasin/MesRapportsStock'
import AnalysesVentes      from './pages/commercial/shared/AnalysesVentes'
import RetoursProduits     from './pages/commercial/agence/RetoursProduits'
import DGRetours           from './pages/commercial/dg/DGRetours'
import TransfertsCaisse    from './pages/commercial/caisse/TransfertsCaisse'
import CommLayout          from './components/commercial/CommLayout'
import RespAgenceLayout    from './components/commercial/RespAgenceLayout'
import VenteLayout         from './components/commercial/VenteLayout'
import MagasinLayout       from './components/commercial/MagasinLayout'
import CaisseLayout        from './components/commercial/CaisseLayout'
import DGCommLayout        from './components/commercial/DGCommLayout'
import AuditLayout         from './components/commercial/AuditLayout'
import AuditDashboard      from './pages/commercial/audit/AuditDashboard'
import EcartsAudit         from './pages/commercial/audit/EcartsAudit'

// ── Module Besoins : Employé ─────────────────────────────────────────────────
import EmployeDashboard    from './pages/besoins/employe/EmployeDashboard'
import CreerBesoin         from './pages/besoins/employe/CreerBesoin'
import MesBesoins          from './pages/besoins/employe/MesBesoins'
import DetailBesoin        from './pages/besoins/employe/DetailBesoin'

// ── Module Besoins : DFC ─────────────────────────────────────────────────────
import DFCDashboard        from './pages/besoins/dfc/DFCDashboard'
import ValiderBesoin       from './pages/besoins/dfc/ValiderBesoin'

// ── Module Besoins : DG ──────────────────────────────────────────────────────
import DGDashboard         from './pages/besoins/dg/DGDashboard'
import ValiderBesoinDG     from './pages/besoins/dg/ValiderBesoinDG'
import AnalyseBesoins      from './pages/besoins/dg/AnalyseBesoins'
import DetailBesoinAnalyse  from "./pages/besoins/dg/DetailBesoinAnalyse"

// ── Module Besoins : Caissière ───────────────────────────────────────────────
import CaissiereDashboard  from './pages/besoins/caissiere/CaissiereDashboard'
import Decaissement        from './pages/besoins/caissiere/Decaissement'

// ── Module Besoins : Justif ──────────────────────────────────────────────────
import JustifDashboard     from './pages/besoins/justif/JustifDashboard'
import SaisirJustificatif  from './pages/besoins/justif/SaisirJustificatif'

/*
  RÔLES EXACTS EN BASE (table `roles`, module besoins) :
  ──────────────────────────────────────────────────────
    emet_besoin     → émet des besoins
    DFC             → valide côté DFC
    DG              → valide côté DG + analyse & contrôles
    analyse_besoin  → analyse des besoins (dashboard dédié, sans contrôles)
    decaissement    → gère les décaissements (caissière)
    Justif          → saisit les justificatifs

  Rôle global (via utilisateur_roles, pas de module) :
    Admin           → accès admin complet
*/

const BESOINS_ALL = ['emet_besoin', 'DFC', 'DG', 'analyse_besoin', 'decaissement', 'Justif']
const COMMERCIAL_ALL = ['COMM', 'RESP_AGENCE', 'VENTE', 'CAISSE', 'MAGASIN', 'DG', 'AUDIT']

function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <Routes>

          {/* ── Route publique ────────────────────────────────────── */}
          <Route path="/login" element={<Login />} />

          {/* ── Onboarding ────────────────────────────────────────── */}
          <Route path="/changer-mot-de-passe" element={<ProtectedRoute onboardingOnly><ChangePassword /></ProtectedRoute>} />
          <Route path="/completer-profil"     element={<ProtectedRoute onboardingOnly><CompleteProfile /></ProtectedRoute>} />

          {/* ── Portail ──────────────────────────────────────────── */}
          <Route path="/dashboard" element={<ProtectedRoute><PortailDashboard /></ProtectedRoute>} />

          {/* ── Module Besoins : routeur de rôle ─────────────────── */}
          <Route path="/besoins" element={<ProtectedRoute><BesoinsDashboard /></ProtectedRoute>} />

          {/* ── Admin (rôle global direct) ────────────────────────── */}
          <Route path="/besoins/admin"      element={<ProtectedRoute roles={['Admin']}><AdminDashboard /></ProtectedRoute>} />
          <Route path="/admin/entreprises"  element={<ProtectedRoute roles={['Admin']}><Entreprises /></ProtectedRoute>} />
          <Route path="/admin/departements" element={<ProtectedRoute roles={['Admin']}><Departements /></ProtectedRoute>} />
          <Route path="/admin/services"     element={<ProtectedRoute roles={['Admin']}><Services /></ProtectedRoute>} />
          <Route path="/admin/modules"      element={<ProtectedRoute roles={['Admin']}><Modules /></ProtectedRoute>} />
          <Route path="/admin/caisses"      element={<ProtectedRoute roles={['Admin']}><Caisses /></ProtectedRoute>} />
          <Route path="/admin/agences"      element={<ProtectedRoute roles={['Admin']}><Agences /></ProtectedRoute>} />
          <Route path="/admin/magasins"     element={<ProtectedRoute roles={['Admin']}><Magasins /></ProtectedRoute>} />
          <Route path="/admin/citernes"     element={<ProtectedRoute roles={['Admin']}><Citernes /></ProtectedRoute>} />
          <Route path="/admin/banques"      element={<ProtectedRoute roles={['Admin']}><Banques /></ProtectedRoute>} />
          <Route path="/admin/virements"    element={<ProtectedRoute roles={['Admin']}><Virements /></ProtectedRoute>} />
          <Route path="/admin/roles"        element={<ProtectedRoute roles={['Admin']}><Roles /></ProtectedRoute>} />
          <Route path="/admin/utilisateurs" element={<ProtectedRoute roles={['Admin']}><Utilisateurs /></ProtectedRoute>} />
          <Route path="/admin/articles"            element={<ProtectedRoute roles={['Admin']}><Articles /></ProtectedRoute>} />
          <Route path="/admin/vehicules"           element={<ProtectedRoute roles={['Admin']}><Vehicules /></ProtectedRoute>} />
          <Route path="/admin/categories-clients"  element={<ProtectedRoute roles={['Admin']}><CategoriesClients /></ProtectedRoute>} />
          <Route path="/admin/prix"                element={<ProtectedRoute roles={['Admin']}><PrixCategories /></ProtectedRoute>} />
          <Route path="/admin/clients"             element={<ProtectedRoute roles={['Admin']}><Clients /></ProtectedRoute>} />
          <Route path="/admin/itineraires"         element={<ProtectedRoute roles={['Admin']}><Itineraires /></ProtectedRoute>} />

          {/* ── Module Commercial : routeur de rôle ────────────────── */}
          <Route path="/commercial" element={<ProtectedRoute><CommercialDashboard /></ProtectedRoute>} />

          {/* ── Commercial : COMM ───────────────────────────────────── */}
          <Route path="/commercial/comm"                      element={<ProtectedRoute module="commercial" moduleRoles={['COMM']}><CommDashboard /></ProtectedRoute>} />
          <Route path="/commercial/comm/commandes"            element={<ProtectedRoute module="commercial" moduleRoles={['COMM']}><ListeCommandes Layout={CommLayout} basePath="/commercial/comm/commandes" creerPath="/commercial/comm/commandes/creer" /></ProtectedRoute>} />
          <Route path="/commercial/comm/commandes/creer"      element={<ProtectedRoute module="commercial" moduleRoles={['COMM']}><CreerCommande Layout={CommLayout} backPath="/commercial/comm" /></ProtectedRoute>} />
          <Route path="/commercial/comm/commandes/:id"        element={<ProtectedRoute module="commercial" moduleRoles={['COMM']}><DetailCommande Layout={CommLayout} backPath="/commercial/comm/commandes" /></ProtectedRoute>} />
          <Route path="/commercial/comm/factures"             element={<ProtectedRoute module="commercial" moduleRoles={['COMM']}><ListeFactures Layout={CommLayout} basePath="/commercial/comm/commandes" /></ProtectedRoute>} />
          <Route path="/commercial/comm/clients"              element={<ProtectedRoute module="commercial" moduleRoles={['COMM']}><ListeClientsComm Layout={CommLayout} /></ProtectedRoute>} />
          <Route path="/commercial/comm/analyses"             element={<ProtectedRoute module="commercial" moduleRoles={['COMM']}><AnalysesVentes Layout={CommLayout} /></ProtectedRoute>} />

          {/* ── Commercial : Resp Agence ────────────────────────────── */}
          <Route path="/commercial/agence"                    element={<ProtectedRoute module="commercial" moduleRoles={['RESP_AGENCE']}><AgenceDashboard /></ProtectedRoute>} />
          <Route path="/commercial/agence/commandes"          element={<ProtectedRoute module="commercial" moduleRoles={['RESP_AGENCE']}><ListeCommandes Layout={RespAgenceLayout} basePath="/commercial/agence/commandes" creerPath="/commercial/agence/commandes/creer" /></ProtectedRoute>} />
          <Route path="/commercial/agence/commandes/creer"    element={<ProtectedRoute module="commercial" moduleRoles={['RESP_AGENCE']}><CreerCommande Layout={RespAgenceLayout} backPath="/commercial/agence" /></ProtectedRoute>} />
          <Route path="/commercial/agence/commandes/:id"      element={<ProtectedRoute module="commercial" moduleRoles={['RESP_AGENCE']}><DetailCommande Layout={RespAgenceLayout} backPath="/commercial/agence/commandes" /></ProtectedRoute>} />
          <Route path="/commercial/agence/sorties"            element={<ProtectedRoute module="commercial" moduleRoles={['RESP_AGENCE']}><ListeSorties /></ProtectedRoute>} />
          <Route path="/commercial/agence/sorties/creer"      element={<ProtectedRoute module="commercial" moduleRoles={['RESP_AGENCE']}><CreerSortie /></ProtectedRoute>} />
          <Route path="/commercial/agence/factures"           element={<ProtectedRoute module="commercial" moduleRoles={['RESP_AGENCE']}><ListeFactures Layout={RespAgenceLayout} basePath="/commercial/agence/commandes" /></ProtectedRoute>} />
          <Route path="/commercial/agence/clients"            element={<ProtectedRoute module="commercial" moduleRoles={['RESP_AGENCE']}><ListeClientsComm Layout={RespAgenceLayout} /></ProtectedRoute>} />
          <Route path="/commercial/agence/validations"        element={<ProtectedRoute module="commercial" moduleRoles={['RESP_AGENCE']}><ValidationsClotures /></ProtectedRoute>} />
          <Route path="/commercial/agence/retours"            element={<ProtectedRoute module="commercial" moduleRoles={['RESP_AGENCE']}><RetoursProduits /></ProtectedRoute>} />

          {/* ── Commercial : Vente (commercial terrain) ────────────── */}
          <Route path="/commercial/vente"                     element={<ProtectedRoute module="commercial" moduleRoles={['VENTE']}><VenteDashboard /></ProtectedRoute>} />
          <Route path="/commercial/vente/commandes"           element={<ProtectedRoute module="commercial" moduleRoles={['VENTE']}><ListeCommandes Layout={VenteLayout} basePath="/commercial/vente/commandes" creerPath="/commercial/vente/commandes/creer" /></ProtectedRoute>} />
          <Route path="/commercial/vente/commandes/creer"     element={<ProtectedRoute module="commercial" moduleRoles={['VENTE']}><CreerCommande Layout={VenteLayout} backPath="/commercial/vente" /></ProtectedRoute>} />
          <Route path="/commercial/vente/commandes/:id"       element={<ProtectedRoute module="commercial" moduleRoles={['VENTE']}><DetailCommande Layout={VenteLayout} backPath="/commercial/vente/commandes" /></ProtectedRoute>} />
          <Route path="/commercial/vente/factures"            element={<ProtectedRoute module="commercial" moduleRoles={['VENTE']}><ListeFactures Layout={VenteLayout} basePath="/commercial/vente/commandes" /></ProtectedRoute>} />
          <Route path="/commercial/vente/stock"               element={<ProtectedRoute module="commercial" moduleRoles={['VENTE']}><StockVehicule /></ProtectedRoute>} />
          <Route path="/commercial/vente/caisse"              element={<ProtectedRoute module="commercial" moduleRoles={['VENTE']}><CaisseVente /></ProtectedRoute>} />
          <Route path="/commercial/vente/boucler"             element={<ProtectedRoute module="commercial" moduleRoles={['VENTE']}><BouclerVente /></ProtectedRoute>} />

          {/* ── Commercial : Caisse ─────────────────────────────────── */}
          <Route path="/commercial/caisse"                    element={<ProtectedRoute module="commercial" moduleRoles={['CAISSE']}><CaisseDashboard /></ProtectedRoute>} />
          <Route path="/commercial/caisse/gestion"              element={<ProtectedRoute module="commercial" moduleRoles={['CAISSE']}><GestionCaisse /></ProtectedRoute>} />
          <Route path="/commercial/caisse/commandes"          element={<ProtectedRoute module="commercial" moduleRoles={['CAISSE']}><ListeCommandes Layout={CaisseLayout} basePath="/commercial/caisse/commandes" creerPath="/commercial/caisse/commandes/creer" /></ProtectedRoute>} />
          <Route path="/commercial/caisse/commandes/creer"    element={<ProtectedRoute module="commercial" moduleRoles={['CAISSE']}><CreerCommande Layout={CaisseLayout} backPath="/commercial/caisse" /></ProtectedRoute>} />
          <Route path="/commercial/caisse/commandes/:id"      element={<ProtectedRoute module="commercial" moduleRoles={['CAISSE']}><DetailCommande Layout={CaisseLayout} backPath="/commercial/caisse/commandes" /></ProtectedRoute>} />
          <Route path="/commercial/caisse/factures"           element={<ProtectedRoute module="commercial" moduleRoles={['CAISSE']}><ListeFactures Layout={CaisseLayout} basePath="/commercial/caisse/commandes" /></ProtectedRoute>} />
          <Route path="/commercial/caisse/encaissements"      element={<ProtectedRoute module="commercial" moduleRoles={['CAISSE']}><Encaissements /></ProtectedRoute>} />
          <Route path="/commercial/caisse/versements"         element={<ProtectedRoute module="commercial" moduleRoles={['CAISSE']}><VersementsCommerciaux /></ProtectedRoute>} />
          <Route path="/commercial/caisse/mes-rapports"       element={<ProtectedRoute module="commercial" moduleRoles={['CAISSE']}><MesRapportsCaisse /></ProtectedRoute>} />
          <Route path="/commercial/caisse/transferts"         element={<ProtectedRoute module="commercial" moduleRoles={['CAISSE']}><TransfertsCaisse /></ProtectedRoute>} />

          {/* ── Commercial : Magasin ────────────────────────────────── */}
          <Route path="/commercial/magasin"                   element={<ProtectedRoute module="commercial" moduleRoles={['MAGASIN']}><MagasinDashboard /></ProtectedRoute>} />
          <Route path="/commercial/magasin/gestion"             element={<ProtectedRoute module="commercial" moduleRoles={['MAGASIN']}><GestionStock /></ProtectedRoute>} />
          <Route path="/commercial/magasin/stock"               element={<ProtectedRoute module="commercial" moduleRoles={['MAGASIN']}><StockMagasin /></ProtectedRoute>} />
          <Route path="/commercial/magasin/livraisons"        element={<ProtectedRoute module="commercial" moduleRoles={['MAGASIN']}><Livraisons /></ProtectedRoute>} />
          <Route path="/commercial/magasin/mes-rapports"      element={<ProtectedRoute module="commercial" moduleRoles={['MAGASIN']}><MesRapportsStock /></ProtectedRoute>} />

          {/* ── Commercial : DG (validation dettes + audit + rapports) ── */}
          <Route path="/commercial/dg"                        element={<ProtectedRoute module="commercial" moduleRoles={['DG']}><DGCommDashboard /></ProtectedRoute>} />
          <Route path="/commercial/dg/dettes"                 element={<ProtectedRoute module="commercial" moduleRoles={['DG']}><DGCommDashboard /></ProtectedRoute>} />
          <Route path="/commercial/dg/rapports-caisse"        element={<ProtectedRoute module="commercial" moduleRoles={['DG']}><RapportsCaisse /></ProtectedRoute>} />
          <Route path="/commercial/dg/rapports-stock"         element={<ProtectedRoute module="commercial" moduleRoles={['DG']}><RapportsStock /></ProtectedRoute>} />
          <Route path="/commercial/dg/inventaires"            element={<ProtectedRoute module="commercial" moduleRoles={['DG']}><InventairesPage /></ProtectedRoute>} />
          <Route path="/commercial/dg/audit"                  element={<ProtectedRoute module="commercial" moduleRoles={['DG']}><JournalAudit /></ProtectedRoute>} />
          <Route path="/commercial/dg/analyses"               element={<ProtectedRoute module="commercial" moduleRoles={['DG']}><AnalysesVentes Layout={DGCommLayout} /></ProtectedRoute>} />
          <Route path="/commercial/dg/retours"                element={<ProtectedRoute module="commercial" moduleRoles={['DG']}><DGRetours /></ProtectedRoute>} />

          {/* ── Commercial : AUDIT ─────────────────────────────────── */}
          <Route path="/commercial/audit"                     element={<ProtectedRoute module="commercial" moduleRoles={['AUDIT']}><AuditDashboard /></ProtectedRoute>} />
          <Route path="/commercial/audit/ecarts"              element={<ProtectedRoute module="commercial" moduleRoles={['AUDIT']}><EcartsAudit /></ProtectedRoute>} />
          <Route path="/commercial/audit/rapports-caisse"     element={<ProtectedRoute module="commercial" moduleRoles={['AUDIT']}><RapportsCaisse Layout={AuditLayout} /></ProtectedRoute>} />
          <Route path="/commercial/audit/rapports-stock"      element={<ProtectedRoute module="commercial" moduleRoles={['AUDIT']}><RapportsStock Layout={AuditLayout} /></ProtectedRoute>} />
          <Route path="/commercial/audit/inventaires"         element={<ProtectedRoute module="commercial" moduleRoles={['AUDIT']}><InventairesPage Layout={AuditLayout} /></ProtectedRoute>} />
          <Route path="/commercial/audit/journal"             element={<ProtectedRoute module="commercial" moduleRoles={['AUDIT']}><JournalAudit Layout={AuditLayout} /></ProtectedRoute>} />
          <Route path="/commercial/audit/analyses"            element={<ProtectedRoute module="commercial" moduleRoles={['AUDIT']}><AnalysesVentes Layout={AuditLayout} /></ProtectedRoute>} />

          {/* ── Besoins : Employé (tous les rôles besoins) ────────── */}
          <Route path="/besoins/employe"               element={<ProtectedRoute module="besoins" moduleRoles={BESOINS_ALL}><EmployeDashboard /></ProtectedRoute>} />
          <Route path="/besoins/employe/creer-besoin"  element={<ProtectedRoute module="besoins" moduleRoles={BESOINS_ALL}><CreerBesoin /></ProtectedRoute>} />
          <Route path="/besoins/employe/mes-besoins"   element={<ProtectedRoute module="besoins" moduleRoles={BESOINS_ALL}><MesBesoins /></ProtectedRoute>} />
          <Route path="/besoins/employe/besoin/:id"    element={<ProtectedRoute module="besoins" moduleRoles={BESOINS_ALL}><DetailBesoin /></ProtectedRoute>} />

          {/* ── Besoins : DFC ─────────────────────────────────────── */}
          <Route path="/besoins/dfc"            element={<ProtectedRoute module="besoins" moduleRoles={['DFC']}><DFCDashboard /></ProtectedRoute>} />
          <Route path="/besoins/dfc/besoin/:id" element={<ProtectedRoute module="besoins" moduleRoles={['DFC']}><ValiderBesoin /></ProtectedRoute>} />
          <Route path="/besoins/dfc/analyse"              element={<ProtectedRoute module="besoins" moduleRoles={['DFC']}><AnalyseBesoins layout="dfc" /></ProtectedRoute>} />
          <Route path="/besoins/dfc/analyse/besoin/:id"   element={<ProtectedRoute module="besoins" moduleRoles={['DFC']}><DetailBesoinAnalyse layout="dfc" /></ProtectedRoute>} />

          {/* ── Besoins : DG (rôle DG uniquement) ─────────────────── */}
          <Route path="/besoins/dg"             element={<ProtectedRoute module="besoins" moduleRoles={['DG']}><DGDashboard /></ProtectedRoute>} />
          <Route path="/besoins/dg/analyse"              element={<ProtectedRoute module="besoins" moduleRoles={['DG']}><AnalyseBesoins layout="dg" /></ProtectedRoute>} />
          <Route path="/besoins/dg/analyse/besoin/:id"   element={<ProtectedRoute module="besoins" moduleRoles={['DG']}><DetailBesoinAnalyse layout="dg" /></ProtectedRoute>} />
          <Route path="/besoins/dg/besoin/:id"  element={<ProtectedRoute module="besoins" moduleRoles={['DG']}><ValiderBesoinDG /></ProtectedRoute>} />

          {/* ── Besoins : Analyse (rôle analyse_besoin) ───────────── */}
          <Route path="/besoins/analyse"             element={<ProtectedRoute module="besoins" moduleRoles={['analyse_besoin']}><AnalyseBesoins layout="analyse" /></ProtectedRoute>} />
          <Route path="/besoins/analyse/besoin/:id"  element={<ProtectedRoute module="besoins" moduleRoles={['analyse_besoin']}><DetailBesoinAnalyse layout="analyse" /></ProtectedRoute>} />

          {/* ── Besoins : Caissière ───────────────────────────────── */}
          <Route path="/besoins/caissiere"             element={<ProtectedRoute module="besoins" moduleRoles={['decaissement']}><CaissiereDashboard /></ProtectedRoute>} />
          <Route path="/besoins/caissiere/besoin/:id"  element={<ProtectedRoute module="besoins" moduleRoles={['decaissement']}><Decaissement /></ProtectedRoute>} />

          {/* ── Besoins : Justif ──────────────────────────────────── */}
          <Route path="/besoins/justif"             element={<ProtectedRoute module="besoins" moduleRoles={['Justif']}><JustifDashboard /></ProtectedRoute>} />
          <Route path="/besoins/justif/besoin/:id"  element={<ProtectedRoute module="besoins" moduleRoles={['Justif']}><SaisirJustificatif /></ProtectedRoute>} />

          {/* ── Redirections de compatibilité ─────────────────────── */}
          <Route path="/admin"      element={<Navigate to="/besoins/admin" replace />} />
          <Route path="/dg"         element={<Navigate to="/besoins/dg" replace />} />
          <Route path="/dfc"        element={<Navigate to="/besoins/dfc" replace />} />
          <Route path="/caissiere"  element={<Navigate to="/besoins/caissiere" replace />} />
          <Route path="/employe"    element={<Navigate to="/besoins/employe" replace />} />
          <Route path="/justif"     element={<Navigate to="/besoins/justif" replace />} />

          {/* ── Fallback ─────────────────────────────────────────── */}
          <Route path="*" element={<Navigate to="/login" replace />} />

        </Routes>
      </AuthProvider>
    </BrowserRouter>
  )
}

export default App