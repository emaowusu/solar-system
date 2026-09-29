import { useEffect, useState } from 'react';
import { LogIn, LogOut, Moon, Orbit, Sun, UserPlus, Loader2 } from 'lucide-react';
import { useAuth } from './AuthContext';
import AuthModal from './AuthModal';
import Explorer from './Explorer';

function initialTheme() {
  try { const t = localStorage.getItem('theme'); if (t) return t; } catch { /* ignore */ }
  return window.matchMedia?.('(prefers-color-scheme: light)').matches ? 'light' : 'dark';
}

export default function App() {
  const { user, ready, signout } = useAuth();
  const [theme, setTheme] = useState(initialTheme);
  const [modal, setModal] = useState(null);
  useEffect(() => {
    document.documentElement.dataset.theme = theme;
    try { localStorage.setItem('theme', theme); } catch { /* ignore */ }
  }, [theme]);

  return (
    <>
      <header className="topbar glass">
        <div className="brand">
          <Orbit size={22} /> ORBITORY <small></small>
        </div>
        <div className="actions">
          <button
            className="icon-btn"
            onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
            aria-label="Toggle dark / light mode"
            title="Toggle theme"
          >
            {theme === "dark" ? <Sun size={18} /> : <Moon size={18} />}
          </button>
          {user ? (
            <>
              <span className="who">{user.name}</span>
              <button className="btn" onClick={signout}>
                <LogOut size={16} /> Sign out
              </button>
            </>
          ) : (
            <>
              <button className="btn" onClick={() => setModal("signin")}>
                <LogIn size={16} /> Sign in
              </button>
              <button
                className="btn primary"
                onClick={() => setModal("signup")}
              >
                <UserPlus size={16} /> Sign up
              </button>
            </>
          )}
        </div>
      </header>
      {!ready ? (
        <div className="center">
          <Loader2 className="spin" />
        </div>
      ) : user ? (
        <Explorer theme={theme} />
      ) : (
        <section className="landing">
           
          <div className="landing-copy">
            <h1>
              Watch the solar system move — in real time.
            </h1>
            <p>
              Track every planet as it moves through space — powered by real
              orbital mechanics, stunning planetary imagery, and live telemetry for every world. Sign in to start exploring.
            </p>
            <div className="cta">
              <button
                className="btn primary big"
                onClick={() => setModal("signin")}
              >
                <LogIn size={18} /> Sign in
              </button>
              <button className="btn big" onClick={() => setModal("signup")}>
                <UserPlus size={18} /> Create account
              </button>
            </div>
          </div>
        </section>
      )}
      {modal && !user && (
        <AuthModal
          mode={modal}
          onMode={setModal}
          onClose={() => setModal(null)}
        />
      )}
    </>
  );
}
