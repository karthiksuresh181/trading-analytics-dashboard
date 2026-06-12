import { useState, useMemo } from 'react';
import { ChevronDown, ChevronUp, ChevronLeft, ChevronRight, ClipboardList } from 'lucide-react';
import {
  LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer,
  CartesianGrid, ReferenceLine, Area, AreaChart,
} from 'recharts';

const GREEN = '#10b981';
const RED = '#f43f5e';
const GREEN_DIM = 'rgba(16, 185, 129, 0.12)';
const RED_DIM = 'rgba(244, 63, 94, 0.10)';

function fmtTime(date) {
  if (!date) return '—';
  return date.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
}

function fmtDuration(min) {
  if (!min || min < 0) return '—';
  if (min < 60) return `${Math.round(min)}m`;
  return `${Math.floor(min / 60)}h ${Math.round(min % 60)}m`;
}

function fmtDate(dateKey) {
  if (!dateKey) return '';
  const d = new Date(dateKey);
  return d.toLocaleDateString('en-GB', { weekday: 'long', day: '2-digit', month: 'long', year: 'numeric' });
}

/* Single cumulative P/L line chart for daily trades */
function DailyPnLLine({ trades }) {
  // Build cumulative P/L data starting from 0
  let cum = 0;
  const data = [
    { label: 'Start', cum: 0, pnl: 0 },
    ...trades.map((t, i) => {
      cum += t.profit;
      return {
        label: `#${i + 1}`,
        cum,
        pnl: t.profit,
        symbol: t.symbol,
        type: t.type,
      };
    }),
  ];

  const minVal = Math.min(0, ...data.map(d => d.cum));
  const maxVal = Math.max(0, ...data.map(d => d.cum));
  const isPositiveEnd = data[data.length - 1].cum >= 0;
  const lineColor = isPositiveEnd ? GREEN : RED;

  return (
    <ResponsiveContainer width="100%" height={80}>
      <AreaChart data={data} margin={{ top: 4, right: 8, left: 0, bottom: 0 }}>
        <defs>
          <linearGradient id={`dlg-${isPositiveEnd}`} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={lineColor} stopOpacity={0.18} />
            <stop offset="100%" stopColor={lineColor} stopOpacity={0.02} />
          </linearGradient>
        </defs>
        <CartesianGrid strokeDasharray="2 3" stroke="rgba(255,255,255,0.04)" />
        <XAxis
          dataKey="label"
          tick={{ fill: '#9ca3af', fontSize: 9, fontFamily: 'JetBrains Mono, monospace' }}
          tickLine={false} axisLine={false}
          interval={Math.max(0, Math.floor(data.length / 6) - 1)}
        />
        <YAxis hide domain={[minVal * 1.15, maxVal * 1.15]} />
        <ReferenceLine y={0} stroke="rgba(255,255,255,0.15)" strokeDasharray="3 3" />
        <Tooltip
          content={({ active, payload }) => {
            if (!active || !payload?.length) return null;
            const d = payload[0].payload;
            if (d.label === 'Start') return null;
            const pos = d.pnl >= 0;
            return (
              <div style={{
                background: '#1a1d21', border: '1px solid #2d3035',
                borderRadius: 8, padding: '8px 12px', minWidth: 130,
              }}>
                <p style={{ color: '#7a7f8a', fontSize: '0.7rem', fontFamily: 'JetBrains Mono, monospace', marginBottom: 4 }}>
                  {d.label} {d.symbol ? `· ${d.symbol}` : ''}
                </p>
                <p style={{ color: pos ? GREEN : RED, fontSize: '0.8125rem', fontWeight: 700, fontFamily: 'JetBrains Mono, monospace' }}>
                  {d.cum >= 0 ? '+' : ''}${d.cum.toFixed(2)} cum.
                </p>
                <p style={{ color: pos ? GREEN : RED, fontSize: '0.75rem', fontFamily: 'JetBrains Mono, monospace' }}>
                  {pos ? '▲' : '▼'} {pos ? '+' : ''}${d.pnl.toFixed(2)} this trade
                </p>
              </div>
            );
          }}
        />
        <Area
          type="monotone"
          dataKey="cum"
          stroke={lineColor}
          strokeWidth={2}
          fill={`url(#dlg-${isPositiveEnd})`}
          dot={false}
          activeDot={{ r: 4, fill: lineColor, strokeWidth: 0 }}
          animationDuration={600}
        />
      </AreaChart>
    </ResponsiveContainer>
  );
}

/* Single day card */
function DayCard({ dateKey, trades }) {
  const [expanded, setExpanded] = useState(true);

  const dayPnL = trades.reduce((s, t) => s + t.profit, 0);
  const wins = trades.filter(t => t.profit > 0).length;
  const losses = trades.filter(t => t.profit < 0).length;
  const isPos = dayPnL >= 0;

  return (
    <div className="card" style={{ overflow: 'visible' }}>
      {/* Day Header */}
      <div
        onClick={() => setExpanded(e => !e)}
        style={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          padding: '14px 20px',
          cursor: 'pointer',
          borderBottom: expanded ? '1px solid var(--hairline-soft)' : 'none',
          transition: 'background 0.15s',
          userSelect: 'none',
        }}
        onMouseEnter={e => e.currentTarget.style.background = 'rgba(255,255,255,0.02)'}
        onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
          <div style={{
            width: 4, height: 36, borderRadius: 99,
            background: isPos ? GREEN : RED, flexShrink: 0,
          }} />
          <div>
            <p style={{ color: 'var(--ink)', fontSize: '0.9375rem', fontWeight: 600, marginBottom: 2 }}>
              {fmtDate(dateKey)}
            </p>
            <div style={{ display: 'flex', align: 'center', gap: 12, flexWrap: 'wrap' }}>
              <span className="t-label">{trades.length} trade{trades.length !== 1 ? 's' : ''}</span>
              <span className="t-label" style={{ color: GREEN }}>↑ {wins}W</span>
              <span className="t-label" style={{ color: RED }}>↓ {losses}L</span>
            </div>
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
          <span style={{
            fontSize: '1.25rem', fontWeight: 700, letterSpacing: '-0.02em',
            color: isPos ? GREEN : RED,
          }}>
            {isPos ? '+' : ''}${dayPnL.toFixed(2)}
          </span>
          {expanded ? <ChevronUp size={16} style={{ color: 'var(--ink-mute)' }} /> : <ChevronDown size={16} style={{ color: 'var(--ink-mute)' }} />}
        </div>
      </div>

      {expanded && (
        <div style={{ display: 'flex', minHeight: 0 }}>

          {/* ── Left: Intraday chart ── */}
          <div style={{
            width: 220, flexShrink: 0,
            borderRight: '1px solid var(--hairline-soft)',
            display: 'flex', flexDirection: 'column',
            padding: '14px 12px 12px',
            gap: 6,
          }}>
            <p className="t-label" style={{ marginBottom: 2 }}>Intraday P/L</p>
            <div style={{ flex: 1, minHeight: 80 }}>
              <DailyPnLLine trades={trades} />
            </div>
            {/* Mini stats below the chart */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6, paddingTop: 4, borderTop: '1px solid var(--hairline-soft)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span className="t-label">Avg P/L</span>
                <span style={{ fontSize: '0.8rem', fontWeight: 600, color: isPos ? GREEN : RED, fontFamily: 'JetBrains Mono, monospace' }}>
                  {trades.length > 0 ? `${isPos ? '+' : ''}$${(dayPnL / trades.length).toFixed(2)}` : '—'}
                </span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span className="t-label">Best</span>
                <span style={{ fontSize: '0.8rem', fontWeight: 600, color: GREEN, fontFamily: 'JetBrains Mono, monospace' }}>
                  +${Math.max(...trades.map(t => t.profit)).toFixed(2)}
                </span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span className="t-label">Worst</span>
                <span style={{ fontSize: '0.8rem', fontWeight: 600, color: RED, fontFamily: 'JetBrains Mono, monospace' }}>
                  ${Math.min(...trades.map(t => t.profit)).toFixed(2)}
                </span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span className="t-label">Win Rate</span>
                <span style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--ink)', fontFamily: 'JetBrains Mono, monospace' }}>
                  {trades.length > 0 ? ((wins / trades.length) * 100).toFixed(0) : 0}%
                </span>
              </div>
            </div>
          </div>

          {/* ── Right: Trade table ── */}
          <div style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column' }}>
            {/* Table header */}
            <div style={{
              display: 'grid',
              gridTemplateColumns: '70px 1fr 60px 72px 100px 100px 90px',
              padding: '8px 16px',
              borderBottom: '1px solid var(--hairline-soft)',
            }}>
              {['Time', 'Symbol', 'Type', 'Vol', 'Open', 'Close', 'P/L'].map(h => (
                <span key={h} className="t-label">{h}</span>
              ))}
            </div>

            {/* Trade rows */}
            <div style={{ flex: 1, overflowY: 'auto', maxHeight: 320 }}>
              {trades.map((t, i) => {
                const isWin = t.profit >= 0;
                return (
                  <div key={t.id || i} style={{
                    display: 'grid',
                    gridTemplateColumns: '70px 1fr 60px 72px 100px 100px 90px',
                    alignItems: 'center',
                    padding: '9px 16px',
                    borderBottom: i < trades.length - 1 ? '1px solid var(--hairline-soft)' : 'none',
                    transition: 'background 0.12s',
                    background: 'transparent',
                  }}
                    onMouseEnter={e => e.currentTarget.style.background = 'rgba(255,255,255,0.02)'}
                    onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                  >
                    <span style={{ color: 'var(--ink-dim)', fontSize: '0.8rem', fontFamily: 'JetBrains Mono, monospace' }}>
                      {fmtTime(t.closeTime || t.openTime)}
                    </span>
                    <span style={{ color: 'var(--ink)', fontSize: '0.875rem', fontWeight: 600 }}>
                      {t.symbol}
                    </span>
                    <span>
                      <span className={t.type === 'buy' ? 'badge badge-buy' : 'badge badge-sell'}>
                        {t.type}
                      </span>
                    </span>
                    <span style={{ color: 'var(--ink-dim)', fontSize: '0.8125rem', fontFamily: 'JetBrains Mono, monospace' }}>
                      {t.volume}
                    </span>
                    <span style={{ color: 'var(--ink-dim)', fontSize: '0.8125rem', fontFamily: 'JetBrains Mono, monospace' }}>
                      {t.openPrice?.toFixed(5) ?? '—'}
                    </span>
                    <span style={{ color: 'var(--ink-dim)', fontSize: '0.8125rem', fontFamily: 'JetBrains Mono, monospace' }}>
                      {t.closePrice?.toFixed(5) ?? '—'}
                    </span>
                    <span style={{
                      fontSize: '0.875rem', fontWeight: 700,
                      fontFamily: 'JetBrains Mono, monospace',
                      color: isWin ? GREEN : RED,
                    }}>
                      {isWin ? '+' : ''}${t.profit.toFixed(2)}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

      )}
    </div>
  );
}

export default function TradeHistory({ trades }) {
  // Group trades by date key
  const grouped = useMemo(() => {
    if (!trades || trades.length === 0) return [];
    const map = {};
    for (const t of trades) {
      const key = t.dateKey || (t.openTime ? t.openTime.toISOString().slice(0, 10) : 'unknown');
      if (!map[key]) map[key] = [];
      map[key].push(t);
    }
    // Sort newest first
    return Object.entries(map)
      .sort(([a], [b]) => b.localeCompare(a))
      .map(([date, tds]) => ({ date, trades: tds }));
  }, [trades]);

  // Months for navigation
  const months = useMemo(() => {
    const set = new Set(grouped.map(g => g.date.slice(0, 7)));
    return Array.from(set).sort().reverse();
  }, [grouped]);

  const [monthIdx, setMonthIdx] = useState(0);

  if (!trades || trades.length === 0) return null;

  const currentMonth = months[monthIdx] || months[0];
  const [yr, mo] = currentMonth.split('-').map(Number);
  const monthLabel = new Date(yr, mo - 1, 1).toLocaleDateString('en-GB', { month: 'long', year: 'numeric' });

  const filteredGroups = grouped.filter(g => g.date.startsWith(currentMonth));
  const monthPnL = filteredGroups.reduce((s, g) => s + g.trades.reduce((ss, t) => ss + t.profit, 0), 0);
  const monthTrades = filteredGroups.reduce((s, g) => s + g.trades.length, 0);

  return (
    <div className="stack">
      {/* Header card */}
      <div className="card">
        <div className="card-header" style={{ justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <div className="card-header-icon"><ClipboardList size={14} /></div>
            <span className="card-title">Trade History</span>
          </div>
          {/* Month navigator */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <button
              onClick={() => setMonthIdx(Math.min(months.length - 1, monthIdx + 1))}
              disabled={monthIdx >= months.length - 1}
              className="btn-icon"
            >
              <ChevronLeft size={14} />
            </button>
            <span style={{
              fontFamily: '"JetBrains Mono", ui-monospace, monospace',
              fontSize: '0.8125rem', color: 'var(--ink)', minWidth: 140,
              textAlign: 'center', fontWeight: 500,
            }}>
              {monthLabel}
            </span>
            <button
              onClick={() => setMonthIdx(Math.max(0, monthIdx - 1))}
              disabled={monthIdx <= 0}
              className="btn-icon"
            >
              <ChevronRight size={14} />
            </button>
          </div>
        </div>

        {/* Month summary */}
        <div className="card-body" style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12, padding: '16px 20px' }}>
          <SummaryChip label="Month P/L" value={`${monthPnL >= 0 ? '+' : ''}$${monthPnL.toFixed(2)}`} color={monthPnL >= 0 ? GREEN : RED} />
          <SummaryChip label="Total Trades" value={monthTrades} color="var(--ink)" />
          <SummaryChip label="Trading Days" value={filteredGroups.length} color="var(--ink-dim)" />
        </div>
      </div>

      {/* Day cards */}
      {filteredGroups.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '48px 0', color: 'var(--ink-mute)' }}>
          <ClipboardList size={32} style={{ margin: '0 auto 12px', opacity: 0.3 }} />
          <p className="t-label">No trades in this period</p>
        </div>
      ) : (
        filteredGroups.map(({ date, trades: dayTrades }) => (
          <DayCard key={date} dateKey={date} trades={dayTrades} />
        ))
      )}
    </div>
  );
}

function SummaryChip({ label, value, color }) {
  return (
    <div style={{
      padding: '14px 16px', borderRadius: 'var(--radius-sm)',
      background: 'var(--canvas-mid)', border: '1px solid var(--hairline)',
    }}>
      <p className="t-label" style={{ marginBottom: 6 }}>{label}</p>
      <p style={{ fontSize: '1.25rem', fontWeight: 700, letterSpacing: '-0.02em', color }}>{value}</p>
    </div>
  );
}
