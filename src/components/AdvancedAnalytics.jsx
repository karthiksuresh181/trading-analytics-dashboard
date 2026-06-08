import { Clock, AlertTriangle, TrendingDown, Droplets, Timer, DollarSign, ArrowDownRight, ArrowUpRight } from 'lucide-react';

export default function AdvancedAnalytics({ metrics }) {
  if (!metrics) return null;

  return (
    <div className="stack">

      {/* ── Row 1: Hold Time / Expectancy / Trade Breakdown ── */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 16 }}
           className="analytics-top-row">
        <style>{`
          @media (max-width: 900px)  { .analytics-top-row { grid-template-columns: 1fr 1fr !important; } }
          @media (max-width: 600px)  { .analytics-top-row { grid-template-columns: 1fr !important; } }
        `}</style>

        {/* Hold Time */}
        <div className="card">
          <div className="card-header">
            <div className="card-header-icon"><Timer size={14} /></div>
            <span className="card-title">Hold Time Analysis</span>
          </div>
          <div className="card-body" style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            {/* Win duration row */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <ArrowUpRight size={14} style={{ color: 'var(--accent)' }} />
                <span style={{ color: 'var(--ink-mute)', fontSize: '0.8125rem' }}>Avg Win Duration</span>
              </div>
              <span style={{ color: 'var(--ink)', fontSize: '0.8125rem' }}>{formatDuration(metrics.avgWinDuration)}</span>
            </div>
            {/* Loss duration row */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <ArrowDownRight size={14} style={{ color: 'var(--danger)' }} />
                <span style={{ color: 'var(--ink-mute)', fontSize: '0.8125rem' }}>Avg Loss Duration</span>
              </div>
              <span style={{ color: 'var(--danger)', fontSize: '0.8125rem' }}>{formatDuration(metrics.avgLossDuration)}</span>
            </div>

            <div className="divider" />

            {/* Hold Time Ratio */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <span style={{ color: 'var(--ink-mute)', fontSize: '0.8125rem' }}>Hold Time Ratio</span>
              <span style={{
                fontSize: '1.25rem', letterSpacing: '-0.02em', lineHeight: 1,
                color: metrics.holdTimeRatio > 2 ? 'var(--danger)' :
                       metrics.holdTimeRatio > 1.3 ? 'var(--accent)' : 'var(--ink)',
              }}>
                {metrics.holdTimeRatio.toFixed(2)}x
              </span>
            </div>

            {/* Progress */}
            <div>
              <div style={{ position: 'relative', height: 6, borderRadius: 99, background: 'var(--canvas-mid)', overflow: 'hidden' }}>
                <div style={{
                  position: 'absolute', left: 0, top: 0, height: '100%',
                  background: 'var(--accent)', borderRadius: 99,
                  width: `${Math.min(100, (metrics.avgWinDuration / Math.max(metrics.avgWinDuration, metrics.avgLossDuration)) * 100)}%`,
                  transition: 'width 0.8s cubic-bezier(0.16,1,0.3,1)',
                }} />
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 6 }}>
                <span className="t-label">Winners</span>
                <span className="t-label">Losers</span>
              </div>
            </div>
          </div>
        </div>

        {/* Expectancy */}
        <div className="card">
          <div className="card-header">
            <div className="card-header-icon"><DollarSign size={14} /></div>
            <span className="card-title">Expectancy</span>
          </div>
          <div className="card-body" style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            <div style={{ textAlign: 'center', padding: '8px 0' }}>
              <div style={{
                fontSize: 'clamp(1.75rem, 3vw, 2.5rem)',
                letterSpacing: '-0.04em',
                lineHeight: 1,
                color: metrics.expectancy >= 0 ? 'var(--ink)' : 'var(--danger)',
              }}>
                ${metrics.expectancy.toFixed(2)}
              </div>
              <p style={{ color: 'var(--ink-mute)', fontSize: '0.8125rem', marginTop: 8 }}>
                Expected value per trade
              </p>
            </div>

            <div style={{
              display: 'flex', alignItems: 'center', justifyContent: 'space-between',
              padding: '10px 14px', borderRadius: 'var(--radius-sm)',
              background: 'var(--canvas-mid)', border: '1px solid var(--hairline)',
            }}>
              <span style={{ color: 'var(--ink-mute)', fontSize: '0.8125rem' }}>Expectancy (R)</span>
              <span style={{
                fontSize: '0.8125rem',
                color: metrics.expectancyR >= 0 ? 'var(--ink)' : 'var(--danger)',
              }}>
                {metrics.expectancyR.toFixed(3)}R
              </span>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
              <InfoBlock label="Gross Profit" value={`$${metrics.grossProfit.toFixed(2)}`} color="var(--accent)" />
              <InfoBlock label="Gross Loss"   value={`$${metrics.grossLoss.toFixed(2)}`}  color="var(--danger)" />
            </div>
          </div>
        </div>

        {/* Trade Breakdown */}
        <div className="card">
          <div className="card-header">
            <div className="card-header-icon mute"><Clock size={14} /></div>
            <span className="card-title">Trade Breakdown</span>
          </div>
          <div className="card-body" style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            {/* Win / Loss circles */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 24 }}>
              <CircleBadge count={metrics.wins}   label="Wins"   color="var(--accent)" />
              <CircleBadge count={metrics.losses} label="Losses" color="var(--danger)" />
              {metrics.breakeven > 0 && <CircleBadge count={metrics.breakeven} label="B/E" color="var(--ink-mute)" />}
            </div>

            {/* Win rate bar */}
            <div>
              <div style={{ height: 6, borderRadius: 99, background: 'var(--canvas-mid)', overflow: 'hidden' }}>
                <div style={{
                  height: '100%', borderRadius: 99,
                  width: `${metrics.winRate}%`, background: 'var(--accent)',
                  transition: 'width 0.8s cubic-bezier(0.16,1,0.3,1)',
                }} />
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 6 }}>
                <span className="t-label" style={{ color: 'var(--accent)' }}>{metrics.winRate.toFixed(1)}% Win</span>
                <span className="t-label">{(100 - metrics.winRate).toFixed(1)}% Loss</span>
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
              <InfoBlock label="Commission" value={`$${metrics.totalCommission.toFixed(2)}`} />
              <InfoBlock label="Swap"       value={`$${metrics.totalSwap.toFixed(2)}`} />
            </div>
          </div>
        </div>
      </div>

      {/* ── Profit Leakage ── */}
      {metrics.leakage.length > 0 && (
        <div className="card" style={{ borderColor: 'rgba(244,63,94,0.25)' }}>
          <div className="card-header" style={{ borderBottomColor: 'rgba(244,63,94,0.12)', background: 'rgba(244,63,94,0.04)' }}>
            <div className="card-header-icon" style={{ background: 'var(--danger-soft)', color: 'var(--danger)' }}>
              <Droplets size={14} />
            </div>
            <span className="card-title" style={{ color: 'var(--danger)' }}>Profit Leakage Detected</span>
          </div>
          <div className="card-body">
            <div className="stack-sm">
              {metrics.leakage.map((leak, i) => (
                <div key={i} style={{
                  display: 'flex', alignItems: 'flex-start', gap: 12,
                  padding: '12px 14px',
                  borderRadius: 'var(--radius-sm)',
                  background: 'rgba(244,63,94,0.04)',
                  border: '1px solid rgba(244,63,94,0.15)',
                }}>
                  <TrendingDown size={15} style={{ color: 'var(--danger)', flexShrink: 0, marginTop: 1 }} />
                  <div style={{ flex: 1 }}>
                    <p style={{ color: 'var(--ink-dim)', fontSize: '0.8125rem', lineHeight: 1.5 }}>{leak.message}</p>
                    <div style={{
                      marginTop: 8, height: 4, borderRadius: 99,
                      background: 'var(--canvas-mid)', overflow: 'hidden', maxWidth: 280,
                    }}>
                      <div style={{
                        height: '100%', background: 'var(--danger)', borderRadius: 99,
                        width: `${Math.min(100, leak.percentage)}%`,
                        transition: 'width 0.8s cubic-bezier(0.16,1,0.3,1)',
                      }} />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* ── AI Behavioral Insights ── */}
      <div className="card">
        <div className="card-header">
          <div className="card-header-icon"><AlertTriangle size={14} /></div>
          <span className="card-title">AI Behavioral Insights</span>
        </div>
        <div className="card-body">
          {metrics.recommendations.length === 0 ? (
            <p style={{ color: 'var(--ink-mute)', fontSize: '0.8125rem', textAlign: 'center', padding: '16px 0' }}>
              No critical insights detected. Keep trading consistently!
            </p>
          ) : (
            <div className="stack-sm">
              {metrics.recommendations.map((rec, i) => {
                const sev = rec.severity || 'info';
                return (
                  <div key={i} className={`insight-row ${sev}`}>
                    <span style={{ fontSize: '1rem', lineHeight: 1, flexShrink: 0 }}>{rec.icon}</span>
                    <p style={{ color: 'var(--ink-dim)', fontSize: '0.8125rem', lineHeight: 1.55 }}>{rec.message}</p>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

    </div>
  );
}

/* ── Helpers ── */
function InfoBlock({ label, value, color }) {
  return (
    <div style={{
      padding: '10px 12px', borderRadius: 'var(--radius-sm)',
      background: 'var(--canvas-mid)', border: '1px solid var(--hairline)',
      textAlign: 'center',
    }}>
      <p className="t-label" style={{ marginBottom: 4 }}>{label}</p>
      <p style={{ fontSize: '0.875rem', color: color || 'var(--ink)' }}>{value}</p>
    </div>
  );
}

function CircleBadge({ count, label, color }) {
  return (
    <div style={{ textAlign: 'center' }}>
      <div style={{
        width: 48, height: 48, borderRadius: '50%',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        border: `1.5px solid ${color}`,
        background: `${color}14`,
        fontSize: '1rem', color, marginBottom: 6, margin: '0 auto 6px',
      }}>
        {count}
      </div>
      <span className="t-label">{label}</span>
    </div>
  );
}

function formatDuration(min) {
  if (min < 1)  return `${Math.round(min * 60)}s`;
  if (min < 60) return `${Math.round(min)}m`;
  const h = Math.floor(min / 60);
  const m = Math.round(min % 60);
  return `${h}h ${m}m`;
}
