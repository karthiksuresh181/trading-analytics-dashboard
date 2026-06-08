import { useState, useMemo } from 'react';
import { Calendar, ChevronLeft, ChevronRight } from 'lucide-react';

const MONTH_NAMES = [
  'January','February','March','April','May','June',
  'July','August','September','October','November','December',
];
const DAY_LABELS = ['Mon','Tue','Wed','Thu','Fri','Sat','Sun'];

export default function JournalCalendar({ calendarData }) {
  const months = useMemo(() => {
    if (!calendarData || calendarData.length === 0) return [];
    const set = new Set();
    for (const d of calendarData) set.add(d.date.slice(0, 7));
    return Array.from(set).sort();
  }, [calendarData]);

  const [currentIdx, setCurrentIdx] = useState(months.length - 1);

  if (!calendarData || calendarData.length === 0 || months.length === 0) return null;

  const currentMonth = months[Math.max(0, Math.min(currentIdx, months.length - 1))];
  const [year, month] = currentMonth.split('-').map(Number);

  const dataMap = {};
  for (const d of calendarData) dataMap[d.date] = d;

  const firstDay     = new Date(year, month - 1, 1);
  const daysInMonth  = new Date(year, month, 0).getDate();
  let startDow       = firstDay.getDay();
  startDow = startDow === 0 ? 6 : startDow - 1;

  const cells = [];
  for (let i = 0; i < startDow; i++) cells.push({ type: 'empty', key: `e${i}` });
  for (let d = 1; d <= daysInMonth; d++) {
    const key  = `${year}-${String(month).padStart(2,'0')}-${String(d).padStart(2,'0')}`;
    const data = dataMap[key];
    cells.push({
      type: 'day', day: d, date: key,
      pnl:     data?.pnl     ?? null,
      trades:  data?.trades  ?? 0,
      hasData: !!data,
      key,
    });
  }

  const monthTrades = calendarData.filter(d => d.date.startsWith(currentMonth));
  const monthPnL    = monthTrades.reduce((s, d) => s + d.pnl, 0);
  const profitDays  = monthTrades.filter(d => d.pnl > 0).length;
  const lossDays    = monthTrades.filter(d => d.pnl < 0).length;

  return (
    <div className="card">
      {/* ── Header ── */}
      <div className="card-header" style={{ justifyContent: 'space-between' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <div className="card-header-icon"><Calendar size={14} /></div>
          <span className="card-title">Trading Journal</span>
        </div>
        {/* Month navigator */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <button
            onClick={() => setCurrentIdx(Math.max(0, currentIdx - 1))}
            disabled={currentIdx <= 0}
            className="btn-icon"
          >
            <ChevronLeft size={14} />
          </button>
          <span style={{
            fontFamily: '"JetBrains Mono", ui-monospace, monospace',
            fontSize: '0.75rem', letterSpacing: '0.06em',
            color: 'var(--ink)', minWidth: 130, textAlign: 'center',
            textTransform: 'uppercase',
          }}>
            {MONTH_NAMES[month - 1]} {year}
          </span>
          <button
            onClick={() => setCurrentIdx(Math.min(months.length - 1, currentIdx + 1))}
            disabled={currentIdx >= months.length - 1}
            className="btn-icon"
          >
            <ChevronRight size={14} />
          </button>
        </div>
      </div>

      <div className="card-body" style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>

        {/* Monthly Summary */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12 }}>
          <SummaryTile label="Month P/L" value={`${monthPnL >= 0 ? '+' : ''}$${monthPnL.toFixed(2)}`}
                       color={monthPnL >= 0 ? 'var(--accent)' : 'var(--danger)'} />
          <SummaryTile label="Green Days" value={profitDays} color="var(--accent)" />
          <SummaryTile label="Red Days"   value={lossDays}   color="var(--danger)" />
        </div>

        {/* Day labels */}
        <div style={{
          display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 4,
        }}>
          {DAY_LABELS.map(l => (
            <div key={l} style={{ textAlign: 'center', padding: '2px 0' }}>
              <span className="t-label">{l}</span>
            </div>
          ))}
        </div>

        {/* Calendar Grid */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 4 }}>
          {cells.map((cell) => {
            if (cell.type === 'empty') {
              return <div key={cell.key} style={{ aspectRatio: '1' }} />;
            }

            const isGreen   = cell.hasData && cell.pnl > 0;
            const isRed     = cell.hasData && cell.pnl < 0;

            let bg = 'transparent', border = 'var(--hairline)';
            if (isGreen) {
              const intensity = Math.min(1, Math.abs(cell.pnl) / 80);
              bg     = `rgba(255,122,23,${0.06 + intensity * 0.14})`;
              border = `rgba(255,122,23,${0.18 + intensity * 0.22})`;
            } else if (isRed) {
              const intensity = Math.min(1, Math.abs(cell.pnl) / 80);
              bg     = `rgba(244,63,94,${0.06 + intensity * 0.14})`;
              border = `rgba(244,63,94,${0.18 + intensity * 0.22})`;
            }

            return (
              <div key={cell.key} style={{
                aspectRatio: '1',
                borderRadius: 6,
                display: 'flex', flexDirection: 'column',
                alignItems: 'center', justifyContent: 'center',
                background: bg,
                border: `1px solid ${border}`,
                transition: 'transform 0.15s ease',
                position: 'relative',
                cursor: cell.hasData ? 'default' : 'default',
              }}
              className={cell.hasData ? 'cal-cell-hover' : ''}
              >
                <style>{`.cal-cell-hover:hover { transform: scale(1.1); z-index: 2; }`}</style>

                <span style={{
                  fontFamily: '"JetBrains Mono", ui-monospace, monospace',
                  fontSize: '0.6875rem',
                  color: cell.hasData ? 'var(--ink)' : 'var(--ink-mute)',
                  lineHeight: 1,
                }}>
                  {cell.day}
                </span>

                {cell.hasData && (
                  <span style={{
                    fontSize: '0.5625rem', marginTop: 3, lineHeight: 1,
                    color: isGreen ? 'var(--accent)' : isRed ? 'var(--danger)' : 'var(--ink-mute)',
                  }}>
                    {cell.pnl >= 0 ? '+' : ''}{cell.pnl.toFixed(0)}
                  </span>
                )}

                {/* Hover tooltip */}
                {cell.hasData && (
                  <div style={{
                    position: 'absolute', bottom: '110%', left: '50%',
                    transform: 'translateX(-50%)',
                    pointerEvents: 'none',
                    opacity: 0, transition: 'opacity 0.15s',
                    zIndex: 10,
                  }} className="cal-tooltip">
                    <style>{`
                      .cal-cell-hover:hover .cal-tooltip { opacity: 1 !important; }
                    `}</style>
                    <div style={{
                      borderRadius: 8, padding: '8px 12px',
                      background: 'var(--canvas-card)', border: '1px solid var(--hairline)',
                      boxShadow: '0 4px 12px rgba(0,0,0,0.4)',
                      whiteSpace: 'nowrap',
                    }}>
                      <p className="t-label" style={{ marginBottom: 4 }}>{cell.date}</p>
                      <p style={{
                        fontSize: '0.8125rem',
                        color: isGreen ? 'var(--accent)' : isRed ? 'var(--danger)' : 'var(--ink)',
                      }}>
                        {cell.pnl >= 0 ? '+' : ''}${cell.pnl.toFixed(2)}
                      </p>
                      <p className="t-label" style={{ marginTop: 4 }}>
                        {cell.trades} trade{cell.trades !== 1 ? 's' : ''}
                      </p>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* Legend */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 20, paddingTop: 4 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <div style={{ width: 10, height: 10, borderRadius: 3, background: 'rgba(255,122,23,0.25)', border: '1px solid rgba(255,122,23,0.5)' }} />
            <span className="t-label">Profit day</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <div style={{ width: 10, height: 10, borderRadius: 3, background: 'rgba(244,63,94,0.25)', border: '1px solid rgba(244,63,94,0.5)' }} />
            <span className="t-label">Loss day</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <div style={{ width: 10, height: 10, borderRadius: 3, border: '1px solid var(--hairline)' }} />
            <span className="t-label">No trades</span>
          </div>
        </div>
      </div>
    </div>
  );
}

function SummaryTile({ label, value, color }) {
  return (
    <div style={{
      padding: '14px', borderRadius: 'var(--radius-sm)',
      background: 'var(--canvas-mid)', border: '1px solid var(--hairline)',
      textAlign: 'center',
    }}>
      <p className="t-label" style={{ marginBottom: 6 }}>{label}</p>
      <p style={{ fontSize: '1.25rem', letterSpacing: '-0.02em', lineHeight: 1, color }}>{value}</p>
    </div>
  );
}
