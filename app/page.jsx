'use client';

import { useEffect, useMemo, useState } from 'react';
import { formatPercent, selectCorePicks } from '../lib/value-model.js';

const emptyData = { date: '', dateISO: '', candidates: [], core: [], secondary: [], skips: [] };

function sastTodayKey() {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Africa/Johannesburg',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(new Date());
}

function displayProbability(value) {
  if (typeof value === 'string') return value;
  if (Number.isFinite(value)) return value <= 1 ? `${Math.round(value * 100)}%` : `${Math.round(value)}%`;
  return '—';
}

export default function HomePage() {
  const [data, setData] = useState(emptyData);
  const [loading, setLoading] = useState(true);
  const [email, setEmail] = useState('');
  const [consent, setConsent] = useState(false);
  const [subscribeState, setSubscribeState] = useState({
    type: 'idle',
    message: '',
  });
  const candidates = data.candidates ?? [];
  const computedSelection = useMemo(() => selectCorePicks(candidates), [candidates]);
  const publishedCore = Array.isArray(data.core) ? data.core : [];
  const publishedWatchlist = candidates.filter((pick) => String(pick.classification || '').toUpperCase() === 'WATCHLIST');
  const valueSelection = {
    core: publishedCore.length > 0 ? publishedCore : computedSelection.core,
    watchlist: publishedWatchlist.length > 0 ? publishedWatchlist : computedSelection.watchlist,
    skip: computedSelection.skip,
  };
  const isStale = Boolean(data.dateISO && data.dateISO !== sastTodayKey());

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
            <h1>Daily football analysis ranked from strongest to weakest.</h1>
            <p>
              Football Tips v1.0 has no hard rejection rules. We analyze the available board, compare form, team strength, goals/xG, prices and context, then rank the strongest opportunities.
            </p>
            <a className="cta" href="#picks">View today's ranked picks</a>
          </div>
          <div className="hero-card">
            <span>Daily process</span>
            <strong>06:00 SAST</strong>
            <p>Every analyzed selection can be ranked. There are no mandatory market, probability, EV, heat or context thresholds.</p>
          </div>
        </section>

        <section id="picks" className="section">
          <div className="section-heading">
            <div>
              <span className="eyebrow">TODAY</span>
              <h2>{data.date || 'Daily Picks'}</h2>
            </div>
            <span className="pill">v1.0 · OPEN RANKING MODEL</span>
          </div>

          {loading ? <p className="muted">Loading picks…</p> : null}

          {!loading && data.runAtSAST ? (
            <div className="status-banner">
              <strong>Last workflow run: {data.runAtSAST} SAST</strong>
              <span>{data.publicationStatus || 'published'}</span>
            </div>
          ) : null}

          {!loading && isStale ? (
            <div className="status-banner warning">
              <strong>Today's scan has not been published yet.</strong>
              <span>Showing the last published board: {data.date || data.dateISO}.</span>
            </div>
          ) : null}

          {data.scanCoverage ? (
            <div className="scan-audit">
              <div className="scan-audit-head">
                <div><span className="eyebrow">SCAN AUDIT</span><h3>What today's rescan covered</h3></div>
                <span className="pill">{data.scanCoverage.competitionsObserved?.length ?? 0} competitions observed</span>
              </div>
              <div className="scan-metrics">
                {(data.scanCoverage.sourceBoards ?? []).map((source) => (
                  <span key={source.source}><b>{source.rows}</b><small>{source.source}</small></span>
                ))}
                <span><b>{data.scanCoverage.deepEvidenceAudits ?? 0}</b><small>Deep evidence audits</small></span>
              </div>
              <p>{data.scanCoverage.coverageLimitations}</p>
              <details>
                <summary>Show competitions observed</summary>
                <div className="competition-list">{(data.scanCoverage.competitionsObserved ?? []).join(' · ')}</div>
              </details>
            </div>
          ) : null}

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
                  <span><b>{pick.value.footballStrength.toFixed(1)}</b><small>Football /100</small></span>
                  <span><b>{pick.value.valueStrength.toFixed(1)}</b><small>Value /100</small></span>
                  <span><b>{pick.value.rating.toFixed(1)}</b><small>Overall /100</small></span>
                  <span><b>{pick.value.ratingBand}</b><small>Core rating</small></span>
                </div>
                <p>{pick.reason}</p>
              </article>
            ))}
          </div>

          {!loading && valueSelection.core.length === 0 ? (
            <div className="no-picks">
              <h3>No Core picks currently verified</h3>
              <p>
                {candidates.length === 0
                  ? 'No candidate analysis has been published for this board yet.'
                  : valueSelection.watchlist.length > 0
                    ? `${valueSelection.watchlist.length} football-qualified candidate(s) remain on the Watchlist while price/value or final football checks are pending.`
                    : 'The football evidence did not produce a Core selection.'}
              </p>
            </div>
          ) : null}

          {valueSelection.watchlist.length > 0 ? (
            <div className="watchlist-block">
              <div className="watchlist-heading">
                <div>
                  <span className="eyebrow">FOOTBALL-QUALIFIED</span>
                  <h3>Watchlist — verification pending</h3>
                </div>
                <span className="pill">{valueSelection.watchlist.length} candidates</span>
              </div>
              {valueSelection.watchlist.map((pick, i) => (
                <div className="watchlist-row" key={`${pick.fixture}-watch-${i}`}>
                  <div>
                    <strong>{pick.fixture}</strong>
                    <span>{pick.market || 'Best market pending'} · {pick.kickoff || 'KO pending'}</span>
                    <small>{pick.reason || pick.assessment?.reasons?.[0] || 'Football profile passed; Core confirmation is pending.'}</small>
                  </div>
                  <div className="watchlist-meta">
                    <b>{displayProbability(pick.probability)}</b>
                    <span>{
                      pick.classification === 'WATCHLIST'
                        ? 'WATCHLIST'
                        : pick.assessment?.priceStatus === 'pending'
                          ? 'PRICE PENDING'
                          : pick.assessment?.priceStatus === 'verified-football-pending'
                            ? 'FOOTBALL CHECK'
                            : 'NOT CORE VALUE'
                    }</span>
                  </div>
                </div>
              ))}
            </div>
          ) : null}

          {(data.secondary ?? []).length > 0 && (
            <div className="secondary-block">
              <h3>Additional watchlist — not Core</h3>
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
          <h2>Football Tips v1.0</h2>
          <div className="model-grid">
            <div><strong>01</strong><h3>No Hard Market Rule</h3><p>Any football market may be considered when the data supports it.</p></div>
            <div><strong>02</strong><h3>No Automatic Reject Gates</h3><p>No fixed probability, EV, heat, contradiction, away-threat or model-agreement threshold automatically removes a match.</p></div>
            <div><strong>03</strong><h3>Match Team Form</h3><p>Pillar 1 combines weighted last-5 overall form with venue form: 40% overall + 60% home form for the host, or away form for the visitor. Recent matches carry 30/25/20/15/10% weights. The pillar also tracks weighted Goals Scored, Goals Conceded, xG, xGA, Opponent Strength and Recent Trend.</p></div>
            <div><strong>04</strong><h3>Rank, Don't Force</h3><p>The strongest opportunities are ranked from best to weakest, with uncertainty and missing evidence shown openly.</p></div>
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
