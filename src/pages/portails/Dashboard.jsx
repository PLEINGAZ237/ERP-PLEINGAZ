import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { useState } from "react";

const ALL_MODULES = [
  {
    code: "besoins",
    icon: "💼",
    title: "Gestion des Besoins",
    desc: "Demandes financières, validation DFC / DG, décaissements et justificatifs.",
    route: "/besoins",
    developed: true,
  },
  {
    code: "stock",
    icon: "📦",
    title: "Gestion du Stock",
    desc: "Entrées et sorties de stock, alertes de rupture, inventaires.",
    route: null,
    developed: false,
    badge: "Q2 2025",
  },
  {
    code: "depotage",
    icon: "🛢️",
    title: "Dépotage",
    desc: "Opérations de dépotage, suivi des citernes et des livraisons.",
    route: null,
    developed: false,
    badge: "Q3 2025",
  },
  {
    code: "rh",
    icon: "👥",
    title: "Ressources Humaines",
    desc: "Gestion du personnel, congés, paie et évaluations.",
    route: null,
    developed: false,
    badge: "Q4 2025",
  },
];

export default function PortailDashboard() {
  const {
    user, profile, signOut, hasRole,
    getAccessibleModules, serviceRoles, serviceRolesLoaded,
  } = useAuth();
  const navigate = useNavigate();
  const [hoveredId, setHoveredId] = useState(null);
  const [menuOpen, setMenuOpen] = useState(false);

  const displayName = profile
    ? `${profile.prenom ?? ""} ${profile.nom ?? ""}`.trim()
    : user?.email ?? "Utilisateur";

  const initials = displayName
    .split(" ").slice(0, 2)
    .map(w => w[0]?.toUpperCase() ?? "")
    .join("");

  async function handleLogout() {
    await signOut();
    navigate("/login");
  }

  const hour = new Date().getHours();
  const greeting = hour < 12 ? "Bonjour" : hour < 18 ? "Bon après-midi" : "Bonsoir";

  const isAdmin = hasRole('Admin');
  const noService = !isAdmin && !profile?.service_id;

  // Calculer les modules accessibles
  const accessibleModules = getAccessibleModules();
  const accessibleModuleCodes = accessibleModules.map(m => m.code?.toLowerCase());

  // DEBUG — à retirer après résolution
  console.log('🖥️ DASHBOARD RENDER:', {
    serviceRolesLoaded,
    serviceRoles: JSON.stringify(serviceRoles),
    accessibleModuleCodes,
    isAdmin,
    service_id: profile?.service_id,
  });

  const modules = ALL_MODULES.map(mod => {
    const hasAccess = isAdmin || accessibleModuleCodes.includes(mod.code.toLowerCase());
    const active = mod.developed && hasAccess;
    return { ...mod, active, hasAccess };
  });

  // Si les rôles service ne sont pas encore chargés, afficher un loader
  // au lieu de montrer "Non attribué" prématurément
  const showModuleLoader = !serviceRolesLoaded && !isAdmin && profile?.service_id;

  return (
    <div style={styles.root}>
      <div style={styles.grid} />
      <div style={styles.orb1} />
      <div style={styles.orb2} />

      <nav style={styles.nav}>
        <div style={styles.navInner}>
          <div style={styles.navLogo}>
            <div style={styles.logoIcon}>
              <svg width="22" height="22" viewBox="0 0 32 32" fill="none">
                <polygon points="16,2 30,10 30,22 16,30 2,22 2,10" fill="none" stroke="#ff0000" strokeWidth="2"/>
                <circle cx="16" cy="16" r="5" fill="#ff0000"/>
              </svg>
            </div>
            <div>
              <div style={styles.logoTitle}>PLEINGAZ ERP</div>
              <div style={styles.logoSub}>INFOTECH / WONDERFUL</div>
            </div>
          </div>

          <div style={styles.navRight}>
            <div style={styles.avatarWrap} onClick={() => setMenuOpen(v => !v)}>
              <div style={styles.avatar}>{initials || "U"}</div>
              <div style={styles.avatarInfo}>
                <span style={styles.avatarName}>{displayName}</span>
                <span style={styles.avatarRole}>
                  {profile?.services?.nom ?? profile?.departements?.nom ?? "Utilisateur"}
                </span>
              </div>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#888" strokeWidth="2"
                style={{ transform: menuOpen ? "rotate(180deg)" : "none", transition: "transform 0.2s" }}>
                <polyline points="6 9 12 15 18 9"/>
              </svg>
            </div>

            {menuOpen && (
              <div style={styles.dropdown}>
                <div style={styles.dropdownHeader}>
                  <div style={styles.dropdownAvatar}>{initials || "U"}</div>
                  <div>
                    <div style={{ color: "#111", fontSize: "13px", fontWeight: 600 }}>{displayName}</div>
                    <div style={{ color: "#999", fontSize: "11px" }}>{user?.email}</div>
                  </div>
                </div>
                <div style={styles.dropdownDivider} />
                <button style={{ ...styles.dropdownItem, color: "#ff6b6b" }} onClick={handleLogout}>
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/>
                  </svg>
                  Déconnexion
                </button>
              </div>
            )}
          </div>
        </div>
      </nav>

      <main style={styles.main}>
        <div style={styles.heroSection}>
          <div style={styles.heroBadge}>
            <span style={styles.heroBadgeDot} />
            Plateforme opérationnelle
          </div>
          <h1 style={styles.heroTitle}>
            {greeting},{" "}
            <span style={styles.heroName}>{displayName.split(" ")[0]}</span> 👋
          </h1>
          <p style={styles.heroSub}>
            {noService
              ? "Vous n'avez pas encore de service attribué. Contactez votre administrateur."
              : "Que voulez-vous gérer aujourd'hui ?"
            }
          </p>
        </div>

        {noService && (
          <div style={styles.alertBox}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#d97706" strokeWidth="2">
              <circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/>
            </svg>
            <div>
              <strong>Aucun service attribué</strong>
              <p style={{ fontSize: "13px", color: "#92400e", marginTop: "4px" }}>
                Votre administrateur doit vous affecter un service pour accéder aux modules.
              </p>
            </div>
          </div>
        )}

        <div style={styles.sectionLabel}>
          <div style={styles.sectionLine} />
          <span>Modules disponibles</span>
          <div style={styles.sectionLine} />
        </div>

        {showModuleLoader ? (
          <div style={{ textAlign: "center", padding: "60px 0" }}>
            <div style={{
              width: "32px", height: "32px", margin: "0 auto 12px",
              border: "3px solid #e5e7eb", borderTopColor: "#3b82f6",
              borderRadius: "50%", animation: "spin 0.7s linear infinite",
            }} />
            <p style={{ color: "#999", fontSize: "14px" }}>Chargement de vos accès...</p>
            <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
          </div>
        ) : (
          <div style={styles.grid2}>
            {modules.map((mod, i) => (
              <div
                key={mod.code}
                style={{
                  ...styles.moduleCard,
                  ...(mod.active ? styles.moduleCardActive : styles.moduleCardDisabled),
                  ...(hoveredId === mod.code && mod.active ? styles.moduleCardHover : {}),
                  animationDelay: `${i * 0.1}s`,
                }}
                onMouseEnter={() => setHoveredId(mod.code)}
                onMouseLeave={() => setHoveredId(null)}
                onClick={() => mod.active && mod.route && navigate(mod.route)}
              >
                {mod.active && hoveredId === mod.code && <div style={styles.cardAccent} />}

                <div style={styles.cardHeader}>
                  <div style={{
                    ...styles.cardIconWrap,
                    ...(mod.active ? styles.cardIconActive : styles.cardIconDisabled),
                  }}>
                    <span style={{ fontSize: "24px" }}>{mod.icon}</span>
                  </div>
                  {mod.active ? (
                    <div style={styles.activeBadge}>
                      <span style={styles.activeDot} />
                      Actif
                    </div>
                  ) : !mod.developed ? (
                    <div style={styles.soonBadge}>{mod.badge}</div>
                  ) : (
                    <div style={styles.noAccessBadge}>Non attribué</div>
                  )}
                </div>

                <h3 style={{ ...styles.cardTitle, color: mod.active ? "#111" : "#aaa" }}>{mod.title}</h3>
                <p style={{ ...styles.cardDesc, color: mod.active ? "#777" : "#bbb" }}>{mod.desc}</p>

                {mod.active ? (
                  <div style={{ ...styles.cardCta, opacity: hoveredId === mod.code ? 1 : 0.6 }}>
                    Accéder au module
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#ff0000" strokeWidth="2.5">
                      <line x1="5" y1="12" x2="19" y2="12"/><polyline points="12 5 19 12 12 19"/>
                    </svg>
                  </div>
                ) : !mod.developed ? (
                  <div style={styles.cardLocked}>
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#555" strokeWidth="2">
                      <rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/>
                    </svg>
                    En développement
                  </div>
                ) : (
                  <div style={styles.cardLocked}>
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#999" strokeWidth="2">
                      <circle cx="12" cy="12" r="10"/><line x1="4.93" y1="4.93" x2="19.07" y2="19.07"/>
                    </svg>
                    Non attribué à votre service
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </main>

      {menuOpen && <div style={styles.overlay} onClick={() => setMenuOpen(false)} />}

      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Syne:wght@400;600;700;800&family=DM+Sans:wght@300;400;500&display=swap');
        * { box-sizing: border-box; margin: 0; padding: 0; }
        @keyframes fadeUp { from{opacity:0;transform:translateY(20px)} to{opacity:1;transform:translateY(0)} }
        @keyframes pulse1 { 0%,100%{transform:scale(1);opacity:.4} 50%{transform:scale(1.2) translate(30px,-30px);opacity:.7} }
        @keyframes pulse2 { 0%,100%{transform:scale(1);opacity:.3} 50%{transform:scale(1.1) translate(-20px,20px);opacity:.6} }
        @keyframes blink { 0%,100%{opacity:1} 50%{opacity:0.4} }
      `}</style>
    </div>
  );
}

const styles = {
  root: { minHeight: "100vh", background: "#ffffff", fontFamily: "'DM Sans', sans-serif", position: "relative", overflow: "hidden" },
  grid: { position: "fixed", inset: 0, backgroundImage: "linear-gradient(rgba(255,0,0,0.04) 1px, transparent 1px),linear-gradient(90deg, rgba(255,0,0,0.04) 1px, transparent 1px)", backgroundSize: "56px 56px", pointerEvents: "none", zIndex: 0 },
  orb1: { position: "fixed", top: "-15%", right: "-5%", width: "600px", height: "600px", borderRadius: "50%", background: "radial-gradient(circle, rgba(255,0,0,0.07) 0%, transparent 65%)", animation: "pulse1 12s ease-in-out infinite", pointerEvents: "none", zIndex: 0 },
  orb2: { position: "fixed", bottom: "-20%", left: "-10%", width: "500px", height: "500px", borderRadius: "50%", background: "radial-gradient(circle, rgba(255,0,0,0.04) 0%, transparent 65%)", animation: "pulse2 15s ease-in-out infinite", pointerEvents: "none", zIndex: 0 },
  nav: { position: "sticky", top: 0, zIndex: 100, background: "rgba(255,255,255,0.9)", backdropFilter: "blur(20px)", borderBottom: "1px solid rgba(0,0,0,0.07)" },
  navInner: { maxWidth: "1100px", margin: "0 auto", padding: "0 24px", height: "64px", display: "flex", alignItems: "center", justifyContent: "space-between" },
  navLogo: { display: "flex", alignItems: "center", gap: "12px" },
  logoIcon: { width: "40px", height: "40px", background: "rgba(255,0,0,0.06)", border: "1px solid rgba(255,0,0,0.18)", borderRadius: "10px", display: "flex", alignItems: "center", justifyContent: "center" },
  logoTitle: { fontFamily: "'Syne', sans-serif", fontSize: "14px", fontWeight: 800, color: "#111", letterSpacing: "0.08em" },
  logoSub: { fontSize: "10px", color: "#aaa", letterSpacing: "0.1em", textTransform: "uppercase" },
  navRight: { position: "relative" },
  avatarWrap: { display: "flex", alignItems: "center", gap: "10px", cursor: "pointer", padding: "6px 12px", borderRadius: "12px", border: "1px solid rgba(0,0,0,0.08)", background: "#fafafa", transition: "all 0.2s", userSelect: "none" },
  avatar: { width: "32px", height: "32px", borderRadius: "50%", background: "linear-gradient(135deg, #ff0000, #880000)", color: "#fff", fontSize: "13px", fontWeight: 700, display: "flex", alignItems: "center", justifyContent: "center", fontFamily: "'Syne', sans-serif", flexShrink: 0 },
  avatarInfo: { display: "flex", flexDirection: "column" },
  avatarName: { fontSize: "13px", color: "#111", fontWeight: 500, lineHeight: 1.3 },
  avatarRole: { fontSize: "10px", color: "#aaa", textTransform: "uppercase", letterSpacing: "0.06em" },
  dropdown: { position: "absolute", top: "calc(100% + 10px)", right: 0, background: "#ffffff", border: "1px solid rgba(0,0,0,0.09)", borderRadius: "16px", padding: "8px", minWidth: "220px", boxShadow: "0 20px 60px rgba(0,0,0,0.12)", zIndex: 200 },
  dropdownHeader: { display: "flex", alignItems: "center", gap: "10px", padding: "10px 12px 14px" },
  dropdownAvatar: { width: "36px", height: "36px", borderRadius: "50%", background: "linear-gradient(135deg, #ff0000, #880000)", color: "#fff", fontSize: "14px", fontWeight: 700, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 },
  dropdownDivider: { height: "1px", background: "rgba(0,0,0,0.07)", margin: "4px 0" },
  dropdownItem: { display: "flex", alignItems: "center", gap: "10px", width: "100%", padding: "10px 12px", background: "none", border: "none", cursor: "pointer", borderRadius: "10px", color: "#555", fontSize: "13px", fontFamily: "'DM Sans', sans-serif", transition: "all 0.15s", textAlign: "left" },
  overlay: { position: "fixed", inset: 0, zIndex: 99 },
  main: { maxWidth: "1100px", margin: "0 auto", padding: "48px 24px 80px", position: "relative", zIndex: 1 },
  heroSection: { marginBottom: "48px", animation: "fadeUp 0.5s cubic-bezier(.16,1,.3,1) both" },
  heroBadge: { display: "inline-flex", alignItems: "center", gap: "8px", background: "rgba(255,0,0,0.06)", border: "1px solid rgba(255,0,0,0.18)", borderRadius: "20px", padding: "5px 14px", fontSize: "12px", color: "#cc0000", marginBottom: "18px", letterSpacing: "0.04em" },
  heroBadgeDot: { width: "6px", height: "6px", borderRadius: "50%", background: "#ff0000", animation: "blink 2s ease-in-out infinite" },
  heroTitle: { fontFamily: "'Syne', sans-serif", fontSize: "clamp(28px, 5vw, 44px)", fontWeight: 800, color: "#111", lineHeight: 1.2, marginBottom: "12px" },
  heroName: { color: "#ff0000" },
  heroSub: { fontSize: "16px", color: "#888" },
  alertBox: { display: "flex", alignItems: "flex-start", gap: "12px", background: "#fffbeb", border: "1px solid #fde68a", borderRadius: "16px", padding: "16px 20px", marginBottom: "32px", fontSize: "14px", fontWeight: 600, color: "#92400e" },
  sectionLabel: { display: "flex", alignItems: "center", gap: "16px", marginBottom: "28px", color: "#aaa", fontSize: "12px", textTransform: "uppercase", letterSpacing: "0.08em" },
  sectionLine: { flex: 1, height: "1px", background: "rgba(0,0,0,0.07)" },
  grid2: { display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(260px, 1fr))", gap: "18px" },
  moduleCard: { position: "relative", borderRadius: "20px", padding: "28px 24px", cursor: "pointer", transition: "all 0.25s cubic-bezier(.16,1,.3,1)", overflow: "hidden" },
  moduleCardActive: { background: "#ffffff", border: "1.5px solid rgba(0,0,0,0.09)", boxShadow: "0 2px 12px rgba(0,0,0,0.05)" },
  moduleCardDisabled: { background: "#fafafa", border: "1.5px solid rgba(0,0,0,0.05)", cursor: "default" },
  moduleCardHover: { transform: "translateY(-4px)", boxShadow: "0 20px 60px rgba(255,0,0,0.10)", borderColor: "rgba(255,0,0,0.22)" },
  cardAccent: { position: "absolute", top: 0, left: "20%", right: "20%", height: "2px", background: "linear-gradient(90deg, transparent, #ff0000, transparent)", borderRadius: "0 0 4px 4px" },
  cardHeader: { display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: "18px" },
  cardIconWrap: { width: "52px", height: "52px", borderRadius: "14px", display: "flex", alignItems: "center", justifyContent: "center" },
  cardIconActive: { background: "rgba(255,0,0,0.06)", border: "1px solid rgba(255,0,0,0.15)" },
  cardIconDisabled: { background: "rgba(0,0,0,0.03)", border: "1px solid rgba(0,0,0,0.06)" },
  activeBadge: { display: "flex", alignItems: "center", gap: "6px", background: "rgba(0,180,90,0.07)", border: "1px solid rgba(0,180,90,0.2)", borderRadius: "20px", padding: "4px 10px", fontSize: "11px", color: "#00a050" },
  activeDot: { width: "5px", height: "5px", borderRadius: "50%", background: "#00a050" },
  soonBadge: { background: "rgba(0,0,0,0.04)", border: "1px solid rgba(0,0,0,0.07)", borderRadius: "20px", padding: "4px 10px", fontSize: "11px", color: "#bbb" },
  noAccessBadge: { background: "rgba(0,0,0,0.04)", border: "1px solid rgba(0,0,0,0.07)", borderRadius: "20px", padding: "4px 10px", fontSize: "11px", color: "#999" },
  cardTitle: { fontFamily: "'Syne', sans-serif", fontSize: "16px", fontWeight: 700, marginBottom: "8px" },
  cardDesc: { fontSize: "13px", lineHeight: 1.6, marginBottom: "20px" },
  cardCta: { display: "flex", alignItems: "center", gap: "8px", fontSize: "13px", fontWeight: 600, color: "#ff0000", transition: "opacity 0.2s", fontFamily: "'Syne', sans-serif" },
  cardLocked: { display: "flex", alignItems: "center", gap: "6px", fontSize: "12px", color: "#bbb" },
};