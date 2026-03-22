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
  const { user, fetchProfile } = useAuth();
  const navigate = useNavigate();

  const strength = password.length === 0 ? 0 : password.length < 6 ? 1 : password.length < 10 ? 2 : /[A-Z]/.test(password) && /[0-9]/.test(password) ? 4 : 3;
  const strengthLabel = ["", "Faible", "Moyen", "Fort", "Excellent"];
  const strengthColor = ["", "#ef4444", "#f59e0b", "#22c55e", "#10b981"];

  async function handleSubmit(e) {
    e.preventDefault();
    if (password !== confirm) { setError("Les mots de passe ne correspondent pas."); return; }
    if (password.length < 6) { setError("Le mot de passe doit contenir au moins 6 caractères."); return; }
    setError(""); setLoading(true);
    try {
      const { error: authErr } = await supabase.auth.updateUser({ password });
      if (authErr) throw authErr;
      const { error: dbErr } = await supabase.from("profiles").update({ mot_de_passe_change: true }).eq("id", user.id);
      if (dbErr) throw dbErr;
      await fetchProfile(user.id);
      setSuccess(true);
      // Déterminer la destination après changement de mot de passe
      const [{ data: freshProfile }, { data: adminRoles }] = await Promise.all([
        supabase.from("profiles").select("profil_complete").eq("id", user.id).single(),
        supabase.from("utilisateur_roles").select("roles(nom)").eq("user_id", user.id),
      ]);
      const isAdmin = (adminRoles ?? []).some(r => r.roles?.nom === "Admin");
      const profilOk = freshProfile?.profil_complete;
      const dest = profilOk
        ? (isAdmin ? "/besoins/admin" : "/dashboard")
        : "/completer-profil";
      setTimeout(() => navigate(dest), 2000);
    } catch (err) { setError(err.message || "Erreur."); } finally { setLoading(false); }
  }

  return (
    <>
      <style>{`@import url('https://fonts.googleapis.com/css2?family=Syne:wght@400;600;700;800&family=DM+Sans:wght@300;400;500&display=swap');*,*::before,*::after{box-sizing:border-box;margin:0;padding:0;}@keyframes spin{to{transform:rotate(360deg);}}@keyframes fadeUp{from{opacity:0;transform:translateY(16px)}to{opacity:1;transform:translateY(0)}}.cp-input:focus{border-color:#ff0000!important;box-shadow:0 0 0 3px rgba(255,0,0,0.08)!important;}`}</style>
      <div style={s.root}>
        <div style={s.decoTop}/><div style={s.decoBot}/>
        <div style={s.card}>
          <div style={s.header}><div style={s.logoWrap}><svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#ff0000" strokeWidth="2"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg></div><div><h1 style={s.brand}>PLEINGAZ ERP</h1><p style={s.brandSub}>Sécurité du compte</p></div></div>
          <div style={s.divider}/>
          <div style={s.steps}><div style={{display:"flex",alignItems:"center",gap:"8px"}}><div style={s.stepDotActive}>1</div><span style={{fontSize:"13px",fontWeight:600,color:"#111"}}>Mot de passe</span></div><div style={{width:"40px",height:"2px",background:"#e5e7eb",borderRadius:"1px"}}/><div style={{display:"flex",alignItems:"center",gap:"8px"}}><div style={s.stepDotInactive}>2</div><span style={{fontSize:"13px",fontWeight:500,color:"#9ca3af"}}>Profil</span></div></div>
          {success ? (
            <div style={{display:"flex",flexDirection:"column",alignItems:"center",gap:"14px",padding:"30px 0"}}><div style={{width:"64px",height:"64px",background:"#f0fdf4",border:"1px solid #bbf7d0",borderRadius:"50%",display:"flex",alignItems:"center",justifyContent:"center"}}><svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="#22c55e" strokeWidth="2.5"><polyline points="20 6 9 17 4 12"/></svg></div><h2 style={{fontFamily:"'Syne',sans-serif",fontSize:"22px",fontWeight:700,color:"#22c55e"}}>Mot de passe mis à jour !</h2><p style={{fontSize:"14px",color:"#888"}}>Redirection…</p></div>
          ) : (
            <>
              <h2 style={s.title}>Nouveau mot de passe</h2><p style={s.subtitle}>Choisissez un mot de passe sécurisé</p>
              <form onSubmit={handleSubmit} style={{display:"flex",flexDirection:"column",gap:"18px"}}>
                <div><label style={s.label}>Nouveau mot de passe</label><div style={s.inputRow}><span style={s.inputIcon}><svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#aaa" strokeWidth="2"><rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg></span><input className="cp-input" type={showP?"text":"password"} value={password} onChange={e=>setPassword(e.target.value)} placeholder="••••••••" required style={s.input}/><button type="button" onClick={()=>setShowP(v=>!v)} style={s.eyeBtn} tabIndex={-1}><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#aaa" strokeWidth="2">{showP?<><path d="M17.94 17.94A10.07 10.07 0 0112 20c-7 0-11-8-11-8a18.45 18.45 0 015.06-5.94"/><line x1="1" y1="1" x2="23" y2="23"/></>:<><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></>}</svg></button></div>{password.length>0&&(<div style={{display:"flex",alignItems:"center",gap:"10px",marginTop:"6px"}}><div style={{display:"flex",gap:"4px",flex:1}}>{[1,2,3,4].map(i=>(<div key={i} style={{height:"4px",flex:1,borderRadius:"2px",background:i<=strength?strengthColor[strength]:"#e5e7eb",transition:"background 0.3s"}}/>))}</div><span style={{fontSize:"11px",fontWeight:500,color:strengthColor[strength]}}>{strengthLabel[strength]}</span></div>)}</div>
                <div><label style={s.label}>Confirmer</label><div style={{...s.inputRow,borderColor:confirm&&confirm!==password?"#fca5a5":"#e5e7eb"}}><span style={s.inputIcon}><svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#aaa" strokeWidth="2"><path d="M9 12l2 2 4-4"/><rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg></span><input className="cp-input" type={showC?"text":"password"} value={confirm} onChange={e=>setConfirm(e.target.value)} placeholder="••••••••" required style={s.input}/><button type="button" onClick={()=>setShowC(v=>!v)} style={s.eyeBtn} tabIndex={-1}><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#aaa" strokeWidth="2">{showC?<><path d="M17.94 17.94A10.07 10.07 0 0112 20c-7 0-11-8-11-8a18.45 18.45 0 015.06-5.94"/><line x1="1" y1="1" x2="23" y2="23"/></>:<><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></>}</svg></button></div>{confirm&&confirm!==password&&<p style={{fontSize:"12px",color:"#ef4444",marginTop:"4px"}}>Ne correspond pas</p>}</div>
                {error&&<div style={s.errorBox}>{error}</div>}
                <button type="submit" disabled={loading} style={{...s.submitBtn,opacity:loading?0.65:1}}>{loading?<span style={s.spinner}/>:<>Enregistrer <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5"><line x1="5" y1="12" x2="19" y2="12"/><polyline points="12 5 19 12 12 19"/></svg></>}</button>
              </form>
            </>
          )}
          <p style={s.footer}>© {new Date().getFullYear()} PLEINGAZ ERP</p>
        </div>
      </div>
    </>
  );
}
const s={root:{minHeight:"100vh",display:"flex",alignItems:"center",justifyContent:"center",background:"#f8f9fb",fontFamily:"'DM Sans',sans-serif",position:"relative",overflow:"hidden"},decoTop:{position:"absolute",top:"-120px",right:"-80px",width:"360px",height:"360px",borderRadius:"50%",background:"radial-gradient(circle,rgba(255,0,0,0.06),transparent 70%)",zIndex:0},decoBot:{position:"absolute",bottom:"-100px",left:"-60px",width:"300px",height:"300px",borderRadius:"50%",background:"radial-gradient(circle,rgba(255,0,0,0.04),transparent 70%)",zIndex:0},card:{position:"relative",zIndex:1,background:"#fff",border:"1px solid #e5e7eb",borderRadius:"24px",padding:"40px 44px",width:"100%",maxWidth:"440px",boxShadow:"0 8px 40px rgba(0,0,0,0.06)",animation:"fadeUp 0.5s ease both"},header:{display:"flex",alignItems:"center",gap:"14px",marginBottom:"24px"},logoWrap:{width:"48px",height:"48px",background:"#fef2f2",border:"1px solid #fecaca",borderRadius:"14px",display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0},brand:{fontFamily:"'Syne',sans-serif",fontSize:"17px",fontWeight:800,color:"#111",letterSpacing:"0.06em"},brandSub:{fontSize:"11px",color:"#999",letterSpacing:"0.1em",textTransform:"uppercase",marginTop:"2px"},divider:{height:"1px",background:"linear-gradient(90deg,transparent,#fecaca,transparent)",marginBottom:"24px"},steps:{display:"flex",alignItems:"center",justifyContent:"center",gap:"12px",marginBottom:"28px"},stepDotActive:{width:"26px",height:"26px",borderRadius:"50%",background:"#ff0000",color:"#fff",fontSize:"12px",fontWeight:700,display:"flex",alignItems:"center",justifyContent:"center",fontFamily:"'Syne',sans-serif"},stepDotInactive:{width:"26px",height:"26px",borderRadius:"50%",background:"#f3f4f6",color:"#9ca3af",fontSize:"12px",fontWeight:700,display:"flex",alignItems:"center",justifyContent:"center",fontFamily:"'Syne',sans-serif",border:"1px solid #e5e7eb"},title:{fontFamily:"'Syne',sans-serif",fontSize:"24px",fontWeight:700,color:"#111",marginBottom:"6px"},subtitle:{fontSize:"14px",color:"#888",marginBottom:"28px"},label:{display:"block",fontSize:"12px",fontWeight:500,color:"#666",letterSpacing:"0.03em",marginBottom:"6px"},inputRow:{display:"flex",alignItems:"center",background:"#fafafa",border:"1.5px solid #e5e7eb",borderRadius:"10px",transition:"border-color 0.2s,box-shadow 0.2s",overflow:"hidden"},inputIcon:{padding:"0 12px",display:"flex",alignItems:"center",flexShrink:0},input:{flex:1,background:"transparent",border:"none",outline:"none",color:"#111",fontSize:"14px",padding:"13px 0",fontFamily:"'DM Sans',sans-serif"},eyeBtn:{background:"none",border:"none",cursor:"pointer",padding:"0 14px",display:"flex",alignItems:"center",color:"#bbb"},errorBox:{display:"flex",alignItems:"center",gap:"8px",background:"#fef2f2",border:"1px solid #fecaca",borderRadius:"10px",padding:"10px 14px",color:"#dc2626",fontSize:"13px"},submitBtn:{display:"flex",alignItems:"center",justifyContent:"center",gap:"8px",background:"#ff0000",border:"none",borderRadius:"10px",color:"#fff",fontSize:"15px",fontWeight:600,padding:"14px",cursor:"pointer",fontFamily:"'Syne',sans-serif",boxShadow:"0 4px 16px rgba(255,0,0,0.2)",transition:"all 0.2s",marginTop:"4px"},spinner:{width:"18px",height:"18px",border:"2.5px solid rgba(255,255,255,0.3)",borderTopColor:"#fff",borderRadius:"50%",display:"inline-block",animation:"spin 0.7s linear infinite"},footer:{marginTop:"28px",textAlign:"center",fontSize:"11px",color:"#bbb"}};