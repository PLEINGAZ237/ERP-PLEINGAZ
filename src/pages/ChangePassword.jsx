import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/contexts/AuthContext";

export default function ChangePassword() {
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);
  const [loading, setLoading] = useState(false);
  const [showP, setShowP] = useState(false);
  const [showC, setShowC] = useState(false);
  const { signOut } = useAuth();
  const navigate = useNavigate();

  const strength = password.length === 0 ? 0
    : password.length < 6 ? 1
    : password.length < 10 ? 2
    : /[A-Z]/.test(password) && /[0-9]/.test(password) ? 4 : 3;

  const strengthLabel = ["", "Faible", "Moyen", "Fort", "Excellent"];
  const strengthColor = ["", "#ff4444", "#ff9500", "#00c851", "#00e676"];

  async function handleSubmit(e) {
    e.preventDefault();
    if (password !== confirm) { setError("Les mots de passe ne correspondent pas."); return; }
    if (password.length < 6) { setError("Le mot de passe doit contenir au moins 6 caractères."); return; }
    setError(""); setLoading(true);
    try {
      const { error: err } = await supabase.auth.updateUser({ password });
      if (err) throw err;
      setSuccess(true);
      setTimeout(() => navigate("/dashboard"), 2500);
    } catch (err) {
      setError(err.message || "Erreur lors du changement de mot de passe.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div style={styles.root}>
      <div style={styles.grid} />
      <div style={styles.orb1} />
      <div style={styles.orb2} />

      <div style={styles.card}>
        <div style={styles.header}>
          <div style={styles.logoWrap}>
            <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#ff0000" strokeWidth="2">
              <rect x="3" y="11" width="18" height="11" rx="2" ry="2"/>
              <path d="M7 11V7a5 5 0 0 1 10 0v4"/>
            </svg>
          </div>
          <div>
            <h1 style={styles.title}>PLEINGAZ ERP</h1>
            <p style={styles.subtitle}>Sécurité du compte</p>
          </div>
        </div>

        <div style={styles.divider} />

        {success ? (
          <div style={styles.successBox}>
            <div style={styles.successIcon}>
              <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="#00e676" strokeWidth="2.5">
                <polyline points="20 6 9 17 4 12"/>
              </svg>
            </div>
            <h2 style={{ ...styles.welcomeTitle, color: "#00e676", fontSize: "22px" }}>Mot de passe mis à jour !</h2>
            <p style={styles.welcomeSub}>Redirection en cours…</p>
          </div>
        ) : (
          <>
            <h2 style={styles.welcomeTitle}>Nouveau mot de passe</h2>
            <p style={styles.welcomeSub}>Choisissez un mot de passe sécurisé pour votre compte</p>

            <form onSubmit={handleSubmit} style={styles.form}>
              <div style={styles.fieldGroup}>
                <label style={styles.label}>Nouveau mot de passe</label>
                <div style={styles.inputWrap}>
                  <span style={styles.inputIcon}>
                    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#888" strokeWidth="2">
                      <rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/>
                    </svg>
                  </span>
                  <input type={showP ? "text" : "password"} value={password}
                    onChange={e => setPassword(e.target.value)} placeholder="••••••••" required style={styles.input}
                    onFocus={e => e.target.parentElement.style.boxShadow = "0 0 0 2px #ff000044"}
                    onBlur={e => e.target.parentElement.style.boxShadow = "none"}
                  />
                  <button type="button" onClick={() => setShowP(v => !v)} style={styles.eyeBtn}>
                    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#888" strokeWidth="2">
                      {showP ? <><path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94"/><path d="M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19"/><line x1="1" y1="1" x2="23" y2="23"/></> : <><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></>}
                    </svg>
                  </button>
                </div>
                {password.length > 0 && (
                  <div style={styles.strengthWrap}>
                    <div style={styles.strengthBar}>
                      {[1,2,3,4].map(i => (
                        <div key={i} style={{ ...styles.strengthSegment, background: i <= strength ? strengthColor[strength] : "#2a2a2a" }} />
                      ))}
                    </div>
                    <span style={{ fontSize: "11px", color: strengthColor[strength] }}>{strengthLabel[strength]}</span>
                  </div>
                )}
              </div>

              <div style={styles.fieldGroup}>
                <label style={styles.label}>Confirmer le mot de passe</label>
                <div style={{
                  ...styles.inputWrap,
                  borderColor: confirm && confirm !== password ? "rgba(255,80,80,0.4)" : "#2a2a2a"
                }}>
                  <span style={styles.inputIcon}>
                    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#888" strokeWidth="2">
                      <path d="M9 12l2 2 4-4"/><rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/>
                    </svg>
                  </span>
                  <input type={showC ? "text" : "password"} value={confirm}
                    onChange={e => setConfirm(e.target.value)} placeholder="••••••••" required style={styles.input}
                    onFocus={e => e.target.parentElement.style.boxShadow = "0 0 0 2px #ff000044"}
                    onBlur={e => e.target.parentElement.style.boxShadow = "none"}
                  />
                  <button type="button" onClick={() => setShowC(v => !v)} style={styles.eyeBtn}>
                    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#888" strokeWidth="2">
                      {showC ? <><path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94"/><line x1="1" y1="1" x2="23" y2="23"/></> : <><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></>}
                    </svg>
                  </button>
                </div>
              </div>

              {error && (
                <div style={styles.errorBox}>
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#ff6b6b" strokeWidth="2">
                    <circle cx="12" cy="12" r="10"/><line x1="15" y1="9" x2="9" y2="15"/><line x1="9" y1="9" x2="15" y2="15"/>
                  </svg>
                  {error}
                </div>
              )}

              <button type="submit" disabled={loading} style={{ ...styles.submitBtn, opacity: loading ? 0.7 : 1 }}>
                {loading ? <span style={styles.spinner} /> : <>Enregistrer le mot de passe <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5"><line x1="5" y1="12" x2="19" y2="12"/><polyline points="12 5 19 12 12 19"/></svg></>}
              </button>
            </form>
          </>
        )}

        <p style={styles.footer}>
          © {new Date().getFullYear()} PLEINGAZ ERP &mdash; Accès réservé
        </p>
      </div>

      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Syne:wght@400;600;700;800&family=DM+Sans:wght@300;400;500&display=swap');
        * { box-sizing: border-box; }
        @keyframes fadeUp { from{opacity:0;transform:translateY(24px)} to{opacity:1;transform:translateY(0)} }
        @keyframes spin { to{transform:rotate(360deg)} }
        @keyframes pulse1 { 0%,100%{transform:scale(1) translate(0,0);opacity:.5} 50%{transform:scale(1.15) translate(20px,-20px);opacity:.8} }
        @keyframes pulse2 { 0%,100%{transform:scale(1) translate(0,0);opacity:.4} 50%{transform:scale(1.1) translate(-15px,15px);opacity:.7} }
        input:-webkit-autofill { -webkit-box-shadow:0 0 0 100px #1a1a1a inset !important; -webkit-text-fill-color:#fff !important; }
      `}</style>
    </div>
  );
}

const styles = {
  root: { minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", background: "#0a0a0a", fontFamily: "'DM Sans', sans-serif", position: "relative", overflow: "hidden" },
  grid: { position: "absolute", inset: 0, backgroundImage: "linear-gradient(rgba(255,0,0,0.04) 1px, transparent 1px),linear-gradient(90deg, rgba(255,0,0,0.04) 1px, transparent 1px)", backgroundSize: "48px 48px", zIndex: 0 },
  orb1: { position: "absolute", top: "-20%", right: "-10%", width: "500px", height: "500px", borderRadius: "50%", background: "radial-gradient(circle, rgba(255,0,0,0.18) 0%, transparent 70%)", animation: "pulse1 8s ease-in-out infinite", zIndex: 0 },
  orb2: { position: "absolute", bottom: "-20%", left: "-10%", width: "400px", height: "400px", borderRadius: "50%", background: "radial-gradient(circle, rgba(255,0,0,0.12) 0%, transparent 70%)", animation: "pulse2 10s ease-in-out infinite", zIndex: 0 },
  card: { position: "relative", zIndex: 1, background: "linear-gradient(145deg, #161616, #111111)", border: "1px solid rgba(255,255,255,0.07)", borderRadius: "24px", padding: "40px 44px", width: "100%", maxWidth: "440px", boxShadow: "0 32px 80px rgba(0,0,0,0.6), 0 0 0 1px rgba(255,0,0,0.08)", animation: "fadeUp 0.6s cubic-bezier(.16,1,.3,1) both" },
  header: { display: "flex", alignItems: "center", gap: "14px", marginBottom: "24px" },
  logoWrap: { width: "52px", height: "52px", background: "rgba(255,0,0,0.08)", border: "1px solid rgba(255,0,0,0.2)", borderRadius: "14px", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 },
  title: { fontFamily: "'Syne', sans-serif", fontSize: "18px", fontWeight: 800, color: "#fff", letterSpacing: "0.08em" },
  subtitle: { fontSize: "11px", color: "#666", letterSpacing: "0.12em", textTransform: "uppercase", marginTop: "2px" },
  divider: { height: "1px", background: "linear-gradient(90deg, transparent, rgba(255,0,0,0.3), transparent)", marginBottom: "28px" },
  welcomeTitle: { fontFamily: "'Syne', sans-serif", fontSize: "26px", fontWeight: 700, color: "#fff", marginBottom: "6px" },
  welcomeSub: { fontSize: "14px", color: "#666", marginBottom: "28px" },
  form: { display: "flex", flexDirection: "column", gap: "18px" },
  fieldGroup: { display: "flex", flexDirection: "column", gap: "7px" },
  label: { fontSize: "12px", fontWeight: 500, color: "#999", letterSpacing: "0.04em" },
  inputWrap: { display: "flex", alignItems: "center", background: "#1c1c1c", border: "1px solid #2a2a2a", borderRadius: "12px", transition: "box-shadow 0.2s", overflow: "hidden" },
  inputIcon: { padding: "0 12px", display: "flex", alignItems: "center", flexShrink: 0 },
  input: { flex: 1, background: "transparent", border: "none", outline: "none", color: "#fff", fontSize: "14px", padding: "13px 0", fontFamily: "'DM Sans', sans-serif" },
  eyeBtn: { background: "none", border: "none", cursor: "pointer", padding: "0 14px", display: "flex", alignItems: "center" },
  strengthWrap: { display: "flex", alignItems: "center", gap: "10px", marginTop: "4px" },
  strengthBar: { display: "flex", gap: "4px", flex: 1 },
  strengthSegment: { height: "4px", flex: 1, borderRadius: "2px", transition: "background 0.3s" },
  errorBox: { display: "flex", alignItems: "center", gap: "8px", background: "rgba(255,80,80,0.08)", border: "1px solid rgba(255,80,80,0.2)", borderRadius: "10px", padding: "10px 14px", color: "#ff8080", fontSize: "13px" },
  submitBtn: { display: "flex", alignItems: "center", justifyContent: "center", gap: "8px", background: "linear-gradient(135deg, #ff0000, #cc0000)", border: "none", borderRadius: "12px", color: "#fff", fontSize: "15px", fontWeight: 600, padding: "14px", cursor: "pointer", fontFamily: "'Syne', sans-serif", letterSpacing: "0.03em", boxShadow: "0 4px 24px rgba(255,0,0,0.3)", transition: "all 0.2s", marginTop: "4px" },
  spinner: { width: "18px", height: "18px", border: "2px solid rgba(255,255,255,0.3)", borderTopColor: "#fff", borderRadius: "50%", display: "inline-block", animation: "spin 0.7s linear infinite" },
  successBox: { display: "flex", flexDirection: "column", alignItems: "center", gap: "14px", padding: "20px 0" },
  successIcon: { width: "64px", height: "64px", background: "rgba(0,230,118,0.1)", border: "1px solid rgba(0,230,118,0.3)", borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center" },
  footer: { marginTop: "28px", textAlign: "center", fontSize: "11px", color: "#444", letterSpacing: "0.03em" },
};