import { Trophy, Flame, TrendingUp, TrendingDown, Shield, Target, Zap, Award } from 'lucide-react';

/* ── Grade config: Mature, Institutional Dark Palette ── */
const GRADE = {
  S: { bg: 'rgba(129, 140, 248, 0.12)', border: 'rgba(129, 140, 248, 0.32)', color: '#818CF8' },
  A: { bg: 'rgba(52, 211, 153, 0.12)',  border: 'rgba(52, 211, 153, 0.32)',  color: '#34D399' },
  B: { bg: 'rgba(56, 189, 248, 0.12)',  border: 'rgba(56, 189, 248, 0.32)',  color: '#38BDF8' },
  C: { bg: 'rgba(251, 191, 36, 0.12)',  border: 'rgba(251, 191, 36, 0.32)',  color: '#FBBF24' },
  F: { bg: 'rgba(251, 113, 133, 0.12)', border: 'rgba(251, 113, 133, 0.32)', color: '#FB7185' },
};

const GRADE_LABEL = {
  S: 'Top-tier execution discipline & risk controls detected',
  A: 'Strong edge with consistent risk-adjusted returns',
  B: 'Solid foundation with manageable drawdown tolerance',
  C: 'Needs optimization in risk-to-reward and position sizing',
  F: 'Critical review of risk parameters and edge recommended',
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
          @media (max-width: 900px) { .overview-top-row { grid-template-columns: 1fr !important; } }
        `}</style>

        {/* Account Grade */}
        <div className="card">
          <div className="card-header">
            <div className="card-header-icon"><Award size={15} /></div>
            <span className="card-title">Performance Rating</span>
          </div>
          <div className="card-body" style={{ display: 'flex', alignItems: 'center', gap: 18, padding: '22px 20px' }}>
            <div style={{
              width: 58, height: 58, borderRadius: 10,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              border: `1.5px solid ${gc.border}`,
              background: gc.bg,
              fontSize: '1.75rem', fontWeight: 800,
              fontFamily: 'var(--font-mono)',
              letterSpacing: '-0.03em',
              color: gc.color, flexShrink: 0,
            }}>
              {grade.grade}
            </div>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                <p style={{ color: 'var(--text-primary)', fontSize: '1rem', fontWeight: 600 }}>{grade.label}</p>
                <span style={{
                  fontSize: '0.6875rem', fontWeight: 600, padding: '2px 7px',
                  borderRadius: 4, background: gc.bg, color: gc.color, border: `1px solid ${gc.border}`
                }}>
                  Grade {grade.grade}
                </span>
              </div>
              <p style={{ color: 'var(--text-muted)', fontSize: '0.8125rem', lineHeight: 1.45 }}>
                {GRADE_LABEL[grade.grade]}
              </p>
            </div>
          </div>
        </div>

        {/* Streaks */}
        <div className="card">
          <div className="card-header">
            <div className="card-header-icon" style={{ background: 'var(--warning-soft)', color: 'var(--warning)', borderColor: 'var(--warning-border)' }}>
              <Flame size={15} />
            </div>
            <span className="card-title">Streak Dynamics</span>
          </div>
          <div className="card-body" style={{ padding: '20px' }}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
              <div style={{ padding: '10px 12px', background: 'var(--bg-surface-soft)', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border-default)' }}>
                <p className="t-label" style={{ marginBottom: 6 }}>Current Win Streak</p>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <span style={{ fontFamily: 'var(--font-mono)', fontSize: '1.5rem', fontWeight: 700, color: 'var(--positive)', lineHeight: 1 }}>
                    {metrics.currentWinStreak}
                  </span>
                  <TrendingUp size={14} style={{ color: 'var(--positive)' }} />
                </div>
              </div>
              <div style={{ padding: '10px 12px', background: 'var(--bg-surface-soft)', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border-default)' }}>
                <p className="t-label" style={{ marginBottom: 6 }}>Current Loss Streak</p>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <span style={{ fontFamily: 'var(--font-mono)', fontSize: '1.5rem', fontWeight: 700, color: 'var(--negative)', lineHeight: 1 }}>
                    {metrics.currentLossStreak}
                  </span>
                  <TrendingDown size={14} style={{ color: 'var(--negative)' }} />
                </div>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0 4px' }}>
                <span className="t-label">Max Win Streak</span>
                <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                  <Trophy size={13} style={{ color: 'var(--positive)' }} />
                  <span style={{ fontFamily: 'var(--font-mono)', color: 'var(--text-primary)', fontWeight: 600, fontSize: '0.9375rem' }}>
                    {metrics.maxWinStreak}
                  </span>
                </div>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0 4px' }}>
                <span className="t-label">Max Loss Streak</span>
                <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                  <Shield size={13} style={{ color: 'var(--text-muted)' }} />
                  <span style={{ fontFamily: 'var(--font-mono)', color: 'var(--text-muted)', fontWeight: 600, fontSize: '0.9375rem' }}>
                    {metrics.maxLossStreak}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Consistency Score */}
        <div className="card">
          <div className="card-header">
            <div className="card-header-icon violet"><Target size={15} /></div>
            <span className="card-title">Sizing Consistency</span>
          </div>
          <div className="card-body" style={{ display: 'flex', alignItems: 'center', gap: 18, padding: '22px 20px' }}>
            {/* Radial progress */}
            <div style={{ position: 'relative', width: 58, height: 58, flexShrink: 0 }}>
              <svg viewBox="0 0 36 36" style={{ width: '100%', height: '100%', transform: 'rotate(-90deg)' }}>
                <circle cx="18" cy="18" r="15.5" fill="none" stroke="rgba(148, 163, 184, 0.12)" strokeWidth="3" />
                <circle cx="18" cy="18" r="15.5" fill="none"
                  stroke={metrics.consistencyScore >= 75 ? 'var(--positive)' : metrics.consistencyScore >= 50 ? 'var(--primary)' : 'var(--warning)'}
                  strokeWidth="3"
                  strokeDasharray={`${metrics.consistencyScore * 0.974} 100`}
                  strokeLinecap="round"
                  style={{ transition: 'stroke-dasharray 1s cubic-bezier(0.16,1,0.3,1)' }}
                />
              </svg>
              <div style={{
                position: 'absolute', inset: 0,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontFamily: 'var(--font-mono)',
                fontSize: '0.875rem', fontWeight: 700, color: 'var(--text-primary)',
              }}>
                {Math.round(metrics.consistencyScore)}%
              </div>
            </div>
            <div>
              <p style={{ color: 'var(--text-primary)', fontSize: '1rem', fontWeight: 600, marginBottom: 4 }}>
                {metrics.consistencyScore >= 75 ? 'Disciplined Sizing' :
                 metrics.consistencyScore >= 50 ? 'Moderate Consistency' : 'Inconsistent Sizing'}
              </p>
              <p style={{ color: 'var(--text-muted)', fontSize: '0.8125rem', lineHeight: 1.45 }}>
                Position sizing variance and standard deviation
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* ── Row 2: 6 Key Stats ── */}
      <div className="grid-6">
        <StatTile
          label="Total Trades"
          value={metrics.totalTrades}
          icon={<Zap size={14} />}
          color="default"
        />
        <StatTile
          label="Win Rate"
          value={`${metrics.winRate.toFixed(1)}%`}
          icon={<Target size={14} />}
          color={wRate >= 50 ? 'accent' : 'danger'}
        />
        <StatTile
          label="Profit Factor"
          value={pFactor === Infinity ? '∞' : pFactor.toFixed(2)}
          icon={<TrendingUp size={14} />}
          color={pFactor >= 1.2 ? 'accent' : pFactor >= 1.0 ? 'default' : 'danger'}
        />
        <StatTile
          label="Net Profit"
          value={`${metrics.totalProfit >= 0 ? '+' : ''}$${metrics.totalProfit.toFixed(2)}`}
          icon={metrics.totalProfit >= 0 ? <TrendingUp size={14} /> : <TrendingDown size={14} />}
          color={metrics.totalProfit >= 0 ? 'accent' : 'danger'}
        />
        <StatTile
          label="Expectancy"
          value={`${metrics.expectancy >= 0 ? '+' : ''}$${metrics.expectancy.toFixed(2)}`}
          icon={<Zap size={14} />}
          color={metrics.expectancy >= 0 ? 'accent' : 'danger'}
        />
        <StatTile
          label="Max Drawdown"
          value={`${metrics.maxDrawdownPct.toFixed(1)}%`}
          icon={<Shield size={14} />}
          color={metrics.maxDrawdownPct <= 10 ? 'default' : 'danger'}
        />
      </div>

      {/* ── Row 3: Secondary Stats ── */}
      <div className="grid-4">
        <MiniTile label="Average Win" value={`+$${metrics.avgWin.toFixed(2)}`} positive />
        <MiniTile label="Average Loss" value={`$${metrics.avgLoss.toFixed(2)}`} />
        <MiniTile label="Largest Win" value={`+$${metrics.largestWin.toFixed(2)}`} positive />
        <MiniTile label="Largest Loss" value={`$${metrics.largestLoss.toFixed(2)}`} />
      </div>
    </div>
  );
}

/* ── StatTile Component ── */
const COLOR_MAP = {
  accent:  'var(--positive)',
  danger:  'var(--negative)',
  success: 'var(--positive)',
  mute:    'var(--text-muted)',
  default: 'var(--text-primary)',
};

function StatTile({ label, value, icon, color = 'default' }) {
  const valueColor = COLOR_MAP[color] || COLOR_MAP.default;
  return (
    <div className="stat-tile">
      <div className="stat-tile-label">
        <span style={{ color: 'var(--text-muted)', display: 'flex' }}>{icon}</span>
        <span>{label}</span>
      </div>
      <div style={{ color: valueColor }} className="stat-tile-value">
        {value}
      </div>
    </div>
  );
}

/* ── MiniTile Component ── */
function MiniTile({ label, value, positive }) {
  return (
    <div className="mini-stat">
      <p className="mini-stat-label">{label}</p>
      <p style={{
        fontFamily: 'var(--font-mono)',
        fontSize: '1.0625rem',
        fontWeight: 600,
        fontVariantNumeric: 'tabular-nums',
        color: positive ? 'var(--positive)' : 'var(--negative)'
      }}>
        {value}
      </p>
    </div>
  );
}
