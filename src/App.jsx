import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { AuthProvider }    from './contexts/AuthContext'
import ProtectedRoute      from './components/ProtectedRoute'

// ── Pages publiques ──────────────────────────────────────────────────────────
import Login               from './pages/Login'
import ChangePassword      from './pages/ChangePassword'
import CompleteProfile     from './pages/CompleteProfile'

// ── Portail (page d'accueil après connexion) ─────────────────────────────────
import PortailDashboard    from './pages/portails/Dashboard'

// ── Module Besoins : routeur de rôle ─────────────────────────────────────────
import BesoinsDashboard    from './pages/besoins/BesoinsDashboard' 

// ── Module Besoins : Admin ───────────────────────────────────────────────────
import AdminDashboard      from './pages/besoins/admin/AdminDashboard'
import Entreprises         from './pages/besoins/admin/Entreprises'
import Departements        from './pages/besoins/admin/Departements'
import Caisses             from './pages/besoins/admin/Caisses'
import Agences             from './pages/besoins/admin/Agences'
import Magasins            from './pages/besoins/admin/Magasins'
import Citernes            from './pages/besoins/admin/Citernes'
import Banques             from './pages/besoins/admin/Banques'
import Virements           from './pages/besoins/admin/Virements'
import Roles               from './pages/besoins/admin/Roles'
import Utilisateurs        from './pages/besoins/admin/Utilisateurs'

// ── Module Besoins : Employé ─────────────────────────────────────────────────
import EmployeDashboard    from './pages/besoins/employe/EmployeDashboard'
import CreerBesoin         from './pages/besoins/employe/CreerBesoin'
import MesBesoins          from './pages/besoins/employe/MesBesoins'

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

// ── Futurs modules (décommenter quand prêts) ─────────────────────────────────
// import StockDashboard   from './pages/stock/StockDashboard'
// import DepotageDashboard from './pages/depotage/DepotageDashboard'

function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <Routes>

          {/* ── Routes publiques ──────────────────────────────────── */}
          <Route path="/login"                element={<Login />} />
          <Route path="/changer-mot-de-passe" element={<ChangePassword />} />
          <Route path="/completer-profil"     element={<CompleteProfile />} />

          {/* ── Portail (tableau de bord principal) ──────────────── */}
          <Route
            path="/dashboard"
            element={<ProtectedRoute><PortailDashboard /></ProtectedRoute>}
          />

          {/* ── Module Besoins : routeur de rôle ─────────────────── */}
          {/* Quand on clique sur le module "Besoins" dans le portail, */}
          {/* cette route redirige vers /besoins/dg, /besoins/dfc, etc. */}
          <Route
            path="/besoins"
            element={<ProtectedRoute><BesoinsDashboard /></ProtectedRoute>}
          />

          {/* ── Module Besoins : Admin ────────────────────────────── */}
          <Route path="/besoins/admin"              element={<ProtectedRoute roles={['Admin']}><AdminDashboard /></ProtectedRoute>} />
          <Route path="/besoins/admin/entreprises"  element={<ProtectedRoute roles={['Admin']}><Entreprises /></ProtectedRoute>} />
          <Route path="/besoins/admin/departements" element={<ProtectedRoute roles={['Admin']}><Departements /></ProtectedRoute>} />
          <Route path="/besoins/admin/caisses"      element={<ProtectedRoute roles={['Admin']}><Caisses /></ProtectedRoute>} />
          <Route path="/besoins/admin/agences"      element={<ProtectedRoute roles={['Admin']}><Agences /></ProtectedRoute>} />
          <Route path="/besoins/admin/magasins"     element={<ProtectedRoute roles={['Admin']}><Magasins /></ProtectedRoute>} />
          <Route path="/besoins/admin/citernes"     element={<ProtectedRoute roles={['Admin']}><Citernes /></ProtectedRoute>} />
          <Route path="/besoins/admin/banques"      element={<ProtectedRoute roles={['Admin']}><Banques /></ProtectedRoute>} />
          <Route path="/besoins/admin/virements"    element={<ProtectedRoute roles={['Admin']}><Virements /></ProtectedRoute>} />
          <Route path="/besoins/admin/roles"        element={<ProtectedRoute roles={['Admin']}><Roles /></ProtectedRoute>} />
          <Route path="/besoins/admin/utilisateurs" element={<ProtectedRoute roles={['Admin']}><Utilisateurs /></ProtectedRoute>} />

          {/* ── Module Besoins : Employé ──────────────────────────── */}
          <Route path="/besoins/employe"              element={<ProtectedRoute roles={['Employe','DFC','DG','Caissiere','Justif']}><EmployeDashboard /></ProtectedRoute>} />
          <Route path="/besoins/employe/creer-besoin" element={<ProtectedRoute roles={['Employe','DFC','DG','Caissiere','Justif']}><CreerBesoin /></ProtectedRoute>} />
          <Route path="/besoins/employe/mes-besoins"  element={<ProtectedRoute roles={['Employe','DFC','DG','Caissiere','Justif']}><MesBesoins /></ProtectedRoute>} />

          {/* ── Module Besoins : DFC ─────────────────────────────── */}
          <Route path="/besoins/dfc"            element={<ProtectedRoute roles={['DFC']}><DFCDashboard /></ProtectedRoute>} />
          <Route path="/besoins/dfc/besoin/:id" element={<ProtectedRoute roles={['DFC']}><ValiderBesoin /></ProtectedRoute>} />

          {/* ── Module Besoins : DG ──────────────────────────────── */}
          <Route path="/besoins/dg"             element={<ProtectedRoute roles={['DG']}><DGDashboard /></ProtectedRoute>} />
          <Route path="/besoins/dg/analyse"     element={<ProtectedRoute roles={['DG']}><AnalyseBesoins /></ProtectedRoute>} />
          <Route path="/besoins/dg/besoin/:id"  element={<ProtectedRoute roles={['DG']}><ValiderBesoinDG /></ProtectedRoute>} />

          {/* ── Module Besoins : Caissière ───────────────────────── */}
          <Route path="/besoins/caissiere"             element={<ProtectedRoute roles={['Caissiere']}><CaissiereDashboard /></ProtectedRoute>} />
          <Route path="/besoins/caissiere/besoin/:id"  element={<ProtectedRoute roles={['Caissiere']}><Decaissement /></ProtectedRoute>} />

          {/* ── Module Besoins : Justif ──────────────────────────── */}
          <Route path="/besoins/justif"             element={<ProtectedRoute roles={['Justif']}><JustifDashboard /></ProtectedRoute>} />
          <Route path="/besoins/justif/besoin/:id"  element={<ProtectedRoute roles={['Justif']}><SaisirJustificatif /></ProtectedRoute>} />

          {/* ── Futurs modules ───────────────────────────────────── */}
          {/* <Route path="/stock" element={<ProtectedRoute><StockDashboard /></ProtectedRoute>} /> */}
          {/* <Route path="/depotage" element={<ProtectedRoute><DepotageDashboard /></ProtectedRoute>} /> */}

          {/* ── Redirections de compatibilité (anciennes URLs) ────── */}
          {/* Si quelqu'un a bookmarké /dg ou /caissiere, on redirige */}
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