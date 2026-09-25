import { useState, useMemo } from 'react';
import { ChevronDown, ChevronUp, ChevronLeft, ChevronRight, ClipboardList } from 'lucide-react';
import {
  XAxis, YAxis, Tooltip, ResponsiveContainer,
  CartesianGrid, ReferenceLine, Area, AreaChart,
} from 'recharts';

const GREEN = '#34D399';
const RED = '#FB7185';
const GRID = 'rgba(148, 163, 184, 0.08)';

function fmtTime(date) {
  if (!date) return '—';
  return date.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
}

function fmtDate(dateKey) {
  if (!dateKey) return '';
  const d = new Date(dateKey);
  return d.toLocaleDateString('en-GB', { weekday: 'long', day: '2-digit', month: 'long', year: 'numeric' });
}

/* Single cumulative P/L area chart for daily trades */
function DailyPnLLine({ trades }) {
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
    <ResponsiveContainer width="100%" height={85}>
      <AreaChart data={data} margin={{ top: 6, right: 8, left: 2, bottom: 2 }}>
        <defs>
          <linearGradient id={`dlgDark-${isPositiveEnd}`} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={lineColor} stopOpacity={0.16} />
            <stop offset="100%" stopColor={lineColor} stopOpacity={0.01} />
          </linearGradient>
        </defs>
        <CartesianGrid strokeDasharray="2 3" stroke={GRID} vertical={false} />
        <XAxis
          dataKey="label"
          tick={{ fill: '#94A3B8', fontSize: 10, fontFamily: 'var(--font-mono)' }}
          tickLine={false} axisLine={{ stroke: GRID }}
          interval={Math.max(0, Math.floor(data.length / 5) - 1)}
        />
        <YAxis hide domain={[minVal * 1.15, maxVal * 1.15]} />
        <ReferenceLine y={0} stroke="rgba(148, 163, 184, 0.2)" strokeDasharray="3 3" />
        <Tooltip
          content={({ active, payload }) => {
            if (!active || !payload?.length) return null;
            const d = payload[0].payload;
            if (d.label === 'Start') return null;
            const pos = d.pnl >= 0;
            return (
              <div style={{
                background: '#161E2C', border: '1px solid rgba(148, 163, 184, 0.22)',
                borderRadius: 8, padding: '8px 12px', minWidth: 140,
                boxShadow: '0 8px 20px rgba(0, 0, 0, 0.5)',
              }}>
                <p style={{ color: 'var(--text-muted)', fontSize: '0.75rem', fontFamily: 'var(--font-mono)', marginBottom: 4 }}>
                  {d.label} {d.symbol ? `· ${d.symbol}` : ''}
                </p>
                <p style={{ color: d.cum >= 0 ? GREEN : RED, fontSize: '0.875rem', fontWeight: 700, fontFamily: 'var(--font-mono)' }}>
                  {d.cum >= 0 ? '+' : ''}${d.cum.toFixed(2)} cum.
                </p>
                <p style={{ color: pos ? GREEN : RED, fontSize: '0.75rem', fontFamily: 'var(--font-mono)' }}>
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
          fill={`url(#dlgDark-${isPositiveEnd})`}
          dot={false}
          activeDot={{ r: 4, fill: lineColor, stroke: '#0B0F17', strokeWidth: 2 }}
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
          borderBottom: expanded ? '1px solid var(--border-default)' : 'none',
          transition: 'background 0.15s',
          userSelect: 'none',
          background: 'var(--bg-surface)',
        }}
        onMouseEnter={e => e.currentTarget.style.background = 'var(--bg-hover)'}
        onMouseLeave={e => e.currentTarget.style.background = 'var(--bg-surface)'}
        role="button"
        tabIndex={0}
        onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') setExpanded(prev => !prev); }}
        aria-expanded={expanded}
        aria-label={`Toggle trade history for ${fmtDate(dateKey)}`}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
          <div style={{
            width: 4, height: 36, borderRadius: 'var(--radius-full)',
            background: isPos ? GREEN : RED, flexShrink: 0,
          }} />
          <div>
            <p style={{ color: 'var(--text-primary)', fontSize: '0.9375rem', fontWeight: 600, marginBottom: 2 }}>
              {fmtDate(dateKey)}
            </p>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
              <span className="t-label">{trades.length} trade{trades.length !== 1 ? 's' : ''}</span>
              <span style={{ color: 'var(--border-strong)' }}>•</span>
              <span style={{ color: GREEN, fontSize: '0.75rem', fontWeight: 600 }}>↑ {wins} Won</span>
              <span style={{ color: RED, fontSize: '0.75rem', fontWeight: 600 }}>↓ {losses} Lost</span>
            </div>
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
          <span style={{
            fontFamily: 'var(--font-mono)',
            fontSize: '1.25rem', fontWeight: 700, letterSpacing: '-0.02em',
            fontVariantNumeric: 'tabular-nums',
            color: isPos ? GREEN : RED,
          }}>
            {isPos ? '+' : ''}${dayPnL.toFixed(2)}
          </span>
          {expanded ? <ChevronUp size={18} style={{ color: 'var(--text-muted)' }} /> : <ChevronDown size={18} style={{ color: 'var(--text-muted)' }} />}
        </div>
      </div>

      {expanded && (
        <div style={{ display: 'flex', minHeight: 0, flexDirection: 'row' }} className="day-card-body">
          <style>{`
            @media (max-width: 860px) {
              .day-card-body { flex-direction: column !important; }
              .day-card-chart { width: 100% !important; border-right: none !important; border-bottom: 1px solid var(--border-default) !important; }
            }
          `}</style>

          {/* ── Left: Intraday chart ── */}
          <div style={{
            width: 240, flexShrink: 0,
            borderRight: '1px solid var(--border-default)',
            display: 'flex', flexDirection: 'column',
            padding: '14px 14px 12px',
            gap: 8,
            background: 'var(--bg-surface-soft)',
          }} className="day-card-chart">
            <p className="t-label" style={{ fontWeight: 600 }}>Intraday Trajectory</p>
            <div style={{ flex: 1, minHeight: 85 }}>
              <DailyPnLLine trades={trades} />
            </div>
            {/* Mini stats below chart */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6, paddingTop: 8, borderTop: '1px solid var(--border-default)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span className="t-label">Avg P/L:</span>
                <span style={{ fontSize: '0.8125rem', fontWeight: 600, color: isPos ? GREEN : RED, fontFamily: 'var(--font-mono)' }}>
                  {trades.length > 0 ? `${isPos ? '+' : ''}$${(dayPnL / trades.length).toFixed(2)}` : '—'}
                </span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span className="t-label">Best Trade:</span>
                <span style={{ fontSize: '0.8125rem', fontWeight: 600, color: GREEN, fontFamily: 'var(--font-mono)' }}>
                  +${Math.max(...trades.map(t => t.profit)).toFixed(2)}
                </span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span className="t-label">Worst Trade:</span>
                <span style={{ fontSize: '0.8125rem', fontWeight: 600, color: RED, fontFamily: 'var(--font-mono)' }}>
                  ${Math.min(...trades.map(t => t.profit)).toFixed(2)}
                </span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span className="t-label">Win Rate:</span>
                <span style={{ fontSize: '0.8125rem', fontWeight: 600, color: 'var(--text-primary)', fontFamily: 'var(--font-mono)' }}>
                  {trades.length > 0 ? ((wins / trades.length) * 100).toFixed(0) : 0}%
                </span>
              </div>
            </div>
          </div>

          {/* ── Right: Trade table ── */}
          <div style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', overflowX: 'auto' }}>
            <div style={{ minWidth: 580 }}>
              {/* Table header */}
              <div style={{
                display: 'grid',
                gridTemplateColumns: '76px 1fr 64px 68px 94px 94px 90px',
                padding: '9px 16px',
                borderBottom: '1px solid var(--border-default)',
                background: 'var(--bg-surface-soft)',
              }}>
                <span className="t-label">Time</span>
                <span className="t-label">Symbol</span>
                <span className="t-label">Type</span>
                <span className="t-label" style={{ textAlign: 'right' }}>Volume</span>
                <span className="t-label" style={{ textAlign: 'right' }}>Open</span>
                <span className="t-label" style={{ textAlign: 'right' }}>Close</span>
                <span className="t-label" style={{ textAlign: 'right' }}>Profit</span>
              </div>

              {/* Trade rows */}
              <div style={{ maxHeight: 320, overflowY: 'auto' }}>
                {trades.map((t, i) => {
                  const isWin = t.profit >= 0;
                  return (
                    <div key={t.id || i} style={{
                      display: 'grid',
                      gridTemplateColumns: '76px 1fr 64px 68px 94px 94px 90px',
                      alignItems: 'center',
                      padding: '10px 16px',
                      borderBottom: i < trades.length - 1 ? '1px solid var(--border-default)' : 'none',
                      transition: 'background 0.12s',
                    }}
                      onMouseEnter={e => e.currentTarget.style.background = 'var(--bg-hover)'}
                      onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                    >
                      <span style={{ color: 'var(--text-muted)', fontSize: '0.8125rem', fontFamily: 'var(--font-mono)' }}>
                        {fmtTime(t.closeTime || t.openTime)}
                      </span>
                      <span style={{ color: 'var(--text-primary)', fontSize: '0.875rem', fontWeight: 600 }}>
                        {t.symbol}
                      </span>
                      <span>
                        <span className={t.type === 'buy' ? 'badge badge-buy' : 'badge badge-sell'}>
                          {t.type}
                        </span>
                      </span>
                      <span style={{ color: 'var(--text-secondary)', fontSize: '0.8125rem', fontFamily: 'var(--font-mono)', textAlign: 'right' }}>
                        {t.volume}
                      </span>
                      <span style={{ color: 'var(--text-secondary)', fontSize: '0.8125rem', fontFamily: 'var(--font-mono)', textAlign: 'right' }}>
                        {t.openPrice?.toFixed(5) ?? '—'}
                      </span>
                      <span style={{ color: 'var(--text-secondary)', fontSize: '0.8125rem', fontFamily: 'var(--font-mono)', textAlign: 'right' }}>
                        {t.closePrice?.toFixed(5) ?? '—'}
                      </span>
                      <span style={{
                        fontSize: '0.875rem',
                        fontWeight: 700,
                        fontFamily: 'var(--font-mono)',
                        fontVariantNumeric: 'tabular-nums',
                        textAlign: 'right',
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
    return Object.entries(map)
      .sort(([a], [b]) => b.localeCompare(a))
      .map(([date, tds]) => ({ date, trades: tds }));
  }, [trades]);

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
      {/* Header card with month navigator */}
      <div className="card">
        <div className="card-header" style={{ justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div className="card-header-icon"><ClipboardList size={15} /></div>
            <span className="card-title">Trade History Journal</span>
          </div>
          {/* Month navigator */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <button
              onClick={() => setMonthIdx(Math.min(months.length - 1, monthIdx + 1))}
              disabled={monthIdx >= months.length - 1}
              className="btn-icon"
              aria-label="Previous month"
            >
              <ChevronLeft size={15} />
            </button>
            <span style={{
              fontFamily: 'var(--font-sans)',
              fontSize: '0.875rem', color: 'var(--text-primary)', minWidth: 140,
              textAlign: 'center', fontWeight: 600,
            }}>
              {monthLabel}
            </span>
            <button
              onClick={() => setMonthIdx(Math.max(0, monthIdx - 1))}
              disabled={monthIdx <= 0}
              className="btn-icon"
              aria-label="Next month"
            >
              <ChevronRight size={15} />
            </button>
          </div>
        </div>

        {/* Month summary chips */}
        <div className="card-body" style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 14, padding: '16px 20px' }}>
          <SummaryChip
            label="Month Net P/L"
            value={`${monthPnL >= 0 ? '+' : ''}$${monthPnL.toFixed(2)}`}
            color={monthPnL >= 0 ? GREEN : RED}
          />
          <SummaryChip
            label="Total Executions"
            value={monthTrades}
            color="var(--text-primary)"
          />
          <SummaryChip
            label="Active Trading Days"
            value={filteredGroups.length}
            color="var(--text-primary)"
          />
        </div>
      </div>

      {/* Day cards */}
      {filteredGroups.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '48px 0', color: 'var(--text-muted)' }}>
          <ClipboardList size={36} style={{ margin: '0 auto 12px', opacity: 0.35 }} />
          <p style={{ fontSize: '0.875rem', fontWeight: 500 }}>No trade executions recorded for this period</p>
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
      background: 'var(--bg-surface-soft)', border: '1px solid var(--border-default)',
    }}>
      <p className="t-label" style={{ marginBottom: 6 }}>{label}</p>
      <p style={{
        fontSize: '1.35rem', fontWeight: 700, letterSpacing: '-0.02em',
        fontFamily: 'var(--font-mono)', fontVariantNumeric: 'tabular-nums',
        color
      }}>
        {value}
      </p>
    </div>
  );
}
