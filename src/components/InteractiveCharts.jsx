import {
  AreaChart, Area, BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer,
  CartesianGrid, Cell, PieChart, Pie,
} from 'recharts';
import { TrendingUp, BarChart3, Clock, PieChart as PieIcon } from 'lucide-react';

const C = {
  accent: '#ff7a17',
  violet: '#7c3aed',
  blue:   '#a0c3ec',
  red:    '#f43f5e',
  mute:   '#3a3f47',
};

export default function InteractiveCharts({ metrics, trades }) {
  if (!metrics) return null;

  const equityData = metrics.equityCurve.map((pt, i) => ({ ...pt, index: i + 1, label: `Trade ${i + 1}` }));
  const hourlyData = metrics.hourlyPnL.filter(h => h.count > 0);
  const pieData    = [
    { name: 'Wins',   value: metrics.wins,   color: C.accent },
    { name: 'Losses', value: metrics.losses, color: C.red    },
    ...(metrics.breakeven > 0 ? [{ name: 'Breakeven', value: metrics.breakeven, color: C.mute }] : []),
  ];

  return (
    <div className="stack">

      {/* ── Equity Curve ── */}
      <div className="card">
        <div className="card-header">
          <div className="card-header-icon"><TrendingUp size={14} /></div>
          <span className="card-title">Equity Curve</span>
        </div>
        <div className="card-body" style={{ padding: '20px 8px 16px' }}>
          <ResponsiveContainer width="100%" height={300}>
            <AreaChart data={equityData} margin={{ top: 8, right: 16, left: 0, bottom: 0 }}>
              <defs>
                <linearGradient id="eqGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%"   stopColor={C.violet} stopOpacity={0.2} />
                  <stop offset="100%" stopColor={C.violet} stopOpacity={0}   />
                </linearGradient>
                <linearGradient id="eqStroke" x1="0" y1="0" x2="1" y2="0">
                  <stop offset="0%"   stopColor={C.accent} />
                  <stop offset="50%"  stopColor={C.violet} />
                  <stop offset="100%" stopColor={C.blue}   />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" />
              <XAxis dataKey="index" tick={axisTick} tickLine={false} axisLine={false} />
              <YAxis tick={axisTick} tickLine={false} axisLine={false} tickFormatter={v => `$${v.toFixed(0)}`} />
              <Tooltip content={<EquityTooltip />} />
              <Area type="monotone" dataKey="balance"
                    stroke="url(#eqStroke)" strokeWidth={1.5}
                    fill="url(#eqGrad)" animationDuration={1000} />
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
            <ResponsiveContainer width="100%" height={240}>
              <BarChart data={hourlyData} margin={{ top: 8, right: 16, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" />
                <XAxis dataKey="label" tick={axisTick} tickLine={false} axisLine={false} />
                <YAxis tick={axisTick} tickLine={false} axisLine={false} tickFormatter={v => `$${v}`} />
                <Tooltip content={<HourTooltip />} />
                <Bar dataKey="totalPnL" radius={[3, 3, 0, 0]} animationDuration={1000} maxBarSize={32}>
                  {hourlyData.map((entry, idx) => (
                    <Cell key={idx} fill={entry.totalPnL >= 0 ? C.accent : C.red} fillOpacity={0.85} />
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
              const pct    = maxAbs > 0 ? (Math.abs(asset.totalPnL) / maxAbs) * 100 : 0;
              const isPos  = asset.totalPnL >= 0;
              const wr     = asset.count > 0 ? ((asset.wins / asset.count) * 100).toFixed(0) : 0;

              return (
                <div key={asset.symbol} style={{ display: 'flex', flexDirection: 'column', gap: 8 }} className="asset-row">
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
                      <span style={{ color: 'var(--ink)', fontSize: '0.875rem', minWidth: 60 }}>{asset.symbol}</span>
                      <span className="t-label">{asset.count} trades</span>
                      <span className="t-label">WR: {wr}%</span>
                    </div>
                    <span style={{ fontSize: '0.875rem', color: isPos ? C.accent : C.red }}>
                      {isPos ? '+' : ''}${asset.totalPnL.toFixed(2)}
                    </span>
                  </div>
                  <div style={{ height: 5, borderRadius: 99, background: 'var(--canvas-mid)', overflow: 'hidden' }}>
                    <div style={{
                      height: '100%', borderRadius: 99,
                      background: isPos ? C.accent : C.red,
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
                  background: isPos ? 'rgba(255,122,23,0.04)' : 'rgba(244,63,94,0.04)',
                  textAlign: 'center',
                  transition: 'border-color 0.2s',
                }}>
                  <p className="t-label" style={{ marginBottom: 8 }}>{day.shortName}</p>
                  <p style={{
                    fontSize: '1.25rem', letterSpacing: '-0.02em', lineHeight: 1,
                    color: isPos ? C.accent : C.red, marginBottom: 6,
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
  fill: '#636870',
  fontSize: 10,
  fontFamily: '"JetBrains Mono", ui-monospace, monospace',
};

/* ── Tooltips ── */
const tipStyle = {
  borderRadius: 8,
  padding: '10px 14px',
  background: 'var(--canvas-card)',
  border: '1px solid var(--hairline)',
  boxShadow: '0 4px 12px rgba(0,0,0,0.3)',
};

function EquityTooltip({ active, payload }) {
  if (!active || !payload?.length) return null;
  const d = payload[0].payload;
  return (
    <div style={tipStyle}>
      <p className="t-label" style={{ marginBottom: 6 }}>{d.label}</p>
      <p style={{ color: 'var(--ink)', fontSize: '0.8125rem' }}>Balance: ${d.balance.toFixed(2)}</p>
      <p style={{ color: d.profit >= 0 ? C.accent : C.red, fontSize: '0.8125rem' }}>
        P/L: {d.profit >= 0 ? '+' : ''}${d.profit.toFixed(2)}
      </p>
      {d.symbol && <p className="t-label" style={{ marginTop: 4 }}>{d.symbol}</p>}
    </div>
  );
}

function HourTooltip({ active, payload }) {
  if (!active || !payload?.length) return null;
  const d = payload[0].payload;
  return (
    <div style={tipStyle}>
      <p className="t-label" style={{ marginBottom: 6 }}>{d.label}</p>
      <p style={{ color: d.totalPnL >= 0 ? C.accent : C.red, fontSize: '0.8125rem' }}>
        P/L: ${d.totalPnL.toFixed(2)}
      </p>
      <p className="t-label" style={{ marginTop: 4 }}>{d.count} trades ({d.wins}W / {d.losses}L)</p>
    </div>
  );
}

function PieTooltip({ active, payload, total }) {
  if (!active || !payload?.length) return null;
  const d = payload[0];
  return (
    <div style={tipStyle}>
      <p style={{ color: 'var(--ink)', fontSize: '0.8125rem' }}>{d.name}</p>
      <p className="t-label" style={{ marginTop: 4 }}>
        {d.value} trades ({total > 0 ? ((d.value / total) * 100).toFixed(1) : 0}%)
      </p>
    </div>
  );
}
