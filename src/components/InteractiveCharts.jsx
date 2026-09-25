import {
  AreaChart, Area, BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer,
  CartesianGrid, Cell, PieChart, Pie, ReferenceLine,
} from 'recharts';
import { TrendingUp, BarChart3, Clock, PieChart as PieIcon } from 'lucide-react';

/* ── Refined Dark Theme Chart Palette ── */
const C = {
  primary:       '#38BDF8', // Cyan/Sky for Balance Curve
  primaryGradient: '#38BDF8',
  positive:      '#34D399', // Emerald
  negative:      '#FB7185', // Rose/Red
  breakeven:     '#64748B', // Slate
  tick:          '#94A3B8', // Medium-muted axis text
  grid:          'rgba(148, 163, 184, 0.08)',
  refLine:       'rgba(148, 163, 184, 0.20)',
};

/* Format dates for X-axis labels: "09 Jun" */
function fmtDateLabel(dateStr) {
  if (!dateStr) return '';
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return dateStr;
  return d.toLocaleDateString('en-GB', { day: '2-digit', month: 'short' });
}

/* Thin out X-axis ticks so they don't overlap */
function buildDateTicks(data, maxTicks = 10) {
  if (!data || data.length === 0) return [];
  const step = Math.max(1, Math.floor(data.length / maxTicks));
  return data
    .filter((_, i) => i % step === 0 || i === data.length - 1)
    .map(d => d.date);
}

export default function InteractiveCharts({ metrics, trades }) {
  if (!metrics) return null;

  // Balance curve — cumulative P/L starting from 0
  let runningPnL = 0;
  const balanceData = metrics.equityCurve.map((pt, i) => {
    runningPnL += pt.profit;
    return {
      ...pt,
      cumulativePnL: runningPnL,
      index: i + 1,
      label: `Trade ${i + 1}`,
      dateLabel: fmtDateLabel(pt.date),
    };
  });

  const dateTicks = buildDateTicks(balanceData, 10);
  const minPnL = Math.min(0, ...balanceData.map(d => d.cumulativePnL));
  const maxPnL = Math.max(0, ...balanceData.map(d => d.cumulativePnL));

  const hourlyData = metrics.hourlyPnL.filter(h => h.count > 0);
  const pieData = [
    { name: 'Wins', value: metrics.wins, color: C.positive },
    { name: 'Losses', value: metrics.losses, color: C.negative },
    ...(metrics.breakeven > 0 ? [{ name: 'Breakeven', value: metrics.breakeven, color: C.breakeven }] : []),
  ];

  return (
    <div className="stack">

      {/* ── Balance Curve ── */}
      <div className="card">
        <div className="card-header" style={{ justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div className="card-header-icon"><TrendingUp size={15} /></div>
            <span className="card-title">Cumulative Performance (Balance Curve)</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <span className="t-label">Net Realized P/L:</span>
            <span style={{
              fontFamily: 'var(--font-mono)',
              fontSize: '0.875rem',
              fontWeight: 700,
              color: metrics.totalProfit >= 0 ? C.positive : C.negative
            }}>
              {metrics.totalProfit >= 0 ? '+' : ''}${metrics.totalProfit.toFixed(2)}
            </span>
          </div>
        </div>
        <div className="card-body" style={{ padding: '20px 12px 14px' }}>
          <ResponsiveContainer width="100%" height={320}>
            <AreaChart data={balanceData} margin={{ top: 12, right: 24, left: 14, bottom: 4 }}>
              <defs>
                <linearGradient id="balGradDark" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor={C.primaryGradient} stopOpacity={0.16} />
                  <stop offset="100%" stopColor={C.primaryGradient} stopOpacity={0.01} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke={C.grid} />
              <XAxis
                dataKey="date"
                type="category"
                ticks={dateTicks}
                tickFormatter={fmtDateLabel}
                tick={axisTick}
                tickLine={false}
                axisLine={{ stroke: C.grid }}
                interval={0}
                height={32}
              />
              <YAxis
                tick={axisTick}
                tickLine={false}
                axisLine={false}
                tickFormatter={v => `${v >= 0 ? '+' : ''}$${v.toFixed(0)}`}
                width={68}
                domain={[minPnL * 1.08, maxPnL * 1.08]}
              />
              <ReferenceLine
                y={0}
                stroke={C.refLine}
                strokeDasharray="4 4"
                label={{ value: 'Break-even ($0)', position: 'insideTopLeft', fill: C.tick, fontSize: 11, fontFamily: 'var(--font-sans)' }}
              />
              <Tooltip content={<BalanceTooltip />} />
              <Area
                type="monotone"
                dataKey="cumulativePnL"
                stroke={C.primary}
                strokeWidth={2}
                fill="url(#balGradDark)"
                animationDuration={900}
                dot={false}
                activeDot={{ r: 5, fill: C.primary, stroke: '#0B0F17', strokeWidth: 2 }}
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* ── Hourly + Pie Row ── */}
      <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: 16 }} className="charts-row-2">
        <style>{`
          @media (max-width: 900px) { .charts-row-2 { grid-template-columns: 1fr !important; } }
        `}</style>

        {/* Hourly Performance */}
        <div className="card">
          <div className="card-header">
            <div className="card-header-icon"><Clock size={15} /></div>
            <span className="card-title">Hourly Performance</span>
          </div>
          <div className="card-body" style={{ padding: '20px 12px 14px' }}>
            <ResponsiveContainer width="100%" height={260}>
              <BarChart data={hourlyData} margin={{ top: 8, right: 16, left: 10, bottom: 4 }}>
                <CartesianGrid strokeDasharray="3 3" stroke={C.grid} vertical={false} />
                <XAxis dataKey="label" tick={axisTick} tickLine={false} axisLine={{ stroke: C.grid }} />
                <YAxis tick={axisTick} tickLine={false} axisLine={false} tickFormatter={v => `$${v}`} width={56} />
                <Tooltip content={<HourTooltip />} />
                <Bar dataKey="totalPnL" radius={[4, 4, 0, 0]} animationDuration={800} maxBarSize={32}>
                  {hourlyData.map((entry, idx) => (
                    <Cell key={idx} fill={entry.totalPnL >= 0 ? C.positive : C.negative} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Win/Loss Pie */}
        <div className="card">
          <div className="card-header">
            <div className="card-header-icon violet"><PieIcon size={15} /></div>
            <span className="card-title">Win / Loss Ratio</span>
          </div>
          <div className="card-body" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 14 }}>
            <ResponsiveContainer width="100%" height={180}>
              <PieChart>
                <Pie data={pieData} dataKey="value" cx="50%" cy="50%"
                  innerRadius={50} outerRadius={72}
                  paddingAngle={3} stroke="#111827" strokeWidth={2} animationDuration={800}>
                  {pieData.map((entry, idx) => (
                    <Cell key={idx} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip content={<PieTooltip total={metrics.totalTrades} />} />
              </PieChart>
            </ResponsiveContainer>
            <div style={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'center', gap: '8px 16px' }}>
              {pieData.map((d) => (
                <div key={d.name} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  <div style={{ width: 9, height: 9, borderRadius: '50%', background: d.color }} />
                  <span style={{ fontSize: '0.75rem', fontWeight: 500, color: 'var(--text-secondary)' }}>
                    {d.name} ({d.value})
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* ── Asset P&L Distribution ── */}
      <div className="card">
        <div className="card-header">
          <div className="card-header-icon" style={{ background: 'var(--primary-soft)', color: 'var(--primary-hover)', borderColor: 'var(--primary-border)' }}>
            <BarChart3 size={15} />
          </div>
          <span className="card-title">Asset P&amp;L Distribution</span>
        </div>
        <div className="card-body">
          <div className="stack">
            {metrics.assetPnL.map((asset) => {
              const maxAbs = Math.max(...metrics.assetPnL.map(a => Math.abs(a.totalPnL)));
              const pct = maxAbs > 0 ? (Math.abs(asset.totalPnL) / maxAbs) * 100 : 0;
              const isPos = asset.totalPnL >= 0;
              const wr = asset.count > 0 ? ((asset.wins / asset.count) * 100).toFixed(0) : 0;

              return (
                <div key={asset.symbol} style={{ display: 'flex', flexDirection: 'column', gap: 6 }} className="asset-row">
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
                      <span style={{ color: 'var(--text-primary)', fontSize: '0.875rem', fontWeight: 600, minWidth: 64 }}>
                        {asset.symbol}
                      </span>
                      <span className="t-label">{asset.count} trades</span>
                      <span className="t-label">Win Rate: {wr}%</span>
                    </div>
                    <span style={{
                      fontFamily: 'var(--font-mono)',
                      fontSize: '0.875rem',
                      fontWeight: 700,
                      fontVariantNumeric: 'tabular-nums',
                      color: isPos ? C.positive : C.negative
                    }}>
                      {isPos ? '+' : ''}${asset.totalPnL.toFixed(2)}
                    </span>
                  </div>
                  <div style={{ height: 6, borderRadius: 'var(--radius-full)', background: 'var(--bg-surface-soft)', overflow: 'hidden' }}>
                    <div style={{
                      height: '100%',
                      borderRadius: 'var(--radius-full)',
                      background: isPos ? C.positive : C.negative,
                      width: `${pct}%`,
                      transition: 'width 0.8s cubic-bezier(0.16,1,0.3,1)',
                    }} />
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* ── Day-of-Week Performance ── */}
      <div className="card">
        <div className="card-header">
          <div className="card-header-icon violet"><BarChart3 size={15} /></div>
          <span className="card-title">Day-of-Week Performance</span>
        </div>
        <div className="card-body">
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: 12 }} className="dow-grid">
            <style>{`
              @media (max-width: 640px) { .dow-grid { grid-template-columns: repeat(2, 1fr) !important; } }
            `}</style>
            {metrics.dailyPnL.map((day) => {
              const isPos = day.totalPnL >= 0;
              return (
                <div key={day.name} style={{
                  padding: '16px 14px',
                  borderRadius: 'var(--radius-sm)',
                  border: '1px solid var(--border-default)',
                  background: 'var(--bg-surface-soft)',
                  textAlign: 'center',
                  transition: 'border-color 0.15s ease',
                }}>
                  <p style={{
                    fontSize: '0.8125rem',
                    fontWeight: 600,
                    color: 'var(--text-secondary)',
                    marginBottom: 8
                  }}>
                    {day.name}
                  </p>
                  <p style={{
                    fontFamily: 'var(--font-mono)',
                    fontSize: '1.25rem',
                    letterSpacing: '-0.02em',
                    lineHeight: 1,
                    fontVariantNumeric: 'tabular-nums',
                    color: isPos ? C.positive : C.negative,
                    marginBottom: 6,
                    fontWeight: 700,
                  }}>
                    {isPos ? '+' : ''}${day.totalPnL.toFixed(0)}
                  </p>
                  <p className="t-label">{day.count} trades</p>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}

/* ── Axis Tick Style ── */
const axisTick = {
  fill: C.tick,
  fontSize: 11,
  fontFamily: '"JetBrains Mono", monospace',
  fontWeight: 400,
};

/* ── Tooltips: Refined Dark Institutional Card ── */
const tipStyle = {
  borderRadius: 8,
  padding: '12px 16px',
  background: '#161E2C',
  border: '1px solid rgba(148, 163, 184, 0.22)',
  boxShadow: '0 10px 25px rgba(0, 0, 0, 0.55)',
  minWidth: 190,
};

function BalanceTooltip({ active, payload }) {
  if (!active || !payload?.length) return null;
  const d = payload[0].payload;
  const isPos = d.profit >= 0;
  const isCumPos = d.cumulativePnL >= 0;

  let dateDisplay = d.date;
  try {
    const dt = new Date(d.date);
    dateDisplay = dt.toLocaleDateString('en-GB', {
      weekday: 'short', day: '2-digit', month: 'short', year: 'numeric',
    });
  } catch { }

  return (
    <div style={tipStyle}>
      <p style={{ color: 'var(--text-muted)', fontSize: '0.75rem', fontWeight: 500, marginBottom: 8 }}>
        {dateDisplay}
      </p>
      {/* Cumulative P/L */}
      <p style={{
        color: isCumPos ? C.positive : C.negative,
        fontSize: '1.125rem',
        fontWeight: 700,
        fontFamily: 'var(--font-mono)',
        fontVariantNumeric: 'tabular-nums',
        marginBottom: 2
      }}>
        {isCumPos ? '+' : ''}${d.cumulativePnL.toFixed(2)}
      </p>
      <p style={{ color: 'var(--text-muted)', fontSize: '0.6875rem', marginBottom: 8 }}>
        Cumulative Net P/L
      </p>
      {/* Trade P/L */}
      <div style={{
        borderTop: '1px solid rgba(148, 163, 184, 0.15)',
        paddingTop: 8,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: 8
      }}>
        <span style={{ color: 'var(--text-secondary)', fontSize: '0.75rem' }}>This Trade:</span>
        <span style={{
          color: isPos ? C.positive : C.negative,
          fontSize: '0.8125rem',
          fontWeight: 700,
          fontFamily: 'var(--font-mono)'
        }}>
          {isPos ? '+' : ''}${d.profit.toFixed(2)}
        </span>
      </div>
      {d.symbol && (
        <p style={{ color: 'var(--text-muted)', fontSize: '0.6875rem', marginTop: 4, fontFamily: 'var(--font-mono)' }}>
          {d.symbol} · #{d.index}
        </p>
      )}
    </div>
  );
}

function HourTooltip({ active, payload }) {
  if (!active || !payload?.length) return null;
  const d = payload[0].payload;
  const isPos = d.totalPnL >= 0;
  return (
    <div style={tipStyle}>
      <p style={{ color: 'var(--text-muted)', fontSize: '0.75rem', fontWeight: 500, marginBottom: 6 }}>
        {d.label}
      </p>
      <p style={{
        color: isPos ? C.positive : C.negative,
        fontSize: '1rem',
        fontWeight: 700,
        fontFamily: 'var(--font-mono)',
        marginBottom: 4
      }}>
        {isPos ? '+' : ''}${d.totalPnL.toFixed(2)}
      </p>
      <p style={{ color: 'var(--text-secondary)', fontSize: '0.75rem' }}>
        {d.count} trades ({d.wins}W / {d.losses}L)
      </p>
    </div>
  );
}

function PieTooltip({ active, payload, total }) {
  if (!active || !payload?.length) return null;
  const d = payload[0];
  return (
    <div style={tipStyle}>
      <p style={{ color: 'var(--text-primary)', fontSize: '0.875rem', fontWeight: 600, marginBottom: 4 }}>
        {d.name}
      </p>
      <p style={{ color: 'var(--text-secondary)', fontSize: '0.75rem', fontFamily: 'var(--font-mono)' }}>
        {d.value} trades ({total > 0 ? ((d.value / total) * 100).toFixed(1) : 0}%)
      </p>
    </div>
  );
}
