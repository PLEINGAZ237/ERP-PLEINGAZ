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
    DG              → valide côté DG
    analyse_besoin  → analyse des besoins (accès DG)
    decaissement    → gère les décaissements (caissière)
    Justif          → saisit les justificatifs

  Rôle global (via utilisateur_roles, pas de module) :
    Admin           → accès admin complet
*/

// Tous les rôles du module besoins — tout utilisateur ayant UN de ces rôles peut émettre un besoin
const BESOINS_ALL = ['emet_besoin', 'DFC', 'DG', 'analyse_besoin', 'decaissement', 'Justif']

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

          {/* ── Besoins : Employé (tous les rôles besoins peuvent émettre) ─ */}
          <Route path="/besoins/employe"               element={<ProtectedRoute module="besoins" moduleRoles={BESOINS_ALL}><EmployeDashboard /></ProtectedRoute>} />
          <Route path="/besoins/employe/creer-besoin"  element={<ProtectedRoute module="besoins" moduleRoles={BESOINS_ALL}><CreerBesoin /></ProtectedRoute>} />
          <Route path="/besoins/employe/mes-besoins"   element={<ProtectedRoute module="besoins" moduleRoles={BESOINS_ALL}><MesBesoins /></ProtectedRoute>} />
          <Route path="/besoins/employe/besoin/:id"    element={<ProtectedRoute module="besoins" moduleRoles={BESOINS_ALL}><DetailBesoin /></ProtectedRoute>} />

          {/* ── Besoins : DFC ─────────────────────────────────────── */}
          <Route path="/besoins/dfc"            element={<ProtectedRoute module="besoins" moduleRoles={['DFC']}><DFCDashboard /></ProtectedRoute>} />
          <Route path="/besoins/dfc/besoin/:id" element={<ProtectedRoute module="besoins" moduleRoles={['DFC']}><ValiderBesoin /></ProtectedRoute>} />

          {/* ── Besoins : DG ──────────────────────────────────────── */}
          <Route path="/besoins/dg"             element={<ProtectedRoute module="besoins" moduleRoles={['DG', 'analyse_besoin']}><DGDashboard /></ProtectedRoute>} />
          <Route path="/besoins/dg/analyse"     element={<ProtectedRoute module="besoins" moduleRoles={['DG', 'analyse_besoin']}><AnalyseBesoins /></ProtectedRoute>} />
          <Route path="/besoins/dg/besoin/:id"  element={<ProtectedRoute module="besoins" moduleRoles={['DG', 'analyse_besoin']}><ValiderBesoinDG /></ProtectedRoute>} />

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