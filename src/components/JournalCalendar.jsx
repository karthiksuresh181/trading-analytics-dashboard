import { useState, useMemo, useRef, useCallback } from 'react';
import { Calendar, ChevronLeft, ChevronRight, Camera } from 'lucide-react';

const MONTH_NAMES = [
  'January','February','March','April','May','June',
  'July','August','September','October','November','December',
];
const DAY_LABELS = ['Mon','Tue','Wed','Thu','Fri','Sat','Sun'];

const GREEN = '#22c55e';
const RED   = '#f43f5e';

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
  // Collect only "day" cells with their date key
  const weeks = {};
  for (const cell of cells) {
    if (cell.type !== 'day') continue;
    const wk = isoWeek(cell.date);
    if (!weeks[wk]) weeks[wk] = { week: wk, dates: [] };
    weeks[wk].dates.push(cell.date);
  }
  // Sort weeks and compute PnL per week
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

  const handleSnapshot = useCallback(async () => {
    if (!cardRef.current) return;
    try {
      const { default: html2canvas } = await import('html2canvas');
      const canvas = await html2canvas(cardRef.current, {
        backgroundColor: '#141618',
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
  }, []);

  if (!calendarData || calendarData.length === 0 || months.length === 0) return null;

  const currentMonth = months[Math.max(0, Math.min(currentIdx, months.length - 1))];
  const [year, month] = currentMonth.split('-').map(Number);

  const dataMap = {};
  for (const d of calendarData) dataMap[d.date] = d;

  const firstDay    = new Date(year, month - 1, 1);
  const daysInMonth = new Date(year, month, 0).getDate();
  let startDow      = firstDay.getDay();
  startDow = startDow === 0 ? 6 : startDow - 1; // Mon=0 … Sun=6

  // Build cell list
  const cells = [];
  for (let i = 0; i < startDow; i++) cells.push({ type: 'empty', key: `e${i}` });
  for (let d = 1; d <= daysInMonth; d++) {
    const key  = `${year}-${String(month).padStart(2,'0')}-${String(d).padStart(2,'0')}`;
    const data = dataMap[key];
    cells.push({
      type: 'day', day: d, date: key,
      pnl:    data?.pnl    ?? null,
      trades: data?.trades ?? 0,
      hasData: !!data,
      key,
    });
  }

  // Weekly PnL
  const weeks = buildWeeks(cells, year, month, dataMap);

  const monthTrades = calendarData.filter(d => d.date.startsWith(currentMonth));
  const monthPnL    = monthTrades.reduce((s, d) => s + d.pnl, 0);
  const profitDays  = monthTrades.filter(d => d.pnl > 0).length;
  const lossDays    = monthTrades.filter(d => d.pnl < 0).length;
  const tradingDays = monthTrades.length;

  // Build rows (7 days + 1 weekly PnL column = 8 columns)
  // Pad cells so we can always build complete 7-day rows
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
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <div className="card-header-icon"><Calendar size={14} /></div>
          <span className="card-title">Trading Journal</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <button onClick={() => setCurrentIdx(Math.max(0, currentIdx - 1))}
                  disabled={currentIdx <= 0} className="btn-icon">
            <ChevronLeft size={14} />
          </button>
          <span style={{
            fontFamily: '"JetBrains Mono", ui-monospace, monospace',
            fontSize: '0.8125rem', letterSpacing: '0.04em',
            color: 'var(--ink)', minWidth: 140, textAlign: 'center', fontWeight: 500,
          }}>
            {MONTH_NAMES[month - 1]} {year}
          </span>
          <button onClick={() => setCurrentIdx(Math.min(months.length - 1, currentIdx + 1))}
                  disabled={currentIdx >= months.length - 1} className="btn-icon">
            <ChevronRight size={14} />
          </button>
          <button onClick={handleSnapshot} className="btn-icon" title="Download snapshot" style={{ marginLeft: 4 }}>
            <Camera size={14} />
          </button>
        </div>
      </div>

      <div className="card-body" style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>

        {/* Monthly Summary */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12 }}>
          <SummaryTile label="Month P/L" value={`${monthPnL >= 0 ? '+' : ''}$${monthPnL.toFixed(2)}`} color={monthPnL >= 0 ? GREEN : RED} />
          <SummaryTile label="Trading Days" value={tradingDays} color="var(--ink)"  />
          <SummaryTile label="Green Days"   value={profitDays}  color={GREEN}       />
          <SummaryTile label="Red Days"     value={lossDays}    color={RED}         />
        </div>

        {/* Column headers: 7 day labels + "Week" */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr) 80px', gap: 4 }}>
          {DAY_LABELS.map(l => (
            <div key={l} style={{ textAlign: 'center', padding: '4px 0' }}>
              <span style={{
                fontFamily: 'var(--font-mono)', fontSize: '0.75rem',
                letterSpacing: '0.06em', textTransform: 'uppercase',
                color: 'var(--ink-dim)', fontWeight: 500,
              }}>{l}</span>
            </div>
          ))}
          <div style={{ textAlign: 'center', padding: '4px 0' }}>
            <span style={{
              fontFamily: 'var(--font-mono)', fontSize: '0.75rem',
              letterSpacing: '0.06em', textTransform: 'uppercase',
              color: 'var(--accent-bright)', fontWeight: 600,
            }}>Week</span>
          </div>
        </div>

        {/* Calendar rows — each row = 7 day cells + 1 weekly PnL cell */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
          {rows.map((row, rowIdx) => {
            const weekData = weeks[rowIdx];
            const wPnl  = weekData?.pnl ?? 0;
            const wPos  = wPnl >= 0;
            const hasWeekTrades = weekData?.dates?.some(dk => !!dataMap[dk]);

            return (
              <div key={rowIdx} style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr) 80px', gap: 4 }}>
                {row.map(cell => <DayCell key={cell.key} cell={cell} dataMap={dataMap} />)}

                {/* Weekly PnL pill */}
                <div style={{
                  borderRadius: 8,
                  display: 'flex', flexDirection: 'column',
                  alignItems: 'center', justifyContent: 'center',
                  padding: '6px 4px',
                  background: hasWeekTrades
                    ? (wPos ? 'rgba(22,163,74,0.08)' : 'rgba(244,63,94,0.08)')
                    : 'transparent',
                  border: `1px solid ${hasWeekTrades
                    ? (wPos ? 'rgba(22,163,74,0.25)' : 'rgba(244,63,94,0.25)')
                    : 'var(--hairline)'}`,
                  gap: 2,
                }}>
                  {hasWeekTrades ? (
                    <>
                      <span style={{
                        fontFamily: '"JetBrains Mono", monospace',
                        fontSize: '0.6rem', letterSpacing: '0.06em',
                        textTransform: 'uppercase', color: 'var(--ink-mute)',
                        lineHeight: 1,
                      }}>W{weekData?.week}</span>
                      <span style={{
                        fontFamily: '"JetBrains Mono", monospace',
                        fontSize: '0.75rem', fontWeight: 700,
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
        <div style={{ display: 'flex', alignItems: 'center', gap: 20, paddingTop: 4 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <div style={{ width: 10, height: 10, borderRadius: 3, background: 'rgba(22,163,74,0.25)', border: '1px solid rgba(22,163,74,0.5)' }} />
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
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginLeft: 8 }}>
            <div style={{ width: 28, height: 10, borderRadius: 3, background: 'rgba(22,163,74,0.08)', border: '1px solid rgba(22,163,74,0.25)' }} />
            <span className="t-label" style={{ color: 'var(--accent-bright)' }}>Weekly P/L</span>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ── Single Day Cell ── */
function DayCell({ cell, dataMap }) {
  if (cell.type === 'empty') return <div style={{ aspectRatio: '1' }} />;

  const data    = dataMap[cell.date];
  const isGreen = cell.hasData && cell.pnl > 0;
  const isRed   = cell.hasData && cell.pnl < 0;

  let bg = 'transparent', border = 'var(--hairline)';
  if (isGreen) {
    const intensity = Math.min(1, Math.abs(cell.pnl) / 80);
    bg     = `rgba(22,163,74,${0.07 + intensity * 0.16})`;
    border = `rgba(22,163,74,${0.22 + intensity * 0.25})`;
  } else if (isRed) {
    const intensity = Math.min(1, Math.abs(cell.pnl) / 80);
    bg     = `rgba(244,63,94,${0.07 + intensity * 0.16})`;
    border = `rgba(244,63,94,${0.22 + intensity * 0.25})`;
  }

  const pnlColor = isGreen ? GREEN : isRed ? RED : 'var(--ink-mute)';

  return (
    <div style={{
      aspectRatio: '1',
      borderRadius: 8,
      background: bg,
      border: `1px solid ${border}`,
      transition: 'transform 0.15s ease',
      position: 'relative',
      overflow: 'visible',
      padding: '7px 7px 5px',
      display: 'flex',
      flexDirection: 'column',
    }}
    className={cell.hasData ? 'cal-cell-hover' : ''}
    >
      <style>{`.cal-cell-hover:hover { transform: scale(1.1); z-index: 2; }`}</style>

      {/* Date number — top left */}
      <span style={{
        fontFamily: '"JetBrains Mono", ui-monospace, monospace',
        fontSize: '0.8125rem', fontWeight: 700,
        color: cell.hasData ? 'var(--ink)' : 'var(--ink-mute)',
        lineHeight: 1, alignSelf: 'flex-start',
      }}>
        {cell.day}
      </span>

      {/* PnL — center */}
      {cell.hasData && (
        <div style={{
          flex: 1, display: 'flex', flexDirection: 'column',
          alignItems: 'center', justifyContent: 'center', gap: 3,
        }}>
          <span style={{
            fontSize: '0.9375rem',
            fontFamily: '"JetBrains Mono", ui-monospace, monospace',
            fontWeight: 800, lineHeight: 1,
            color: pnlColor,
            letterSpacing: '-0.02em',
          }}>
            {cell.pnl >= 0 ? '+' : ''}${Math.abs(cell.pnl).toFixed(0)}
          </span>
          {/* Trade count below PnL */}
          <span style={{
            fontSize: '0.625rem',
            fontFamily: '"JetBrains Mono", ui-monospace, monospace',
            color: 'var(--ink-mute)', lineHeight: 1,
            letterSpacing: '0.02em',
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
          opacity: 0, transition: 'opacity 0.15s',
          zIndex: 20,
        }} className="cal-tooltip">
          <style>{`.cal-cell-hover:hover .cal-tooltip { opacity: 1 !important; }`}</style>
          <div style={{
            borderRadius: 10, padding: '10px 14px',
            background: '#1a1d21', border: '1px solid #2d3035',
            boxShadow: '0 8px 24px rgba(0,0,0,0.5)',
            whiteSpace: 'nowrap',
          }}>
            <p style={{ color: '#7a7f8a', fontSize: '0.7rem', letterSpacing: '0.06em', textTransform: 'uppercase', fontFamily: 'JetBrains Mono, monospace', marginBottom: 6 }}>
              {cell.date}
            </p>
            <p style={{ fontSize: '1rem', fontWeight: 700, color: pnlColor, marginBottom: 4 }}>
              {cell.pnl >= 0 ? '+' : ''}${cell.pnl.toFixed(2)}
            </p>
            <p style={{ color: '#7a7f8a', fontSize: '0.75rem', fontFamily: 'JetBrains Mono, monospace' }}>
              {cell.trades} trade{cell.trades !== 1 ? 's' : ''}
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
      padding: '16px', borderRadius: 'var(--radius-sm)',
      background: 'var(--canvas-mid)', border: '1px solid var(--hairline)',
      textAlign: 'center',
    }}>
      <p style={{
        fontFamily: 'var(--font-mono)', fontSize: '0.7rem',
        letterSpacing: '0.08em', textTransform: 'uppercase',
        color: 'var(--ink-mute)', marginBottom: 8,
      }}>{label}</p>
      <p style={{ fontSize: '1.375rem', letterSpacing: '-0.02em', lineHeight: 1, color, fontWeight: 600 }}>{value}</p>
    </div>
  );
}
