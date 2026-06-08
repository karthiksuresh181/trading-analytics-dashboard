import { Trophy, Flame, TrendingUp, TrendingDown, Shield, Target, Zap, Award } from 'lucide-react';

/* ── Grade config ── */
const GRADE = {
  S: { bg: 'rgba(255,122,23,0.10)',  border: 'rgba(255,122,23,0.40)',  color: '#ff7a17' },
  A: { bg: 'rgba(196,181,253,0.10)', border: 'rgba(196,181,253,0.40)', color: '#c4b5fd' },
  B: { bg: 'rgba(160,195,236,0.10)', border: 'rgba(160,195,236,0.40)', color: '#a0c3ec' },
  C: { bg: 'rgba(255,255,255,0.04)', border: 'rgba(255,255,255,0.15)', color: '#636870' },
  F: { bg: 'rgba(244,63,94,0.08)',   border: 'rgba(244,63,94,0.30)',   color: '#f43f5e' },
};

const GRADE_LABEL = {
  S: 'Top-tier execution & risk control',
  A: 'Strong, consistent edge detected',
  B: 'Solid foundation, room to grow',
  C: 'Needs improvement in key areas',
  F: 'Review strategy and risk management',
};

export default function GamifiedOverview({ metrics }) {
  if (!metrics) return null;

  const grade   = metrics.accountGrade;
  const gc      = GRADE[grade.grade] || GRADE.F;
  const wRate   = metrics.winRate;
  const pFactor = metrics.profitFactor;

  return (
    <div className="stack">

      {/* ── Row 1: Grade / Streaks / Consistency ── */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 16 }}
           className="overview-top-row">
        <style>{`
          @media (max-width: 768px) { .overview-top-row { grid-template-columns: 1fr !important; } }
        `}</style>

        {/* Account Grade */}
        <div className="card">
          <div className="card-header">
            <div className="card-header-icon"><Award size={14} /></div>
            <span className="card-title">Account Grade</span>
          </div>
          <div className="card-body" style={{ display: 'flex', alignItems: 'center', gap: 20, padding: '24px 20px' }}>
            <div style={{
              width: 68, height: 68, borderRadius: 10,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              border: `1.5px solid ${gc.border}`,
              background: gc.bg,
              fontSize: '2rem', letterSpacing: '-0.04em',
              color: gc.color, flexShrink: 0,
            }}>
              {grade.grade}
            </div>
            <div>
              <p style={{ color: 'var(--ink)', fontSize: '1rem', marginBottom: 6 }}>{grade.label}</p>
              <p style={{ color: 'var(--ink-mute)', fontSize: '0.8125rem', lineHeight: 1.5 }}>
                {GRADE_LABEL[grade.grade]}
              </p>
            </div>
          </div>
        </div>

        {/* Streaks */}
        <div className="card">
          <div className="card-header">
            <div className="card-header-icon"><Flame size={14} /></div>
            <span className="card-title">Streaks</span>
          </div>
          <div className="card-body">
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
              <div>
                <p className="t-label" style={{ marginBottom: 8 }}>Current Win</p>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <span style={{ fontSize: '1.75rem', letterSpacing: '-0.03em', color: 'var(--accent)', lineHeight: 1 }}>
                    {metrics.currentWinStreak}
                  </span>
                  <TrendingUp size={14} style={{ color: 'var(--accent)' }} />
                </div>
              </div>
              <div>
                <p className="t-label" style={{ marginBottom: 8 }}>Current Loss</p>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <span style={{ fontSize: '1.75rem', letterSpacing: '-0.03em', color: 'var(--danger)', lineHeight: 1 }}>
                    {metrics.currentLossStreak}
                  </span>
                  <TrendingDown size={14} style={{ color: 'var(--danger)' }} />
                </div>
              </div>
              <div>
                <p className="t-label" style={{ marginBottom: 6 }}>Max Win</p>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  <Trophy size={12} style={{ color: 'var(--accent)' }} />
                  <span style={{ color: 'var(--ink)', fontSize: '1rem' }}>{metrics.maxWinStreak}</span>
                </div>
              </div>
              <div>
                <p className="t-label" style={{ marginBottom: 6 }}>Max Loss</p>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  <Shield size={12} style={{ color: 'var(--ink-mute)' }} />
                  <span style={{ color: 'var(--ink-mute)', fontSize: '1rem' }}>{metrics.maxLossStreak}</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Consistency Score */}
        <div className="card">
          <div className="card-header">
            <div className="card-header-icon violet"><Target size={14} /></div>
            <span className="card-title">Consistency Score</span>
          </div>
          <div className="card-body" style={{ display: 'flex', alignItems: 'center', gap: 20 }}>
            {/* Radial progress */}
            <div style={{ position: 'relative', width: 68, height: 68, flexShrink: 0 }}>
              <svg viewBox="0 0 36 36" style={{ width: '100%', height: '100%', transform: 'rotate(-90deg)' }}>
                <circle cx="18" cy="18" r="15.5" fill="none" stroke="var(--canvas-mid)" strokeWidth="2.5" />
                <circle cx="18" cy="18" r="15.5" fill="none"
                  stroke={metrics.consistencyScore >= 75 ? 'var(--accent)' : metrics.consistencyScore >= 50 ? '#7c3aed' : 'var(--ink-mute)'}
                  strokeWidth="2.5"
                  strokeDasharray={`${metrics.consistencyScore * 0.974} 100`}
                  strokeLinecap="square"
                  style={{ transition: 'stroke-dasharray 1s cubic-bezier(0.16,1,0.3,1)' }}
                />
              </svg>
              <div style={{
                position: 'absolute', inset: 0,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: '0.8125rem', color: 'var(--ink)',
              }}>
                {Math.round(metrics.consistencyScore)}%
              </div>
            </div>
            <div>
              <p style={{ color: 'var(--ink)', fontSize: '1rem', marginBottom: 6 }}>
                {metrics.consistencyScore >= 75 ? 'Disciplined' :
                 metrics.consistencyScore >= 50 ? 'Moderate'    : 'Inconsistent'}
              </p>
              <p style={{ color: 'var(--ink-mute)', fontSize: '0.8125rem', lineHeight: 1.5 }}>
                Lot size consistency across trades
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* ── Row 2: Key Stats ── */}
      <div className="grid-6">
        <StatTile label="Total Trades" value={metrics.totalTrades}                               icon={<Zap size={13} />}       color="default" />
        <StatTile label="Win Rate"     value={`${metrics.winRate.toFixed(1)}%`}                  icon={<Target size={13} />}    color={wRate >= 50 ? 'accent' : 'mute'} />
        <StatTile label="Profit Factor"
                  value={pFactor === Infinity ? '∞' : pFactor.toFixed(2)}
                  icon={<TrendingUp size={13} />}
                  color={pFactor >= 1 ? 'accent' : 'danger'} />
        <StatTile label="Net Profit"   value={`$${metrics.totalProfit.toFixed(2)}`}
                  icon={metrics.totalProfit >= 0 ? <TrendingUp size={13} /> : <TrendingDown size={13} />}
                  color={metrics.totalProfit >= 0 ? 'accent' : 'danger'} />
        <StatTile label="Expectancy"   value={`$${metrics.expectancy.toFixed(2)}`}
                  icon={<Zap size={13} />}
                  color={metrics.expectancy >= 0 ? 'accent' : 'danger'} />
        <StatTile label="Max Drawdown" value={`${metrics.maxDrawdownPct.toFixed(1)}%`}
                  icon={<Shield size={13} />}
                  color={metrics.maxDrawdownPct <= 10 ? 'mute' : 'danger'} />
      </div>

      {/* ── Row 3: Secondary Stats ── */}
      <div className="grid-4">
        <MiniTile label="Avg Win"     value={`$${metrics.avgWin.toFixed(2)}`}   positive />
        <MiniTile label="Avg Loss"    value={`$${metrics.avgLoss.toFixed(2)}`}  />
        <MiniTile label="Largest Win" value={`$${metrics.largestWin.toFixed(2)}`}  positive />
        <MiniTile label="Largest Loss" value={`$${metrics.largestLoss.toFixed(2)}`} />
      </div>
    </div>
  );
}

/* ── StatTile ── */
const COLOR_MAP = {
  accent:  'var(--accent)',
  danger:  'var(--danger)',
  success: 'var(--success)',
  mute:    'var(--ink-mute)',
  default: 'var(--ink)',
};

function StatTile({ label, value, icon, color = 'default' }) {
  const valueColor = COLOR_MAP[color] || COLOR_MAP.default;
  return (
    <div className="stat-tile">
      <div className="stat-tile-label">
        <span style={{ color: 'var(--ink-mute)', display: 'flex' }}>{icon}</span>
        {label}
      </div>
      <div style={{ fontSize: '1.5rem', letterSpacing: '-0.025em', color: valueColor, lineHeight: 1 }}>
        {value}
      </div>
    </div>
  );
}

/* ── MiniTile ── */
function MiniTile({ label, value, positive }) {
  return (
    <div className="mini-stat">
      <p className="mini-stat-label">{label}</p>
      <p style={{ fontSize: '1rem', letterSpacing: '-0.015em', color: positive ? 'var(--accent)' : 'var(--danger)' }}>
        {value}
      </p>
    </div>
  );
}
