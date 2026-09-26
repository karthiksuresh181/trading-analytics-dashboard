import { useMemo } from 'react';
import {
  AreaChart, Area, BarChart, Bar, LineChart, Line, XAxis, YAxis,
  Tooltip, ResponsiveContainer, CartesianGrid, Cell, ReferenceLine, Legend
} from 'recharts';
import { TrendingUp, Calendar, BarChart3, LineChart as LineIcon, AlertTriangle } from 'lucide-react';
import { formatCurrency } from '../utils/portfolioEngine';

/* Institutional Dark Theme Chart Palette */
const C = {
  primary:       '#38BDF8', // Cyan/Sky
  positive:      '#34D399', // Emerald
  negative:      '#FB7185', // Rose
  neutral:       '#94A3B8', // Slate
  grid:          'rgba(148, 163, 184, 0.08)',
  tick:          '#94A3B8',
  tooltipBg:     '#161E2C',
  tooltipBorder: 'rgba(148, 163, 184, 0.18)',
  colors:        ['#38BDF8', '#34D399', '#818CF8', '#FBBF24', '#F472B6', '#38E2B8', '#A78BFA'],
};

const axisTick = {
  fill: C.tick,
  fontSize: 11,
  fontFamily: 'var(--font-mono)',
};

const tipStyle = {
  background: C.tooltipBg,
  border: `1px solid ${C.tooltipBorder}`,
  borderRadius: 8,
  padding: '10px 14px',
  boxShadow: '0 8px 24px rgba(0,0,0,0.5)',
  fontFamily: 'var(--font-sans)',
};

function fmtDate(str) {
  if (!str) return '';
  const d = new Date(str);
  if (isNaN(d.getTime())) return str;
  return d.toLocaleDateString('en-GB', { day: '2-digit', month: 'short' });
}

export default function PortfolioCharts({ portfolioData }) {
  if (!portfolioData || !portfolioData.metrics) return null;

  const { timeline, dailyPnL, monthlyPnL, contribution, normalizedComparison, compatibility } = portfolioData;
  const isEligible = compatibility.monetaryAggregationEligible;
  const curr = compatibility.currency || null;

  // Prepare normalized comparison data combined by timestamp/date for Recharts multi-line
  const combinedNormalizedData = useMemo(() => {
    if (!normalizedComparison || !normalizedComparison.series || normalizedComparison.series.length === 0) {
      return [];
    }

    // Collect all unique dates across series
    const dateMap = new Map();
    normalizedComparison.series.forEach((s) => {
      s.points.forEach((pt) => {
        if (!dateMap.has(pt.date)) {
          dateMap.set(pt.date, { date: pt.date, timestamp: pt.timestamp });
        }
      });
    });

    const sortedDates = Array.from(dateMap.values()).sort((a, b) => a.timestamp - b.timestamp);

    // Keep running last index for each series to produce smooth continuous lines
    const lastIndex = {};
    normalizedComparison.series.forEach(s => { lastIndex[s.accountId] = 100; });

    return sortedDates.map(d => {
      const row = { date: d.date, dateLabel: fmtDate(d.date) };
      normalizedComparison.series.forEach(s => {
        const found = s.points.filter(p => p.date === d.date);
        if (found.length > 0) {
          const lastPoint = found[found.length - 1];
          lastIndex[s.accountId] = lastPoint.index;
        }
        row[s.accountId] = lastIndex[s.accountId];
      });
      return row;
    });
  }, [normalizedComparison]);

  return (
    <div className="stack-lg fade-up" id="portfolio-charts-container">

      {/* Mixed Currency Notification if monetary charts are disabled */}
      {!isEligible && (
        <div className="portfolio-alert-card">
          <div className="portfolio-alert-header">
            <div className="row" style={{ gap: 8, alignItems: 'center' }}>
              <AlertTriangle size={16} className="text-warning" />
              <span className="font-semibold text-sm">Monetary Aggregation Unavailable for Charts</span>
            </div>
          </div>
          <p className="portfolio-alert-msg">
            {compatibility.currencyIssues && compatibility.currencyIssues.length > 0
              ? compatibility.currencyIssues.join(' ')
              : 'Currency could not be authoritatively verified across reports.'} Absolute monetary P/L charts (Cumulative Net P/L, Daily Net P/L, Monthly Net P/L) cannot be mathematically aggregated without verified currency. Normalized account comparisons remain available below where balance bases are valid.
          </p>
        </div>
      )}

      {/* ── Chart A: Cumulative Portfolio Net P/L Curve (Req #39A & #11) ── */}
      {isEligible && timeline.length > 0 && (
        <div className="card" id="chart-cumulative-net-pnl">
          <div className="card-header" style={{ justifyContent: 'space-between', flexWrap: 'wrap', gap: 8 }}>
            <div className="row" style={{ gap: 10, alignItems: 'center' }}>
              <div className="card-header-icon"><TrendingUp size={15} /></div>
              <div>
                <span className="card-title">Cumulative Portfolio Net P/L</span>
                <p className="card-subtitle">
                  Chronological event curve of all canonical closed trades across eligible accounts
                </p>
              </div>
            </div>
            <div className="row" style={{ gap: 8, alignItems: 'center' }}>
              <span className="t-label">Net Realized P/L:</span>
              <span className={`font-mono font-bold text-sm ${portfolioData.metrics.netPnL >= 0 ? 'text-positive' : 'text-negative'}`}>
                {formatCurrency(portfolioData.metrics.netPnL, curr, { showSign: true })}
              </span>
            </div>
          </div>
          <div className="card-body" style={{ padding: '20px 12px 14px' }}>
            <ResponsiveContainer width="100%" height={320}>
              <AreaChart data={timeline} margin={{ top: 10, right: 20, left: 10, bottom: 4 }}>
                <defs>
                  <linearGradient id="portCumGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor={C.primary} stopOpacity={0.2} />
                    <stop offset="100%" stopColor={C.primary} stopOpacity={0.01} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke={C.grid} />
                <XAxis
                  dataKey="dailyDate"
                  tick={axisTick}
                  tickFormatter={fmtDate}
                  minTickGap={40}
                />
                <YAxis
                  tick={axisTick}
                  tickFormatter={v => formatCurrency(v, curr, { minimumFractionDigits: 0, maximumFractionDigits: 0 })}
                  domain={['auto', 'auto']}
                />
                <ReferenceLine y={0} stroke="rgba(148, 163, 184, 0.25)" strokeDasharray="3 3" />
                <Tooltip
                  content={({ active, payload }) => {
                    if (!active || !payload?.length) return null;
                    const d = payload[0].payload;
                    const isPos = d.cumulativeNetPnL >= 0;
                    const tradePos = d.tradeNetPnL >= 0;
                    return (
                      <div style={tipStyle}>
                        <div style={{ color: 'var(--text-muted)', fontSize: '0.75rem', marginBottom: 4 }}>
                          {d.dailyDate} · Account: {d.accountId} {d.symbol && `· ${d.symbol}`}
                        </div>
                        <div style={{
                          color: isPos ? C.positive : C.negative,
                          fontSize: '1.125rem',
                          fontWeight: 700,
                          fontFamily: 'var(--font-mono)',
                          marginBottom: 4,
                        }}>
                          {formatCurrency(d.cumulativeNetPnL, curr, { showSign: true })}
                        </div>
                        <div style={{ color: 'var(--text-secondary)', fontSize: '0.75rem' }}>
                          This Trade Net: <strong style={{ color: tradePos ? C.positive : C.negative }}>{formatCurrency(d.tradeNetPnL, curr, { showSign: true })}</strong>
                        </div>
                      </div>
                    );
                  }}
                />
                <Area
                  type="monotone"
                  dataKey="cumulativeNetPnL"
                  stroke={C.primary}
                  strokeWidth={2}
                  fill="url(#portCumGrad)"
                  name="Cumulative Net P/L"
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}

      {/* ── Chart B & C: Daily and Monthly Net P/L (Req #39B, 39C & #11) ── */}
      {isEligible && (
        <div className="grid-2">

          {/* Daily Net P/L Bar Chart */}
          <div className="card" id="chart-daily-net-pnl">
            <div className="card-header" style={{ justifyContent: 'space-between' }}>
              <div className="row" style={{ gap: 8, alignItems: 'center' }}>
                <div className="card-header-icon"><Calendar size={15} /></div>
                <div>
                  <span className="card-title">Daily Portfolio Net P/L</span>
                  <p className="card-subtitle">Realized daily net P/L after costs</p>
                </div>
              </div>
            </div>
            <div className="card-body" style={{ padding: '16px 10px 10px' }}>
              <ResponsiveContainer width="100%" height={260}>
                <BarChart data={dailyPnL} margin={{ top: 10, right: 10, left: 0, bottom: 4 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke={C.grid} />
                  <XAxis dataKey="date" tick={axisTick} tickFormatter={fmtDate} minTickGap={30} />
                  <YAxis tick={axisTick} tickFormatter={v => formatCurrency(v, curr, { minimumFractionDigits: 0, maximumFractionDigits: 0 })} />
                  <ReferenceLine y={0} stroke="rgba(148, 163, 184, 0.2)" />
                  <Tooltip
                    content={({ active, payload }) => {
                      if (!active || !payload?.length) return null;
                      const d = payload[0].payload;
                      const isPos = d.netPnL >= 0;
                      return (
                        <div style={tipStyle}>
                          <div style={{ color: 'var(--text-muted)', fontSize: '0.75rem', marginBottom: 4 }}>
                            {d.date} ({d.tradeCount} trade{d.tradeCount > 1 ? 's' : ''})
                          </div>
                          <div style={{
                            color: isPos ? C.positive : C.negative,
                            fontSize: '1rem',
                            fontWeight: 700,
                            fontFamily: 'var(--font-mono)',
                            marginBottom: 4,
                          }}>
                            {formatCurrency(d.netPnL, curr, { showSign: true })}
                          </div>
                          <div style={{ color: 'var(--text-secondary)', fontSize: '0.6875rem' }}>
                            Trading P/L: {formatCurrency(d.tradingPnL, curr, { showSign: true })} • Costs: {formatCurrency(d.commission + d.swap, curr)}
                          </div>
                        </div>
                      );
                    }}
                  />
                  <Bar dataKey="netPnL" radius={[2, 2, 0, 0]}>
                    {dailyPnL.map((entry, idx) => (
                      <Cell key={`cell-day-${idx}`} fill={entry.netPnL >= 0 ? C.positive : C.negative} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Monthly Net P/L Bar Chart */}
          <div className="card" id="chart-monthly-net-pnl">
            <div className="card-header" style={{ justifyContent: 'space-between' }}>
              <div className="row" style={{ gap: 8, alignItems: 'center' }}>
                <div className="card-header-icon"><BarChart3 size={15} /></div>
                <div>
                  <span className="card-title">Monthly Portfolio Net P/L</span>
                  <p className="card-subtitle">Aggregated calendar monthly returns</p>
                </div>
              </div>
            </div>
            <div className="card-body" style={{ padding: '16px 10px 10px' }}>
              <ResponsiveContainer width="100%" height={260}>
                <BarChart data={monthlyPnL} margin={{ top: 10, right: 10, left: 0, bottom: 4 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke={C.grid} />
                  <XAxis dataKey="month" tick={axisTick} />
                  <YAxis tick={axisTick} tickFormatter={v => formatCurrency(v, curr, { minimumFractionDigits: 0, maximumFractionDigits: 0 })} />
                  <ReferenceLine y={0} stroke="rgba(148, 163, 184, 0.2)" />
                  <Tooltip
                    content={({ active, payload }) => {
                      if (!active || !payload?.length) return null;
                      const d = payload[0].payload;
                      const isPos = d.netPnL >= 0;
                      return (
                        <div style={tipStyle}>
                          <div style={{ color: 'var(--text-muted)', fontSize: '0.75rem', marginBottom: 4 }}>
                            {d.month} · {d.tradeCount} trades
                          </div>
                          <div style={{
                            color: isPos ? C.positive : C.negative,
                            fontSize: '1rem',
                            fontWeight: 700,
                            fontFamily: 'var(--font-mono)',
                            marginBottom: 4,
                          }}>
                            {formatCurrency(d.netPnL, curr, { showSign: true })}
                          </div>
                          <div style={{ color: 'var(--text-secondary)', fontSize: '0.6875rem' }}>
                            {d.winningTrades} wins · {d.losingTrades} losses
                          </div>
                        </div>
                      );
                    }}
                  />
                  <Bar dataKey="netPnL" radius={[2, 2, 0, 0]}>
                    {monthlyPnL.map((entry, idx) => (
                      <Cell key={`cell-mon-${idx}`} fill={entry.netPnL >= 0 ? C.positive : C.negative} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

        </div>
      )}

      {/* ── Chart D: Account Contribution Bar Chart (Req #39D & #11) ── */}
      {isEligible && contribution.length > 0 && (
        <div className="card" id="chart-account-contribution">
          <div className="card-header" style={{ justifyContent: 'space-between' }}>
            <div className="row" style={{ gap: 8, alignItems: 'center' }}>
              <div className="card-header-icon"><BarChart3 size={15} /></div>
              <div>
                <span className="card-title">Signed Account Net P/L Contribution</span>
                <p className="card-subtitle">Absolute signed Net P/L per participating account</p>
              </div>
            </div>
          </div>
          <div className="card-body" style={{ padding: '16px 12px 10px' }}>
            <ResponsiveContainer width="100%" height={260}>
              <BarChart
                data={contribution}
                layout="vertical"
                margin={{ top: 10, right: 30, left: 50, bottom: 4 }}
              >
                <CartesianGrid strokeDasharray="3 3" stroke={C.grid} horizontal={false} />
                <XAxis type="number" tick={axisTick} tickFormatter={v => formatCurrency(v, curr, { minimumFractionDigits: 0, maximumFractionDigits: 0 })} />
                <YAxis
                  type="category"
                  dataKey="accountLabel"
                  tick={axisTick}
                  width={140}
                  tickFormatter={l => l.length > 18 ? `${l.slice(0, 16)}…` : l}
                />
                <ReferenceLine x={0} stroke="rgba(148, 163, 184, 0.2)" />
                <Tooltip
                  content={({ active, payload }) => {
                    if (!active || !payload?.length) return null;
                    const d = payload[0].payload;
                    const isPos = d.netPnL >= 0;
                    return (
                      <div style={tipStyle}>
                        <div style={{ color: 'var(--text-primary)', fontWeight: 600, fontSize: '0.8125rem', marginBottom: 2 }}>
                          {d.accountLabel} (ID: {d.accountId})
                        </div>
                        <div style={{
                          color: isPos ? C.positive : C.negative,
                          fontSize: '1rem',
                          fontWeight: 700,
                          fontFamily: 'var(--font-mono)',
                          marginBottom: 4,
                        }}>
                          {formatCurrency(d.netPnL, d.currency || curr, { showSign: true })}
                        </div>
                        <div style={{ color: 'var(--text-secondary)', fontSize: '0.75rem' }}>
                          Trades: {d.tradeCount} {d.returnPct !== null && `• Return: ${d.returnPct.toFixed(2)}%`}
                        </div>
                      </div>
                    );
                  }}
                />
                <Bar dataKey="netPnL" radius={[0, 4, 4, 0]}>
                  {contribution.map((entry, idx) => (
                    <Cell key={`cell-contr-${idx}`} fill={entry.netPnL >= 0 ? C.positive : C.negative} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}

      {/* ── Chart E: Indexed Account Comparison (Base 100) (Req #39E) ── */}
      {normalizedComparison && combinedNormalizedData.length > 0 && (
        <div className="card" id="chart-indexed-comparison">
          <div className="card-header" style={{ justifyContent: 'space-between', flexWrap: 'wrap', gap: 8 }}>
            <div className="row" style={{ gap: 8, alignItems: 'center' }}>
              <div className="card-header-icon"><LineIcon size={15} /></div>
              <div>
                <span className="card-title">Indexed Account Comparison (Base 100)</span>
                <p className="card-subtitle">
                  Normalized capital performance indexed from 100. Allows relative comparison across accounts of different sizes.
                </p>
              </div>
            </div>
            <span className="t-label text-xs">
              Basis: Ending Balance Minus Net Trading P/L
            </span>
          </div>
          <div className="card-body" style={{ padding: '20px 12px 14px' }}>
            <ResponsiveContainer width="100%" height={320}>
              <LineChart data={combinedNormalizedData} margin={{ top: 10, right: 24, left: 10, bottom: 4 }}>
                <CartesianGrid strokeDasharray="3 3" stroke={C.grid} />
                <XAxis dataKey="date" tick={axisTick} tickFormatter={fmtDate} minTickGap={30} />
                <YAxis
                  tick={axisTick}
                  domain={['auto', 'auto']}
                  tickFormatter={v => `${v}`}
                />
                <ReferenceLine y={100} stroke="rgba(148, 163, 184, 0.3)" strokeDasharray="3 3" />
                <Tooltip
                  content={({ active, payload, label }) => {
                    if (!active || !payload?.length) return null;
                    return (
                      <div style={tipStyle}>
                        <div style={{ color: 'var(--text-muted)', fontSize: '0.75rem', marginBottom: 6 }}>
                          {label}
                        </div>
                        {payload.map((p, idx) => {
                          const s = normalizedComparison.series.find(item => item.accountId === p.dataKey);
                          const labelName = s?.accountLabel || p.dataKey;
                          const val = Number(p.value) || 100;
                          const diff = val - 100;
                          return (
                            <div key={idx} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, marginBottom: 3 }}>
                              <span style={{ color: p.color, fontSize: '0.75rem', fontWeight: 500 }}>
                                {labelName}:
                              </span>
                              <span style={{ fontFamily: 'var(--font-mono)', fontSize: '0.8125rem', fontWeight: 600, color: diff >= 0 ? C.positive : C.negative }}>
                                {val.toFixed(2)} ({diff >= 0 ? '+' : ''}{diff.toFixed(2)}%)
                              </span>
                            </div>
                          );
                        })}
                      </div>
                    );
                  }}
                />
                <Legend
                  wrapperStyle={{ paddingTop: 10, fontSize: '0.75rem', fontFamily: 'var(--font-sans)' }}
                  formatter={(value) => {
                    const s = normalizedComparison.series.find(item => item.accountId === value);
                    return <span style={{ color: 'var(--text-secondary)' }}>{s?.accountLabel || value}</span>;
                  }}
                />
                {normalizedComparison.series.map((s, idx) => (
                  <Line
                    key={s.accountId}
                    type="monotone"
                    dataKey={s.accountId}
                    stroke={C.colors[idx % C.colors.length]}
                    strokeWidth={2}
                    dot={false}
                    name={s.accountId}
                  />
                ))}
              </LineChart>
            </ResponsiveContainer>
            <div style={{ marginTop: 8, padding: '0 8px', fontSize: '0.6875rem', color: 'var(--text-muted)' }}>
              * Note: Normalized returns are calculated against estimated initial capital. Cash flow events (deposits & withdrawals) are not independently reconciled in MT5 HTML exports.
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
