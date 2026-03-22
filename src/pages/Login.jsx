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
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&family=Syne:wght@700;800&display=swap');
        
        *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
        
        body { 
          overflow-x: hidden; 
          background-color: #fbfbfb; 
          color: #1a1a1a;
          font-family: 'Inter', sans-serif;
        }

        .pg-login-wrapper {
          min-height: 100vh;
          display: flex;
          align-items: center;
          justify-content: center;
          position: relative;
          padding: 20px;
          /* Motif de fond subtil */
          background-image: 
            radial-gradient(#e1e1e1 1px, transparent 1px), 
            radial-gradient(#e1e1e1 1px, #fbfbfb 1px);
          background-size: 40px 40px;
          background-position: 0 0, 20px 20px;
          animation: fadeIn 0.5s ease-out;
        }

        /* Décorations d'arrière-plan floues (Rouge et Blanc) */
        .blob {
          position: absolute;
          border-radius: 50%;
          filter: blur(80px);
          opacity: 0.5;
          z-index: 0;
        }
        .blob-1 {
          top: 10%;
          left: 10%;
          width: 300px;
          height: 300px;
          background-color: rgba(255, 0, 0, 0.1);
        }
        .blob-2 {
          bottom: 10%;
          right: 10%;
          width: 400px;
          height: 400px;
          background-color: rgba(255, 0, 0, 0.05);
        }

        .pg-card {
          position: relative;
          z-index: 1;
          width: 100%;
          max-width: 480px;
          background: rgba(255, 255, 255, 0.8);
          backdrop-filter: blur(10px);
          -webkit-backdrop-filter: blur(10px);
          border: 1px solid rgba(255, 255, 255, 0.6);
          border-radius: 24px;
          padding: 50px 40px;
          box-shadow: 0 20px 40px rgba(0,0,0,0.03);
          transition: transform 0.3s ease, box-shadow 0.3s ease;
        }

        .pg-header {
          text-align: center;
          margin-bottom: 40px;
        }

        .pg-logo {
          font-family: 'Syne', sans-serif;
          font-size: 36px;
          font-weight: 800;
          color: #ff0000;
          letter-spacing: -1.5px;
          margin-bottom: 10px;
          display: inline-block;
        }
        .pg-logo span {
          color: #ff0000;
        }

        .pg-subtitle {
          font-size: 15px;
          color: #666;
          font-weight: 400;
          line-height: 1.5;
          max-width: 300px;
          margin: 0 auto;
        }

        /* Formulaire */
        .form-stack {
          display: flex;
          flex-direction: column;
          gap: 20px;
        }

        .input-group label {
          display: block;
          font-size: 13px;
          font-weight: 500;
          color: #444;
          margin-bottom: 8px;
          margin-left: 2px;
        }

        .input-wrapper {
          position: relative;
        }

        .pg-input {
          width: 100%;
          height: 52px;
          background: #fff;
          border: 1px solid #e0e0e0;
          border-radius: 12px;
          padding: 0 16px;
          font-size: 15px;
          font-family: 'Inter', sans-serif;
          color: #1a1a1a;
          transition: all 0.2s ease;
        }

        .pg-input::placeholder {
          color: #aaa;
        }

        .pg-input:focus {
          outline: none;
          border-color: #ff0000;
          box-shadow: 0 0 0 4px rgba(255, 0, 0, 0.1);
        }

        /* Input mot de passe avec œil */
        .pg-input-p {
          padding-right: 50px;
        }

        .pass-toggle {
          position: absolute;
          right: 14px;
          top: 50%;
          transform: translateY(-50%);
          background: none;
          border: none;
          cursor: pointer;
          color: #bbb;
          padding: 6px;
          display: flex;
          align-items: center;
          justify-content: center;
          border-radius: 8px;
          transition: all 0.2s;
        }
        .pass-toggle:hover {
          color: #ff0000;
          background-color: rgba(255,0,0,0.05);
        }

        /* Erreur */
        .error-alert {
          display: flex;
          align-items: center;
          gap: 10px;
          background-color: #fff1f1;
          border: 1px solid #ffcccc;
          color: #cc0000;
          padding: 14px;
          border-radius: 12px;
          font-size: 14px;
          font-weight: 500;
        }

        /* Bouton */
        .pg-submit-btn {
          width: 100%;
          height: 52px;
          background-color: #ff0000;
          color: #fff;
          border: none;
          border-radius: 12px;
          font-size: 16px;
          font-weight: 600;
          cursor: pointer;
          transition: all 0.2s ease;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 10px;
          margin-top: 10px;
          box-shadow: 0 4px 12px rgba(255, 0, 0, 0.2);
        }

        .pg-submit-btn:hover:not(:disabled) {
          background-color: #e60000;
          transform: translateY(-1px);
          box-shadow: 0 6px 18px rgba(255, 0, 0, 0.3);
        }

        .pg-submit-btn:active:not(:disabled) {
          transform: translateY(1px);
        }

        .pg-submit-btn:disabled {
          opacity: 0.6;
          cursor: not-allowed;
          box-shadow: none;
        }

        /* Loader */
        .spinner {
          width: 20px;
          height: 20px;
          border: 2.5px solid rgba(255,255,255,0.3);
          border-top-color: #fff;
          border-radius: 50%;
          animation: spin 0.7s linear infinite;
        }

        .pg-footer {
          margin-top: 40px;
          text-align: center;
          font-size: 13px;
          color: #888;
          border-top: 1px solid #eee;
          padding-top: 20px;
        }
        .pg-footer strong {
          color: #ff0000;
          font-weight: 600;
        }

        /* Animations */
        @keyframes spin { to { transform: rotate(360deg); } }
        @keyframes fadeIn {
          from { opacity: 0; transform: translateY(10px); }
          to { opacity: 1; transform: translateY(0); }
        }

        /* Media Queries pour Super Responsivité */
        
        /* Tablettes et mobiles larges */
        @media (max-width: 768px) {
          .pg-card {
            padding: 40px 30px;
          }
        }

        /* Petits mobiles */
        @media (max-width: 480px) {
          .pg-login-wrapper {
            padding: 0; /* Plus de padding extérieur */
            background: #fff; /* Fond blanc uni sur mobile pour plus de clarté */
          }
          
          .pg-card {
            border-radius: 0;
            border: none;
            box-shadow: none;
            height: 100vh; /* Pleine hauteur */
            display: flex;
            flex-direction: column;
            justify-content: center;
            background: #fff;
            padding: 30px;
          }
          
          .blob { display: none; } /* Enlever les décos sur mobile */
          
          .pg-logo { font-size: 32px; }
          .pg-input { height: 50px; }
          .pg-submit-btn { height: 50px; }
        }
        
        /* Hauteur d'écran courte */
        @media (max-height: 600px) {
          .pg-login-wrapper { align-items: flex-start; padding-top: 20px; }
          .pg-card { height: auto; padding: 30px; }
          .pg-header { margin-bottom: 25px; }
          .pg-footer { margin-top: 25px; }
        }
      `}</style>

      <div className="pg-login-wrapper">
        <div className="blob blob-1"></div>
        <div className="blob blob-2"></div>

        <div className="pg-card">
          <div className="pg-header">
            <h1 className="pg-logo">PLEINGAZ</h1>
            <p className="pg-subtitle">Connectez-vous pour accéder à votre espace de gestion unifié.</p>
          </div>

          <form onSubmit={handleSubmit} className="form-stack">
            {error && (
              <div className="error-alert">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
                {error}
              </div>
            )}

            <div className="input-group">
              <label htmlFor="email">Adresse email</label>
              <div className="input-wrapper">
                <input 
                  id="email"
                  className="pg-input" 
                  type="email" 
                  placeholder="exemple@wonderful.com"
                  value={email} 
                  onChange={e => setEmail(e.target.value)} 
                  required 
                  autoFocus 
                />
              </div>
            </div>

            <div className="input-group">
              <label htmlFor="password">Mot de passe</label>
              <div className="input-wrapper">
                <input 
                  id="password"
                  className="pg-input pg-input-p" 
                  type={showPass ? "text" : "password"} 
                  placeholder="••••••••••••"
                  value={password} 
                  onChange={e => setPassword(e.target.value)} 
                  required 
                />
                <button 
                  type="button" 
                  className="pass-toggle" 
                  onClick={() => setShowPass(!showPass)}
                  aria-label={showPass ? "Cacher le mot de passe" : "Afficher le mot de passe"}
                >
                  {showPass 
                    ? <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M17.94 17.94A10.07 10.07 0 0112 20c-7 0-11-8-11-8a18.45 18.45 0 015.06-5.94"/><path d="M9.9 4.24A9.12 9.12 0 0112 4c7 0 11 8 11 8a18.5 18.5 0 01-2.16 3.19"/><line x1="1" y1="1" x2="23" y2="23"/></svg>
                    : <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>
                  }
                </button>
              </div>
            </div>

            <button className="pg-submit-btn" type="submit" disabled={loading}>
              {loading ? (
                <div className="spinner" />
              ) : (
                <>
                  Se connecter
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><line x1="5" y1="12" x2="19" y2="12"/><polyline points="12 5 19 12 12 19"/></svg>
                </>
              )}
            </button>
          </form>

          <div className="pg-footer">
            © 2025 <strong>PLEINGAZ</strong> · Plateforme INFOTECH / WONDERFUL
          </div>
        </div>
      </div>
    </>
  );
}