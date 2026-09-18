'use client';

import { useEffect, useMemo, useState } from 'react';
import { formatPercent, selectCorePicks } from '../lib/value-model.js';

const emptyData = { date: '', candidates: [], core: [], secondary: [], skips: [] };

export default function HomePage() {
  const [data, setData] = useState(emptyData);
  const [loading, setLoading] = useState(true);
  const [email, setEmail] = useState('');
  const [consent, setConsent] = useState(false);
  const [subscribeState, setSubscribeState] = useState({
    type: 'idle',
    message: '',
  });
  const candidates = data.candidates ?? data.core ?? [];
  const valueSelection = useMemo(() => selectCorePicks(candidates), [candidates]);

  useEffect(() => {
    fetch('/data/today.json', { cache: 'no-store' })
      .then((response) => {
        if (!response.ok) throw new Error('Could not load today\'s picks.');
        return response.json();
      })
      .then(setData)
      .catch(() => setData(emptyData))
      .finally(() => setLoading(false));

    const params = new URLSearchParams(window.location.search);
    const subscription = params.get('subscription');

    if (subscription === 'confirmed') {
      setSubscribeState({
        type: 'success',
        message: 'Subscription confirmed. You are on the Daily Core Picks list.',
      });
    } else if (subscription === 'invalid') {
      setSubscribeState({
        type: 'error',
        message: 'That confirmation link is invalid.',
      });
    } else if (subscription === 'error') {
      setSubscribeState({
        type: 'error',
        message: 'We could not confirm the subscription. Please try again.',
      });
    }
  }, []);

  async function handleSubscribe(event) {
    event.preventDefault();
    setSubscribeState({ type: 'loading', message: 'Subscribing…' });

    const form = new FormData(event.currentTarget);
    const website = String(form.get('website') || '');

    try {
      const response = await fetch('/api/subscribe', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          email,
          consent,
          website,
        }),
      });

      const result = await response.json();

      if (!response.ok || !result.ok) {
        throw new Error(result.error || 'Could not subscribe.');
      }

      setSubscribeState({
        type: 'success',
        message:
          result.message ||
          'Check your inbox and confirm your subscription.',
      });

      if (result.status !== 'already_subscribed') {
        setEmail('');
        setConsent(false);
      }
    } catch (error) {
      setSubscribeState({
        type: 'error',
        message:
          error instanceof Error ? error.message : 'Could not subscribe.',
      });
    }
  }

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
              Football Tips v1.2 requires football strength and a positive market price.
              A likely outcome is not Core unless it also clears our no-vig edge and EV gates.
            </p>
            <a className="cta" href="#picks">View today's Core picks</a>
          </div>
          <div className="hero-card">
            <span>Daily process</span>
            <strong>06:00 SAST</strong>
            <p>Maximum 6 value-qualified Core picks. Fewer when the prices are weak.</p>
          </div>
        </section>

        <section id="picks" className="section">
          <div className="section-heading">
            <div>
              <span className="eyebrow">TODAY</span>
              <h2>{data.date || 'Daily Picks'}</h2>
            </div>
            <span className="pill">v1.2 · VALUE GATE</span>
          </div>

          {loading ? <p className="muted">Loading picks…</p> : null}

          <div className="grid">
            {valueSelection.core.map((pick, i) => (
              <article className="pick-card core" key={`${pick.fixture}-${i}`}>
                <div className="pick-top">
                  <span className="badge">CORE {i + 1}</span>
                  <span className="kickoff">{pick.kickoff}</span>
                </div>
                <h3>{pick.fixture}</h3>
                <div className="market">{pick.market}</div>
                <div className="metrics">
                  <span><b>{pick.value.odds.toFixed(2)}</b><small>Odds</small></span>
                  <span><b>{formatPercent(pick.value.modelProbability, 0)}</b><small>Model P</small></span>
                  <span><b>{pick.value.fairOdds.toFixed(2)}</b><small>Fair odds</small></span>
                  <span><b>+{formatPercent(pick.value.edge)}</b><small>No-vig edge</small></span>
                  <span><b>+{formatPercent(pick.value.expectedValue)}</b><small>EV</small></span>
                  <span><b>{pick.heat}</b><small>Heat</small></span>
                </div>
                <p>{pick.reason}</p>
              </article>
            ))}
          </div>

          {!loading && valueSelection.core.length === 0 ? (
            <div className="no-picks">
              <h3>No value-qualified Core picks</h3>
              <p>
                {valueSelection.rejected.length > 0
                  ? `${valueSelection.rejected.length} candidate(s) were withheld because they did not have enough verified price value.`
                  : 'The model will publish fewer picks rather than force a weak board.'}
              </p>
            </div>
          ) : null}

          {(data.secondary ?? []).length > 0 && (
            <div className="secondary-block">
              <h3>Watchlist — not Core</h3>
              {(data.secondary ?? []).map((pick, i) => (
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
          <h2>Football Tips v1.2</h2>
          <div className="model-grid">
            <div><strong>01</strong><h3>Price First</h3><p>All outcomes from one bookmaker snapshot are converted to margin-free market probabilities.</p></div>
            <div><strong>02</strong><h3>Football Strength</h3><p>Form, home/away profile and xG/goals feed the Poisson and Dixon–Coles probability checks.</p></div>
            <div><strong>03</strong><h3>Value Gate</h3><p>Core requires at least 65% model probability, +4pp no-vig edge and +5% EV.</p></div>
            <div><strong>04</strong><h3>Final Rank</h3><p>Agreement, Heat, floors and contradictions are checked before the best six can be published.</p></div>
          </div>
        </section>

        <section id="subscribe" className="section subscribe">
          <div>
            <span className="eyebrow">DAILY EMAIL</span>
            <h2>Get the Core picks every morning.</h2>
            <p>
              Subscribe to receive the daily Core picks by email. We confirm the
              address first so nobody can subscribe you without permission.
            </p>
          </div>

          <form className="subscribe-form" onSubmit={handleSubscribe}>
            <div className="subscribe-row">
              <input
                type="email"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                placeholder="you@example.com"
                aria-label="Email address"
                required
              />
              <button
                type="submit"
                disabled={subscribeState.type === 'loading'}
              >
                {subscribeState.type === 'loading' ? 'Subscribing…' : 'Subscribe'}
              </button>
            </div>

            <label className="consent">
              <input
                type="checkbox"
                checked={consent}
                onChange={(event) => setConsent(event.target.checked)}
                required
              />
              <span>I agree to receive the Daily Core Picks email.</span>
            </label>

            <input
              className="honeypot"
              type="text"
              name="website"
              tabIndex="-1"
              autoComplete="off"
              aria-hidden="true"
            />

            {subscribeState.message ? (
              <p
                className={`form-status ${subscribeState.type}`}
                role="status"
              >
                {subscribeState.message}
              </p>
            ) : null}
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
