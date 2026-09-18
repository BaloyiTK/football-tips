import React, { useEffect, useState } from 'react';
import { createRoot } from 'react-dom/client';
import './styles.css';

function App() {
  const [data, setData] = useState({ date: '', core: [], secondary: [], skips: [] });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/data/today.json', { cache: 'no-store' })
      .then((r) => r.json())
      .then(setData)
      .catch(() => setData({ date: '', core: [], secondary: [], skips: [] }))
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="site-shell">
      <header className="topbar">
        <a href="#top" className="brand">FOOTBALL TIPS</a>
        <nav>
          <a href="#picks">Today's Picks</a>
          <a href="#method">Model</a>
          <a href="#subscribe">Subscribe</a>
        </nav>
      </header>

      <main id="top">
        <section className="hero">
          <div>
            <span className="eyebrow">FOOTBALL-FIRST ANALYSIS</span>
            <h1>Daily football picks without forcing the board.</h1>
            <p>
              Football Tips v1.1 filters fixtures using form, goal strength, model probability,
              Heat, Contradiction Gate and Shock Risk before a pick can become Core.
            </p>
            <a className="cta" href="#picks">View today's Core picks</a>
          </div>
          <div className="hero-card">
            <span>Daily process</span>
            <strong>06:00 SAST</strong>
            <p>Maximum 5 Core picks. Fewer when the board is weak.</p>
          </div>
        </section>

        <section id="picks" className="section">
          <div className="section-heading">
            <div>
              <span className="eyebrow">TODAY</span>
              <h2>{data.date || 'Daily Picks'}</h2>
            </div>
            <span className="pill">v1.1</span>
          </div>

          {loading ? <p className="muted">Loading picks…</p> : null}

          <div className="grid">
            {data.core.map((pick, i) => (
              <article className="pick-card core" key={`${pick.fixture}-${i}`}>
                <div className="pick-top">
                  <span className="badge">CORE {i + 1}</span>
                  <span className="kickoff">{pick.kickoff}</span>
                </div>
                <h3>{pick.fixture}</h3>
                <div className="market">{pick.market}</div>
                <div className="metrics">
                  <span><b>{pick.probability}</b><small>Model P</small></span>
                  <span><b>{pick.heat}</b><small>Heat</small></span>
                  <span><b>{pick.contradictions}</b><small>Contradictions</small></span>
                  <span><b>{pick.shock}</b><small>Shock</small></span>
                </div>
                <p>{pick.reason}</p>
              </article>
            ))}
          </div>

          {data.secondary.length > 0 && (
            <div className="secondary-block">
              <h3>Secondary</h3>
              {data.secondary.map((pick, i) => (
                <div className="secondary-row" key={`${pick.fixture}-${i}`}>
                  <div>
                    <strong>{pick.fixture}</strong>
                    <span>{pick.market}</span>
                  </div>
                  <b>{pick.probability}</b>
                </div>
              ))}
            </div>
          )}
        </section>

        <section id="method" className="section model-section">
          <span className="eyebrow">THE MODEL</span>
          <h2>Football Tips v1.1</h2>
          <div className="model-grid">
            <div><strong>01</strong><h3>Football Strength</h3><p>Recent form, home/away profile, scoring, defending and squad context.</p></div>
            <div><strong>02</strong><h3>Probability</h3><p>Goal expectations and Poisson/Dixon-Coles checks where reliable data is available.</p></div>
            <div><strong>03</strong><h3>Contradiction Gate</h3><p>Strong-looking picks are downgraded when current football contradicts the selection.</p></div>
            <div><strong>04</strong><h3>Market Fit</h3><p>The model chooses the best market instead of forcing match-result or double-chance picks.</p></div>
          </div>
        </section>

        <section id="subscribe" className="section subscribe">
          <div>
            <span className="eyebrow">DAILY EMAIL</span>
            <h2>Get the Core picks every morning.</h2>
            <p>Email delivery will be connected in the next automation step.</p>
          </div>
          <form onSubmit={(e) => e.preventDefault()}>
            <input type="email" placeholder="you@example.com" aria-label="Email address" />
            <button type="submit">Coming soon</button>
          </form>
        </section>
      </main>

      <footer>
        <span>Football Tips</span>
        <p>Probabilities are estimates, not guarantees. Bet responsibly.</p>
      </footer>
    </div>
  );
}

createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
