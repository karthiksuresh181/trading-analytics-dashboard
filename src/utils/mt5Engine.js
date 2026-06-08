// ============================================================================
// MT5 Analytics Engine — Parser + Stats + Behavioral Analysis
// ============================================================================

// ── PARSER ──────────────────────────────────────────────────────────────────

/**
 * Parse MT5 HTML report into a unified array of trade objects.
 * Uses the "Positions" table as primary source (closed trades with PnL).
 * Falls back to "Deals" table if Positions is unavailable.
 */
export function parseMT5Report(htmlString) {
  const parser = new DOMParser();
  const doc = parser.parseFromString(htmlString, 'text/html');

  // Extract account metadata from header rows
  const meta = extractMetadata(doc);

  // Try Positions table first — it has clean open/close per row
  let trades = parsePositionsTable(doc);

  // Fallback: parse Deals table and pair in/out deals
  if (trades.length === 0) {
    trades = parseDealsTable(doc);
  }

  // Parse summary statistics from the Results section
  const reportStats = parseResultsSection(doc);

  return { trades, meta, reportStats };
}

function extractMetadata(doc) {
  const meta = { name: '', account: '', company: '', date: '', currency: 'USD' };
  const thElements = doc.querySelectorAll('th');

  for (let i = 0; i < thElements.length; i++) {
    const text = thElements[i].textContent.trim();
    if (text === 'Name:' && thElements[i + 1]) {
      meta.name = thElements[i + 1].textContent.trim();
    }
    if (text === 'Account:' && thElements[i + 1]) {
      const accText = thElements[i + 1].textContent.trim();
      meta.account = accText;
      // Extract currency from account string like "26222962 (USD, ...)"
      const currMatch = accText.match(/\((\w{3}),/);
      if (currMatch) meta.currency = currMatch[1];
    }
    if (text === 'Company:' && thElements[i + 1]) {
      meta.company = thElements[i + 1].textContent.trim();
    }
    if (text === 'Date:' && thElements[i + 1]) {
      meta.date = thElements[i + 1].textContent.trim();
    }
  }
  return meta;
}

function parsePositionsTable(doc) {
  const trades = [];

  // Find the section header "Positions"
  const headers = doc.querySelectorAll('th, td');
  let positionsSection = null;

  for (const el of headers) {
    if (el.textContent.trim() === 'Positions') {
      positionsSection = el.closest('tr');
      break;
    }
  }

  if (!positionsSection) return [];

  // Get the parent table
  const table = positionsSection.closest('table');
  if (!table) return [];

  const allRows = Array.from(table.querySelectorAll('tr'));
  const posIdx = allRows.indexOf(positionsSection);

  // Find the header row (the one with "Time", "Position", "Symbol", etc.)
  let headerRowIdx = -1;
  for (let i = posIdx + 1; i < allRows.length; i++) {
    const row = allRows[i];
    const firstBold = row.querySelector('b');
    if (firstBold && firstBold.textContent.trim() === 'Time') {
      headerRowIdx = i;
      break;
    }
  }

  if (headerRowIdx === -1) return [];

  // Parse data rows after the header until we hit a non-data row
  for (let i = headerRowIdx + 1; i < allRows.length; i++) {
    const row = allRows[i];
    const bg = row.getAttribute('bgcolor');

    // Data rows alternate between #FFFFFF and #F7F7F7
    if (bg !== '#FFFFFF' && bg !== '#F7F7F7') break;

    // Get all visible td cells (skip hidden ones)
    const allCells = Array.from(row.querySelectorAll('td'));
    const visibleCells = allCells.filter(td => !td.classList.contains('hidden'));

    if (visibleCells.length < 10) continue;

    // The MT5 Positions table with hidden cells has this visible layout:
    // [0] Open Time, [1] Position ID, [2] Symbol, [3] Type,
    // [4] Volume, [5] Open Price, [6] S/L, [7] T/P,
    // [8] Close Time, [9] Close Price, [10] Commission, [11] Swap, [12] Profit
    const openTimeStr = visibleCells[0]?.textContent?.trim() || '';
    const positionId  = visibleCells[1]?.textContent?.trim() || '';
    const symbol      = visibleCells[2]?.textContent?.trim() || '';
    const type        = visibleCells[3]?.textContent?.trim()?.toLowerCase() || '';
    const volume      = parseNum(visibleCells[4]?.textContent);
    const openPrice   = parseNum(visibleCells[5]?.textContent);
    const sl          = parseNum(visibleCells[6]?.textContent);
    const tp          = parseNum(visibleCells[7]?.textContent);
    const closeTimeStr= visibleCells[8]?.textContent?.trim() || '';
    const closePrice  = parseNum(visibleCells[9]?.textContent);
    const commission  = parseNum(visibleCells[10]?.textContent);
    const swap        = parseNum(visibleCells[11]?.textContent);
    const profit      = parseNum(visibleCells[12]?.textContent);

    if (!openTimeStr || !symbol) continue;

    const openTime = parseMT5Date(openTimeStr);
    const closeTime = parseMT5Date(closeTimeStr);
    const durationMs = closeTime && openTime ? closeTime - openTime : 0;
    const durationMin = durationMs / 60000;

    trades.push({
      id: positionId,
      symbol,
      type,          // 'buy' or 'sell'
      volume,
      openTime,
      closeTime,
      openPrice,
      closePrice,
      sl,
      tp,
      commission,
      swap,
      profit,
      netProfit: profit + commission + swap,
      durationMin,
      openHour: openTime ? openTime.getHours() : 0,
      openDay: openTime ? openTime.getDay() : 0,  // 0=Sun, 1=Mon...
      dateKey: openTime ? formatDateKey(openTime) : '',
    });
  }

  return trades;
}

function parseDealsTable(doc) {
  const trades = [];
  const headers = doc.querySelectorAll('th, td');
  let dealsSection = null;

  for (const el of headers) {
    if (el.textContent.trim() === 'Deals') {
      dealsSection = el.closest('tr');
      break;
    }
  }

  if (!dealsSection) return [];

  const table = dealsSection.closest('table');
  if (!table) return [];

  const allRows = Array.from(table.querySelectorAll('tr'));
  const dealsIdx = allRows.indexOf(dealsSection);

  // Find header row
  let headerRowIdx = -1;
  for (let i = dealsIdx + 1; i < allRows.length; i++) {
    const row = allRows[i];
    const firstBold = row.querySelector('b');
    if (firstBold && firstBold.textContent.trim() === 'Time') {
      headerRowIdx = i;
      break;
    }
  }

  if (headerRowIdx === -1) return [];

  // Collect deal entries
  const deals = [];
  for (let i = headerRowIdx + 1; i < allRows.length; i++) {
    const row = allRows[i];
    const bg = row.getAttribute('bgcolor');
    if (bg !== '#FFFFFF' && bg !== '#F7F7F7') break;

    const cells = Array.from(row.querySelectorAll('td')).filter(
      td => !td.classList.contains('hidden')
    );
    if (cells.length < 10) continue;

    // Deals columns: Time, Deal, Symbol, Type, Direction, Volume, Price, Order,
    //                Commission, Fee, Swap, Profit, Balance, Comment
    const direction = cells[4]?.textContent?.trim()?.toLowerCase() || '';
    if (direction !== 'in' && direction !== 'out') continue;

    deals.push({
      time: cells[0]?.textContent?.trim() || '',
      dealId: cells[1]?.textContent?.trim() || '',
      symbol: cells[2]?.textContent?.trim() || '',
      type: cells[3]?.textContent?.trim()?.toLowerCase() || '',
      direction,
      volume: parseNum(cells[5]?.textContent),
      price: parseNum(cells[6]?.textContent),
      order: cells[7]?.textContent?.trim() || '',
      commission: parseNum(cells[8]?.textContent),
      fee: parseNum(cells[9]?.textContent),
      swap: parseNum(cells[10]?.textContent),
      profit: parseNum(cells[11]?.textContent),
      balance: parseNum(cells[12]?.textContent),
      comment: cells[13]?.textContent?.trim() || '',
    });
  }

  // Pair "in" and "out" deals by symbol sequence
  const openDeals = [];
  for (const deal of deals) {
    if (deal.direction === 'in') {
      openDeals.push(deal);
    } else if (deal.direction === 'out') {
      // Find matching open deal
      const matchIdx = openDeals.findIndex(d => d.symbol === deal.symbol);
      if (matchIdx !== -1) {
        const open = openDeals.splice(matchIdx, 1)[0];
        const openTime = parseMT5Date(open.time);
        const closeTime = parseMT5Date(deal.time);
        const durationMs = closeTime && openTime ? closeTime - openTime : 0;

        trades.push({
          id: open.dealId,
          symbol: open.symbol,
          type: open.type,
          volume: open.volume,
          openTime,
          closeTime,
          openPrice: open.price,
          closePrice: deal.price,
          sl: 0,
          tp: 0,
          commission: open.commission + deal.commission,
          swap: deal.swap,
          profit: deal.profit,
          netProfit: deal.profit + open.commission + deal.commission + deal.swap,
          durationMin: durationMs / 60000,
          openHour: openTime ? openTime.getHours() : 0,
          openDay: openTime ? openTime.getDay() : 0,
          dateKey: openTime ? formatDateKey(openTime) : '',
        });
      }
    }
  }

  return trades;
}

function parseResultsSection(doc) {
  const stats = {};
  const allRows = Array.from(doc.querySelectorAll('tr'));

  for (const row of allRows) {
    const cells = Array.from(row.querySelectorAll('td'));
    for (let i = 0; i < cells.length - 1; i++) {
      const label = cells[i].textContent.trim().replace(/:$/, '');
      const value = cells[i + 1]?.textContent?.trim() || '';

      if (label.includes('Total Net Profit'))          stats.totalNetProfit = parseNum(value);
      if (label.includes('Gross Profit'))               stats.grossProfit = parseNum(value);
      if (label.includes('Gross Loss'))                 stats.grossLoss = parseNum(value);
      if (label.includes('Profit Factor'))              stats.profitFactor = parseNum(value);
      if (label.includes('Expected Payoff'))            stats.expectedPayoff = parseNum(value);
      if (label.includes('Recovery Factor'))            stats.recoveryFactor = parseNum(value);
      if (label.includes('Sharpe Ratio'))               stats.sharpeRatio = parseNum(value);
      if (label.includes('Balance Drawdown Absolute'))  stats.ddAbsolute = parseNum(value);
      if (label.includes('Balance Drawdown Maximal'))   stats.ddMaximal = value;
      if (label.includes('Balance Drawdown Relative'))  stats.ddRelative = value;
      if (label.includes('Total Trades'))               stats.totalTrades = parseNum(value);
      if (label.includes('Balance') && !label.includes('Drawdown')) {
        if (!stats.balance) stats.balance = parseNum(value);
      }
    }
  }

  return stats;
}

// ── HELPERS ─────────────────────────────────────────────────────────────────

function parseNum(str) {
  if (!str) return 0;
  // MT5 uses spaces as thousand separators: "9 764.46" → "9764.46"
  const cleaned = str.replace(/\s/g, '').replace(/,/g, '');
  const num = parseFloat(cleaned);
  return isNaN(num) ? 0 : num;
}

function parseMT5Date(str) {
  if (!str) return null;
  // Format: "2026.04.03 07:22:50"
  const cleaned = str.replace(/\./g, '-');
  const d = new Date(cleaned);
  return isNaN(d.getTime()) ? null : d;
}

function formatDateKey(d) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

// ── STATISTICS ENGINE ───────────────────────────────────────────────────────

export function computeAllMetrics(trades, reportStats = {}) {
  if (!trades || trades.length === 0) return null;

  const wins = trades.filter(t => t.profit > 0);
  const losses = trades.filter(t => t.profit < 0);
  const breakeven = trades.filter(t => t.profit === 0);

  // ── Basic Metrics ──
  const totalTrades = trades.length;
  const winRate = (wins.length / totalTrades) * 100;
  const totalProfit = trades.reduce((s, t) => s + t.profit, 0);
  const grossProfit = wins.reduce((s, t) => s + t.profit, 0);
  const grossLoss = losses.reduce((s, t) => s + t.profit, 0);
  const profitFactor = grossLoss !== 0 ? Math.abs(grossProfit / grossLoss) : grossProfit > 0 ? Infinity : 0;
  const avgWin = wins.length > 0 ? grossProfit / wins.length : 0;
  const avgLoss = losses.length > 0 ? grossLoss / losses.length : 0;
  const largestWin = wins.length > 0 ? Math.max(...wins.map(t => t.profit)) : 0;
  const largestLoss = losses.length > 0 ? Math.min(...losses.map(t => t.profit)) : 0;
  const totalCommission = trades.reduce((s, t) => s + t.commission, 0);
  const totalSwap = trades.reduce((s, t) => s + t.swap, 0);

  // ── Drawdown calculation ──
  // Use starting balance from report if available (balance - totalNetProfit)
  const endBalance = reportStats.balance || 0;
  const startingBalance = endBalance > 0 ? endBalance - totalProfit : 10000; // Fallback to 10k
  let peak = startingBalance;
  let maxDrawdown = 0;
  let maxDrawdownPct = 0;
  let running = startingBalance;
  const equityCurve = [];

  for (const t of trades) {
    running += t.profit;
    equityCurve.push({
      date: t.closeTime ? t.closeTime.toISOString().slice(0, 10) : t.dateKey,
      balance: running,
      profit: t.profit,
      symbol: t.symbol,
    });
    if (running > peak) peak = running;
    const dd = peak - running;
    if (dd > maxDrawdown) {
      maxDrawdown = dd;
      maxDrawdownPct = peak > 0 ? (dd / peak) * 100 : 0;
    }
  }

  // ── Streaks ──
  const { currentWinStreak, currentLossStreak, maxWinStreak, maxLossStreak } = computeStreaks(trades);

  // ── Consistency Score ──
  const consistencyScore = computeConsistencyScore(trades);

  // ── Account Grade ──
  const accountGrade = computeAccountGrade(winRate, profitFactor, maxDrawdownPct, consistencyScore);

  // ── Hold Time Correlation ──
  const avgWinDuration = wins.length > 0
    ? wins.reduce((s, t) => s + t.durationMin, 0) / wins.length
    : 0;
  const avgLossDuration = losses.length > 0
    ? losses.reduce((s, t) => s + t.durationMin, 0) / losses.length
    : 0;
  const holdTimeRatio = avgWinDuration > 0 ? avgLossDuration / avgWinDuration : 0;

  // ── Expectancy ──
  const expectancy = (winRate / 100) * avgWin + (1 - winRate / 100) * avgLoss;
  const expectancyR = avgLoss !== 0 ? expectancy / Math.abs(avgLoss) : 0;

  // ── Time / Day Efficiency Matrix ──
  const hourlyPnL = computeHourlyPnL(trades);
  const dailyPnL = computeDailyPnL(trades);

  // ── Asset Distribution ──
  const assetPnL = computeAssetPnL(trades);

  // ── Profit Leakage ──
  const leakage = computeProfitLeakage(trades, assetPnL, dailyPnL, hourlyPnL);

  // ── Calendar Data ──
  const calendarData = computeCalendarData(trades);

  // ── Behavioral Recommendations ──
  const recommendations = generateRecommendations({
    winRate, profitFactor, avgWin, avgLoss,
    avgWinDuration, avgLossDuration, holdTimeRatio,
    maxDrawdownPct, consistencyScore, leakage,
    hourlyPnL, dailyPnL, totalTrades,
  });

  return {
    totalTrades,
    winRate,
    totalProfit,
    grossProfit,
    grossLoss,
    profitFactor,
    avgWin,
    avgLoss,
    largestWin,
    largestLoss,
    totalCommission,
    totalSwap,
    maxDrawdown,
    maxDrawdownPct,
    currentWinStreak,
    currentLossStreak,
    maxWinStreak,
    maxLossStreak,
    consistencyScore,
    accountGrade,
    avgWinDuration,
    avgLossDuration,
    holdTimeRatio,
    expectancy,
    expectancyR,
    hourlyPnL,
    dailyPnL,
    assetPnL,
    leakage,
    calendarData,
    equityCurve,
    recommendations,
    wins: wins.length,
    losses: losses.length,
    breakeven: breakeven.length,
  };
}

// ── STREAKS ─────────────────────────────────────────────────────────────────

function computeStreaks(trades) {
  let currentWinStreak = 0;
  let currentLossStreak = 0;
  let maxWinStreak = 0;
  let maxLossStreak = 0;
  let tempWin = 0;
  let tempLoss = 0;

  for (const t of trades) {
    if (t.profit > 0) {
      tempWin++;
      tempLoss = 0;
      if (tempWin > maxWinStreak) maxWinStreak = tempWin;
    } else if (t.profit < 0) {
      tempLoss++;
      tempWin = 0;
      if (tempLoss > maxLossStreak) maxLossStreak = tempLoss;
    } else {
      // breakeven resets both
      tempWin = 0;
      tempLoss = 0;
    }
  }

  currentWinStreak = tempWin;
  currentLossStreak = tempLoss;

  return { currentWinStreak, currentLossStreak, maxWinStreak, maxLossStreak };
}

// ── CONSISTENCY SCORE ───────────────────────────────────────────────────────

function computeConsistencyScore(trades) {
  if (trades.length < 2) return 100;

  const volumes = trades.map(t => t.volume);
  const mean = volumes.reduce((a, b) => a + b, 0) / volumes.length;
  if (mean === 0) return 100;

  const variance = volumes.reduce((s, v) => s + Math.pow(v - mean, 2), 0) / volumes.length;
  const stdDev = Math.sqrt(variance);
  const cv = stdDev / mean; // coefficient of variation

  // CV of 0 = 100% consistent, CV of 2+ = 0% consistent
  const score = Math.max(0, Math.min(100, (1 - cv / 2) * 100));
  return Math.round(score * 10) / 10;
}

// ── ACCOUNT GRADE ───────────────────────────────────────────────────────────

function computeAccountGrade(winRate, profitFactor, maxDrawdownPct, consistency) {
  let score = 0;

  // Profit Factor scoring (max 30 pts)
  if (profitFactor >= 2.0) score += 30;
  else if (profitFactor >= 1.5) score += 24;
  else if (profitFactor >= 1.2) score += 18;
  else if (profitFactor >= 1.0) score += 12;
  else if (profitFactor >= 0.8) score += 6;

  // Win Rate scoring (max 25 pts)
  if (winRate >= 60) score += 25;
  else if (winRate >= 50) score += 20;
  else if (winRate >= 45) score += 15;
  else if (winRate >= 40) score += 10;
  else if (winRate >= 30) score += 5;

  // Drawdown scoring (max 25 pts — lower is better)
  if (maxDrawdownPct <= 5) score += 25;
  else if (maxDrawdownPct <= 10) score += 20;
  else if (maxDrawdownPct <= 15) score += 15;
  else if (maxDrawdownPct <= 25) score += 10;
  else if (maxDrawdownPct <= 40) score += 5;

  // Consistency scoring (max 20 pts)
  if (consistency >= 90) score += 20;
  else if (consistency >= 75) score += 16;
  else if (consistency >= 60) score += 12;
  else if (consistency >= 40) score += 8;
  else if (consistency >= 20) score += 4;

  if (score >= 85) return { grade: 'S', label: 'Elite', color: '#a855f7' };
  if (score >= 70) return { grade: 'A', label: 'Excellent', color: '#10b981' };
  if (score >= 55) return { grade: 'B', label: 'Good', color: '#3b82f6' };
  if (score >= 40) return { grade: 'C', label: 'Average', color: '#f59e0b' };
  return { grade: 'F', label: 'Needs Work', color: '#ef4444' };
}

// ── HOURLY / DAILY PNL ──────────────────────────────────────────────────────

function computeHourlyPnL(trades) {
  const hours = Array.from({ length: 24 }, (_, i) => ({
    hour: i,
    label: `${String(i).padStart(2, '0')}:00`,
    totalPnL: 0,
    count: 0,
    wins: 0,
    losses: 0,
  }));

  for (const t of trades) {
    const h = t.openHour;
    hours[h].totalPnL += t.profit;
    hours[h].count++;
    if (t.profit > 0) hours[h].wins++;
    else if (t.profit < 0) hours[h].losses++;
  }

  return hours;
}

function computeDailyPnL(trades) {
  const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
  const result = days.map((name, i) => ({
    day: i,
    name,
    shortName: name.slice(0, 3),
    totalPnL: 0,
    count: 0,
    wins: 0,
    losses: 0,
  }));

  for (const t of trades) {
    const d = t.openDay;
    result[d].totalPnL += t.profit;
    result[d].count++;
    if (t.profit > 0) result[d].wins++;
    else if (t.profit < 0) result[d].losses++;
  }

  return result.filter(d => d.count > 0);
}

// ── ASSET PNL ───────────────────────────────────────────────────────────────

function computeAssetPnL(trades) {
  const map = {};
  for (const t of trades) {
    if (!map[t.symbol]) {
      map[t.symbol] = { symbol: t.symbol, totalPnL: 0, count: 0, wins: 0, losses: 0, volume: 0 };
    }
    map[t.symbol].totalPnL += t.profit;
    map[t.symbol].count++;
    map[t.symbol].volume += t.volume;
    if (t.profit > 0) map[t.symbol].wins++;
    else if (t.profit < 0) map[t.symbol].losses++;
  }

  return Object.values(map).sort((a, b) => b.totalPnL - a.totalPnL);
}

// ── PROFIT LEAKAGE DETECTOR ─────────────────────────────────────────────────

function computeProfitLeakage(trades, assetPnL, dailyPnL, hourlyPnL) {
  const totalProfit = trades.reduce((s, t) => s + t.profit, 0);
  const leakages = [];

  // Asset-level leakage
  for (const asset of assetPnL) {
    if (asset.totalPnL < 0 && totalProfit !== 0) {
      const pctDrain = Math.abs(asset.totalPnL / Math.abs(totalProfit)) * 100;
      if (pctDrain > 10) {
        leakages.push({
          type: 'asset',
          label: asset.symbol,
          amount: asset.totalPnL,
          percentage: pctDrain,
          message: `${asset.symbol} drains ${pctDrain.toFixed(0)}% of your total net profits ($${asset.totalPnL.toFixed(2)})`,
        });
      }
    }
  }

  // Day-level leakage
  for (const day of dailyPnL) {
    if (day.totalPnL < 0 && totalProfit !== 0) {
      const pctDrain = Math.abs(day.totalPnL / Math.abs(totalProfit)) * 100;
      if (pctDrain > 10) {
        leakages.push({
          type: 'day',
          label: day.name,
          amount: day.totalPnL,
          percentage: pctDrain,
          message: `${day.name} trading reduces your total net profits by ${pctDrain.toFixed(0)}% ($${day.totalPnL.toFixed(2)})`,
        });
      }
    }
  }

  // Hour-level leakage
  const significantHours = hourlyPnL.filter(h => h.count >= 2 && h.totalPnL < -20);
  for (const h of significantHours) {
    if (totalProfit !== 0) {
      const pctDrain = Math.abs(h.totalPnL / Math.abs(totalProfit)) * 100;
      if (pctDrain > 15) {
        leakages.push({
          type: 'hour',
          label: h.label,
          amount: h.totalPnL,
          percentage: pctDrain,
          message: `Trading at ${h.label} drains ${pctDrain.toFixed(0)}% of profits ($${h.totalPnL.toFixed(2)})`,
        });
      }
    }
  }

  return leakages;
}

// ── CALENDAR DATA ───────────────────────────────────────────────────────────

function computeCalendarData(trades) {
  const map = {};
  for (const t of trades) {
    if (!t.dateKey) continue;
    if (!map[t.dateKey]) {
      map[t.dateKey] = { date: t.dateKey, pnl: 0, trades: 0 };
    }
    map[t.dateKey].pnl += t.profit;
    map[t.dateKey].trades++;
  }
  return Object.values(map).sort((a, b) => a.date.localeCompare(b.date));
}

// ── AUTOMATED RECOMMENDATIONS ───────────────────────────────────────────────

function generateRecommendations(data) {
  const recs = [];

  // Hold-time imbalance
  if (data.holdTimeRatio > 2) {
    recs.push({
      severity: 'critical',
      icon: '❌',
      message: `Your average losing trade lasts ${data.holdTimeRatio.toFixed(1)}x longer than your average winning trade (${data.avgLossDuration.toFixed(0)} min vs ${data.avgWinDuration.toFixed(0)} min). You are fighting stop-losses.`,
    });
  } else if (data.holdTimeRatio > 1.5) {
    recs.push({
      severity: 'warning',
      icon: '⚠️',
      message: `Losing trades are held ${data.holdTimeRatio.toFixed(1)}x longer than winners. Consider tighter stop-losses or faster exit on losing setups.`,
    });
  }

  // Win rate too low
  if (data.winRate < 40) {
    recs.push({
      severity: 'critical',
      icon: '❌',
      message: `Win rate of ${data.winRate.toFixed(1)}% is below the 40% threshold. Your system requires a very high reward-to-risk ratio to compensate.`,
    });
  }

  // Profit factor
  if (data.profitFactor < 1.0) {
    recs.push({
      severity: 'critical',
      icon: '❌',
      message: `Profit Factor is ${data.profitFactor.toFixed(2)} (below 1.0). Your system is currently unprofitable. Review your edge.`,
    });
  }

  // Risk:Reward
  const avgWinAbs = Math.abs(data.avgWin);
  const avgLossAbs = Math.abs(data.avgLoss);
  if (avgLossAbs > 0 && avgWinAbs / avgLossAbs < 1) {
    recs.push({
      severity: 'warning',
      icon: '⚠️',
      message: `Average win ($${avgWinAbs.toFixed(2)}) is smaller than average loss ($${avgLossAbs.toFixed(2)}). Your reward-to-risk ratio is ${(avgWinAbs / avgLossAbs).toFixed(2)}:1 — aim for at least 1.5:1.`,
    });
  }

  // Drawdown warning
  if (data.maxDrawdownPct > 20) {
    recs.push({
      severity: 'critical',
      icon: '❌',
      message: `Maximum drawdown of ${data.maxDrawdownPct.toFixed(1)}% is very high. This can lead to account blow-ups. Consider reducing position sizes.`,
    });
  } else if (data.maxDrawdownPct > 10) {
    recs.push({
      severity: 'warning',
      icon: '⚠️',
      message: `Maximum drawdown of ${data.maxDrawdownPct.toFixed(1)}% is approaching risky territory. Stay disciplined with risk management.`,
    });
  }

  // Consistency
  if (data.consistencyScore < 50) {
    recs.push({
      severity: 'warning',
      icon: '⚠️',
      message: `Consistency Score is ${data.consistencyScore.toFixed(0)}%. Your lot sizes vary significantly — this often indicates revenge trading or emotional sizing.`,
    });
  }

  // Day leakage
  for (const leak of data.leakage) {
    if (leak.type === 'day') {
      recs.push({
        severity: 'warning',
        icon: '⚠️',
        message: leak.message + '. Consider avoiding or reducing exposure on this day.',
      });
    }
  }

  // Hour leakage
  for (const leak of data.leakage) {
    if (leak.type === 'hour') {
      recs.push({
        severity: 'info',
        icon: '💡',
        message: leak.message + '. Consider narrowing your active trading window.',
      });
    }
  }

  // Asset leakage
  for (const leak of data.leakage) {
    if (leak.type === 'asset') {
      recs.push({
        severity: 'warning',
        icon: '⚠️',
        message: leak.message + '. Consider removing this instrument from your watchlist.',
      });
    }
  }

  // Low sample size
  if (data.totalTrades < 30) {
    recs.push({
      severity: 'info',
      icon: '💡',
      message: `Only ${data.totalTrades} trades analyzed. Statistical significance improves with 30+ trades. Keep journaling.`,
    });
  }

  // Positive encouragement
  if (data.profitFactor >= 1.5 && data.winRate >= 50) {
    recs.push({
      severity: 'positive',
      icon: '✅',
      message: `Strong performance: ${data.winRate.toFixed(1)}% win rate with ${data.profitFactor.toFixed(2)} profit factor. Your edge is quantifiable — keep executing.`,
    });
  }

  return recs;
}

// ── EXPORT REPORT GENERATION ────────────────────────────────────────────────

export function generateTextReport(trades, metrics, meta) {
  const lines = [];
  const sep = '═'.repeat(70);
  const thin = '─'.repeat(70);

  lines.push(sep);
  lines.push('  MT5 TRADING ANALYTICS — COMPREHENSIVE REPORT');
  lines.push(sep);
  lines.push(`  Account: ${meta.account}`);
  lines.push(`  Name:    ${meta.name}`);
  lines.push(`  Report:  ${new Date().toLocaleDateString()}`);
  lines.push(thin);

  lines.push('');
  lines.push(`  ACCOUNT GRADE: ${metrics.accountGrade.grade} — ${metrics.accountGrade.label}`);
  lines.push(`  Consistency Score: ${metrics.consistencyScore.toFixed(1)}%`);
  lines.push('');
  lines.push(thin);
  lines.push('  KEY METRICS');
  lines.push(thin);
  lines.push(`  Total Trades:     ${metrics.totalTrades}`);
  lines.push(`  Win Rate:         ${metrics.winRate.toFixed(2)}%`);
  lines.push(`  Profit Factor:    ${metrics.profitFactor === Infinity ? '∞' : metrics.profitFactor.toFixed(2)}`);
  lines.push(`  Net Profit:       $${metrics.totalProfit.toFixed(2)}`);
  lines.push(`  Gross Profit:     $${metrics.grossProfit.toFixed(2)}`);
  lines.push(`  Gross Loss:       $${metrics.grossLoss.toFixed(2)}`);
  lines.push(`  Avg Win:          $${metrics.avgWin.toFixed(2)}`);
  lines.push(`  Avg Loss:         $${metrics.avgLoss.toFixed(2)}`);
  lines.push(`  Largest Win:      $${metrics.largestWin.toFixed(2)}`);
  lines.push(`  Largest Loss:     $${metrics.largestLoss.toFixed(2)}`);
  lines.push(`  Max Drawdown:     $${metrics.maxDrawdown.toFixed(2)} (${metrics.maxDrawdownPct.toFixed(2)}%)`);
  lines.push(`  Expectancy:       $${metrics.expectancy.toFixed(2)}`);
  lines.push(`  Expectancy (R):   ${metrics.expectancyR.toFixed(3)}`);

  lines.push('');
  lines.push(thin);
  lines.push('  STREAK ANALYSIS');
  lines.push(thin);
  lines.push(`  Current Win Streak:  ${metrics.currentWinStreak}`);
  lines.push(`  Current Loss Streak: ${metrics.currentLossStreak}`);
  lines.push(`  Max Win Streak:      ${metrics.maxWinStreak}`);
  lines.push(`  Max Loss Streak:     ${metrics.maxLossStreak}`);

  lines.push('');
  lines.push(thin);
  lines.push('  HOLD TIME ANALYSIS');
  lines.push(thin);
  lines.push(`  Avg Win Duration:    ${metrics.avgWinDuration.toFixed(1)} min`);
  lines.push(`  Avg Loss Duration:   ${metrics.avgLossDuration.toFixed(1)} min`);
  lines.push(`  Hold Time Ratio:     ${metrics.holdTimeRatio.toFixed(2)}x`);

  lines.push('');
  lines.push(thin);
  lines.push('  ASSET DISTRIBUTION');
  lines.push(thin);
  for (const a of metrics.assetPnL) {
    lines.push(`  ${a.symbol.padEnd(12)} PnL: $${a.totalPnL.toFixed(2).padStart(10)}  Trades: ${a.count}  Wins: ${a.wins}  Losses: ${a.losses}`);
  }

  lines.push('');
  lines.push(thin);
  lines.push('  DAILY PERFORMANCE');
  lines.push(thin);
  for (const d of metrics.dailyPnL) {
    lines.push(`  ${d.name.padEnd(12)} PnL: $${d.totalPnL.toFixed(2).padStart(10)}  Trades: ${d.count}  WR: ${d.count > 0 ? ((d.wins / d.count) * 100).toFixed(0) : 0}%`);
  }

  lines.push('');
  lines.push(thin);
  lines.push('  HOURLY PERFORMANCE');
  lines.push(thin);
  const activeHours = metrics.hourlyPnL.filter(h => h.count > 0);
  for (const h of activeHours) {
    lines.push(`  ${h.label.padEnd(8)} PnL: $${h.totalPnL.toFixed(2).padStart(10)}  Trades: ${h.count}`);
  }

  if (metrics.leakage.length > 0) {
    lines.push('');
    lines.push(thin);
    lines.push('  ⚠ PROFIT LEAKAGE DETECTED');
    lines.push(thin);
    for (const l of metrics.leakage) {
      lines.push(`  • ${l.message}`);
    }
  }

  lines.push('');
  lines.push(thin);
  lines.push('  AI RECOMMENDATIONS');
  lines.push(thin);
  for (const r of metrics.recommendations) {
    lines.push(`  ${r.icon} ${r.message}`);
  }

  lines.push('');
  lines.push(thin);
  lines.push('  TRADE LOG');
  lines.push(thin);
  lines.push(`  ${'#'.padEnd(4)} ${'Date'.padEnd(20)} ${'Symbol'.padEnd(10)} ${'Type'.padEnd(6)} ${'Vol'.padEnd(6)} ${'PnL'.padStart(10)} ${'Duration'.padStart(10)}`);
  lines.push(`  ${'─'.repeat(4)} ${'─'.repeat(20)} ${'─'.repeat(10)} ${'─'.repeat(6)} ${'─'.repeat(6)} ${'─'.repeat(10)} ${'─'.repeat(10)}`);

  trades.forEach((t, i) => {
    const dateStr = t.openTime ? t.openTime.toISOString().slice(0, 19).replace('T', ' ') : '';
    const dur = t.durationMin >= 60
      ? `${Math.floor(t.durationMin / 60)}h ${Math.round(t.durationMin % 60)}m`
      : `${Math.round(t.durationMin)}m`;
    lines.push(`  ${String(i + 1).padEnd(4)} ${dateStr.padEnd(20)} ${t.symbol.padEnd(10)} ${t.type.padEnd(6)} ${String(t.volume).padEnd(6)} ${('$' + t.profit.toFixed(2)).padStart(10)} ${dur.padStart(10)}`);
  });

  lines.push('');
  lines.push(sep);
  lines.push('  Generated by MT5 Analytics Dashboard');
  lines.push(sep);

  return lines.join('\n');
}
