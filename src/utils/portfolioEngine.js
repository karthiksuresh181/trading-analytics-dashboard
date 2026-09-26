// ============================================================================
// MT5 Analytics Engine — Phase 2 Portfolio Analytics Engine
// Pure analytical module: No React code, no DOM manipulation, deterministic.
// ============================================================================

/**
 * Normalizes numerical values to standard precision to avoid floating point noise.
 */
export function roundNum(val, decimals = 2) {
  if (typeof val !== 'number' || isNaN(val)) return 0;
  const factor = Math.pow(10, decimals);
  return Math.round(val * factor) / factor;
}

/**
 * Format Date to YYYY-MM-DD (UTC based)
 */
export function formatDateKey(d) {
  if (!d || !(d instanceof Date) || isNaN(d.getTime())) return '';
  return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, '0')}-${String(d.getUTCDate()).padStart(2, '0')}`;
}

/**
 * Format Date to YYYY-MM (UTC based)
 */
export function formatMonthKey(d) {
  if (!d || !(d instanceof Date) || isNaN(d.getTime())) return '';
  return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, '0')}`;
}

/**
 * Fast deterministic string hash (32-bit FNV-1a)
 */
export function fnv1aHash(str) {
  let hash = 0x811c9dc5;
  for (let i = 0; i < str.length; i++) {
    hash ^= str.charCodeAt(i);
    hash = (hash * 0x01000193) >>> 0;
  }
  return hash.toString(16);
}

/**
 * Centralized currency formatter using Intl.NumberFormat.
 * Avoids hardcoding "$" throughout the dashboard.
 */
export function formatCurrency(value, currencyCode = null, options = {}) {
  if (value === null || value === undefined || isNaN(value)) {
    return 'N/A';
  }

  const num = Number(value);
  const showSign = options.showSign ?? false;
  const sign = num < 0 ? '-' : (showSign && num > 0 ? '+' : '');

  // If no currency code or currency is explicitly null/empty/unverified:
  // Fails closed and never invents a currency symbol (Req #7 & #8)
  if (!currencyCode) {
    let minDigits = options.minimumFractionDigits ?? 2;
    let maxDigits = options.maximumFractionDigits ?? Math.max(minDigits, 2);
    if (options.maximumFractionDigits !== undefined && options.minimumFractionDigits === undefined) {
      minDigits = Math.min(minDigits, maxDigits);
    }
    if (minDigits > maxDigits) maxDigits = minDigits;

    let formattedNum = '';
    try {
      formattedNum = Math.abs(num).toLocaleString('en-US', {
        minimumFractionDigits: minDigits,
        maximumFractionDigits: maxDigits,
      });
    } catch {
      formattedNum = Math.abs(num).toFixed(maxDigits);
    }

    if (options.showUnverifiedLabel) {
      return `${sign}${formattedNum} (unverified)`;
    }
    return `${sign}${formattedNum}`;
  }

  const code = String(currencyCode).toUpperCase().trim();
  const isJpy = code === 'JPY';
  let minDigits = options.minimumFractionDigits ?? (isJpy ? 0 : 2);
  let maxDigits = options.maximumFractionDigits ?? Math.max(minDigits, isJpy ? 0 : 2);
  if (options.maximumFractionDigits !== undefined && options.minimumFractionDigits === undefined) {
    minDigits = Math.min(minDigits, maxDigits);
  }
  if (minDigits > maxDigits) {
    maxDigits = minDigits;
  }

  let formatted = '';
  try {
    const formatter = new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: code,
      minimumFractionDigits: minDigits,
      maximumFractionDigits: maxDigits,
    });
    formatted = formatter.format(Math.abs(num));
  } catch {
    // Fallback if currency code is not a valid ISO 4217 code
    try {
      formatted = `${Math.abs(num).toLocaleString('en-US', { minimumFractionDigits: minDigits, maximumFractionDigits: maxDigits })} ${code}`;
    } catch {
      formatted = `${Math.abs(num).toFixed(maxDigits)} ${code}`;
    }
  }

  return `${sign}${formatted}`;
}

/**
 * Extract normalized account identity, source, and confidence.
 * Guarantees 100% deterministic fallback without Math.random().
 * Correctly normalizes decorated account strings (Req #13, #14, #15, #16).
 */
export function extractAccountIdentity(report) {
  const metaAcc = (report.meta?.account || '').trim();

  // 1. Authoritative account metadata containing leading digits or digits before paren
  if (metaAcc) {
    const candidateStr = metaAcc.includes('(') ? metaAcc.split('(')[0].trim() : metaAcc;
    const numMatches = candidateStr.match(/\d+/g) || [];

    // Exactly one clear numeric sequence before parentheses -> normalize to account number
    // Handles: "100234", "Live-100234", "Account 100234", "Demo#100234" (Req #14)
    if (numMatches.length === 1) {
      return {
        normalizedAccountId: numMatches[0],
        accountIdentitySource: 'META_ACCOUNT_NUMBER',
        accountIdentityConfidence: 'HIGH',
      };
    }

    // Multiple numeric sequences: ambiguous structure (e.g. "Broker 123 / Login 456")
    // Fail conservatively to avoid false account merging (Req #15 & #16)
    if (numMatches.length > 1) {
      return {
        normalizedAccountId: candidateStr.replace(/\s+/g, '_'),
        accountIdentitySource: 'META_ACCOUNT_STRING',
        accountIdentityConfidence: 'MEDIUM',
      };
    }

    // No digits: use non-numeric candidate string
    if (candidateStr) {
      return {
        normalizedAccountId: candidateStr.replace(/\s+/g, '_'),
        accountIdentitySource: 'META_ACCOUNT_STRING',
        accountIdentityConfidence: 'HIGH',
      };
    }
  }

  // 2. Fallback to accountKey if explicitly available and not generic
  if (report.accountKey && report.accountKey !== report.fileName) {
    const keyStr = String(report.accountKey).trim();
    const keyNums = keyStr.match(/\d+/g) || [];
    if (keyNums.length === 1) {
      return {
        normalizedAccountId: keyNums[0],
        accountIdentitySource: 'ACCOUNT_KEY',
        accountIdentityConfidence: 'MEDIUM',
      };
    }
    return {
      normalizedAccountId: keyStr.replace(/\s+/g, '_'),
      accountIdentitySource: 'ACCOUNT_KEY',
      accountIdentityConfidence: 'MEDIUM',
    };
  }

  // 3. Fallback to meta.name
  if (report.meta?.name && report.meta.name.trim()) {
    return {
      normalizedAccountId: report.meta.name.trim().replace(/\s+/g, '_'),
      accountIdentitySource: 'META_NAME',
      accountIdentityConfidence: 'MEDIUM',
    };
  }

  // 4. Pure deterministic low-confidence fallback (Req #9: No Math.random())
  const detFingerprint = fnv1aHash(
    `${report.id || ''}:${report.fileName || ''}:${report.htmlContent ? report.htmlContent.slice(0, 120) : ''}`
  );
  return {
    normalizedAccountId: `ambiguous_${detFingerprint}`,
    accountIdentitySource: 'REPORT_FALLBACK',
    accountIdentityConfidence: 'LOW',
  };
}

/**
 * Extract explicit currency authority.
 * Only verified when currency token is explicitly in the MT5 account string or explicit property.
 * CRITICAL: report.meta.currency is NOT trusted because mt5Engine defaults to 'USD' (Req #2, #3, #4).
 */
export function extractCurrencyAuthority(report) {
  const metaAcc = (report.meta?.account || '').trim();
  const match = metaAcc.match(/\(([A-Za-z]{3})[\s,)]/);
  if (match) {
    return {
      currency: match[1].toUpperCase(),
      currencyVerified: true,
      currencyAuthoritySource: 'META_ACCOUNT',
    };
  }

  // Also check explicitCurrency property if deliberately supplied (Req #5)
  if (report.explicitCurrency && typeof report.explicitCurrency === 'string' && report.explicitCurrency.trim().length === 3) {
    return {
      currency: report.explicitCurrency.trim().toUpperCase(),
      currencyVerified: true,
      currencyAuthoritySource: 'EXPLICIT_PROPERTY',
    };
  }

  return {
    currency: null,
    currencyVerified: false,
    currencyAuthoritySource: null,
  };
}

/**
 * Computes a deterministic content fingerprint for duplicate report detection.
 */
export function computeReportFingerprint(report) {
  if (report.htmlContent && typeof report.htmlContent === 'string' && report.htmlContent.trim().length > 0) {
    return fnv1aHash(report.htmlContent.trim());
  }
  // Fallback composite for synthetic objects
  const { normalizedAccountId } = extractAccountIdentity(report);
  const tradeCount = report.trades ? report.trades.length : 0;
  const balance = report.reportStats?.balance || 0;
  const netProfit = report.reportStats?.totalNetProfit || 0;
  const tradeSignatures = (report.trades || [])
    .map(t => [
      t.id || '',
      t.symbol || '',
      t.volume || '',
      t.profit || '',
      t.commission || '',
      t.swap || '',
      t.openPrice || '',
      t.closePrice || '',
      t.openTime instanceof Date ? t.openTime.getTime() : (t.openTime || ''),
      t.closeTime instanceof Date ? t.closeTime.getTime() : (t.closeTime || ''),
    ].join(':'))
    .join(';');
  return fnv1aHash(`${normalizedAccountId}|${tradeCount}|${balance}|${netProfit}|${tradeSignatures}`);
}

/**
 * Deterministic trade fingerprint for deduplication.
 */
export function getTradeFingerprint(accountId, trade) {
  const openTs = trade.openTime instanceof Date ? trade.openTime.getTime() : new Date(trade.openTime).getTime() || 0;
  const closeTs = trade.closeTime instanceof Date ? trade.closeTime.getTime() : new Date(trade.closeTime).getTime() || 0;
  const norm = (num) => (Math.round((Number(num) || 0) * 10000) / 10000).toFixed(4);

  return [
    accountId,
    String(trade.id || '').trim(),
    String(trade.symbol || '').toUpperCase().trim(),
    String(trade.type || '').toLowerCase().trim(),
    openTs,
    closeTs,
    norm(trade.volume),
    norm(trade.openPrice),
    norm(trade.closePrice),
    norm(trade.profit),
    norm(trade.commission),
    norm(trade.swap),
  ].join('|');
}

/**
 * Checks if two trades for the same account match all required economic and identity fields.
 * Returns { isExactMatch: boolean, conflictReason: string | null }
 */
export function compareTradeEconomics(t1, t2) {
  const normSym1 = String(t1.symbol || '').toUpperCase().trim();
  const normSym2 = String(t2.symbol || '').toUpperCase().trim();
  if (normSym1 !== normSym2) {
    return { isExactMatch: false, conflictReason: `Symbol mismatch: "${normSym1}" vs "${normSym2}"` };
  }

  const normType1 = String(t1.type || '').toLowerCase().trim();
  const normType2 = String(t2.type || '').toLowerCase().trim();
  if (normType1 !== normType2) {
    return { isExactMatch: false, conflictReason: `Direction/type mismatch: "${normType1}" vs "${normType2}"` };
  }

  const open1 = t1.openTime instanceof Date ? t1.openTime.getTime() : new Date(t1.openTime).getTime() || 0;
  const open2 = t2.openTime instanceof Date ? t2.openTime.getTime() : new Date(t2.openTime).getTime() || 0;
  if (Math.abs(open1 - open2) > 1000) {
    return { isExactMatch: false, conflictReason: `Open timestamp mismatch: ${open1} vs ${open2}` };
  }

  const close1 = t1.closeTime instanceof Date ? t1.closeTime.getTime() : new Date(t1.closeTime).getTime() || 0;
  const close2 = t2.closeTime instanceof Date ? t2.closeTime.getTime() : new Date(t2.closeTime).getTime() || 0;
  if (Math.abs(close1 - close2) > 1000) {
    return { isExactMatch: false, conflictReason: `Close timestamp mismatch: ${close1} vs ${close2}` };
  }

  const vol1 = Number(t1.volume) || 0;
  const vol2 = Number(t2.volume) || 0;
  if (Math.abs(vol1 - vol2) > 0.0001) {
    return { isExactMatch: false, conflictReason: `Volume mismatch: ${vol1} vs ${vol2}` };
  }

  const op1 = Number(t1.openPrice) || 0;
  const op2 = Number(t2.openPrice) || 0;
  if (Math.abs(op1 - op2) > 0.0001) {
    return { isExactMatch: false, conflictReason: `Open price mismatch: ${op1} vs ${op2}` };
  }

  const cp1 = Number(t1.closePrice) || 0;
  const cp2 = Number(t2.closePrice) || 0;
  if (Math.abs(cp1 - cp2) > 0.0001) {
    return { isExactMatch: false, conflictReason: `Close price mismatch: ${cp1} vs ${cp2}` };
  }

  const prof1 = Number(t1.profit) || 0;
  const prof2 = Number(t2.profit) || 0;
  if (Math.abs(prof1 - prof2) > 0.001) {
    return { isExactMatch: false, conflictReason: `Profit mismatch: ${prof1} vs ${prof2}` };
  }

  const comm1 = Number(t1.commission) || 0;
  const comm2 = Number(t2.commission) || 0;
  if (Math.abs(comm1 - comm2) > 0.001) {
    return { isExactMatch: false, conflictReason: `Commission mismatch: ${comm1} vs ${comm2}` };
  }

  const swap1 = Number(t1.swap) || 0;
  const swap2 = Number(t2.swap) || 0;
  if (Math.abs(swap1 - swap2) > 0.001) {
    return { isExactMatch: false, conflictReason: `Swap mismatch: ${swap1} vs ${swap2}` };
  }

  return { isExactMatch: true, conflictReason: null };
}

/**
 * Main Portfolio Analytics Engine
 * Pure, deterministic, upload-order invariant.
 */
export function buildPortfolioAnalytics(reports = []) {
  if (!reports || reports.length === 0) {
    return {
      status: 'EMPTY',
      compatibility: {
        monetaryAggregationEligible: false,
        currency: null,
        currenciesDetected: [],
        currencyIssues: ['No reports provided'],
        accountConflicts: [],
        timezoneConflicts: [],
        tradeConflicts: [],
        duplicateReports: [],
        duplicateTradesRemoved: 0,
        excludedAccounts: [],
        warnings: ['No reports loaded in workspace'],
      },
      accounts: [],
      metrics: null,
      timeline: [],
      dailyPnL: [],
      monthlyPnL: [],
      contribution: [],
      normalizedComparison: null,
      warnings: ['No reports loaded in workspace'],
      diagnostics: {
        totalReports: 0,
        uniqueAccounts: 0,
        eligibleAccounts: 0,
        excludedAccounts: 0,
        rawTradesCount: 0,
        canonicalTradesCount: 0,
        duplicateTradesRemoved: 0,
      },
    };
  }

  const warnings = [];

  // ── Step 1: Extract account identity & group ALL reports by account first (Req #5) ──
  // This ensures that timezone consistency is evaluated across ALL loaded reports before duplicate suppression.
  const accountGroupsMap = new Map();

  for (const report of reports) {
    const identity = extractAccountIdentity(report);
    const currencyAuth = extractCurrencyAuthority(report);
    const accId = identity.normalizedAccountId;

    if (identity.accountIdentityConfidence === 'LOW') {
      warnings.push(`Ambiguous account identity for report "${report.fileName}". Treated as isolated account to prevent silent merging.`);
    }

    if (!accountGroupsMap.has(accId)) {
      accountGroupsMap.set(accId, {
        accountId: accId,
        accountLabel: report.meta?.name || report.meta?.account || report.fileName || accId,
        identitySource: identity.accountIdentitySource,
        identityConfidence: identity.accountIdentityConfidence,
        currency: currencyAuth.currency,
        currencyVerified: currencyAuth.currencyVerified,
        currencyAuthoritySource: currencyAuth.currencyAuthoritySource,
        reports: [],
        status: 'ELIGIBLE',
        exclusionReason: null,
      });
    }

    const group = accountGroupsMap.get(accId);
    group.reports.push(report);

    // If any report has verified currency, adopt it
    if (currencyAuth.currencyVerified) {
      if (!group.currencyVerified) {
        group.currency = currencyAuth.currency;
        group.currencyVerified = true;
        group.currencyAuthoritySource = currencyAuth.currencyAuthoritySource;
      } else if (group.currency !== currencyAuth.currency) {
        // Differing currencies across reports for the same account!
        group.status = 'CURRENCY_CONFLICT';
        group.exclusionReason = `Differing currencies (${group.currency} vs ${currencyAuth.currency}) across reports for account ${accId}.`;
      }
    }
  }

  // ── Step 2: Timezone validation across ALL reports in each account group (Req #5 & #6) ──
  // TIMEZONE_CONFLICT must win over duplicate-report suppression.
  const timezoneConflicts = [];
  const excludedAccounts = [];

  for (const [accId, group] of accountGroupsMap.entries()) {
    if (group.status !== 'ELIGIBLE') {
      excludedAccounts.push({
        accountId: accId,
        reason: group.exclusionReason,
        reportIds: group.reports.map(r => r.id),
      });
      continue;
    }

    const tzOffsets = [...new Set(group.reports.map(r => r.timezoneOffset ?? 2))];
    if (tzOffsets.length > 1) {
      group.status = 'TIMEZONE_CONFLICT';
      group.exclusionReason = `Timezone mismatch between reports for account ${accId} (${tzOffsets.map(o => `UTC${o >= 0 ? '+' : ''}${o}`).join(' vs ')}).`;
      timezoneConflicts.push({
        accountId: accId,
        offsets: tzOffsets,
        reportIds: group.reports.map(r => r.id),
        message: group.exclusionReason,
      });
      excludedAccounts.push({
        accountId: accId,
        reason: group.exclusionReason,
        reportIds: group.reports.map(r => r.id),
      });
      warnings.push(`Account ${accId} excluded: ${group.exclusionReason}`);
    }
  }

  // ── Step 3: Duplicate Report Detection within compatible timezone groups ──
  const duplicateReports = [];
  const nonDuplicateReportsByAccount = new Map();

  for (const [accId, group] of accountGroupsMap.entries()) {
    if (group.status !== 'ELIGIBLE') continue;

    const seenFingerprintsInAccount = new Map();
    const validReportsForAcc = [];

    // Sort reports deterministically before duplicate evaluation so upload order doesn't alter primary
    const sortedGroupReports = [...group.reports].sort((a, b) => {
      const nameComp = String(a.fileName ?? '').localeCompare(String(b.fileName ?? ''));
      if (nameComp !== 0) return nameComp;
      return String(a.id ?? '').localeCompare(String(b.id ?? ''));
    });

    for (const report of sortedGroupReports) {
      const fp = computeReportFingerprint(report);
      if (seenFingerprintsInAccount.has(fp)) {
        const original = seenFingerprintsInAccount.get(fp);
        duplicateReports.push({
          reportId: report.id,
          fileName: report.fileName,
          accountId: accId,
          duplicateOfReportId: original.id,
          duplicateOfFileName: original.fileName,
        });
        warnings.push(`Duplicate report detected: "${report.fileName}" is identical to "${original.fileName}". Double-counting prevented in portfolio ledger.`);
      } else {
        seenFingerprintsInAccount.set(fp, report);
        validReportsForAcc.push(report);
      }
    }

    nonDuplicateReportsByAccount.set(accId, validReportsForAcc);
  }

  // ── Step 4: Trade Deduplication and Trade-ID Conflict Detection (Req #3 & #4) ──
  const tradeConflicts = [];
  const canonicalTradesByAccount = new Map();
  let totalDuplicateTradesRemoved = 0;

  for (const [accId, group] of accountGroupsMap.entries()) {
    if (group.status !== 'ELIGIBLE') continue;

    const nonDupReports = nonDuplicateReportsByAccount.get(accId) || [];
    const allAccountTrades = [];

    for (const r of nonDupReports) {
      for (const t of (r.trades || [])) {
        allAccountTrades.push({
          ...t,
          _sourceReportId: r.id,
          _sourceFileName: r.fileName,
        });
      }
    }

    // Sort raw account trades deterministically before dedup (Chronology + deterministic trade fingerprint)
    allAccountTrades.sort((a, b) => {
      const closeA = a.closeTime ? new Date(a.closeTime).getTime() : 0;
      const closeB = b.closeTime ? new Date(b.closeTime).getTime() : 0;
      if (closeA !== closeB) return closeA - closeB;

      const openA = a.openTime ? new Date(a.openTime).getTime() : 0;
      const openB = b.openTime ? new Date(b.openTime).getTime() : 0;
      if (openA !== openB) return openA - openB;

      return String(a.id ?? '').localeCompare(String(b.id ?? ''));
    });

    const canonicalTradesForAcc = [];
    const seenTradesById = new Map();
    const seenTradesByFingerprint = new Map();
    let accountHasTradeConflict = false;

    for (const trade of allAccountTrades) {
      const tradeId = trade.id ? String(trade.id).trim() : null;
      const fp = getTradeFingerprint(accId, trade);

      if (tradeId) {
        if (seenTradesById.has(tradeId)) {
          const existing = seenTradesById.get(tradeId);
          // Compare ALL economic and identity fields (Req #3 & #4)
          const comp = compareTradeEconomics(existing, trade);

          if (!comp.isExactMatch) {
            accountHasTradeConflict = true;
            const conflictDetail = `Trade ID "${tradeId}" in account ${accId} has conflicting trade economics: ${comp.conflictReason} between reports "${existing.sourceFileNames.join(', ')}" and "${trade._sourceFileName}".`;
            tradeConflicts.push({
              accountId: accId,
              tradeId,
              detail: conflictDetail,
              reports: [...new Set([...existing.sourceReportIds, trade._sourceReportId])],
            });
            break;
          } else {
            // Exact match on ID + all authorized economic fields -> Deduplicate
            totalDuplicateTradesRemoved++;
            if (!existing.sourceReportIds.includes(trade._sourceReportId)) {
              existing.sourceReportIds.push(trade._sourceReportId);
            }
            if (!existing.sourceFileNames.includes(trade._sourceFileName)) {
              existing.sourceFileNames.push(trade._sourceFileName);
            }
            continue;
          }
        }
      }

      // Check fingerprint deduplication (e.g. if ID is empty)
      if (seenTradesByFingerprint.has(fp)) {
        const existing = seenTradesByFingerprint.get(fp);
        totalDuplicateTradesRemoved++;
        if (!existing.sourceReportIds.includes(trade._sourceReportId)) {
          existing.sourceReportIds.push(trade._sourceReportId);
        }
        if (!existing.sourceFileNames.includes(trade._sourceFileName)) {
          existing.sourceFileNames.push(trade._sourceFileName);
        }
        continue;
      }

      // Mechanically derive authorized Net P/L: profit + commission + swap (Req #7)
      const p = Number(trade.profit) || 0;
      const c = Number(trade.commission) || 0;
      const s = Number(trade.swap) || 0;
      const derivedNet = roundNum(p + c + s, 2);

      const canonicalTrade = {
        ...trade,
        profit: p,
        commission: c,
        swap: s,
        netProfit: derivedNet, // Authorized derived value (Req #7)
        portfolioAccountId: accId,
        sourceReportIds: [trade._sourceReportId],
        sourceFileNames: [trade._sourceFileName],
        _fingerprint: fp,
      };
      delete canonicalTrade._sourceReportId;
      delete canonicalTrade._sourceFileName;

      canonicalTradesForAcc.push(canonicalTrade);
      seenTradesByFingerprint.set(fp, canonicalTrade);
      if (tradeId) {
        seenTradesById.set(tradeId, canonicalTrade);
      }
    }

    if (accountHasTradeConflict) {
      group.status = 'TRADE_CONFLICT';
      group.exclusionReason = `Conflicting trade economics detected between reports for account ${accId}.`;
      excludedAccounts.push({
        accountId: accId,
        reason: group.exclusionReason,
        reportIds: group.reports.map(r => r.id),
      });
      warnings.push(`Account ${accId} excluded: ${group.exclusionReason}`);
      continue;
    }

    canonicalTradesByAccount.set(accId, canonicalTradesForAcc);
  }

  // ── Step 5: Currency Compatibility across eligible accounts ──
  const eligibleAccountGroups = Array.from(accountGroupsMap.values()).filter(g => g.status === 'ELIGIBLE');
  const detectedCurrencies = Array.from(new Set(eligibleAccountGroups.map(g => g.currency).filter(Boolean)));
  const unverifiedAccounts = eligibleAccountGroups.filter(g => !g.currencyVerified);
  const currencyIssues = [];
  let monetaryAggregationEligible = true;
  let portfolioCurrency = null;

  if (eligibleAccountGroups.length === 0) {
    monetaryAggregationEligible = false;
    currencyIssues.push('No eligible accounts available for aggregation.');
  } else {
    // Check for unverified currency
    if (unverifiedAccounts.length > 0) {
      monetaryAggregationEligible = false;
      const unverifiedNames = unverifiedAccounts.map(g => g.accountLabel).join(', ');
      currencyIssues.push(`Unverified currency authority for account(s): ${unverifiedNames}.`);
      warnings.push(`Monetary portfolio aggregation unavailable: Currency could not be authoritatively verified for ${unverifiedNames}.`);
    }

    // Check for mixed currencies
    if (detectedCurrencies.length > 1) {
      monetaryAggregationEligible = false;
      currencyIssues.push(`Mixed currencies detected: ${detectedCurrencies.join(', ')}.`);
      warnings.push(`Monetary portfolio aggregation unavailable. Mixed currencies detected: ${detectedCurrencies.join(', ')}.`);
    } else if (detectedCurrencies.length === 1 && unverifiedAccounts.length === 0) {
      portfolioCurrency = detectedCurrencies[0];
    } else if (detectedCurrencies.length === 0) {
      monetaryAggregationEligible = false;
      currencyIssues.push('No authoritative currency found.');
    }
  }

  // ── Step 6: Build Canonical Portfolio Ledger & Sort Chronologically ──
  const allCanonicalTrades = [];
  for (const group of eligibleAccountGroups) {
    const accTrades = canonicalTradesByAccount.get(group.accountId) || [];
    allCanonicalTrades.push(...accTrades);
  }

  // Strict chronological sort: 1. Close Time, 2. Open Time, 3. Deterministic Fingerprint
  allCanonicalTrades.sort((a, b) => {
    const closeA = a.closeTime ? new Date(a.closeTime).getTime() : 0;
    const closeB = b.closeTime ? new Date(b.closeTime).getTime() : 0;
    if (closeA !== closeB) return closeA - closeB;

    const openA = a.openTime ? new Date(a.openTime).getTime() : 0;
    const openB = b.openTime ? new Date(b.openTime).getTime() : 0;
    if (openA !== openB) return openA - openB;

    return String(a._fingerprint ?? '').localeCompare(String(b._fingerprint ?? ''));
  });

  // ── Step 7: Win/Loss & Trade Counts (Independent of Currency) ──
  const totalTrades = allCanonicalTrades.length;
  const wins = allCanonicalTrades.filter(t => (t.profit || 0) > 0);
  const losses = allCanonicalTrades.filter(t => (t.profit || 0) < 0);
  const breakeven = allCanonicalTrades.filter(t => (t.profit || 0) === 0);
  const winRate = totalTrades > 0 ? roundNum((wins.length / totalTrades) * 100, 2) : 0;

  // ── Step 8: Monetary Calculations (Only if monetaryAggregationEligible) ──
  let tradingPnL = null;
  let commission = null;
  let swap = null;
  let netPnL = null;
  let grossWinningProfit = null;
  let grossLosingProfit = null;
  let portfolioPF = null;
  let avgWin = null;
  let avgLoss = null;
  let largestWin = null;
  let largestLoss = null;
  let expectancy = null;
  let maxPortfolioPnLDrawdown = null;
  const timeline = [];
  const dailyPnLMap = new Map();
  const monthlyPnLMap = new Map();

  if (monetaryAggregationEligible && totalTrades > 0) {
    let sumTradingPnL = 0;
    let sumCommission = 0;
    let sumSwap = 0;
    let sumNetPnL = 0;
    let sumGrossWin = 0;
    let sumGrossLoss = 0;

    let peakCum = 0;
    let maxDd = 0;
    let runningCum = 0;

    for (const trade of allCanonicalTrades) {
      // Mechanically derived authorized numbers (Req #7)
      const p = Number(trade.profit) || 0;
      const c = Number(trade.commission) || 0;
      const s = Number(trade.swap) || 0;
      const net = roundNum(p + c + s, 2);

      sumTradingPnL += p;
      sumCommission += c;
      sumSwap += s;
      sumNetPnL += net;

      if (p > 0) sumGrossWin += p;
      if (p < 0) sumGrossLoss += p;

      runningCum += net;
      if (runningCum > peakCum) peakCum = runningCum;
      const dd = peakCum - runningCum;
      if (dd > maxDd) maxDd = dd;

      const closeDate = trade.closeTime ? new Date(trade.closeTime) : null;
      const dateKey = closeDate ? formatDateKey(closeDate) : '';
      const monthKey = closeDate ? formatMonthKey(closeDate) : '';

      // Timeline point
      timeline.push({
        timestamp: closeDate ? closeDate.getTime() : 0,
        dailyDate: dateKey,
        accountId: trade.portfolioAccountId,
        symbol: trade.symbol || '',
        tradeNetPnL: net,
        cumulativeNetPnL: roundNum(runningCum, 2),
      });

      // Daily aggregation
      if (dateKey) {
        if (!dailyPnLMap.has(dateKey)) {
          dailyPnLMap.set(dateKey, {
            date: dateKey,
            tradingPnL: 0,
            commission: 0,
            swap: 0,
            netPnL: 0,
            tradeCount: 0,
          });
        }
        const day = dailyPnLMap.get(dateKey);
        day.tradingPnL += p;
        day.commission += c;
        day.swap += s;
        day.netPnL += net;
        day.tradeCount += 1;
      }

      // Monthly aggregation
      if (monthKey) {
        if (!monthlyPnLMap.has(monthKey)) {
          monthlyPnLMap.set(monthKey, {
            month: monthKey,
            netPnL: 0,
            tradeCount: 0,
            winningTrades: 0,
            losingTrades: 0,
          });
        }
        const m = monthlyPnLMap.get(monthKey);
        m.netPnL += net;
        m.tradeCount += 1;
        if (p > 0) m.winningTrades += 1;
        if (p < 0) m.losingTrades += 1;
      }
    }

    tradingPnL = roundNum(sumTradingPnL, 2);
    commission = roundNum(sumCommission, 2);
    swap = roundNum(sumSwap, 2);
    netPnL = roundNum(sumNetPnL, 2);
    grossWinningProfit = roundNum(sumGrossWin, 2);
    grossLosingProfit = roundNum(sumGrossLoss, 2);

    portfolioPF = Math.abs(sumGrossLoss) > 0
      ? roundNum(Math.abs(sumGrossWin / sumGrossLoss), 2)
      : sumGrossWin > 0 ? Infinity : 0;

    avgWin = wins.length > 0 ? roundNum(sumGrossWin / wins.length, 2) : 0;
    avgLoss = losses.length > 0 ? roundNum(sumGrossLoss / losses.length, 2) : 0;
    largestWin = wins.length > 0 ? roundNum(Math.max(...wins.map(t => Number(t.profit) || 0)), 2) : 0;
    largestLoss = losses.length > 0 ? roundNum(Math.min(...losses.map(t => Number(t.profit) || 0)), 2) : 0;

    // Expectancy
    expectancy = roundNum(((winRate / 100) * avgWin) - ((1 - (winRate / 100)) * Math.abs(avgLoss)), 2);
    maxPortfolioPnLDrawdown = roundNum(maxDd, 2);
  }

  // Sorted daily & monthly PnL
  const dailyPnL = Array.from(dailyPnLMap.values())
    .map(d => ({
      ...d,
      tradingPnL: roundNum(d.tradingPnL, 2),
      commission: roundNum(d.commission, 2),
      swap: roundNum(d.swap, 2),
      netPnL: roundNum(d.netPnL, 2),
    }))
    .sort((a, b) => a.date.localeCompare(b.date));

  const monthlyPnL = Array.from(monthlyPnLMap.values())
    .map(m => ({
      ...m,
      netPnL: roundNum(m.netPnL, 2),
    }))
    .sort((a, b) => a.month.localeCompare(b.month));

  // ── Step 9: Account Details, Chronological Ending Balance & Normalized Curves (Req #2 & #17) ──
  const accountSummaries = [];
  const normalizedSeries = [];

  for (const group of accountGroupsMap.values()) {
    const accTrades = canonicalTradesByAccount.get(group.accountId) || [];
    const accWins = accTrades.filter(t => (t.profit || 0) > 0);
    const accLosses = accTrades.filter(t => (t.profit || 0) < 0);
    const accWinRate = accTrades.length > 0 ? roundNum((accWins.length / accTrades.length) * 100, 2) : 0;

    let accTradingPnL = 0;
    let accNetPnL = 0;
    let accGrossWin = 0;
    let accGrossLoss = 0;

    for (const t of accTrades) {
      const p = Number(t.profit) || 0;
      const c = Number(t.commission) || 0;
      const s = Number(t.swap) || 0;
      const net = roundNum(p + c + s, 2);
      accTradingPnL += p;
      accNetPnL += net;
      if (p > 0) accGrossWin += p;
      if (p < 0) accGrossLoss += p;
    }

    accTradingPnL = roundNum(accTradingPnL, 2);
    accNetPnL = roundNum(accNetPnL, 2);
    accGrossWin = roundNum(accGrossWin, 2);
    accGrossLoss = roundNum(accGrossLoss, 2);

    const accPF = Math.abs(accGrossLoss) > 0
      ? roundNum(Math.abs(accGrossWin / accGrossLoss), 2)
      : accGrossWin > 0 ? Infinity : 0;

    // Date coverage
    const tradeCloseDates = accTrades.map(t => t.closeTime ? new Date(t.closeTime).getTime() : 0).filter(Boolean);
    const minDate = tradeCloseDates.length > 0 ? new Date(Math.min(...tradeCloseDates)) : null;
    const maxDate = tradeCloseDates.length > 0 ? new Date(Math.max(...tradeCloseDates)) : null;
    const coverage = minDate && maxDate
      ? `${formatDateKey(minDate)} to ${formatDateKey(maxDate)}`
      : 'N/A';
    const coverageEnd = maxDate ? maxDate.getTime() : 0;

    // ── Deterministic Chronological Ending Balance Selection (Req #2 & #17) ──
    let estimatedStartBalance = null;
    let balanceBasisEligible = false;
    let balanceBasisConflict = false;
    let balanceBasis = 'INELIGIBLE';
    let returnPct = null;
    let endingBalanceAuthorityReportId = null;

    // Gather all source reports that carry a valid ending balance
    const reportsWithBalance = group.reports
      .filter(r => r.reportStats && typeof r.reportStats.balance === 'number' && r.reportStats.balance > 0)
      .map(r => {
        const rCloseTimes = (r.trades || []).map(t => t.closeTime ? new Date(t.closeTime).getTime() : 0).filter(Boolean);
        const rEnd = rCloseTimes.length > 0 ? Math.max(...rCloseTimes) : 0;
        return {
          reportId: r.id,
          fileName: r.fileName,
          balance: Number(r.reportStats.balance),
          coverageEnd: rEnd,
        };
      });

    if (reportsWithBalance.length > 0) {
      // Find the chronologically latest coverageEnd
      const maxCovEnd = Math.max(...reportsWithBalance.map(r => r.coverageEnd));
      const latestCandidates = reportsWithBalance.filter(r => r.coverageEnd === maxCovEnd);

      // Check if candidates with the same latest coverageEnd disagree materially on ending balance
      const candidateBalances = latestCandidates.map(r => r.balance);
      const minBal = Math.min(...candidateBalances);
      const maxBal = Math.max(...candidateBalances);

      if (maxBal - minBal > 0.01) {
        // Material conflict! (Req #2 & #17)
        balanceBasisConflict = true;
        balanceBasisEligible = false;
        balanceBasis = 'BALANCE_BASIS_CONFLICT';
        warnings.push(`Account ${group.accountId} balance basis conflict: reports share latest coverage end (${maxCovEnd ? formatDateKey(new Date(maxCovEnd)) : 'N/A'}) but report conflicting ending balances (${minBal} vs ${maxBal}).`);
      } else {
        // Deterministic selection: candidates agree (Req #17 & #18)
        // Sort tied candidates deterministically by fileName, then reportId so upload order never changes authority
        latestCandidates.sort((a, b) => {
          const fileComp = String(a.fileName ?? '').localeCompare(String(b.fileName ?? ''));
          if (fileComp !== 0) return fileComp;
          return String(a.reportId ?? '').localeCompare(String(b.reportId ?? ''));
        });
        const authoritativeReport = latestCandidates[0];
        endingBalanceAuthorityReportId = authoritativeReport.reportId;
        const endingBalance = authoritativeReport.balance;
        const startEst = endingBalance - accNetPnL;

        if (startEst > 0) {
          estimatedStartBalance = roundNum(startEst, 2);
          balanceBasisEligible = true;
          balanceBasis = 'END_BALANCE_MINUS_NET_TRADING_PNL';
          returnPct = roundNum((accNetPnL / estimatedStartBalance) * 100, 2);
        } else {
          balanceBasis = 'INSUFFICIENT_OR_NEGATIVE_START_BALANCE';
        }
      }
    }

    // Build normalized comparison curve (starting at 100) if eligible
    let indexCurve = [];
    if (balanceBasisEligible && accTrades.length > 0) {
      let cumAccNet = 0;
      const sortedAccTrades = [...accTrades].sort((a, b) => {
        const ca = a.closeTime ? new Date(a.closeTime).getTime() : 0;
        const cb = b.closeTime ? new Date(b.closeTime).getTime() : 0;
        if (ca !== cb) return ca - cb;
        return String(a._fingerprint ?? '').localeCompare(String(b._fingerprint ?? ''));
      });

      indexCurve = sortedAccTrades.map(t => {
        const p = Number(t.profit) || 0;
        const c = Number(t.commission) || 0;
        const s = Number(t.swap) || 0;
        const net = roundNum(p + c + s, 2);
        cumAccNet += net;
        const indexVal = roundNum(100 * (estimatedStartBalance + cumAccNet) / estimatedStartBalance, 2);
        return {
          timestamp: t.closeTime ? new Date(t.closeTime).getTime() : 0,
          date: t.closeTime ? formatDateKey(new Date(t.closeTime)) : '',
          index: indexVal,
          cumulativeNetPnL: roundNum(cumAccNet, 2),
        };
      });

      normalizedSeries.push({
        accountId: group.accountId,
        accountLabel: group.accountLabel,
        currency: group.currency,
        estimatedStartBalance,
        returnPct,
        points: indexCurve,
      });
    }

    // Deterministic list of source reports
    const sourceReportsList = group.reports.map(r => ({
      reportId: r.id,
      fileName: r.fileName,
      tradeCount: r.trades ? r.trades.length : 0,
      timezoneOffset: r.timezoneOffset ?? 2,
    })).sort((a, b) => String(a.fileName ?? '').localeCompare(String(b.fileName ?? '')));

    accountSummaries.push({
      accountId: group.accountId,
      accountLabel: group.accountLabel,
      reportsCount: group.reports.length,
      reportIds: group.reports.map(r => r.id),
      fileNames: group.reports.map(r => r.fileName),
      sourceReports: sourceReportsList,
      currency: group.currency,
      currencyVerified: group.currencyVerified,
      currencyAuthoritySource: group.currencyAuthoritySource || null,
      identitySource: group.identitySource,
      identityConfidence: group.identityConfidence,
      status: group.status,
      exclusionReason: group.exclusionReason,
      coverage,
      coverageEnd,
      tradeCount: accTrades.length,
      tradingPnL: accTradingPnL,
      netPnL: accNetPnL,
      profitFactor: accPF,
      winRate: accWinRate,
      estimatedStartBalance,
      balanceBasisEligible,
      balanceBasisConflict,
      balanceBasis,
      endingBalanceAuthorityReportId,
      returnPct,
    });
  }

  // Account Contribution: signed Net P/L (Only available when monetary aggregation is eligible - Req #6)
  const contribution = monetaryAggregationEligible
    ? accountSummaries
        .filter(a => a.status === 'ELIGIBLE')
        .map(a => ({
          accountId: a.accountId,
          accountLabel: a.accountLabel,
          netPnL: a.netPnL,
          tradingPnL: a.tradingPnL,
          tradeCount: a.tradeCount,
          returnPct: a.returnPct,
          currency: a.currency,
          currencyVerified: a.currencyVerified,
          currencyAuthoritySource: a.currencyAuthoritySource,
          isEligible: true,
        }))
        .sort((a, b) => b.netPnL - a.netPnL)
    : [];

  // Total raw trades count
  let totalRawTrades = 0;
  for (const r of reports) {
    totalRawTrades += (r.trades ? r.trades.length : 0);
  }

  const metrics = {
    totalAccounts: accountGroupsMap.size,
    eligibleAccounts: eligibleAccountGroups.length,
    excludedAccountsCount: excludedAccounts.length,
    totalReports: reports.length,
    uniqueReportsProcessed: reports.length - duplicateReports.length,
    rawTradesCount: totalRawTrades,
    canonicalTradesCount: allCanonicalTrades.length,
    duplicateTradesRemoved: totalDuplicateTradesRemoved,
    duplicateReportsCount: duplicateReports.length,

    // Win/Loss metrics (always available)
    totalTrades,
    wins: wins.length,
    losses: losses.length,
    breakeven: breakeven.length,
    winRate,

    // Monetary metrics (only when monetaryAggregationEligible is true)
    monetaryAggregationEligible,
    currency: portfolioCurrency,
    tradingPnL,
    commission,
    swap,
    netPnL,
    grossWinningProfit,
    grossLosingProfit,
    portfolioPF,
    avgWin,
    avgLoss,
    largestWin,
    largestLoss,
    expectancy,
    maxPortfolioPnLDrawdown,
    portfolioDrawdownPct: null, // N/A in Phase 2
  };

  const compatibility = {
    monetaryAggregationEligible,
    currency: portfolioCurrency,
    currenciesDetected: detectedCurrencies,
    currencyIssues,
    currencyAuthoritySource: (eligibleAccountGroups.length > 0 && detectedCurrencies.length === 1 && unverifiedAccounts.length === 0)
      ? eligibleAccountGroups[0].currencyAuthoritySource
      : null,
    accountConflicts: [],
    timezoneConflicts,
    tradeConflicts,
    duplicateReports,
    duplicateTradesRemoved: totalDuplicateTradesRemoved,
    excludedAccounts,
    warnings,
  };

  const diagnostics = {
    totalReports: reports.length,
    uniqueAccounts: accountGroupsMap.size,
    eligibleAccounts: eligibleAccountGroups.length,
    excludedAccounts: excludedAccounts.length,
    rawTradesCount: totalRawTrades,
    canonicalTradesCount: allCanonicalTrades.length,
    duplicateTradesRemoved: totalDuplicateTradesRemoved,
    duplicateReportsCount: duplicateReports.length,
    monetaryAggregationEligible,
    currenciesDetected: detectedCurrencies,
  };

  return {
    status: monetaryAggregationEligible ? 'READY' : (detectedCurrencies.length > 1 ? 'MIXED_CURRENCY' : 'PARTIAL_READY'),
    compatibility,
    accounts: accountSummaries,
    metrics,
    timeline,
    dailyPnL,
    monthlyPnL,
    contribution,
    normalizedComparison: normalizedSeries.length > 0 ? { series: normalizedSeries } : null,
    warnings,
    diagnostics,
  };
}
