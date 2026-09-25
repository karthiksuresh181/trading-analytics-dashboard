import {
  Clock, AlertTriangle, TrendingDown, Droplets, Timer,
  DollarSign, ArrowDownRight, ArrowUpRight, BarChart3,
  Trophy, Skull, ArrowUp, ArrowDown, TrendingUp,
} from 'lucide-react';
import {
  AreaChart, Area, BarChart, Bar, XAxis, YAxis, Tooltip,
  ResponsiveContainer, CartesianGrid, Cell, ReferenceLine,
} from 'recharts';

const GREEN = '#34D399';
const RED = '#FB7185';
const AMBER = '#FBBF24';
const BLUE = '#38BDF8';
const GRID = 'rgba(148, 163, 184, 0.08)';

const axisTick = {
  fill: '#94A3B8',
  fontSize: 11,
  fontFamily: '"JetBrains Mono", monospace',
};

const tipStyle = {
  borderRadius: 8,
  padding: '10px 14px',
  background: '#161E2C',
  border: '1px solid rgba(148, 163, 184, 0.22)',
  boxShadow: '0 10px 25px rgba(0, 0, 0, 0.55)',
};

export default function AdvancedAnalytics({ metrics, trades }) {
  if (!metrics) return null;

  // ── Drawdown curve from equity data ──
  const ddCurve = (() => {
    let peak = -Infinity;
    return (metrics.equityCurve || []).map((pt, i) => {
      if (pt.balance > peak) peak = pt.balance;
      const dd = peak > 0 ? ((peak - pt.balance) / peak) * 100 : 0;
      return { index: i + 1, date: pt.date, drawdown: -dd };
    });
  })();

  // ── Direction analysis ──
  const directionStats = (() => {
    const buys = (trades || []).filter(t => t.type === 'buy');
    const sells = (trades || []).filter(t => t.type === 'sell');
    const calc = (arr) => ({
      count: arr.length,
      wins: arr.filter(t => t.profit > 0).length,
      pnl: arr.reduce((s, t) => s + t.profit, 0),
      avgPnl: arr.length ? arr.reduce((s, t) => s + t.profit, 0) / arr.length : 0,
    });
    return { buy: calc(buys), sell: calc(sells) };
  })();

  // ── Best / Worst 3 trades ──
  const sortedByProfit = [...(trades || [])].sort((a, b) => b.profit - a.profit);
  const bestTrades = sortedByProfit.slice(0, 3);
  const worstTrades = sortedByProfit.slice(-3).reverse();

  // ── Average Analysis ──
  const totalDays = metrics.calendarData?.length || 1;
  const avgDailyPnL = metrics.totalProfit / totalDays;
  const totalDur = (trades || []).reduce((s, t) => s + t.durationMin, 0);
  const avgDuration = trades?.length ? totalDur / trades.length : 0;

  return (
    <div className="stack">

      {/* ── Row 1: Hold Time / Expectancy / Trade Breakdown ── */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 16 }}
        className="analytics-top-row">
        <style>{`
          @media (max-width: 900px)  { .analytics-top-row { grid-template-columns: 1fr 1fr !important; } }
          @media (max-width: 600px)  { .analytics-top-row { grid-template-columns: 1fr !important; } }
        `}</style>

        {/* Hold Time Analysis */}
        <div className="card">
          <div className="card-header">
            <div className="card-header-icon"><Timer size={15} /></div>
            <span className="card-title">Hold Time Dynamics</span>
          </div>
          <div className="card-body" style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <ArrowUpRight size={15} style={{ color: GREEN }} />
                <span style={{ color: 'var(--text-secondary)', fontSize: '0.8125rem', fontWeight: 500 }}>
                  Average Win Duration
                </span>
              </div>
              <span style={{ fontFamily: 'var(--font-mono)', color: 'var(--text-primary)', fontSize: '0.875rem', fontWeight: 600 }}>
                {formatDuration(metrics.avgWinDuration)}
              </span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <ArrowDownRight size={15} style={{ color: RED }} />
                <span style={{ color: 'var(--text-secondary)', fontSize: '0.8125rem', fontWeight: 500 }}>
                  Average Loss Duration
                </span>
              </div>
              <span style={{ fontFamily: 'var(--font-mono)', color: RED, fontSize: '0.875rem', fontWeight: 600 }}>
                {formatDuration(metrics.avgLossDuration)}
              </span>
            </div>
            <div className="divider" />
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <span style={{ color: 'var(--text-secondary)', fontSize: '0.8125rem', fontWeight: 500 }}>
                Hold Time Ratio (Loss/Win)
              </span>
              <span style={{
                fontFamily: 'var(--font-mono)',
                fontSize: '1.25rem', letterSpacing: '-0.02em', lineHeight: 1, fontWeight: 700,
                color: metrics.holdTimeRatio > 2 ? RED : metrics.holdTimeRatio > 1.3 ? AMBER : GREEN,
              }}>
                {metrics.holdTimeRatio.toFixed(2)}x
              </span>
            </div>
            <div>
              <div style={{ position: 'relative', height: 7, borderRadius: 'var(--radius-full)', background: 'var(--bg-surface-soft)', overflow: 'hidden' }}>
                <div style={{
                  position: 'absolute', left: 0, top: 0, height: '100%',
                  background: GREEN, borderRadius: 'var(--radius-full)',
                  width: `${Math.min(100, (metrics.avgWinDuration / Math.max(metrics.avgWinDuration, metrics.avgLossDuration || 1)) * 100)}%`,
                  transition: 'width 0.8s cubic-bezier(0.16,1,0.3,1)',
                }} />
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 6 }}>
                <span className="t-label" style={{ color: GREEN, fontWeight: 600 }}>Winners</span>
                <span className="t-label" style={{ color: RED, fontWeight: 600 }}>Losers</span>
              </div>
            </div>
          </div>
        </div>

        {/* Expectancy */}
        <div className="card">
          <div className="card-header">
            <div className="card-header-icon"><DollarSign size={15} /></div>
            <span className="card-title">Mathematical Expectancy</span>
          </div>
          <div className="card-body" style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            <div style={{ textAlign: 'center', padding: '6px 0' }}>
              <div style={{
                fontFamily: 'var(--font-mono)',
                fontSize: 'clamp(1.75rem, 3vw, 2.25rem)',
                letterSpacing: '-0.03em', lineHeight: 1, fontWeight: 700,
                color: metrics.expectancy >= 0 ? GREEN : RED,
              }}>
                {metrics.expectancy >= 0 ? '+' : ''}${metrics.expectancy.toFixed(2)}
              </div>
              <p style={{ color: 'var(--text-muted)', fontSize: '0.8125rem', marginTop: 6 }}>
                Expected value per trade
              </p>
            </div>
            <div style={{
              display: 'flex', alignItems: 'center', justifyContent: 'space-between',
              padding: '10px 14px', borderRadius: 'var(--radius-sm)',
              background: 'var(--bg-surface-soft)', border: '1px solid var(--border-default)',
            }}>
              <span style={{ color: 'var(--text-secondary)', fontSize: '0.8125rem', fontWeight: 500 }}>
                Expectancy (R-Multiple)
              </span>
              <span style={{
                fontFamily: 'var(--font-mono)',
                fontSize: '0.875rem', fontWeight: 700,
                color: metrics.expectancyR >= 0 ? GREEN : RED
              }}>
                {metrics.expectancyR >= 0 ? '+' : ''}{metrics.expectancyR.toFixed(3)}R
              </span>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
              <InfoBlock label="Gross Profit" value={`+$${metrics.grossProfit.toFixed(2)}`} color={GREEN} />
              <InfoBlock label="Gross Loss" value={`$${metrics.grossLoss.toFixed(2)}`} color={RED} />
            </div>
          </div>
        </div>

        {/* Trade Breakdown */}
        <div className="card">
          <div className="card-header">
            <div className="card-header-icon mute"><Clock size={15} /></div>
            <span className="card-title">Trade Outcome Breakdown</span>
          </div>
          <div className="card-body" style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 20 }}>
              <CircleBadge count={metrics.wins} label="Wins" color={GREEN} bg="var(--positive-soft)" />
              <CircleBadge count={metrics.losses} label="Losses" color={RED} bg="var(--negative-soft)" />
              {metrics.breakeven > 0 && (
                <CircleBadge count={metrics.breakeven} label="B/E" color="var(--text-muted)" bg="var(--bg-surface-soft)" />
              )}
            </div>
            <div>
              <div style={{ height: 7, borderRadius: 'var(--radius-full)', background: 'var(--bg-surface-soft)', overflow: 'hidden' }}>
                <div style={{
                  height: '100%', borderRadius: 'var(--radius-full)',
                  width: `${metrics.winRate}%`, background: GREEN,
                  transition: 'width 0.8s cubic-bezier(0.16,1,0.3,1)',
                }} />
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 6 }}>
                <span className="t-label" style={{ color: GREEN, fontWeight: 600 }}>{metrics.winRate.toFixed(1)}% Win</span>
                <span className="t-label" style={{ color: RED, fontWeight: 600 }}>{(100 - metrics.winRate).toFixed(1)}% Loss</span>
              </div>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
              <InfoBlock label="Commission" value={`$${metrics.totalCommission.toFixed(2)}`} />
              <InfoBlock label="Swap" value={`$${metrics.totalSwap.toFixed(2)}`} />
            </div>
          </div>
        </div>
      </div>

      {/* ── Drawdown Analysis ── */}
      <div className="card">
        <div className="card-header" style={{ justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div className="card-header-icon" style={{ background: 'var(--negative-soft)', color: RED, borderColor: 'var(--negative-border)' }}>
              <TrendingDown size={15} />
            </div>
            <span className="card-title">Drawdown Profile</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <span className="t-label">Max Drawdown:</span>
              <span style={{ fontFamily: 'var(--font-mono)', fontWeight: 700, color: RED, fontSize: '0.875rem' }}>
                {metrics.maxDrawdownPct.toFixed(2)}%
              </span>
            </div>
            <span style={{ color: 'var(--border-strong)' }}>•</span>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <span className="t-label">Absolute Drawdown:</span>
              <span style={{ fontFamily: 'var(--font-mono)', fontWeight: 700, color: RED, fontSize: '0.875rem' }}>
                ${metrics.maxDrawdown.toFixed(2)}
              </span>
            </div>
          </div>
        </div>
        <div className="card-body" style={{ padding: '20px 12px 14px' }}>
          <ResponsiveContainer width="100%" height={210}>
            <AreaChart data={ddCurve} margin={{ top: 8, right: 20, left: 10, bottom: 4 }}>
              <defs>
                <linearGradient id="ddGradDark" x1="0" y1="1" x2="0" y2="0">
                  <stop offset="0%" stopColor={RED} stopOpacity={0.18} />
                  <stop offset="100%" stopColor={RED} stopOpacity={0.02} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke={GRID} vertical={false} />
              <XAxis dataKey="index" tick={axisTick} tickLine={false} axisLine={{ stroke: GRID }} />
              <YAxis tick={axisTick} tickLine={false} axisLine={false} tickFormatter={v => `${v.toFixed(0)}%`} width={52} />
              <ReferenceLine y={0} stroke="rgba(148, 163, 184, 0.2)" strokeDasharray="3 3" />
              <Tooltip
                content={({ active, payload }) => {
                  if (!active || !payload?.length) return null;
                  const d = payload[0].payload;
                  return (
                    <div style={tipStyle}>
                      <p style={{ color: 'var(--text-muted)', fontSize: '0.75rem', marginBottom: 4 }}>
                        Trade #{d.index}
                      </p>
                      <p style={{
                        color: RED,
                        fontSize: '0.9375rem',
                        fontWeight: 700,
                        fontFamily: 'var(--font-mono)'
                      }}>
                        {Math.abs(d.drawdown).toFixed(2)}% Drawdown
                      </p>
                    </div>
                  );
                }}
              />
              <Area type="monotone" dataKey="drawdown" stroke={RED} strokeWidth={1.5}
                fill="url(#ddGradDark)" animationDuration={800} dot={false}
                activeDot={{ r: 4, fill: RED, stroke: '#0B0F17', strokeWidth: 2 }} />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* ── Direction Analysis ── */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }} className="dir-grid">
        <style>{`@media (max-width: 640px) { .dir-grid { grid-template-columns: 1fr !important; } }`}</style>

        {[
          { label: 'Long / Buy Trades', stats: directionStats.buy, color: GREEN, bg: 'var(--positive-soft)', border: 'var(--positive-border)', icon: <ArrowUp size={15} /> },
          { label: 'Short / Sell Trades', stats: directionStats.sell, color: RED, bg: 'var(--negative-soft)', border: 'var(--negative-border)', icon: <ArrowDown size={15} /> },
        ].map(({ label, stats, color, bg, border, icon }) => (
          <div className="card" key={label}>
            <div className="card-header" style={{ justifyContent: 'space-between' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <div className="card-header-icon" style={{ background: bg, color, borderColor: border }}>
                  {icon}
                </div>
                <span className="card-title">{label}</span>
              </div>
              <span style={{
                fontFamily: 'var(--font-mono)',
                fontSize: '0.9375rem',
                fontWeight: 700,
                color: stats.pnl >= 0 ? GREEN : RED
              }}>
                {stats.pnl >= 0 ? '+' : ''}${stats.pnl.toFixed(2)}
              </span>
            </div>
            <div className="card-body">
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 10 }}>
                <InfoBlock label="Trades" value={stats.count} />
                <InfoBlock label="Wins" value={stats.wins} color={GREEN} />
                <InfoBlock
                  label="Win Rate"
                  value={stats.count ? `${((stats.wins / stats.count) * 100).toFixed(0)}%` : '—'}
                  color={stats.count && stats.wins / stats.count >= 0.5 ? GREEN : RED}
                />
                <InfoBlock
                  label="Avg P/L"
                  value={`${stats.avgPnl >= 0 ? '+' : ''}$${stats.avgPnl.toFixed(2)}`}
                  color={stats.avgPnl >= 0 ? GREEN : RED}
                />
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* ── Top Performing Instruments ── */}
      <div className="card">
        <div className="card-header">
          <div className="card-header-icon" style={{ background: 'var(--primary-soft)', color: BLUE, borderColor: 'var(--primary-border)' }}>
            <BarChart3 size={15} />
          </div>
          <span className="card-title">Instrument Profitability</span>
        </div>
        <div className="card-body" style={{ padding: '20px 12px 14px' }}>
          <ResponsiveContainer width="100%" height={Math.max(160, metrics.assetPnL.length * 36)}>
            <BarChart
              data={[...metrics.assetPnL].sort((a, b) => b.totalPnL - a.totalPnL)}
              layout="vertical"
              margin={{ top: 4, right: 60, left: 60, bottom: 4 }}
            >
              <CartesianGrid strokeDasharray="3 3" stroke={GRID} horizontal={false} />
              <XAxis type="number" tick={axisTick} tickLine={false} axisLine={{ stroke: GRID }} tickFormatter={v => `$${v.toFixed(0)}`} />
              <YAxis type="category" dataKey="symbol" tick={{ ...axisTick, fontSize: 12, fontWeight: 600, fill: 'var(--text-primary)' }} tickLine={false} axisLine={false} width={64} />
              <Tooltip
                content={({ active, payload }) => {
                  if (!active || !payload?.length) return null;
                  const d = payload[0].payload;
                  const wr = d.count ? ((d.wins / d.count) * 100).toFixed(0) : 0;
                  return (
                    <div style={tipStyle}>
                      <p style={{ color: 'var(--text-primary)', fontWeight: 600, marginBottom: 4 }}>{d.symbol}</p>
                      <p style={{
                        color: d.totalPnL >= 0 ? GREEN : RED,
                        fontSize: '0.9375rem',
                        fontWeight: 700,
                        fontFamily: 'var(--font-mono)',
                        marginBottom: 4
                      }}>
                        {d.totalPnL >= 0 ? '+' : ''}${d.totalPnL.toFixed(2)}
                      </p>
                      <p className="t-label">{d.count} trades · Win Rate: {wr}%</p>
                    </div>
                  );
                }}
              />
              <Bar dataKey="totalPnL" radius={[0, 4, 4, 0]} maxBarSize={22}>
                {metrics.assetPnL.map((entry, i) => (
                  <Cell key={i} fill={entry.totalPnL >= 0 ? GREEN : RED} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* ── Day Breakdown Table ── */}
      <div className="card">
        <div className="card-header">
          <div className="card-header-icon violet"><BarChart3 size={15} /></div>
          <span className="card-title">Day-of-Week Breakdown</span>
        </div>
        <div className="card-body" style={{ padding: 0, overflowX: 'auto' }}>
          <div style={{ minWidth: 620 }}>
            {/* Table header */}
            <div style={{
              display: 'grid', gridTemplateColumns: '120px 1fr 80px 90px 110px 110px',
              padding: '10px 20px', borderBottom: '1px solid var(--border-default)',
              background: 'var(--bg-surface-soft)',
            }}>
              {['Day', 'Win Rate', 'Trades', 'W / L', 'Total P/L', 'Avg P/L'].map((h, i) => (
                <span key={h} className="t-label" style={{ textAlign: i >= 2 ? 'right' : 'left' }}>{h}</span>
              ))}
            </div>
            {metrics.dailyPnL.map((day) => {
              const wr = day.count ? ((day.wins / day.count) * 100) : 0;
              const avgPnl = day.count ? day.totalPnL / day.count : 0;
              const isPos = day.totalPnL >= 0;
              return (
                <div key={day.name} style={{
                  display: 'grid', gridTemplateColumns: '120px 1fr 80px 90px 110px 110px',
                  alignItems: 'center', padding: '12px 20px',
                  borderBottom: '1px solid var(--border-default)',
                  transition: 'background 0.12s',
                }}
                  onMouseEnter={e => e.currentTarget.style.background = 'var(--bg-hover)'}
                  onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                >
                  <span style={{ color: 'var(--text-primary)', fontWeight: 600 }}>{day.name}</span>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <div style={{ flex: 1, height: 6, borderRadius: 'var(--radius-full)', background: 'var(--bg-surface-soft)', overflow: 'hidden', maxWidth: 130 }}>
                      <div style={{ height: '100%', width: `${wr}%`, background: GREEN, borderRadius: 'var(--radius-full)' }} />
                    </div>
                    <span style={{ color: wr >= 50 ? GREEN : RED, fontSize: '0.8125rem', fontFamily: 'var(--font-mono)', fontWeight: 600, minWidth: 36 }}>
                      {wr.toFixed(0)}%
                    </span>
                  </div>
                  <span style={{ color: 'var(--text-secondary)', fontFamily: 'var(--font-mono)', fontSize: '0.8125rem', textAlign: 'right' }}>
                    {day.count}
                  </span>
                  <span style={{ color: 'var(--text-secondary)', fontFamily: 'var(--font-mono)', fontSize: '0.8125rem', textAlign: 'right' }}>
                    <span style={{ color: GREEN }}>{day.wins}</span> / <span style={{ color: RED }}>{day.losses}</span>
                  </span>
                  <span style={{
                    color: isPos ? GREEN : RED,
                    fontFamily: 'var(--font-mono)',
                    fontSize: '0.875rem',
                    fontWeight: 700,
                    textAlign: 'right'
                  }}>
                    {isPos ? '+' : ''}${day.totalPnL.toFixed(2)}
                  </span>
                  <span style={{
                    color: avgPnl >= 0 ? GREEN : RED,
                    fontFamily: 'var(--font-mono)',
                    fontSize: '0.875rem',
                    fontWeight: 600,
                    textAlign: 'right'
                  }}>
                    {avgPnl >= 0 ? '+' : ''}${avgPnl.toFixed(2)}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* ── Average Analysis ── */}
      <div className="card">
        <div className="card-header">
          <div className="card-header-icon"><TrendingUp size={15} /></div>
          <span className="card-title">Average Statistical Profile</span>
        </div>
        <div className="card-body">
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12 }} className="avg-grid">
            <style>{`@media (max-width: 640px) { .avg-grid { grid-template-columns: 1fr 1fr !important; } }`}</style>
            <InfoBlock label="Avg Daily P/L" value={`${avgDailyPnL >= 0 ? '+' : ''}$${avgDailyPnL.toFixed(2)}`} color={avgDailyPnL >= 0 ? GREEN : RED} />
            <InfoBlock label="Avg Trade Duration" value={formatDuration(avgDuration)} color="var(--text-primary)" />
            <InfoBlock label="Avg Win" value={`+$${metrics.avgWin.toFixed(2)}`} color={GREEN} />
            <InfoBlock label="Avg Loss" value={`$${metrics.avgLoss.toFixed(2)}`} color={RED} />
            <InfoBlock label="Avg Lot / Trade" value={trades?.length ? (trades.reduce((s, t) => s + t.volume, 0) / trades.length).toFixed(2) : '—'} color="var(--text-primary)" />
            <InfoBlock label="Realized R:R Ratio" value={metrics.avgLoss !== 0 ? `${(Math.abs(metrics.avgWin) / Math.abs(metrics.avgLoss)).toFixed(2)}:1` : '∞'} color="var(--text-primary)" />
          </div>
        </div>
      </div>

      {/* ── Best & Worst Trades ── */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }} className="bw-grid">
        <style>{`@media (max-width: 700px) { .bw-grid { grid-template-columns: 1fr !important; } }`}</style>

        {/* Best Trades */}
        <div className="card">
          <div className="card-header">
            <div className="card-header-icon" style={{ background: 'var(--positive-soft)', color: GREEN, borderColor: 'var(--positive-border)' }}>
              <Trophy size={15} />
            </div>
            <span className="card-title">Best Trades</span>
          </div>
          <div className="card-body" style={{ padding: 0 }}>
            {bestTrades.map((t, i) => (
              <TradeRow key={t.id || i} trade={t} rank={i + 1} isWin />
            ))}
          </div>
        </div>

        {/* Worst Trades */}
        <div className="card">
          <div className="card-header">
            <div className="card-header-icon" style={{ background: 'var(--negative-soft)', color: RED, borderColor: 'var(--negative-border)' }}>
              <Skull size={15} />
            </div>
            <span className="card-title">Worst Trades</span>
          </div>
          <div className="card-body" style={{ padding: 0 }}>
            {worstTrades.map((t, i) => (
              <TradeRow key={t.id || i} trade={t} rank={i + 1} isWin={false} />
            ))}
          </div>
        </div>
      </div>

      {/* ── Profit Leakage ── */}
      {metrics.leakage.length > 0 && (
        <div className="card" style={{ borderColor: 'var(--negative-border)' }}>
          <div className="card-header" style={{ background: 'var(--negative-soft)', borderBottomColor: 'var(--negative-border)' }}>
            <div className="card-header-icon" style={{ background: 'var(--bg-surface-raised)', color: RED, border: '1px solid var(--negative-border)' }}>
              <Droplets size={15} />
            </div>
            <span className="card-title" style={{ color: RED }}>Profit Leakage Analysis</span>
          </div>
          <div className="card-body">
            <div className="stack-sm">
              {metrics.leakage.map((leak, i) => (
                <div key={i} style={{
                  display: 'flex', alignItems: 'flex-start', gap: 12,
                  padding: '12px 14px', borderRadius: 'var(--radius-sm)',
                  background: 'var(--bg-surface-soft)', border: '1px solid var(--border-default)',
                }}>
                  <TrendingDown size={16} style={{ color: RED, flexShrink: 0, marginTop: 2 }} />
                  <div style={{ flex: 1 }}>
                    <p style={{ color: 'var(--text-secondary)', fontSize: '0.8125rem', lineHeight: 1.5 }}>
                      {leak.message}
                    </p>
                    <div style={{ marginTop: 8, height: 5, borderRadius: 'var(--radius-full)', background: 'var(--bg-surface-raised)', overflow: 'hidden', maxWidth: 300 }}>
                      <div style={{
                        height: '100%', background: RED, borderRadius: 'var(--radius-full)',
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
          <div className="card-header-icon"><AlertTriangle size={15} /></div>
          <span className="card-title">Behavioral Edge &amp; Execution Insights</span>
        </div>
        <div className="card-body">
          {metrics.recommendations.length === 0 ? (
            <p style={{ color: 'var(--text-muted)', fontSize: '0.8125rem', textAlign: 'center', padding: '16px 0' }}>
              No critical performance anomalies detected. Continue consistent trade execution.
            </p>
          ) : (
            <div className="stack-sm">
              {metrics.recommendations.map((rec, i) => {
                const sev = rec.severity || 'info';
                return (
                  <div key={i} className={`insight-row ${sev}`}>
                    <span style={{ fontSize: '1.1rem', lineHeight: 1, flexShrink: 0 }}>{rec.icon}</span>
                    <p style={{ color: 'var(--text-secondary)', fontSize: '0.8125rem', lineHeight: 1.55 }}>
                      {rec.message}
                    </p>
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

/* ── Trade Row for Best/Worst ── */
function TradeRow({ trade: t, rank, isWin }) {
  const color = isWin ? GREEN : RED;
  const bg = isWin ? 'var(--positive-soft)' : 'var(--negative-soft)';
  const border = isWin ? 'var(--positive-border)' : 'var(--negative-border)';
  const dateStr = t.openTime
    ? t.openTime.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })
    : t.dateKey;
  return (
    <div style={{
      display: 'flex', alignItems: 'center', gap: 12, padding: '12px 20px',
      borderBottom: '1px solid var(--border-default)',
    }}>
      <span style={{
        width: 24, height: 24, borderRadius: 6, flexShrink: 0,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        background: bg, border: `1px solid ${border}`, color, fontSize: '0.75rem', fontWeight: 700,
        fontFamily: 'var(--font-mono)'
      }}>{rank}</span>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 2 }}>
          <span style={{ color: 'var(--text-primary)', fontWeight: 600, fontSize: '0.875rem' }}>{t.symbol}</span>
          <span className={t.type === 'buy' ? 'badge badge-buy' : 'badge badge-sell'}>{t.type}</span>
        </div>
        <span style={{ color: 'var(--text-muted)', fontSize: '0.75rem', fontFamily: 'var(--font-mono)' }}>
          {dateStr} · Vol {t.volume}
        </span>
      </div>
      <span style={{
        fontSize: '0.9375rem',
        fontWeight: 700,
        color,
        fontFamily: 'var(--font-mono)'
      }}>
        {t.profit >= 0 ? '+' : ''}${t.profit.toFixed(2)}
      </span>
    </div>
  );
}

/* ── Helpers ── */
function InfoBlock({ label, value, color }) {
  return (
    <div style={{
      padding: '12px 14px', borderRadius: 'var(--radius-sm)',
      background: 'var(--bg-surface-soft)', border: '1px solid var(--border-default)',
      textAlign: 'center',
    }}>
      <p className="t-label" style={{ marginBottom: 4 }}>{label}</p>
      <p style={{
        fontFamily: 'var(--font-mono)',
        fontSize: '0.9375rem',
        fontWeight: 700,
        fontVariantNumeric: 'tabular-nums',
        color: color || 'var(--text-primary)'
      }}>{value}</p>
    </div>
  );
}

function CircleBadge({ count, label, color, bg }) {
  return (
    <div style={{ textAlign: 'center' }}>
      <div style={{
        width: 48, height: 48, borderRadius: '50%',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        border: `1.5px solid ${color}`,
        background: bg,
        fontFamily: 'var(--font-mono)',
        fontSize: '1.05rem', fontWeight: 700, color, marginBottom: 6, margin: '0 auto 6px',
      }}>
        {count}
      </div>
      <span className="t-label">{label}</span>
    </div>
  );
}

function formatDuration(min) {
  if (min < 1) return `${Math.round(min * 60)}s`;
  if (min < 60) return `${Math.round(min)}m`;
  const h = Math.floor(min / 60);
  const m = Math.round(min % 60);
  return `${h}h ${m}m`;
}
