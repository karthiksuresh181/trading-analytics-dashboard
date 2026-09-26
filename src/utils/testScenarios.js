// Pure synthetic scenarios for dev testing and certification verification

function makeSyntheticReport({ id, fileName, account, name, currency, balance, trades, timezoneOffset = 2 }) {
  const closedTradesCount = trades.length;
  const grossProfit = trades.reduce((sum, t) => sum + (t.profit > 0 ? t.profit : 0), 0);
  const grossLoss = trades.reduce((sum, t) => sum + (t.profit < 0 ? Math.abs(t.profit) : 0), 0);
  const totalNet = trades.reduce((sum, t) => sum + (t.profit + (t.commission || 0) + (t.swap || 0)), 0);
  const wins = trades.filter(t => t.profit > 0).length;
  const winRate = closedTradesCount > 0 ? (wins / closedTradesCount) * 100 : 0;
  const profitFactor = grossLoss > 0 ? grossProfit / grossLoss : (grossProfit > 0 ? 99.99 : 0);

  return {
    id,
    fileName,
    accountKey: account,
    explicitCurrency: currency,
    meta: {
      account: account.includes('(') ? account : `${account} (${currency}, Demo)`,
      name,
      currency,
      broker: 'MetaQuotes Ltd',
      date: '2026-03-31',
    },
    reportStats: {
      closedTradesCount,
      balance,
    },
    trades: trades.map((t, idx) => ({
      id: idx + 1,
      ticket: t.ticket || (10000 + idx),
      order: t.ticket || (10000 + idx),
      position: t.ticket || (10000 + idx),
      symbol: t.symbol || 'EURUSD',
      type: t.type || 'buy',
      volume: t.volume || 1.0,
      openTime: t.openTime || '2026-03-01 10:00:00',
      closeTime: t.closeTime || '2026-03-01 12:00:00',
      openPrice: t.openPrice || 1.0850,
      closePrice: t.closePrice || 1.0900,
      profit: t.profit,
      commission: t.commission || 0,
      swap: t.swap || 0,
      netProfit: t.profit + (t.commission || 0) + (t.swap || 0),
    })),
    metrics: {
      netProfit: totalNet,
      grossProfit,
      grossLoss,
      profitFactor,
      winRate,
      totalTrades: closedTradesCount,
    },
    timezoneOffset,
    htmlContent: `<html><title>${fileName}</title><body>Report for ${account} (${currency}) with ${trades.length} trades.</body></html>`,
    importedAt: Date.now(),
  };
}

export const DEV_SCENARIOS = {
  usd: [
    makeSyntheticReport({
      id: 'rep_usd_1',
      fileName: 'Alpha_USD_Main.html',
      account: '26222026',
      name: 'Alpha Growth Fund',
      currency: 'USD',
      balance: 10618,
      trades: [
        { ticket: 101, symbol: 'EURUSD', type: 'buy', volume: 1.0, openTime: '2026-03-02 09:00:00', closeTime: '2026-03-02 14:00:00', profit: 450, commission: -10, swap: -2 },
        { ticket: 102, symbol: 'GBPUSD', type: 'sell', volume: 1.5, openTime: '2026-03-08 10:00:00', closeTime: '2026-03-08 16:30:00', profit: -120, commission: -6, swap: 0 },
        { ticket: 103, symbol: 'USDJPY', type: 'buy', volume: 1.0, openTime: '2026-03-15 08:30:00', closeTime: '2026-03-15 17:00:00', profit: 310, commission: -5, swap: -1 },
      ],
    }),
    makeSyntheticReport({
      id: 'rep_usd_2',
      fileName: 'Beta_USD_Yield.html',
      account: '26222099',
      name: 'Beta Yield Core',
      currency: 'USD',
      balance: 25950,
      trades: [
        { ticket: 201, symbol: 'AUDUSD', type: 'buy', volume: 2.0, openTime: '2026-03-05 07:00:00', closeTime: '2026-03-05 15:00:00', profit: 380, commission: -8, swap: 0 },
        { ticket: 202, symbol: 'XAUUSD', type: 'buy', volume: 0.5, openTime: '2026-03-18 12:00:00', closeTime: '2026-03-18 20:00:00', profit: 590, commission: -12, swap: -4 },
      ],
    }),
  ],

  eur: [
    makeSyntheticReport({
      id: 'rep_eur_1',
      fileName: 'Europa_Alpha_Main.html',
      account: 'EUR_001',
      name: 'Europa Alpha',
      currency: 'EUR',
      balance: 15645,
      trades: [
        { ticket: 301, symbol: 'EURUSD', type: 'buy', volume: 1.5, openTime: '2026-03-04 08:00:00', closeTime: '2026-03-04 13:00:00', profit: 420, commission: -8, swap: -2 },
        { ticket: 302, symbol: 'EURGBP', type: 'sell', volume: 2.0, openTime: '2026-03-11 09:30:00', closeTime: '2026-03-11 16:00:00', profit: 260, commission: -6, swap: 0 },
        { ticket: 303, symbol: 'EURJPY', type: 'buy', volume: 1.0, openTime: '2026-03-19 10:00:00', closeTime: '2026-03-19 18:00:00', profit: 340, commission: -5, swap: -1 },
      ],
    }),
    makeSyntheticReport({
      id: 'rep_eur_2',
      fileName: 'Europa_Beta_Core.html',
      account: 'EUR_002',
      name: 'Europa Beta',
      currency: 'EUR',
      balance: 28410,
      trades: [
        { ticket: 401, symbol: 'GER40', type: 'buy', volume: 1.0, openTime: '2026-03-07 08:30:00', closeTime: '2026-03-07 14:30:00', profit: 580, commission: -10, swap: -3 },
        { ticket: 402, symbol: 'EURCHF', type: 'sell', volume: 1.5, openTime: '2026-03-16 11:00:00', closeTime: '2026-03-16 17:00:00', profit: -130, commission: -5, swap: 0 },
      ],
    }),
  ],

  mixed: [
    makeSyntheticReport({
      id: 'rep_mix_usd',
      fileName: 'Account_US_Alpha.html',
      account: '26222026',
      name: 'Alpha USD Strategy',
      currency: 'USD',
      balance: 10618,
      trades: [
        { ticket: 501, symbol: 'EURUSD', type: 'buy', volume: 1.0, openTime: '2026-03-02 09:00:00', closeTime: '2026-03-02 14:00:00', profit: 500, commission: -10, swap: -2 },
      ],
    }),
    makeSyntheticReport({
      id: 'rep_mix_eur',
      fileName: 'Account_EU_Beta.html',
      account: 'EUR_001',
      name: 'Beta EUR Strategy',
      currency: 'EUR',
      balance: 15300,
      trades: [
        { ticket: 601, symbol: 'EURUSD', type: 'buy', volume: 1.0, openTime: '2026-03-04 08:00:00', closeTime: '2026-03-04 13:00:00', profit: 300, commission: -5, swap: -1 },
      ],
    }),
  ],

  multi: [
    makeSyntheticReport({
      id: 'rep_multi_1a',
      fileName: 'A026_Jan_2026.html',
      account: '26222026',
      name: 'Alpha Prime',
      currency: 'USD',
      balance: 10390,
      trades: [
        { ticket: 701, symbol: 'EURUSD', type: 'buy', volume: 1.0, openTime: '2026-01-10 10:00:00', closeTime: '2026-01-10 16:00:00', profit: 250, commission: -6, swap: -1 },
        { ticket: 702, symbol: 'GBPUSD', type: 'buy', volume: 1.0, openTime: '2026-01-20 11:00:00', closeTime: '2026-01-20 17:00:00', profit: 160, commission: -5, swap: 0 },
      ],
    }),
    makeSyntheticReport({
      id: 'rep_multi_1b',
      fileName: 'A026_Feb_2026.html',
      account: '26222026',
      name: 'Alpha Prime',
      currency: 'USD',
      balance: 10780,
      trades: [
        { ticket: 703, symbol: 'EURUSD', type: 'sell', volume: 1.2, openTime: '2026-02-05 09:00:00', closeTime: '2026-02-05 15:00:00', profit: 410, commission: -8, swap: -2 },
      ],
    }),
    makeSyntheticReport({
      id: 'rep_multi_1c',
      fileName: 'A026_FullHistory.html',
      account: '26222026',
      name: 'Alpha Prime',
      currency: 'USD',
      balance: 11180,
      trades: [
        // Includes duplicate of 701, 702, 703 + new March trade 704
        { ticket: 701, symbol: 'EURUSD', type: 'buy', volume: 1.0, openTime: '2026-01-10 10:00:00', closeTime: '2026-01-10 16:00:00', profit: 250, commission: -6, swap: -1 },
        { ticket: 702, symbol: 'GBPUSD', type: 'buy', volume: 1.0, openTime: '2026-01-20 11:00:00', closeTime: '2026-01-20 17:00:00', profit: 160, commission: -5, swap: 0 },
        { ticket: 703, symbol: 'EURUSD', type: 'sell', volume: 1.2, openTime: '2026-02-05 09:00:00', closeTime: '2026-02-05 15:00:00', profit: 410, commission: -8, swap: -2 },
        { ticket: 704, symbol: 'USDJPY', type: 'buy', volume: 1.0, openTime: '2026-03-12 10:00:00', closeTime: '2026-03-12 18:00:00', profit: 420, commission: -8, swap: -2 },
      ],
    }),
    makeSyntheticReport({
      id: 'rep_multi_2',
      fileName: 'A099_Beta_Full.html',
      account: '26222099',
      name: 'Beta Core',
      currency: 'USD',
      balance: 21500,
      trades: [
        { ticket: 801, symbol: 'AUDUSD', type: 'buy', volume: 1.5, openTime: '2026-02-15 10:00:00', closeTime: '2026-02-15 16:00:00', profit: 320, commission: -7, swap: 0 },
        { ticket: 802, symbol: 'NZDUSD', type: 'buy', volume: 1.0, openTime: '2026-03-10 11:00:00', closeTime: '2026-03-10 17:00:00', profit: 240, commission: -5, swap: -1 },
      ],
    }),
  ],
};
