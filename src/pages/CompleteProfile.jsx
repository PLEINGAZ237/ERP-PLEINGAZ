import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/contexts/AuthContext";

export default function CompleteProfile() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [form, setForm] = useState({ nom: "", prenom: "", telephone: "" });
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handle = field => e => setForm(f => ({ ...f, [field]: e.target.value }));

  async function handleSubmit(e) {
    e.preventDefault();
    if (!form.nom.trim() || !form.prenom.trim()) { setError("Le nom et le prénom sont requis."); return; }
    setError(""); setLoading(true);
    try {
      const { error: err } = await supabase
        .from("profiles")
        .upsert({ id: user.id, ...form, updated_at: new Date().toISOString() });
      if (err) throw err;
      navigate("/dashboard");
    } catch (err) {
      setError(err.message || "Erreur lors de l'enregistrement.");
    } finally {
      setLoading(false);
    }
  }

  const fields = [
    { key: "prenom", label: "Prénom", placeholder: "Ibrahim", icon: <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#888" strokeWidth="2"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg> },
    { key: "nom", label: "Nom de famille", placeholder: "Mouchikpou", icon: <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#888" strokeWidth="2"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg> },
    { key: "telephone", label: "Téléphone (optionnel)", placeholder: "+237 6XX XXX XXX", icon: <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#888" strokeWidth="2"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07A19.5 19.5 0 0 1 4.69 13a19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 3.6 2.18h3a2 2 0 0 1 2 1.72c.127.96.361 1.903.7 2.81a2 2 0 0 1-.45 2.11L7.91 9.91a16 16 0 0 0 6.06 6.06l.92-.92a2 2 0 0 1 2.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0 1 22 16.92z"/></svg> },
  ];

  return (
    <div style={styles.root}>
      <div style={styles.grid} />
      <div style={styles.orb1} />
      <div style={styles.orb2} />

      <div style={styles.card}>
        <div style={styles.header}>
          <div style={styles.logoWrap}>
            <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#ff0000" strokeWidth="2">
              <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/>
            </svg>
          </div>
          <div>
            <h1 style={styles.title}>PLEINGAZ ERP</h1>
            <p style={styles.subtitle}>Configuration du profil</p>
          </div>
        </div>

        <div style={styles.divider} />

        {/* Badge email */}
        <div style={styles.emailBadge}>
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#ff0000" strokeWidth="2">
            <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/>
            <polyline points="22,6 12,13 2,6"/>
          </svg>
          <span>{user?.email}</span>
        </div>

        <h2 style={styles.welcomeTitle}>Complétez votre profil</h2>
        <p style={styles.welcomeSub}>Ces informations seront visibles par votre équipe</p>

        <form onSubmit={handleSubmit} style={styles.form}>
          {fields.map(({ key, label, placeholder, icon }) => (
            <div key={key} style={styles.fieldGroup}>
              <label style={styles.label}>{label}</label>
              <div style={styles.inputWrap}
                onFocus={e => e.currentTarget.style.boxShadow = "0 0 0 2px #ff000044"}
                onBlur={e => e.currentTarget.style.boxShadow = "none"}
              >
                <span style={styles.inputIcon}>{icon}</span>
                <input
                  type="text" value={form[key]}
                  onChange={handle(key)}
                  placeholder={placeholder}
                  required={key !== "telephone"}
                  style={styles.input}
                />
              </div>
            </div>
          ))}

          {error && (
            <div style={styles.errorBox}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#ff6b6b" strokeWidth="2">
                <circle cx="12" cy="12" r="10"/><line x1="15" y1="9" x2="9" y2="15"/><line x1="9" y1="9" x2="15" y2="15"/>
              </svg>
              {error}
            </div>
          )}

          <button type="submit" disabled={loading} style={{ ...styles.submitBtn, opacity: loading ? 0.7 : 1 }}>
            {loading
              ? <span style={styles.spinner} />
              : <>Enregistrer et continuer <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5"><line x1="5" y1="12" x2="19" y2="12"/><polyline points="12 5 19 12 12 19"/></svg></>
            }
          </button>
        </form>

        <p style={styles.footer}>
          © {new Date().getFullYear()} PLEINGAZ ERP &mdash; Accès réservé
        </p>
      </div>

      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Syne:wght@400;600;700;800&family=DM+Sans:wght@300;400;500&display=swap');
        * { box-sizing: border-box; }
        @keyframes fadeUp { from{opacity:0;transform:translateY(24px)} to{opacity:1;transform:translateY(0)} }
        @keyframes spin { to{transform:rotate(360deg)} }
        @keyframes pulse1 { 0%,100%{transform:scale(1);opacity:.5} 50%{transform:scale(1.15) translate(20px,-20px);opacity:.8} }
        @keyframes pulse2 { 0%,100%{transform:scale(1);opacity:.4} 50%{transform:scale(1.1) translate(-15px,15px);opacity:.7} }
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
  divider: { height: "1px", background: "linear-gradient(90deg, transparent, rgba(255,0,0,0.3), transparent)", marginBottom: "24px" },
  emailBadge: { display: "inline-flex", alignItems: "center", gap: "8px", background: "rgba(255,0,0,0.08)", border: "1px solid rgba(255,0,0,0.2)", borderRadius: "20px", padding: "6px 14px", fontSize: "12px", color: "#ccc", marginBottom: "20px" },
  welcomeTitle: { fontFamily: "'Syne', sans-serif", fontSize: "26px", fontWeight: 700, color: "#fff", marginBottom: "6px" },
  welcomeSub: { fontSize: "14px", color: "#666", marginBottom: "28px" },
  form: { display: "flex", flexDirection: "column", gap: "18px" },
  fieldGroup: { display: "flex", flexDirection: "column", gap: "7px" },
  label: { fontSize: "12px", fontWeight: 500, color: "#999", letterSpacing: "0.04em" },
  inputWrap: { display: "flex", alignItems: "center", background: "#1c1c1c", border: "1px solid #2a2a2a", borderRadius: "12px", transition: "box-shadow 0.2s", overflow: "hidden" },
  inputIcon: { padding: "0 12px", display: "flex", alignItems: "center", flexShrink: 0 },
  input: { flex: 1, background: "transparent", border: "none", outline: "none", color: "#fff", fontSize: "14px", padding: "13px 0", fontFamily: "'DM Sans', sans-serif" },
  errorBox: { display: "flex", alignItems: "center", gap: "8px", background: "rgba(255,80,80,0.08)", border: "1px solid rgba(255,80,80,0.2)", borderRadius: "10px", padding: "10px 14px", color: "#ff8080", fontSize: "13px" },
  submitBtn: { display: "flex", alignItems: "center", justifyContent: "center", gap: "8px", background: "linear-gradient(135deg, #ff0000, #cc0000)", border: "none", borderRadius: "12px", color: "#fff", fontSize: "15px", fontWeight: 600, padding: "14px", cursor: "pointer", fontFamily: "'Syne', sans-serif", letterSpacing: "0.03em", boxShadow: "0 4px 24px rgba(255,0,0,0.3)", transition: "all 0.2s", marginTop: "4px" },
  spinner: { width: "18px", height: "18px", border: "2px solid rgba(255,255,255,0.3)", borderTopColor: "#fff", borderRadius: "50%", display: "inline-block", animation: "spin 0.7s linear infinite" },
  footer: { marginTop: "28px", textAlign: "center", fontSize: "11px", color: "#444", letterSpacing: "0.03em" },
};