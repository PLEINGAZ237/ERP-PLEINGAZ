import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/contexts/AuthContext";

export default function CompleteProfile() {
  const { user, fetchProfile } = useAuth();
  const navigate = useNavigate();
  const [form, setForm] = useState({ nom: "", prenom: "", telephone: "" });
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);

  const handle = field => e => setForm(f => ({ ...f, [field]: e.target.value }));

  async function handleSubmit(e) {
    e.preventDefault();
    if (!form.nom.trim() || !form.prenom.trim()) { setError("Le nom et le prénom sont requis."); return; }
    setError(""); setLoading(true);
    try {
      const { error: err } = await supabase.from("profiles").update({ nom: form.nom.trim(), prenom: form.prenom.trim(), telephone: form.telephone.trim() || null, profil_complete: true }).eq("id", user.id);
      if (err) throw err;
      await fetchProfile(user.id);
      setSuccess(true);
      setTimeout(() => navigate("/dashboard"), 2000);
    } catch (err) { setError(err.message || "Erreur."); } finally { setLoading(false); }
  }

  const fields = [
    { key: "prenom", label: "Prénom", placeholder: "Ibrahim", icon: <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#aaa" strokeWidth="2"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg> },
    { key: "nom", label: "Nom de famille", placeholder: "Mouchikpou", icon: <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#aaa" strokeWidth="2"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg> },
    { key: "telephone", label: "Téléphone (optionnel)", placeholder: "+237 6XX XXX XXX", icon: <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#aaa" strokeWidth="2"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07A19.5 19.5 0 0 1 4.69 13a19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 3.6 2.18h3a2 2 0 0 1 2 1.72c.127.96.361 1.903.7 2.81a2 2 0 0 1-.45 2.11L7.91 9.91a16 16 0 0 0 6.06 6.06l.92-.92a2 2 0 0 1 2.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0 1 22 16.92z"/></svg> },
  ];

  return (
    <>
      <style>{`@import url('https://fonts.googleapis.com/css2?family=Syne:wght@400;600;700;800&family=DM+Sans:wght@300;400;500&display=swap');*,*::before,*::after{box-sizing:border-box;margin:0;padding:0;}@keyframes spin{to{transform:rotate(360deg);}}@keyframes fadeUp{from{opacity:0;transform:translateY(16px)}to{opacity:1;transform:translateY(0)}}.cp-input:focus{border-color:#ff0000!important;box-shadow:0 0 0 3px rgba(255,0,0,0.08)!important;}`}</style>
      <div style={s.root}>
        <div style={s.decoTop}/><div style={s.decoBot}/>
        <div style={s.card}>
          <div style={s.header}><div style={s.logoWrap}><svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#ff0000" strokeWidth="2"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg></div><div><h1 style={s.brand}>PLEINGAZ ERP</h1><p style={s.brandSub}>Configuration du profil</p></div></div>
          <div style={s.divider}/>
          <div style={s.steps}><div style={{display:"flex",alignItems:"center",gap:"8px"}}><div style={s.stepDotDone}><svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="3"><polyline points="20 6 9 17 4 12"/></svg></div><span style={{fontSize:"13px",fontWeight:500,color:"#22c55e"}}>Mot de passe</span></div><div style={{width:"40px",height:"2px",background:"#22c55e",borderRadius:"1px"}}/><div style={{display:"flex",alignItems:"center",gap:"8px"}}><div style={s.stepDotActive}>2</div><span style={{fontSize:"13px",fontWeight:600,color:"#111"}}>Profil</span></div></div>
          <div style={s.emailBadge}><svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#ff0000" strokeWidth="2"><path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/><polyline points="22,6 12,13 2,6"/></svg><span>{user?.email}</span></div>
          {success ? (
            <div style={{display:"flex",flexDirection:"column",alignItems:"center",gap:"14px",padding:"30px 0"}}><div style={{width:"64px",height:"64px",background:"#f0fdf4",border:"1px solid #bbf7d0",borderRadius:"50%",display:"flex",alignItems:"center",justifyContent:"center"}}><svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="#22c55e" strokeWidth="2.5"><polyline points="20 6 9 17 4 12"/></svg></div><h2 style={{fontFamily:"'Syne',sans-serif",fontSize:"22px",fontWeight:700,color:"#22c55e"}}>Profil complété !</h2><p style={{fontSize:"14px",color:"#888"}}>Bienvenue ! Redirection…</p></div>
          ) : (
            <>
              <h2 style={s.title}>Complétez votre profil</h2><p style={s.subtitle}>Ces informations seront visibles par votre équipe</p>
              <form onSubmit={handleSubmit} style={{display:"flex",flexDirection:"column",gap:"18px"}}>
                {fields.map(({key,label,placeholder,icon})=>(<div key={key}><label style={s.label}>{label}</label><div style={s.inputRow}><span style={s.inputIcon}>{icon}</span><input className="cp-input" type="text" value={form[key]} onChange={handle(key)} placeholder={placeholder} required={key!=="telephone"} style={s.input}/></div></div>))}
                {error&&<div style={s.errorBox}>{error}</div>}
                <button type="submit" disabled={loading} style={{...s.submitBtn,opacity:loading?0.65:1}}>{loading?<span style={s.spinner}/>:<>Enregistrer et continuer <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5"><line x1="5" y1="12" x2="19" y2="12"/><polyline points="12 5 19 12 12 19"/></svg></>}</button>
              </form>
            </>
          )}
          <p style={s.footer}>© {new Date().getFullYear()} PLEINGAZ ERP</p>
        </div>
      </div>
    </>
  );
}
const s={root:{minHeight:"100vh",display:"flex",alignItems:"center",justifyContent:"center",background:"#f8f9fb",fontFamily:"'DM Sans',sans-serif",position:"relative",overflow:"hidden"},decoTop:{position:"absolute",top:"-120px",right:"-80px",width:"360px",height:"360px",borderRadius:"50%",background:"radial-gradient(circle,rgba(255,0,0,0.06),transparent 70%)",zIndex:0},decoBot:{position:"absolute",bottom:"-100px",left:"-60px",width:"300px",height:"300px",borderRadius:"50%",background:"radial-gradient(circle,rgba(255,0,0,0.04),transparent 70%)",zIndex:0},card:{position:"relative",zIndex:1,background:"#fff",border:"1px solid #e5e7eb",borderRadius:"24px",padding:"40px 44px",width:"100%",maxWidth:"440px",boxShadow:"0 8px 40px rgba(0,0,0,0.06)",animation:"fadeUp 0.5s ease both"},header:{display:"flex",alignItems:"center",gap:"14px",marginBottom:"24px"},logoWrap:{width:"48px",height:"48px",background:"#fef2f2",border:"1px solid #fecaca",borderRadius:"14px",display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0},brand:{fontFamily:"'Syne',sans-serif",fontSize:"17px",fontWeight:800,color:"#111",letterSpacing:"0.06em"},brandSub:{fontSize:"11px",color:"#999",letterSpacing:"0.1em",textTransform:"uppercase",marginTop:"2px"},divider:{height:"1px",background:"linear-gradient(90deg,transparent,#fecaca,transparent)",marginBottom:"24px"},steps:{display:"flex",alignItems:"center",justifyContent:"center",gap:"12px",marginBottom:"28px"},stepDotDone:{width:"26px",height:"26px",borderRadius:"50%",background:"#22c55e",display:"flex",alignItems:"center",justifyContent:"center"},stepDotActive:{width:"26px",height:"26px",borderRadius:"50%",background:"#ff0000",color:"#fff",fontSize:"12px",fontWeight:700,display:"flex",alignItems:"center",justifyContent:"center",fontFamily:"'Syne',sans-serif"},emailBadge:{display:"inline-flex",alignItems:"center",gap:"8px",background:"#fef2f2",border:"1px solid #fecaca",borderRadius:"20px",padding:"6px 14px",fontSize:"12px",color:"#666",marginBottom:"20px"},title:{fontFamily:"'Syne',sans-serif",fontSize:"24px",fontWeight:700,color:"#111",marginBottom:"6px"},subtitle:{fontSize:"14px",color:"#888",marginBottom:"28px"},label:{display:"block",fontSize:"12px",fontWeight:500,color:"#666",letterSpacing:"0.03em",marginBottom:"6px"},inputRow:{display:"flex",alignItems:"center",background:"#fafafa",border:"1.5px solid #e5e7eb",borderRadius:"10px",transition:"border-color 0.2s,box-shadow 0.2s",overflow:"hidden"},inputIcon:{padding:"0 12px",display:"flex",alignItems:"center",flexShrink:0},input:{flex:1,background:"transparent",border:"none",outline:"none",color:"#111",fontSize:"14px",padding:"13px 0",fontFamily:"'DM Sans',sans-serif"},errorBox:{display:"flex",alignItems:"center",gap:"8px",background:"#fef2f2",border:"1px solid #fecaca",borderRadius:"10px",padding:"10px 14px",color:"#dc2626",fontSize:"13px"},submitBtn:{display:"flex",alignItems:"center",justifyContent:"center",gap:"8px",background:"#ff0000",border:"none",borderRadius:"10px",color:"#fff",fontSize:"15px",fontWeight:600,padding:"14px",cursor:"pointer",fontFamily:"'Syne',sans-serif",boxShadow:"0 4px 16px rgba(255,0,0,0.2)",transition:"all 0.2s",marginTop:"4px"},spinner:{width:"18px",height:"18px",border:"2.5px solid rgba(255,255,255,0.3)",borderTopColor:"#fff",borderRadius:"50%",display:"inline-block",animation:"spin 0.7s linear infinite"},footer:{marginTop:"28px",textAlign:"center",fontSize:"11px",color:"#bbb"}};