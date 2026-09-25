import { useState, useMemo, useRef, useCallback } from 'react';
import { Calendar, ChevronLeft, ChevronRight, Camera } from 'lucide-react';

const MONTH_NAMES = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];
const DAY_LABELS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

const GREEN = '#34D399';
const RED = '#FB7185';

/* Return the ISO week number for a given date */
function isoWeek(dateStr) {
  const d = new Date(dateStr);
  d.setHours(0, 0, 0, 0);
  d.setDate(d.getDate() + 4 - (d.getDay() || 7)); // nearest Thursday
  const yearStart = new Date(d.getFullYear(), 0, 1);
  return Math.ceil((((d - yearStart) / 86400000) + 1) / 7);
}

/* Group calendar days by ISO week, return weeks in order */
function buildWeeks(cells, year, month, dataMap) {
  const weeks = {};
  for (const cell of cells) {
    if (cell.type !== 'day') continue;
    const wk = isoWeek(cell.date);
    if (!weeks[wk]) weeks[wk] = { week: wk, dates: [] };
    weeks[wk].dates.push(cell.date);
  }
  return Object.values(weeks)
    .sort((a, b) => a.week - b.week)
    .map(w => {
      const pnl = w.dates.reduce((s, dk) => s + (dataMap[dk]?.pnl ?? 0), 0);
      return { ...w, pnl };
    });
}

export default function JournalCalendar({ calendarData }) {
  const cardRef = useRef(null);

  const months = useMemo(() => {
    if (!calendarData || calendarData.length === 0) return [];
    const set = new Set();
    for (const d of calendarData) set.add(d.date.slice(0, 7));
    return Array.from(set).sort();
  }, [calendarData]);

  const [currentIdx, setCurrentIdx] = useState(months.length - 1);

  const currentMonth = months[Math.max(0, Math.min(currentIdx, months.length - 1))] || '';
  const [year, month] = currentMonth ? currentMonth.split('-').map(Number) : [new Date().getFullYear(), new Date().getMonth() + 1];

  const handleSnapshot = useCallback(async () => {
    if (!cardRef.current) return;
    try {
      const { default: html2canvas } = await import('html2canvas');
      const canvas = await html2canvas(cardRef.current, {
        backgroundColor: '#0B0F17',
        scale: 2,
        useCORS: true,
      });
      const link = document.createElement('a');
      link.download = `journal-${currentMonth}-snapshot.png`;
      link.href = canvas.toDataURL('image/png');
      link.click();
    } catch {
      alert('Snapshot ready — right-click the card and use "Save image as" or use your OS screenshot tool.');
    }
  }, [currentMonth]);

  if (!calendarData || calendarData.length === 0 || months.length === 0) return null;

  const dataMap = {};
  for (const d of calendarData) dataMap[d.date] = d;

  const firstDay = new Date(year, month - 1, 1);
  const daysInMonth = new Date(year, month, 0).getDate();
  let startDow = firstDay.getDay();
  startDow = startDow === 0 ? 6 : startDow - 1; // Mon=0 … Sun=6

  // Build cell list
  const cells = [];
  for (let i = 0; i < startDow; i++) cells.push({ type: 'empty', key: `e${i}` });
  for (let d = 1; d <= daysInMonth; d++) {
    const key = `${year}-${String(month).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
    const data = dataMap[key];
    cells.push({
      type: 'day', day: d, date: key,
      pnl: data?.pnl ?? null,
      trades: data?.trades ?? 0,
      hasData: !!data,
      key,
    });
  }

  // Weekly PnL
  const weeks = buildWeeks(cells, year, month, dataMap);

  const monthTrades = calendarData.filter(d => d.date.startsWith(currentMonth));
  const monthPnL = monthTrades.reduce((s, d) => s + d.pnl, 0);
  const profitDays = monthTrades.filter(d => d.pnl > 0).length;
  const lossDays = monthTrades.filter(d => d.pnl < 0).length;
  const tradingDays = monthTrades.length;

  // Build rows (7 days + 1 weekly PnL column = 8 columns)
  const totalSlots = Math.ceil((startDow + daysInMonth) / 7) * 7;
  const paddedCells = [...cells];
  while (paddedCells.length < totalSlots)
    paddedCells.push({ type: 'empty', key: `ep${paddedCells.length}` });

  const rows = [];
  for (let r = 0; r < paddedCells.length / 7; r++) {
    rows.push(paddedCells.slice(r * 7, r * 7 + 7));
  }

  return (
    <div className="card" ref={cardRef}>
      {/* ── Header ── */}
      <div className="card-header" style={{ justifyContent: 'space-between' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div className="card-header-icon"><Calendar size={15} /></div>
          <span className="card-title">Trading Journal Calendar</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <button
            onClick={() => setCurrentIdx(Math.max(0, currentIdx - 1))}
            disabled={currentIdx <= 0}
            className="btn-icon"
            aria-label="Previous month"
          >
            <ChevronLeft size={15} />
          </button>
          <span style={{
            fontFamily: 'var(--font-sans)',
            fontSize: '0.875rem',
            color: 'var(--text-primary)',
            minWidth: 140,
            textAlign: 'center',
            fontWeight: 600,
          }}>
            {MONTH_NAMES[month - 1]} {year}
          </span>
          <button
            onClick={() => setCurrentIdx(Math.min(months.length - 1, currentIdx + 1))}
            disabled={currentIdx >= months.length - 1}
            className="btn-icon"
            aria-label="Next month"
          >
            <ChevronRight size={15} />
          </button>
          <button
            onClick={handleSnapshot}
            className="btn-icon"
            title="Download journal snapshot PNG"
            style={{ marginLeft: 6 }}
            aria-label="Download snapshot"
          >
            <Camera size={15} />
          </button>
        </div>
      </div>

      <div className="card-body" style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>

        {/* Monthly Summary */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12 }}>
          <SummaryTile label="Month Net P/L" value={`${monthPnL >= 0 ? '+' : ''}$${monthPnL.toFixed(2)}`} color={monthPnL >= 0 ? GREEN : RED} />
          <SummaryTile label="Trading Days" value={tradingDays} color="var(--text-primary)" />
          <SummaryTile label="Profitable Days" value={profitDays} color={GREEN} />
          <SummaryTile label="Loss Days" value={lossDays} color={RED} />
        </div>

        {/* Column headers: 7 day labels + "Week" */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr) 84px', gap: 6 }}>
          {DAY_LABELS.map(l => (
            <div key={l} style={{ textAlign: 'center', padding: '6px 0' }}>
              <span style={{
                fontFamily: 'var(--font-sans)', fontSize: '0.75rem',
                letterSpacing: '0.02em',
                color: 'var(--text-secondary)', fontWeight: 600,
              }}>{l}</span>
            </div>
          ))}
          <div style={{ textAlign: 'center', padding: '6px 0' }}>
            <span style={{
              fontFamily: 'var(--font-sans)', fontSize: '0.75rem',
              letterSpacing: '0.02em',
              color: 'var(--primary-hover)', fontWeight: 600,
            }}>Week P/L</span>
          </div>
        </div>

        {/* Calendar rows — each row = 7 day cells + 1 weekly PnL cell */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
          {rows.map((row, rowIdx) => {
            const weekData = weeks[rowIdx];
            const wPnl = weekData?.pnl ?? 0;
            const wPos = wPnl >= 0;
            const hasWeekTrades = weekData?.dates?.some(dk => !!dataMap[dk]);

            return (
              <div key={rowIdx} style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr) 84px', gap: 6 }}>
                {row.map(cell => <DayCell key={cell.key} cell={cell} dataMap={dataMap} />)}

                {/* Weekly PnL pill */}
                <div style={{
                  borderRadius: 'var(--radius-sm)',
                  display: 'flex', flexDirection: 'column',
                  alignItems: 'center', justifyContent: 'center',
                  padding: '6px 4px',
                  background: hasWeekTrades
                    ? (wPos ? 'var(--positive-soft)' : 'var(--negative-soft)')
                    : 'var(--bg-surface-soft)',
                  border: `1px solid ${hasWeekTrades
                    ? (wPos ? 'var(--positive-border)' : 'var(--negative-border)')
                    : 'var(--border-default)'}`,
                  gap: 3,
                }}>
                  {hasWeekTrades ? (
                    <>
                      <span style={{
                        fontFamily: 'var(--font-sans)',
                        fontSize: '0.625rem',
                        fontWeight: 600,
                        color: 'var(--text-muted)',
                        lineHeight: 1,
                      }}>W{weekData?.week}</span>
                      <span style={{
                        fontFamily: 'var(--font-mono)',
                        fontSize: '0.8125rem', fontWeight: 700,
                        color: wPos ? GREEN : RED, lineHeight: 1,
                      }}>
                        {wPos ? '+' : ''}${Math.abs(wPnl).toFixed(0)}
                      </span>
                    </>
                  ) : null}
                </div>
              </div>
            );
          })}
        </div>

        {/* Legend */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 20, paddingTop: 6, borderTop: '1px solid var(--border-default)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <div style={{ width: 12, height: 12, borderRadius: 3, background: 'var(--positive-soft)', border: '1px solid var(--positive-border)' }} />
            <span className="t-label">Profit Day</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <div style={{ width: 12, height: 12, borderRadius: 3, background: 'var(--negative-soft)', border: '1px solid var(--negative-border)' }} />
            <span className="t-label">Loss Day</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <div style={{ width: 12, height: 12, borderRadius: 3, background: 'var(--bg-surface-soft)', border: '1px solid var(--border-default)' }} />
            <span className="t-label">No Trades</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginLeft: 8 }}>
            <div style={{ width: 26, height: 12, borderRadius: 3, background: 'var(--primary-soft)', border: '1px solid var(--primary-border)' }} />
            <span className="t-label" style={{ color: 'var(--primary-hover)', fontWeight: 600 }}>Weekly Total</span>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ── Single Day Cell ── */
function DayCell({ cell, dataMap }) {
  if (cell.type === 'empty') return <div style={{ aspectRatio: '1.05' }} />;

  const isGreen = cell.hasData && cell.pnl > 0;
  const isRed = cell.hasData && cell.pnl < 0;

  let bg = 'var(--bg-surface-soft)';
  let border = 'var(--border-subtle)';

  if (isGreen) {
    bg = 'var(--positive-soft)';
    border = 'var(--positive-border)';
  } else if (isRed) {
    bg = 'var(--negative-soft)';
    border = 'var(--negative-border)';
  }

  const pnlColor = isGreen ? GREEN : isRed ? RED : 'var(--text-muted)';

  return (
    <div style={{
      aspectRatio: '1.05',
      borderRadius: 'var(--radius-sm)',
      background: bg,
      border: `1px solid ${border}`,
      transition: 'box-shadow 0.15s ease, transform 0.15s ease',
      position: 'relative',
      padding: '7px 8px 6px',
      display: 'flex',
      flexDirection: 'column',
      cursor: cell.hasData ? 'pointer' : 'default',
    }}
      className={cell.hasData ? 'cal-cell-hover' : ''}
    >
      <style>{`
        .cal-cell-hover:hover {
          box-shadow: 0 4px 12px rgba(0, 0, 0, 0.4);
          transform: translateY(-1px);
          z-index: 5;
          border-color: var(--border-strong);
        }
      `}</style>

      {/* Date number — top left */}
      <span style={{
        fontFamily: 'var(--font-sans)',
        fontSize: '0.75rem', fontWeight: 600,
        color: cell.hasData ? 'var(--text-primary)' : 'var(--text-muted)',
        lineHeight: 1, alignSelf: 'flex-start',
      }}>
        {cell.day}
      </span>

      {/* PnL — center */}
      {cell.hasData && (
        <div style={{
          flex: 1, display: 'flex', flexDirection: 'column',
          alignItems: 'center', justifyContent: 'center', gap: 2,
        }}>
          <span style={{
            fontSize: '0.9375rem',
            fontFamily: 'var(--font-mono)',
            fontWeight: 700, lineHeight: 1,
            color: pnlColor,
            fontVariantNumeric: 'tabular-nums',
            letterSpacing: '-0.02em',
          }}>
            {cell.pnl >= 0 ? '+' : ''}${Math.abs(cell.pnl).toFixed(0)}
          </span>
          <span style={{
            fontSize: '0.6875rem',
            fontFamily: 'var(--font-sans)',
            color: 'var(--text-muted)', lineHeight: 1,
            fontWeight: 500,
          }}>
            {cell.trades} trade{cell.trades !== 1 ? 's' : ''}
          </span>
        </div>
      )}

      {/* Hover tooltip */}
      {cell.hasData && (
        <div style={{
          position: 'absolute', bottom: '110%', left: '50%',
          transform: 'translateX(-50%)',
          pointerEvents: 'none',
          opacity: 0, transition: 'opacity 0.15s ease',
          zIndex: 20,
        }} className="cal-tooltip">
          <style>{`.cal-cell-hover:hover .cal-tooltip { opacity: 1 !important; }`}</style>
          <div style={{
            borderRadius: 8, padding: '10px 14px',
            background: '#161E2C', border: '1px solid rgba(148, 163, 184, 0.22)',
            boxShadow: '0 10px 25px rgba(0, 0, 0, 0.55)',
            whiteSpace: 'nowrap',
          }}>
            <p style={{ color: 'var(--text-muted)', fontSize: '0.75rem', fontWeight: 500, marginBottom: 4 }}>
              {cell.date}
            </p>
            <p style={{ fontSize: '1.05rem', fontWeight: 700, color: pnlColor, fontFamily: 'var(--font-mono)', marginBottom: 2 }}>
              {cell.pnl >= 0 ? '+' : ''}${cell.pnl.toFixed(2)}
            </p>
            <p style={{ color: 'var(--text-secondary)', fontSize: '0.75rem' }}>
              {cell.trades} trade{cell.trades !== 1 ? 's' : ''} executed
            </p>
          </div>
        </div>
      )}
    </div>
  );
}

function SummaryTile({ label, value, color }) {
  return (
    <div style={{
      padding: '14px 16px', borderRadius: 'var(--radius-sm)',
      background: 'var(--bg-surface-soft)', border: '1px solid var(--border-default)',
      textAlign: 'center',
    }}>
      <p style={{
        fontFamily: 'var(--font-sans)', fontSize: '0.75rem',
        fontWeight: 500, color: 'var(--text-muted)', marginBottom: 6,
      }}>{label}</p>
      <p style={{
        fontFamily: 'var(--font-mono)',
        fontSize: '1.35rem', letterSpacing: '-0.02em', lineHeight: 1,
        color, fontWeight: 700, fontVariantNumeric: 'tabular-nums'
      }}>{value}</p>
    </div>
  );
}
