// ============================================================================
// Deterministic Validation Script for MT5 Portfolio Engine
// Tests all 18 synthetic test cases and currency formatting.
// ============================================================================

import assert from 'node:assert';
import {
  buildPortfolioAnalytics,
  extractAccountIdentity,
  extractCurrencyAuthority,
  formatCurrency,
  compareTradeEconomics,
} from '../src/utils/portfolioEngine.js';

let totalTests = 0;
let passedTests = 0;

function runTest(name, fn) {
  totalTests++;
  try {
    fn();
    passedTests++;
    console.log(`  ✓ PASS: ${name}`);
  } catch (err) {
    console.error(`  ✗ FAIL: ${name}`);
    console.error(`    ${err.message}`);
    throw err;
  }
}

console.log('=== MT5 Portfolio Engine: Comprehensive Validation Suite ===\n');

// ── Case 1: Two compatible USD accounts ─────────────────────────────────────
runTest('Case 1 — Two compatible USD accounts', () => {
  const rep1 = {
    id: 'rep_1',
    fileName: 'Acc1.html',
    meta: { account: '1001 (USD, Broker, demo)', name: 'Account 1' },
    reportStats: { balance: 10000, totalNetProfit: 100 },
    timezoneOffset: 2,
    trades: [
      { id: 't1', symbol: 'EURUSD', type: 'buy', openTime: new Date('2026-01-01T10:00:00Z'), closeTime: new Date('2026-01-01T11:00:00Z'), profit: 100, commission: 0, swap: 0, netProfit: 100, volume: 1 },
      { id: 't2', symbol: 'GBPUSD', type: 'sell', openTime: new Date('2026-01-01T12:00:00Z'), closeTime: new Date('2026-01-01T13:00:00Z'), profit: -50, commission: 0, swap: 0, netProfit: -50, volume: 1 },
    ],
  };

  const rep2 = {
    id: 'rep_2',
    fileName: 'Acc2.html',
    meta: { account: '1002 (USD, Broker, demo)', name: 'Account 2' },
    reportStats: { balance: 20000, totalNetProfit: 200 },
    timezoneOffset: 2,
    trades: [
      { id: 't3', symbol: 'USDJPY', type: 'buy', openTime: new Date('2026-01-01T10:30:00Z'), closeTime: new Date('2026-01-01T11:30:00Z'), profit: 200, commission: 0, swap: 0, netProfit: 200, volume: 1 },
    ],
  };

  const res = buildPortfolioAnalytics([rep1, rep2]);

  assert.strictEqual(res.status, 'READY');
  assert.strictEqual(res.metrics.totalAccounts, 2);
  assert.strictEqual(res.metrics.eligibleAccounts, 2);
  assert.strictEqual(res.metrics.totalTrades, 3);
  assert.strictEqual(res.metrics.tradingPnL, 250);
  assert.strictEqual(res.metrics.netPnL, 250);
  assert.strictEqual(res.metrics.wins, 2);
  assert.strictEqual(res.metrics.losses, 1);
  assert.strictEqual(res.metrics.winRate, 66.67);
  // PF: grossWinning (300) / abs(grossLosing) (50) = 6.0
  assert.strictEqual(res.metrics.portfolioPF, 6.0);
  assert.strictEqual(res.compatibility.monetaryAggregationEligible, true);
  assert.strictEqual(res.compatibility.currency, 'USD');

  // Verify chronology: t1 close 11:00, t3 close 11:30, t2 close 13:00
  assert.strictEqual(res.timeline[0].symbol, 'EURUSD');
  assert.strictEqual(res.timeline[1].symbol, 'USDJPY');
  assert.strictEqual(res.timeline[2].symbol, 'GBPUSD');
});

// ── Case 2: Exact duplicate report ──────────────────────────────────────────
runTest('Case 2 — Exact duplicate report', () => {
  const rep1 = {
    id: 'rep_dup_1',
    fileName: 'Report_A.html',
    htmlContent: '<html><body>Full Identical Content</body></html>',
    meta: { account: '2001 (USD, Broker)', name: 'Account 2001' },
    reportStats: { balance: 10000, totalNetProfit: 50 },
    timezoneOffset: 2,
    trades: [
      { id: 't1', symbol: 'EURUSD', openTime: new Date('2026-01-01T10:00:00Z'), closeTime: new Date('2026-01-01T11:00:00Z'), profit: 50, commission: 0, swap: 0, netProfit: 50, volume: 1 },
    ],
  };

  const rep2 = {
    id: 'rep_dup_2',
    fileName: 'Report_A_copy.html',
    htmlContent: '<html><body>Full Identical Content</body></html>',
    meta: { account: '2001 (USD, Broker)', name: 'Account 2001' },
    reportStats: { balance: 10000, totalNetProfit: 50 },
    timezoneOffset: 2,
    trades: [
      { id: 't1', symbol: 'EURUSD', openTime: new Date('2026-01-01T10:00:00Z'), closeTime: new Date('2026-01-01T11:00:00Z'), profit: 50, commission: 0, swap: 0, netProfit: 50, volume: 1 },
    ],
  };

  const res = buildPortfolioAnalytics([rep1, rep2]);

  assert.strictEqual(res.compatibility.duplicateReports.length, 1);
  assert.strictEqual(res.metrics.totalReports, 2);
  assert.strictEqual(res.metrics.uniqueReportsProcessed, 1);
  assert.strictEqual(res.metrics.totalTrades, 1, 'Trades should only be counted once');
  assert.strictEqual(res.metrics.netPnL, 50);
});

// ── Case 3: Overlapping reports ─────────────────────────────────────────────
runTest('Case 3 — Overlapping reports (same account, overlapping trades)', () => {
  const tradeA = { id: 'pos_1', symbol: 'EURUSD', openTime: new Date('2026-01-01T10:00:00Z'), closeTime: new Date('2026-01-01T11:00:00Z'), profit: 40, commission: -1, swap: 0, netProfit: 39, volume: 1, openPrice: 1.1, closePrice: 1.104 };
  const tradeB = { id: 'pos_2', symbol: 'GBPUSD', openTime: new Date('2026-01-02T10:00:00Z'), closeTime: new Date('2026-01-02T11:00:00Z'), profit: 60, commission: -1, swap: 0, netProfit: 59, volume: 1, openPrice: 1.2, closePrice: 1.206 };
  const tradeC = { id: 'pos_3', symbol: 'USDCHF', openTime: new Date('2026-01-03T10:00:00Z'), closeTime: new Date('2026-01-03T11:00:00Z'), profit: 20, commission: -1, swap: 0, netProfit: 19, volume: 1, openPrice: 0.9, closePrice: 0.902 };

  const repJan = {
    id: 'rep_jan',
    fileName: 'Account_Jan.html',
    htmlContent: '<html>Jan HTML</html>',
    meta: { account: '3001 (USD, Broker)', name: 'Acc 3001' },
    reportStats: { balance: 10100 },
    timezoneOffset: 2,
    trades: [tradeA, tradeB],
  };

  const repFull = {
    id: 'rep_full',
    fileName: 'Account_Full.html',
    htmlContent: '<html>Full HTML</html>',
    meta: { account: '3001 (USD, Broker)', name: 'Acc 3001' },
    reportStats: { balance: 10120 },
    timezoneOffset: 2,
    trades: [tradeB, tradeC],
  };

  const res = buildPortfolioAnalytics([repJan, repFull]);

  assert.strictEqual(res.metrics.totalAccounts, 1);
  assert.strictEqual(res.compatibility.duplicateTradesRemoved, 1, 'Exact duplicate tradeB should be removed');
  assert.strictEqual(res.metrics.totalTrades, 3, 'Unique trades A, B, C retained');
  assert.strictEqual(res.metrics.netPnL, 39 + 59 + 19);
});

// ── Case 4: Trade conflict ──────────────────────────────────────────────────
runTest('Case 4 — Trade conflict (same ID, materially different profit)', () => {
  const repA = {
    id: 'rep_conf_a',
    fileName: 'Report_A.html',
    htmlContent: '<html>A</html>',
    meta: { account: '4001 (USD, Broker)' },
    reportStats: { balance: 10000 },
    timezoneOffset: 2,
    trades: [
      { id: 'pos_conflict', symbol: 'EURUSD', openTime: new Date('2026-01-01T10:00:00Z'), closeTime: new Date('2026-01-01T11:00:00Z'), profit: 100, commission: 0, swap: 0, netProfit: 100, volume: 1 },
    ],
  };

  const repB = {
    id: 'rep_conf_b',
    fileName: 'Report_B.html',
    htmlContent: '<html>B</html>',
    meta: { account: '4001 (USD, Broker)' },
    reportStats: { balance: 10000 },
    timezoneOffset: 2,
    trades: [
      { id: 'pos_conflict', symbol: 'EURUSD', openTime: new Date('2026-01-01T10:00:00Z'), closeTime: new Date('2026-01-01T11:00:00Z'), profit: 72, commission: 0, swap: 0, netProfit: 72, volume: 1 },
    ],
  };

  const res = buildPortfolioAnalytics([repA, repB]);

  assert.strictEqual(res.compatibility.tradeConflicts.length, 1);
  assert.strictEqual(res.compatibility.excludedAccounts.length, 1);
  assert.strictEqual(res.compatibility.excludedAccounts[0].accountId, '4001');
  assert.strictEqual(res.metrics.eligibleAccounts, 0);
  assert.strictEqual(res.metrics.totalTrades, 0, 'Conflicted account trades excluded');
});

// ── Case 5: Timezone conflict ───────────────────────────────────────────────
runTest('Case 5 — Timezone conflict (same account, differing timezoneOffset)', () => {
  const rep1 = {
    id: 'rep_tz_1',
    fileName: 'Tz1.html',
    htmlContent: '<html>1</html>',
    meta: { account: '5001 (USD, Broker)' },
    reportStats: { balance: 10000 },
    timezoneOffset: 2,
    trades: [{ id: 't1', symbol: 'EURUSD', openTime: new Date(), closeTime: new Date(), profit: 50, commission: 0, swap: 0, volume: 1 }],
  };

  const rep2 = {
    id: 'rep_tz_2',
    fileName: 'Tz2.html',
    htmlContent: '<html>2</html>',
    meta: { account: '5001 (USD, Broker)' },
    reportStats: { balance: 10000 },
    timezoneOffset: 0, // Conflict!
    trades: [{ id: 't2', symbol: 'EURUSD', openTime: new Date(), closeTime: new Date(), profit: 50, commission: 0, swap: 0, volume: 1 }],
  };

  const res = buildPortfolioAnalytics([rep1, rep2]);

  assert.strictEqual(res.compatibility.timezoneConflicts.length, 1);
  assert.strictEqual(res.compatibility.excludedAccounts.length, 1);
  assert.strictEqual(res.compatibility.excludedAccounts[0].accountId, '5001');
  assert.strictEqual(res.accounts[0].status, 'TIMEZONE_CONFLICT');
  assert.strictEqual(res.metrics.totalTrades, 0);
});

// ── Case 6: Mixed currencies ────────────────────────────────────────────────
runTest('Case 6 — Mixed currencies (USD + EUR)', () => {
  const repUSD = {
    id: 'rep_usd',
    fileName: 'USD.html',
    meta: { account: '6001 (USD, Broker)' },
    reportStats: { balance: 10000 },
    timezoneOffset: 2,
    trades: [{ id: 'u1', symbol: 'EURUSD', openTime: new Date('2026-01-01T10:00:00Z'), closeTime: new Date('2026-01-01T11:00:00Z'), profit: 100, commission: 0, swap: 0, volume: 1 }],
  };

  const repEUR = {
    id: 'rep_eur',
    fileName: 'EUR.html',
    meta: { account: '6002 (EUR, Broker)' },
    reportStats: { balance: 10000 },
    timezoneOffset: 2,
    trades: [{ id: 'e1', symbol: 'EURUSD', openTime: new Date('2026-01-01T10:00:00Z'), closeTime: new Date('2026-01-01T11:00:00Z'), profit: -40, commission: 0, swap: 0, volume: 1 }],
  };

  const res = buildPortfolioAnalytics([repUSD, repEUR]);

  assert.strictEqual(res.status, 'MIXED_CURRENCY');
  assert.strictEqual(res.compatibility.monetaryAggregationEligible, false);
  assert.deepStrictEqual(res.compatibility.currenciesDetected.sort(), ['EUR', 'USD']);
  // Non-monetary metrics are still computed
  assert.strictEqual(res.metrics.totalTrades, 2);
  assert.strictEqual(res.metrics.wins, 1);
  assert.strictEqual(res.metrics.losses, 1);
  assert.strictEqual(res.metrics.winRate, 50.0);
  // Monetary metrics are suppressed
  assert.strictEqual(res.metrics.netPnL, null);
  assert.strictEqual(res.metrics.tradingPnL, null);
  assert.strictEqual(res.metrics.portfolioPF, null);
  assert.strictEqual(res.metrics.maxPortfolioPnLDrawdown, null);
});

// ── Case 7: Portfolio PF recomputation ──────────────────────────────────────
runTest('Case 7 — Portfolio PF (grossWinning / abs(grossLosing))', () => {
  const repA = {
    id: 'rep_pf_a',
    fileName: 'PFA.html',
    meta: { account: '7001 (USD, Broker)' },
    reportStats: { balance: 10000 },
    timezoneOffset: 2,
    trades: [
      { id: 't1', symbol: 'EURUSD', openTime: new Date(), closeTime: new Date('2026-01-01T10:00:00Z'), profit: 100, commission: 0, swap: 0, volume: 1 },
      { id: 't2', symbol: 'GBPUSD', openTime: new Date(), closeTime: new Date('2026-01-01T11:00:00Z'), profit: 50, commission: 0, swap: 0, volume: 1 },
    ],
  };

  const repB = {
    id: 'rep_pf_b',
    fileName: 'PFB.html',
    meta: { account: '7002 (USD, Broker)' },
    reportStats: { balance: 10000 },
    timezoneOffset: 2,
    trades: [
      { id: 't3', symbol: 'USDJPY', openTime: new Date(), closeTime: new Date('2026-01-01T12:00:00Z'), profit: -50, commission: 0, swap: 0, volume: 1 },
    ],
  };

  const res = buildPortfolioAnalytics([repA, repB]);

  // Gross win = 100 + 50 = 150
  // Gross loss = 50
  // PF = 150 / 50 = 3.0
  assert.strictEqual(res.metrics.portfolioPF, 3.0);
});

// ── Case 8: Costs (Trading P/L vs Net P/L) ──────────────────────────────────
runTest('Case 8 — Costs (profit = 100, commission = -5, swap = -2)', () => {
  const rep = {
    id: 'rep_cost',
    fileName: 'Cost.html',
    meta: { account: '8001 (USD, Broker)' },
    reportStats: { balance: 10000 },
    timezoneOffset: 2,
    trades: [
      { id: 't1', symbol: 'EURUSD', openTime: new Date(), closeTime: new Date(), profit: 100, commission: -5, swap: -2, volume: 1 },
    ],
  };

  const res = buildPortfolioAnalytics([rep]);

  assert.strictEqual(res.metrics.tradingPnL, 100);
  assert.strictEqual(res.metrics.commission, -5);
  assert.strictEqual(res.metrics.swap, -2);
  assert.strictEqual(res.metrics.netPnL, 93);
});

// ── Case 9: P/L Drawdown calculation ────────────────────────────────────────
runTest('Case 9 — P/L drawdown (exact absolute peak-to-trough)', () => {
  const rep = {
    id: 'rep_dd',
    fileName: 'DD.html',
    meta: { account: '9001 (USD, Broker)' },
    reportStats: { balance: 10000 },
    timezoneOffset: 2,
    trades: [
      { id: 't1', symbol: 'A', openTime: new Date(), closeTime: new Date('2026-01-01T10:00:00Z'), profit: 100, commission: 0, swap: 0, volume: 1 },
      { id: 't2', symbol: 'B', openTime: new Date(), closeTime: new Date('2026-01-01T11:00:00Z'), profit: 50, commission: 0, swap: 0, volume: 1 },
      { id: 't3', symbol: 'C', openTime: new Date(), closeTime: new Date('2026-01-01T12:00:00Z'), profit: -80, commission: 0, swap: 0, volume: 1 },
      { id: 't4', symbol: 'D', openTime: new Date(), closeTime: new Date('2026-01-01T13:00:00Z'), profit: 20, commission: 0, swap: 0, volume: 1 },
      { id: 't5', symbol: 'E', openTime: new Date(), closeTime: new Date('2026-01-01T14:00:00Z'), profit: -50, commission: 0, swap: 0, volume: 1 },
      { id: 't6', symbol: 'F', openTime: new Date(), closeTime: new Date('2026-01-01T15:00:00Z'), profit: 120, commission: 0, swap: 0, volume: 1 },
    ],
  };

  const res = buildPortfolioAnalytics([rep]);

  assert.strictEqual(res.metrics.maxPortfolioPnLDrawdown, 110);
  assert.strictEqual(res.metrics.portfolioDrawdownPct, null);
});

// ── Case 10: Upload-order invariance ────────────────────────────────────────
runTest('Case 10 — Upload-order invariance ([A, B, C] vs [C, A, B])', () => {
  const repA = {
    id: 'rep_ord_a',
    fileName: 'A.html',
    meta: { account: '10001 (USD, Broker)' },
    reportStats: { balance: 10000 },
    timezoneOffset: 2,
    trades: [
      { id: 'ta1', symbol: 'EURUSD', openTime: new Date('2026-01-01T08:00:00Z'), closeTime: new Date('2026-01-01T10:00:00Z'), profit: 100, commission: 0, swap: 0, volume: 1 },
    ],
  };

  const repB = {
    id: 'rep_ord_b',
    fileName: 'B.html',
    meta: { account: '10002 (USD, Broker)' },
    reportStats: { balance: 15000 },
    timezoneOffset: 2,
    trades: [
      { id: 'tb1', symbol: 'GBPUSD', openTime: new Date('2026-01-01T09:00:00Z'), closeTime: new Date('2026-01-01T12:00:00Z'), profit: -30, commission: 0, swap: 0, volume: 1 },
    ],
  };

  const repC = {
    id: 'rep_ord_c',
    fileName: 'C.html',
    meta: { account: '10003 (USD, Broker)' },
    reportStats: { balance: 20000 },
    timezoneOffset: 2,
    trades: [
      { id: 'tc1', symbol: 'USDJPY', openTime: new Date('2026-01-01T07:00:00Z'), closeTime: new Date('2026-01-01T11:00:00Z'), profit: 45, commission: 0, swap: 0, volume: 1 },
    ],
  };

  const res1 = buildPortfolioAnalytics([repA, repB, repC]);
  const res2 = buildPortfolioAnalytics([repC, repA, repB]);

  assert.strictEqual(res1.metrics.netPnL, res2.metrics.netPnL);
  assert.strictEqual(res1.metrics.portfolioPF, res2.metrics.portfolioPF);
  assert.strictEqual(res1.metrics.winRate, res2.metrics.winRate);
  assert.strictEqual(res1.metrics.maxPortfolioPnLDrawdown, res2.metrics.maxPortfolioPnLDrawdown);

  assert.deepStrictEqual(
    res1.timeline.map(t => `${t.accountId}:${t.symbol}:${t.tradeNetPnL}:${t.cumulativeNetPnL}`),
    res2.timeline.map(t => `${t.accountId}:${t.symbol}:${t.tradeNetPnL}:${t.cumulativeNetPnL}`)
  );
});

// ── Case 11: Same-account normalized-return upload-order invariance (Req #2) ──
runTest('Case 11 — Same-account normalized-return upload-order invariance', () => {
  // Report A (Jan): trades ending in Jan, balance = 10000, trade net = 100
  const repA = {
    id: 'rep_jan',
    fileName: 'Acc_Jan.html',
    htmlContent: '<html>Jan report content</html>',
    meta: { account: '11001 (USD, Broker)' },
    reportStats: { balance: 10000 },
    timezoneOffset: 2,
    trades: [
      { id: 't_jan', symbol: 'EURUSD', type: 'buy', openTime: new Date('2026-01-10T10:00:00Z'), closeTime: new Date('2026-01-10T12:00:00Z'), profit: 100, commission: 0, swap: 0, volume: 1 },
    ],
  };

  // Report B (Feb): trades ending in Feb, balance = 10200, trade net = 100
  const repB = {
    id: 'rep_feb',
    fileName: 'Acc_Feb.html',
    htmlContent: '<html>Feb report content</html>',
    meta: { account: '11001 (USD, Broker)' },
    reportStats: { balance: 10200 },
    timezoneOffset: 2,
    trades: [
      { id: 't_feb', symbol: 'EURUSD', type: 'buy', openTime: new Date('2026-02-10T10:00:00Z'), closeTime: new Date('2026-02-10T12:00:00Z'), profit: 100, commission: 0, swap: 0, volume: 1 },
    ],
  };

  const resOrder1 = buildPortfolioAnalytics([repA, repB]);
  const resOrder2 = buildPortfolioAnalytics([repB, repA]);

  const acc1 = resOrder1.accounts[0];
  const acc2 = resOrder2.accounts[0];

  // Latest coverage end is Feb (closeTime 2026-02-10). Ending balance authority must be repB (10200) regardless of upload order.
  // total net P/L for account = 100 + 100 = 200
  // estimatedStartBalance = 10200 - 200 = 10000
  // returnPct = (200 / 10000) * 100 = 2.00%
  assert.strictEqual(acc1.estimatedStartBalance, 10000);
  assert.strictEqual(acc2.estimatedStartBalance, 10000);
  assert.strictEqual(acc1.returnPct, 2.0);
  assert.strictEqual(acc2.returnPct, 2.0);
  assert.strictEqual(acc1.endingBalanceAuthorityReportId, 'rep_feb');
  assert.strictEqual(acc2.endingBalanceAuthorityReportId, 'rep_feb');
});

// ── Case 12: Commission conflict (Req #4) ───────────────────────────────────
runTest('Case 12 — Commission conflict', () => {
  const repA = {
    id: 'rep_comm_a',
    fileName: 'CommA.html',
    htmlContent: '<html>CommA</html>',
    meta: { account: '12001 (USD, Broker)' },
    reportStats: { balance: 10000 },
    timezoneOffset: 2,
    trades: [
      { id: 'pos_123', symbol: 'EURUSD', type: 'buy', openTime: new Date('2026-01-01T10:00:00Z'), closeTime: new Date('2026-01-01T11:00:00Z'), volume: 1, openPrice: 1.1, closePrice: 1.11, profit: 100, commission: -1, swap: 0 },
    ],
  };

  const repB = {
    id: 'rep_comm_b',
    fileName: 'CommB.html',
    htmlContent: '<html>CommB</html>',
    meta: { account: '12001 (USD, Broker)' },
    reportStats: { balance: 10000 },
    timezoneOffset: 2,
    trades: [
      { id: 'pos_123', symbol: 'EURUSD', type: 'buy', openTime: new Date('2026-01-01T10:00:00Z'), closeTime: new Date('2026-01-01T11:00:00Z'), volume: 1, openPrice: 1.1, closePrice: 1.11, profit: 100, commission: -9, swap: 0 }, // Conflict!
    ],
  };

  const res = buildPortfolioAnalytics([repA, repB]);

  assert.strictEqual(res.compatibility.tradeConflicts.length, 1);
  assert.strictEqual(res.compatibility.excludedAccounts.length, 1);
  assert.strictEqual(res.accounts[0].status, 'TRADE_CONFLICT');
  assert.strictEqual(res.metrics.totalTrades, 0, 'Conflicted account must be excluded');
});

// ── Case 13: Swap conflict (Req #4) ─────────────────────────────────────────
runTest('Case 13 — Swap conflict', () => {
  const repA = {
    id: 'rep_swap_a',
    fileName: 'SwapA.html',
    htmlContent: '<html>SwapA</html>',
    meta: { account: '13001 (USD, Broker)' },
    reportStats: { balance: 10000 },
    timezoneOffset: 2,
    trades: [
      { id: 'pos_456', symbol: 'EURUSD', type: 'buy', openTime: new Date('2026-01-01T10:00:00Z'), closeTime: new Date('2026-01-01T11:00:00Z'), volume: 1, openPrice: 1.1, closePrice: 1.11, profit: 100, commission: -2, swap: 0 },
    ],
  };

  const repB = {
    id: 'rep_swap_b',
    fileName: 'SwapB.html',
    htmlContent: '<html>SwapB</html>',
    meta: { account: '13001 (USD, Broker)' },
    reportStats: { balance: 10000 },
    timezoneOffset: 2,
    trades: [
      { id: 'pos_456', symbol: 'EURUSD', type: 'buy', openTime: new Date('2026-01-01T10:00:00Z'), closeTime: new Date('2026-01-01T11:00:00Z'), volume: 1, openPrice: 1.1, closePrice: 1.11, profit: 100, commission: -2, swap: -4 }, // Differing swap
    ],
  };

  const res = buildPortfolioAnalytics([repA, repB]);

  assert.strictEqual(res.compatibility.tradeConflicts.length, 1);
  assert.strictEqual(res.accounts[0].status, 'TRADE_CONFLICT');
  assert.strictEqual(res.metrics.totalTrades, 0);
});

// ── Case 14: Duplicate HTML with differing timezone (Req #5 & #6) ───────────
runTest('Case 14 — Duplicate HTML with differing timezone (TIMEZONE_CONFLICT wins)', () => {
  const rawHtml = '<html><body>Exact Identical Report File Content</body></html>';

  const repA = {
    id: 'rep_tz_dup_a',
    fileName: 'Report_A.html',
    htmlContent: rawHtml,
    meta: { account: '14001 (USD, Broker)' },
    reportStats: { balance: 10000 },
    timezoneOffset: 0, // UTC+0
    trades: [{ id: 't1', symbol: 'EURUSD', openTime: new Date(), closeTime: new Date(), profit: 50, commission: 0, swap: 0, volume: 1 }],
  };

  const repB = {
    id: 'rep_tz_dup_b',
    fileName: 'Report_B.html',
    htmlContent: rawHtml,
    meta: { account: '14001 (USD, Broker)' },
    reportStats: { balance: 10000 },
    timezoneOffset: 2, // UTC+2
    trades: [{ id: 't1', symbol: 'EURUSD', openTime: new Date(), closeTime: new Date(), profit: 50, commission: 0, swap: 0, volume: 1 }],
  };

  // Test [A, B]
  const res1 = buildPortfolioAnalytics([repA, repB]);
  assert.strictEqual(res1.accounts[0].status, 'TIMEZONE_CONFLICT', 'Timezone conflict must win over duplicate suppression');
  assert.strictEqual(res1.compatibility.timezoneConflicts.length, 1);
  assert.strictEqual(res1.metrics.totalTrades, 0);

  // Test reversed [B, A]
  const res2 = buildPortfolioAnalytics([repB, repA]);
  assert.strictEqual(res2.accounts[0].status, 'TIMEZONE_CONFLICT');
  assert.strictEqual(res2.compatibility.timezoneConflicts.length, 1);
  assert.strictEqual(res2.metrics.totalTrades, 0);
});

// ── Case 15: Derived Net P/L ignores inconsistent trade.netProfit (Req #7 & #8)
runTest('Case 15 — Derived Net P/L ignores inconsistent trade.netProfit', () => {
  const rep = {
    id: 'rep_inconsistent_net',
    fileName: 'Inconsistent.html',
    meta: { account: '15001 (USD, Broker)' },
    reportStats: { balance: 10000 },
    timezoneOffset: 2,
    trades: [
      {
        id: 't_bad_net',
        symbol: 'EURUSD',
        openTime: new Date(),
        closeTime: new Date('2026-01-01T12:00:00Z'),
        profit: 100,
        commission: -5,
        swap: -2,
        netProfit: 999, // Inconsistent field in source object
        volume: 1,
      },
    ],
  };

  const res = buildPortfolioAnalytics([rep]);

  // Derived Net P/L must be 100 + (-5) + (-2) = 93, NOT 999!
  assert.strictEqual(res.metrics.netPnL, 93);
  assert.strictEqual(res.timeline[0].tradeNetPnL, 93);
  assert.strictEqual(res.timeline[0].cumulativeNetPnL, 93);
  assert.strictEqual(res.dailyPnL[0].netPnL, 93);
  assert.strictEqual(res.monthlyPnL[0].netPnL, 93);
  assert.strictEqual(res.accounts[0].netPnL, 93);
});

// ── Case 16: Deterministic low-confidence identity (Req #9 & #10) ───────────
runTest('Case 16 — Deterministic low-confidence identity (no Math.random())', () => {
  const repAmbiguous = {
    id: 'rep_ambig_test_123',
    fileName: 'Ambiguous_No_Meta.html',
    htmlContent: '<html><body>No account info here</body></html>',
    meta: {}, // No account, name, or company
    reportStats: {},
    timezoneOffset: 2,
    trades: [],
  };

  const repOther = {
    id: 'rep_other',
    fileName: 'Other.html',
    meta: { account: '16002 (USD)' },
    reportStats: { balance: 5000 },
    timezoneOffset: 2,
    trades: [],
  };

  const id1 = extractAccountIdentity(repAmbiguous).normalizedAccountId;
  const id2 = extractAccountIdentity(repAmbiguous).normalizedAccountId;
  assert.strictEqual(id1, id2, 'Identity must be byte-identical on repeated runs');
  assert.ok(!id1.includes('NaN') && !id1.includes('undefined'));

  // Test across multiple engine runs with permutations
  const res1 = buildPortfolioAnalytics([repAmbiguous, repOther]);
  const res2 = buildPortfolioAnalytics([repOther, repAmbiguous]);

  const ambigAcc1 = res1.accounts.find(a => a.identityConfidence === 'LOW');
  const ambigAcc2 = res2.accounts.find(a => a.identityConfidence === 'LOW');
  assert.strictEqual(ambigAcc1.accountId, ambigAcc2.accountId);
  assert.strictEqual(ambigAcc1.identityConfidence, 'LOW');
});

// ── Case 17: Balance-basis conflict (Req #17) ───────────────────────────────
runTest('Case 17 — Balance-basis conflict', () => {
  const commonCloseTime = new Date('2026-03-01T15:00:00Z');

  // Report A ends at commonCloseTime with balance 10,000
  const repA = {
    id: 'rep_bal_a',
    fileName: 'BalA.html',
    htmlContent: '<html>BalA</html>',
    meta: { account: '17001 (USD, Broker)' },
    reportStats: { balance: 10000 },
    timezoneOffset: 2,
    trades: [
      { id: 't1', symbol: 'EURUSD', openTime: new Date('2026-03-01T10:00:00Z'), closeTime: commonCloseTime, profit: 50, commission: 0, swap: 0, volume: 1 },
    ],
  };

  // Report B ends at same commonCloseTime but reports conflicting ending balance 10,500
  const repB = {
    id: 'rep_bal_b',
    fileName: 'BalB.html',
    htmlContent: '<html>BalB</html>',
    meta: { account: '17001 (USD, Broker)' },
    reportStats: { balance: 10500 }, // Conflicting balance!
    timezoneOffset: 2,
    trades: [
      { id: 't2', symbol: 'GBPUSD', openTime: new Date('2026-03-01T11:00:00Z'), closeTime: commonCloseTime, profit: 50, commission: 0, swap: 0, volume: 1 },
    ],
  };

  const res = buildPortfolioAnalytics([repA, repB]);

  const acc = res.accounts[0];
  assert.strictEqual(acc.balanceBasisEligible, false);
  assert.strictEqual(acc.balanceBasisConflict, true);
  assert.strictEqual(acc.balanceBasis, 'BALANCE_BASIS_CONFLICT');
  assert.strictEqual(acc.estimatedStartBalance, null);
  assert.strictEqual(acc.returnPct, null);
  // Trades remain eligible for portfolio P/L because trades themselves do not conflict
  assert.strictEqual(acc.status, 'ELIGIBLE');
  assert.strictEqual(res.metrics.totalTrades, 2);
  assert.strictEqual(res.metrics.netPnL, 100);
});

// ── Case 18: Same-account overlapping report permutation invariance (Req #16 & #18) ──
runTest('Case 18 — Same-account overlapping report permutation invariance', () => {
  const trade1 = { id: 't1', symbol: 'EURUSD', openTime: new Date('2026-01-01T10:00:00Z'), closeTime: new Date('2026-01-01T11:00:00Z'), profit: 40, commission: -1, swap: 0, volume: 1 };
  const trade2 = { id: 't2', symbol: 'GBPUSD', openTime: new Date('2026-01-02T10:00:00Z'), closeTime: new Date('2026-01-02T11:00:00Z'), profit: 60, commission: -2, swap: -1, volume: 1 };
  const trade3 = { id: 't3', symbol: 'USDCHF', openTime: new Date('2026-01-03T10:00:00Z'), closeTime: new Date('2026-01-03T11:00:00Z'), profit: -30, commission: -1, swap: 0, volume: 1 };

  const rep1 = {
    id: 'rep_sub1',
    fileName: 'Part1.html',
    htmlContent: '<html>Part1</html>',
    meta: { account: '18001 (USD, Broker)' },
    reportStats: { balance: 10037 },
    timezoneOffset: 2,
    trades: [trade1, trade2],
  };

  const rep2 = {
    id: 'rep_sub2',
    fileName: 'Part2.html',
    htmlContent: '<html>Part2</html>',
    meta: { account: '18001 (USD, Broker)' },
    reportStats: { balance: 10065 }, // Latest ending balance
    timezoneOffset: 2,
    trades: [trade2, trade3], // trade2 is overlapping
  };

  const resOrder1 = buildPortfolioAnalytics([rep1, rep2]);
  const resOrder2 = buildPortfolioAnalytics([rep2, rep1]);

  // All metrics, ledger, starting balance, return % must be byte-for-byte identical
  assert.strictEqual(resOrder1.metrics.totalTrades, resOrder2.metrics.totalTrades);
  assert.strictEqual(resOrder1.metrics.netPnL, resOrder2.metrics.netPnL);
  assert.strictEqual(resOrder1.metrics.portfolioPF, resOrder2.metrics.portfolioPF);
  assert.strictEqual(resOrder1.metrics.winRate, resOrder2.metrics.winRate);
  assert.strictEqual(resOrder1.accounts[0].estimatedStartBalance, resOrder2.accounts[0].estimatedStartBalance);
  assert.strictEqual(resOrder1.accounts[0].returnPct, resOrder2.accounts[0].returnPct);
  assert.strictEqual(resOrder1.accounts[0].endingBalanceAuthorityReportId, resOrder2.accounts[0].endingBalanceAuthorityReportId);

  assert.deepStrictEqual(
    resOrder1.timeline.map(t => `${t.dailyDate}:${t.tradeNetPnL}:${t.cumulativeNetPnL}`),
    resOrder2.timeline.map(t => `${t.dailyDate}:${t.tradeNetPnL}:${t.cumulativeNetPnL}`)
  );
});

// ── Currency Formatter Validation (Req #19) ─────────────────────────────────
runTest('Currency Formatter — USD, EUR, GBP, JPY verification', () => {
  const usdFmt = formatCurrency(1250, 'USD');
  const eurFmt = formatCurrency(1250, 'EUR');
  const gbpFmt = formatCurrency(1250, 'GBP');
  const jpyFmt = formatCurrency(1250, 'JPY');

  assert.ok(usdFmt.includes('$') || usdFmt.includes('USD'), `USD formatted: ${usdFmt}`);
  assert.ok(eurFmt.includes('€') || eurFmt.includes('EUR'), `EUR formatted: ${eurFmt}`);
  assert.ok(!eurFmt.includes('$'), 'EUR format must not contain $');
  assert.ok(gbpFmt.includes('£') || gbpFmt.includes('GBP'), `GBP formatted: ${gbpFmt}`);
  assert.ok(!gbpFmt.includes('$'), 'GBP format must not contain $');
  assert.ok(jpyFmt.includes('¥') || jpyFmt.includes('JPY'), `JPY formatted: ${jpyFmt}`);
  assert.ok(!jpyFmt.includes('$'), 'JPY format must not contain $');

  // Negative and signed options
  assert.strictEqual(formatCurrency(-350.5, 'USD'), '-$350.50');
  assert.strictEqual(formatCurrency(500, 'EUR', { showSign: true }), '+€500.00');
  assert.strictEqual(formatCurrency(null, 'USD'), 'N/A');

  // Zero-fraction digits option (e.g. integer charts / axes)
  assert.strictEqual(formatCurrency(1250, 'USD', { maximumFractionDigits: 0 }), '$1,250');
  assert.strictEqual(formatCurrency(1250, 'EUR', { maximumFractionDigits: 0 }), '€1,250');
});

console.log(`\nAll ${passedTests}/${totalTests} tests passed successfully!\n`);
