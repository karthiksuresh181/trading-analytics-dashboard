import {
  AreaChart, Area, BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer,
  CartesianGrid, Cell, PieChart, Pie, ReferenceLine,
} from 'recharts';
import { TrendingUp, BarChart3, Clock, PieChart as PieIcon } from 'lucide-react';

const C = {
  green: '#10b981',
  greenDim: 'rgba(16, 185, 129, 0.12)',
  violet: '#7c3aed',
  blue: '#a0c3ec',
  red: '#f43f5e',
  mute: '#3a3f47',
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

  // Balance curve — cumulative P/L starting from 0 (ignore starting deposit)
  // This makes the chart meaningful for prop-firm accounts
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
    { name: 'Wins', value: metrics.wins, color: C.green },
    { name: 'Losses', value: metrics.losses, color: C.red },
    ...(metrics.breakeven > 0 ? [{ name: 'Breakeven', value: metrics.breakeven, color: C.mute }] : []),
  ];

  return (
    <div className="stack">

      {/* ── Balance Curve ── */}
      <div className="card">
        <div className="card-header">
          <div className="card-header-icon"><TrendingUp size={14} /></div>
          <span className="card-title">Balance Curve</span>
        </div>
        <div className="card-body" style={{ padding: '20px 8px 16px' }}>
          <ResponsiveContainer width="100%" height={320}>
            <AreaChart data={balanceData} margin={{ top: 12, right: 20, left: 10, bottom: 0 }}>
              <defs>
                <linearGradient id="balGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor={C.green} stopOpacity={0.22} />
                  <stop offset="100%" stopColor={C.green} stopOpacity={0.02} />
                </linearGradient>
                <linearGradient id="balGradNeg" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor={C.red} stopOpacity={0.02} />
                  <stop offset="100%" stopColor={C.red} stopOpacity={0.18} />
                </linearGradient>
                <linearGradient id="balStroke" x1="0" y1="0" x2="1" y2="0">
                  <stop offset="0%" stopColor={C.greenDim} />
                  <stop offset="60%" stopColor={C.green} />
                  <stop offset="100%" stopColor="#4ade80" />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" />
              <XAxis
                dataKey="date"
                type="category"
                ticks={dateTicks}
                tickFormatter={fmtDateLabel}
                tick={axisTick}
                tickLine={false}
                axisLine={false}
                interval={0}
                height={36}
              />
              <YAxis
                tick={axisTick}
                tickLine={false}
                axisLine={false}
                tickFormatter={v => `${v >= 0 ? '+' : ''}$${v.toFixed(0)}`}
                width={64}
                domain={[minPnL * 1.05, maxPnL * 1.05]}
              />
              <ReferenceLine
                y={0}
                stroke="rgba(255,255,255,0.18)"
                strokeDasharray="4 4"
                label={{ value: 'Break-even', position: 'insideTopLeft', fill: '#7a7f8a', fontSize: 11 }}
              />
              <Tooltip content={<BalanceTooltip />} />
              <Area
                type="monotone"
                dataKey="cumulativePnL"
                stroke="url(#balStroke)"
                strokeWidth={2}
                fill="url(#balGrad)"
                animationDuration={1000}
                dot={false}
                activeDot={{ r: 5, fill: C.green, strokeWidth: 0 }}
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
            <div className="card-header-icon"><Clock size={14} /></div>
            <span className="card-title">Hourly Performance</span>
          </div>
          <div className="card-body" style={{ padding: '20px 8px 16px' }}>
            <ResponsiveContainer width="100%" height={260}>
              <BarChart data={hourlyData} margin={{ top: 8, right: 16, left: 10, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" />
                <XAxis dataKey="label" tick={axisTick} tickLine={false} axisLine={false} />
                <YAxis tick={axisTick} tickLine={false} axisLine={false} tickFormatter={v => `$${v}`} width={52} />
                <Tooltip content={<HourTooltip />} />
                <Bar dataKey="totalPnL" radius={[3, 3, 0, 0]} animationDuration={1000} maxBarSize={32}>
                  {hourlyData.map((entry, idx) => (
                    <Cell key={idx} fill={entry.totalPnL >= 0 ? C.green : C.red} fillOpacity={0.85} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Win/Loss Pie */}
        <div className="card">
          <div className="card-header">
            <div className="card-header-icon violet"><PieIcon size={14} /></div>
            <span className="card-title">Win / Loss</span>
          </div>
          <div className="card-body" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 16 }}>
            <ResponsiveContainer width="100%" height={180}>
              <PieChart>
                <Pie data={pieData} dataKey="value" cx="50%" cy="50%"
                  innerRadius={52} outerRadius={72}
                  paddingAngle={2} stroke="transparent" animationDuration={1000}>
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
                  <div style={{ width: 8, height: 8, borderRadius: '50%', background: d.color }} />
                  <span className="t-label">{d.name} ({d.value})</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* ── Asset P&L ── */}
      <div className="card">
        <div className="card-header">
          <div className="card-header-icon" style={{ background: 'rgba(160,195,236,0.12)', color: 'var(--accent-blue)' }}>
            <BarChart3 size={14} />
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
                <div key={asset.symbol} style={{ display: 'flex', flexDirection: 'column', gap: 8 }} className="asset-row">
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
                      <span style={{ color: 'var(--ink)', fontSize: '0.875rem', minWidth: 60, fontWeight: 500 }}>{asset.symbol}</span>
                      <span className="t-label">{asset.count} trades</span>
                      <span className="t-label">WR: {wr}%</span>
                    </div>
                    <span style={{ fontSize: '0.875rem', fontWeight: 500, color: isPos ? C.green : C.red }}>
                      {isPos ? '+' : ''}${asset.totalPnL.toFixed(2)}
                    </span>
                  </div>
                  <div style={{ height: 5, borderRadius: 99, background: 'var(--canvas-mid)', overflow: 'hidden' }}>
                    <div style={{
                      height: '100%', borderRadius: 99,
                      background: isPos ? C.green : C.red,
                      width: `${pct}%`,
                      opacity: 0.8,
                      transition: 'width 0.8s cubic-bezier(0.16,1,0.3,1)',
                    }} />
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* ── Day-of-Week ── */}
      <div className="card">
        <div className="card-header">
          <div className="card-header-icon violet"><BarChart3 size={14} /></div>
          <span className="card-title">Day-of-Week Performance</span>
        </div>
        <div className="card-body">
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: 10 }} className="dow-grid">
            <style>{`
              @media (max-width: 640px) { .dow-grid { grid-template-columns: repeat(3, 1fr) !important; } }
            `}</style>
            {metrics.dailyPnL.map((day) => {
              const isPos = day.totalPnL >= 0;
              return (
                <div key={day.name} style={{
                  padding: '16px 12px',
                  borderRadius: 'var(--radius)',
                  border: '1px solid var(--hairline)',
                  background: isPos ? 'rgba(22,163,74,0.04)' : 'rgba(244,63,94,0.04)',
                  textAlign: 'center',
                  transition: 'border-color 0.2s',
                }}>
                  <p className="t-label" style={{ marginBottom: 8 }}>{day.shortName}</p>
                  <p style={{
                    fontSize: '1.25rem', letterSpacing: '-0.02em', lineHeight: 1,
                    color: isPos ? C.green : C.red, marginBottom: 6, fontWeight: 600,
                  }}>
                    ${day.totalPnL.toFixed(0)}
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
  fill: '#9ca3af',
  fontSize: 12,
  fontFamily: '"JetBrains Mono", ui-monospace, monospace',
  fontWeight: 400,
};

/* ── Tooltips ── */
const tipStyle = {
  borderRadius: 10,
  padding: '12px 16px',
  background: '#1a1d21',
  border: '1px solid #2d3035',
  boxShadow: '0 8px 24px rgba(0,0,0,0.5)',
  minWidth: 180,
};

function BalanceTooltip({ active, payload }) {
  if (!active || !payload?.length) return null;
  const d = payload[0].payload;
  const isPos = d.profit >= 0;
  const isCumPos = d.cumulativePnL >= 0;

  // Format date for tooltip
  let dateDisplay = d.date;
  try {
    const dt = new Date(d.date);
    dateDisplay = dt.toLocaleDateString('en-GB', {
      weekday: 'short', day: '2-digit', month: 'short', year: 'numeric',
    });
  } catch { }

  return (
    <div style={tipStyle}>
      <p style={{ color: '#7a7f8a', fontSize: '0.7rem', letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: 10, fontFamily: 'JetBrains Mono, monospace' }}>
        {dateDisplay}
      </p>
      {/* Cumulative P/L — primary figure */}
      <p style={{ color: isCumPos ? '#4ade80' : '#f43f5e', fontSize: '1rem', fontWeight: 700, marginBottom: 4, letterSpacing: '-0.01em' }}>
        {isCumPos ? '+' : ''}${d.cumulativePnL.toFixed(2)}
      </p>
      <p style={{ color: '#7a7f8a', fontSize: '0.7rem', fontFamily: 'JetBrains Mono, monospace', marginBottom: 6 }}>
        Cumulative P/L
      </p>
      {/* Trade P/L */}
      <p style={{
        color: isPos ? '#4ade80' : '#f43f5e',
        fontSize: '0.8125rem',
        fontFamily: 'JetBrains Mono, monospace',
        marginBottom: d.symbol ? 6 : 0,
        borderTop: '1px solid #2d3035',
        paddingTop: 6,
      }}>
        {isPos ? '▲' : '▼'} {isPos ? '+' : ''}${d.profit.toFixed(2)} this trade
      </p>
      {d.symbol && (
        <p style={{ color: '#7a7f8a', fontSize: '0.75rem', fontFamily: 'JetBrains Mono, monospace' }}>
          {d.symbol} · Trade #{d.index}
        </p>

      )}
    </div>
  );
}

function HourTooltip({ active, payload }) {
  if (!active || !payload?.length) return null;
  const d = payload[0].payload;
  return (
    <div style={tipStyle}>
      <p style={{ color: '#7a7f8a', fontSize: '0.7rem', letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: 8, fontFamily: 'JetBrains Mono, monospace' }}>{d.label}</p>
      <p style={{ color: d.totalPnL >= 0 ? '#4ade80' : '#f43f5e', fontSize: '0.9rem', fontWeight: 600, marginBottom: 6 }}>
        {d.totalPnL >= 0 ? '+' : ''}${d.totalPnL.toFixed(2)}
      </p>
      <p style={{ color: '#7a7f8a', fontSize: '0.75rem', fontFamily: 'JetBrains Mono, monospace' }}>
        {d.count} trades — {d.wins}W / {d.losses}L
      </p>
    </div>
  );
}

function PieTooltip({ active, payload, total }) {
  if (!active || !payload?.length) return null;
  const d = payload[0];
  return (
    <div style={tipStyle}>
      <p style={{ color: '#f0f0ee', fontSize: '0.875rem', fontWeight: 500, marginBottom: 4 }}>{d.name}</p>
      <p style={{ color: '#7a7f8a', fontSize: '0.75rem', fontFamily: 'JetBrains Mono, monospace' }}>
        {d.value} trades ({total > 0 ? ((d.value / total) * 100).toFixed(1) : 0}%)
      </p>
    </div>
  );
}
