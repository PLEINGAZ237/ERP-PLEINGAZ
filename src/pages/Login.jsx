import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";

export default function Login() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [showPass, setShowPass] = useState(false);
  const { signIn } = useAuth();
  const navigate = useNavigate();

  async function handleSubmit(e) {
    e.preventDefault();
    setLoading(true);
    setError("");
    const { error } = await signIn(email, password);
    if (error) {
      setError("Email ou mot de passe incorrect.");
      setLoading(false);
    } else {
      navigate("/dashboard");
    }
  }

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Syne:wght@400;500;600;700;800&family=DM+Sans:ital,opsz,wght@0,9..40,300;0,9..40,400;0,9..40,500&display=swap');
        *,*::before,*::after{box-sizing:border-box;margin:0;padding:0;}
        body{overflow:hidden;}

        .lr{min-height:100vh;background:#fff;display:flex;font-family:'DM Sans',sans-serif;overflow:hidden;}

        /* LEFT */
        .ll{width:46%;background:#ff0000;position:relative;display:flex;flex-direction:column;justify-content:space-between;padding:52px 56px;overflow:hidden;}
        .ll::before{content:'';position:absolute;top:-100px;right:-100px;width:380px;height:380px;border-radius:50%;background:rgba(255,255,255,0.07);}
        .ll::after{content:'';position:absolute;bottom:-140px;left:-80px;width:460px;height:460px;border-radius:50%;background:rgba(0,0,0,0.07);}
        .ll-grid{position:absolute;inset:0;background-image:linear-gradient(rgba(255,255,255,0.04) 1px,transparent 1px),linear-gradient(90deg,rgba(255,255,255,0.04) 1px,transparent 1px);background-size:40px 40px;}

        .ll-brand{position:relative;z-index:2;display:inline-flex;align-items:center;gap:10px;background:rgba(255,255,255,0.12);border:1px solid rgba(255,255,255,0.2);border-radius:8px;padding:9px 16px;}
        .ll-dot{width:8px;height:8px;background:#fff;border-radius:50%;}
        .ll-brand-txt{font-family:'Syne',sans-serif;font-weight:700;font-size:13px;letter-spacing:0.12em;text-transform:uppercase;color:#fff;}

        .ll-hero{position:relative;z-index:2;}
        .ll-hero h1{font-family:'Syne',sans-serif;font-size:50px;font-weight:800;color:#fff;line-height:1.05;margin-bottom:18px;letter-spacing:-0.02em;}
        .ll-hero p{font-size:15px;color:rgba(255,255,255,0.72);line-height:1.65;max-width:320px;font-weight:300;}

        .ll-mods{position:relative;z-index:2;display:flex;flex-direction:column;gap:9px;}
        .ll-mod{display:flex;align-items:center;gap:12px;padding:13px 16px;background:rgba(255,255,255,0.09);border:1px solid rgba(255,255,255,0.13);border-radius:10px;}
        .ll-mod-ic{width:30px;height:30px;background:rgba(255,255,255,0.18);border-radius:6px;display:flex;align-items:center;justify-content:center;font-size:13px;flex-shrink:0;}
        .ll-mod-lbl{font-size:13px;font-weight:500;color:rgba(255,255,255,0.88);}

        /* RIGHT */
        .lr-r{flex:1;display:flex;flex-direction:column;align-items:center;justify-content:center;padding:60px 64px;position:relative;}
        .lr-r::after{content:'';position:absolute;top:0;right:0;width:220px;height:220px;background:repeating-linear-gradient(0deg,transparent,transparent 23px,#f0f0f0 23px,#f0f0f0 24px),repeating-linear-gradient(90deg,transparent,transparent 23px,#f0f0f0 23px,#f0f0f0 24px);opacity:.5;pointer-events:none;}

        .lf{width:100%;max-width:400px;}
        .lf-head{margin-bottom:38px;}
        .lf-head h2{font-family:'Syne',sans-serif;font-size:30px;font-weight:700;color:#111;letter-spacing:-0.02em;margin-bottom:6px;}
        .lf-head p{font-size:14px;color:#999;font-weight:300;}

        .lf-field{margin-bottom:18px;}
        .lf-field label{display:block;font-size:11px;font-weight:500;color:#666;text-transform:uppercase;letter-spacing:0.09em;margin-bottom:7px;}
        .lf-iw{position:relative;}
        .lf-in{width:100%;height:50px;border:1.5px solid #ebebeb;border-radius:10px;padding:0 16px;font-size:15px;font-family:'DM Sans',sans-serif;color:#111;background:#fafafa;outline:none;transition:border-color .2s,background .2s,box-shadow .2s;}
        .lf-in:focus{border-color:#ff0000;background:#fff;box-shadow:0 0 0 4px rgba(255,0,0,0.07);}
        .lf-in-p{padding-right:48px;}
        .lf-eye{position:absolute;right:13px;top:50%;transform:translateY(-50%);background:none;border:none;cursor:pointer;padding:4px;color:#bbb;display:flex;align-items:center;transition:color .2s;}
        .lf-eye:hover{color:#ff0000;}

        .lf-err{display:flex;align-items:center;gap:8px;background:#fff5f5;border:1px solid #ffd0d0;border-radius:8px;padding:11px 14px;font-size:13px;color:#cc0000;margin-bottom:18px;}

        .lf-btn{width:100%;height:50px;background:#ff0000;color:#fff;border:none;border-radius:10px;font-family:'Syne',sans-serif;font-size:15px;font-weight:600;letter-spacing:0.02em;cursor:pointer;display:flex;align-items:center;justify-content:center;gap:10px;transition:background .2s,transform .15s,box-shadow .2s;box-shadow:0 4px 20px rgba(255,0,0,0.28);margin-top:6px;}
        .lf-btn:hover:not(:disabled){background:#d40000;transform:translateY(-1px);box-shadow:0 6px 26px rgba(255,0,0,0.38);}
        .lf-btn:active:not(:disabled){transform:translateY(0);}
        .lf-btn:disabled{opacity:.65;cursor:not-allowed;}

        .lf-spin{width:18px;height:18px;border:2.5px solid rgba(255,255,255,0.3);border-top-color:#fff;border-radius:50%;animation:spin .7s linear infinite;}
        @keyframes spin{to{transform:rotate(360deg);}}

        .lf-foot{margin-top:36px;font-size:12px;color:#ccc;text-align:center;}
        .lf-foot span{color:#ff0000;font-weight:500;}

        @media(max-width:860px){.ll{display:none;}.lr-r{padding:40px 24px;}}
      `}</style>

      <div className="lr">
        <div className="ll">
          <div className="ll-grid" />
          <div className="ll-brand">
            <div className="ll-dot" />
            <span className="ll-brand-txt">ERP PLEINGAz</span>
          </div>
          <div className="ll-hero">
            <h1>Gérez votre entreprise efficacement.</h1>
            <p>Plateforme unifiée pour INFOTECH et WONDERFUL. Besoins, stock, dépotage et ressources humaines en un seul endroit.</p>
          </div>
          <div className="ll-mods">
            {[["💼","Gestion des Besoins"],["📦","Gestion du Stock"],["🛢️","Dépotage"],["👥","Ressources Humaines"]].map(([ic,lbl])=>(
              <div key={lbl} className="ll-mod">
                <div className="ll-mod-ic">{ic}</div>
                <span className="ll-mod-lbl">{lbl}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="lr-r">
          <div className="lf">
            <div className="lf-head">
              <h2>Connexion</h2>
              <p>Entrez vos identifiants pour accéder à la plateforme.</p>
            </div>

            {error && (
              <div className="lf-err">
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
                {error}
              </div>
            )}

            <form onSubmit={handleSubmit}>
              <div className="lf-field">
                <label>Adresse email</label>
                <div className="lf-iw">
                  <input className="lf-in" type="email" placeholder="vous@exemple.com"
                    value={email} onChange={e=>setEmail(e.target.value)} required autoFocus />
                </div>
              </div>
              <div className="lf-field">
                <label>Mot de passe</label>
                <div className="lf-iw">
                  <input className="lf-in lf-in-p" type={showPass?"text":"password"} placeholder="••••••••"
                    value={password} onChange={e=>setPassword(e.target.value)} required />
                  <button type="button" className="lf-eye" onClick={()=>setShowPass(!showPass)}>
                    {showPass
                      ? <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M17.94 17.94A10.07 10.07 0 0112 20c-7 0-11-8-11-8a18.45 18.45 0 015.06-5.94"/><path d="M9.9 4.24A9.12 9.12 0 0112 4c7 0 11 8 11 8a18.5 18.5 0 01-2.16 3.19"/><line x1="1" y1="1" x2="23" y2="23"/></svg>
                      : <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>
                    }
                  </button>
                </div>
              </div>
              <button className="lf-btn" type="submit" disabled={loading}>
                {loading ? <span className="lf-spin" /> : <>Se connecter <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><line x1="5" y1="12" x2="19" y2="12"/><polyline points="12 5 19 12 12 19"/></svg></>}
              </button>
            </form>

            <div className="lf-foot">© 2025 <span>PLEINGAz</span> · INFOTECH / WONDERFUL</div>
          </div>
        </div>
      </div>
    </>
  );
}