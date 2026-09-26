import { useState, useMemo } from 'react';
import {
  Layers, Wallet, TrendingUp, Percent, ShieldAlert, CheckCircle2,
  AlertTriangle, ArrowUpRight, ArrowDownRight, ExternalLink,
  ChevronDown, ChevronUp, AlertCircle, Info, Hash, Clock, X
} from 'lucide-react';
import { formatCurrency } from '../utils/portfolioEngine';

export default function PortfolioOverview({
  portfolioData,
  onSelectAccount,
  onNavigateToCharts,
}) {
  const [sortField, setSortField] = useState('netPnL');
  const [sortAsc, setSortAsc] = useState(false);
  const [showAllDiagnostics, setShowAllDiagnostics] = useState(false);
  const [selectedAccountForChooser, setSelectedAccountForChooser] = useState(null);

  if (!portfolioData || !portfolioData.metrics) {
    return (
      <div className="card text-center p-8">
        <Layers size={32} className="mx-auto text-muted mb-3" />
        <h3 className="card-title">No Portfolio Data Available</h3>
        <p className="t-label mt-1">Upload at least two MT5 reports to view portfolio analytics.</p>
      </div>
    );
  }

  const { metrics, compatibility, accounts, contribution, warnings } = portfolioData;
  const isEligible = compatibility.monetaryAggregationEligible;
  const curr = compatibility.currency || 'USD';

  // Sort account rows
  const sortedAccounts = useMemo(() => {
    return [...accounts].sort((a, b) => {
      let valA = a[sortField];
      let valB = b[sortField];

      if (valA === null || valA === undefined) valA = -Infinity;
      if (valB === null || valB === undefined) valB = -Infinity;

      if (typeof valA === 'string') {
        return sortAsc ? valA.localeCompare(valB) : valB.localeCompare(valA);
      }
      return sortAsc ? valA - valB : valB - valA;
    });
  }, [accounts, sortField, sortAsc]);

  const handleSort = (field) => {
    if (sortField === field) {
      setSortAsc(prev => !prev);
    } else {
      setSortField(field);
      setSortAsc(false);
    }
  };

  const getSortIcon = (field) => {
    if (sortField !== field) return null;
    return sortAsc ? <ChevronUp size={12} /> : <ChevronDown size={12} />;
  };

  const handleAccountClick = (acc) => {
    if (!acc.reportIds || acc.reportIds.length === 0) return;
    if (acc.reportsCount > 1) {
      // Req #14: Multiple source reports -> Open chooser modal
      setSelectedAccountForChooser(acc);
    } else {
      // Single report -> Open directly
      onSelectAccount(acc.reportIds[0]);
    }
  };

  return (
    <div className="stack-lg fade-up" id="portfolio-overview-container">

      {/* ── Data Quality / Compatibility Notification ── */}
      {(!isEligible || compatibility.excludedAccounts.length > 0 || compatibility.duplicateReports.length > 0) && (
        <div className="portfolio-alert-card">
          <div className="portfolio-alert-header">
            <div className="row" style={{ gap: 8, alignItems: 'center' }}>
              <AlertTriangle size={16} className="text-warning" />
              <span className="font-semibold text-sm">
                {!isEligible
                  ? 'Monetary Portfolio Aggregation Unavailable'
                  : 'Portfolio Diagnostics Notice'}
              </span>
            </div>
            <button
              type="button"
              className="btn-text-xs"
              onClick={() => setShowAllDiagnostics(prev => !prev)}
            >
              {showAllDiagnostics ? 'Hide Details' : 'View Details'}
              {showAllDiagnostics ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
            </button>
          </div>

          <div className="portfolio-alert-content">
            {!isEligible && (
              <p className="portfolio-alert-msg">
                {compatibility.currenciesDetected.length > 1
                  ? `Mixed currencies detected: ${compatibility.currenciesDetected.join(', ')}. Currency conversion is not authorized in Phase 2. Monetary aggregation is disabled while trade counts and win rates remain active.`
                  : 'Currency could not be authoritatively verified from account metadata.'}
              </p>
            )}

            {compatibility.excludedAccounts.length > 0 && (
              <div className="portfolio-excluded-list">
                <span className="font-medium text-xs text-warning">Excluded accounts ({compatibility.excludedAccounts.length}):</span>
                {compatibility.excludedAccounts.map((ex, idx) => (
                  <div key={idx} className="portfolio-excluded-item">
                    <strong>Account {ex.accountId}:</strong> {ex.reason}
                  </div>
                ))}
              </div>
            )}

            {showAllDiagnostics && warnings.length > 0 && (
              <ul className="portfolio-warnings-list">
                {warnings.map((w, idx) => (
                  <li key={idx}>{w}</li>
                ))}
              </ul>
            )}
          </div>
        </div>
      )}

      {/* ── Primary KPI Metric Cards (Req #37 & #11) ── */}
      <div className="portfolio-kpi-grid">

        {/* 1. Accounts */}
        <div className="kpi-card" id="kpi-portfolio-accounts">
          <div className="kpi-header">
            <span className="kpi-title">Active Accounts</span>
            <div className="kpi-icon-wrap primary">
              <Layers size={14} />
            </div>
          </div>
          <div className="kpi-value-row">
            <span className="kpi-value">{metrics.eligibleAccounts}</span>
            {metrics.excludedAccountsCount > 0 && (
              <span className="kpi-badge warning" title={`${metrics.excludedAccountsCount} account(s) excluded due to conflicts`}>
                {metrics.excludedAccountsCount} Excluded
              </span>
            )}
          </div>
          <div className="kpi-subtext">
            <span>{metrics.totalAccounts} unique accounts across {metrics.totalReports} reports</span>
          </div>
        </div>

        {/* 2. Portfolio Net P/L */}
        <div className="kpi-card" id="kpi-portfolio-net-pnl">
          <div className="kpi-header">
            <span className="kpi-title">Portfolio Net P/L</span>
            <div className={`kpi-icon-wrap ${isEligible ? (metrics.netPnL >= 0 ? 'positive' : 'negative') : 'muted'}`}>
              <Wallet size={14} />
            </div>
          </div>
          <div className="kpi-value-row">
            {isEligible ? (
              <span className={`kpi-value ${metrics.netPnL >= 0 ? 'text-positive' : 'text-negative'}`}>
                {formatCurrency(metrics.netPnL, curr, { showSign: true })}
              </span>
            ) : (
              <span className="kpi-value text-muted" style={{ fontSize: '1.25rem' }}>
                N/A
              </span>
            )}
          </div>
          <div className="kpi-subtext">
            {isEligible ? (
              <span>Trading P/L: {formatCurrency(metrics.tradingPnL, curr, { showSign: true })} • Costs: {formatCurrency(metrics.commission + metrics.swap, curr)}</span>
            ) : (
              <span className="text-warning">Mixed currencies ({compatibility.currenciesDetected.join(', ')})</span>
            )}
          </div>
        </div>

        {/* 3. Portfolio Profit Factor */}
        <div className="kpi-card" id="kpi-portfolio-pf">
          <div className="kpi-header">
            <span className="kpi-title">Profit Factor</span>
            <div className={`kpi-icon-wrap ${isEligible ? 'primary' : 'muted'}`}>
              <TrendingUp size={14} />
            </div>
          </div>
          <div className="kpi-value-row">
            {isEligible ? (
              <span className="kpi-value">
                {metrics.portfolioPF === Infinity ? '∞' : metrics.portfolioPF.toFixed(2)}
              </span>
            ) : (
              <span className="kpi-value text-muted" style={{ fontSize: '1.25rem' }}>
                N/A
              </span>
            )}
          </div>
          <div className="kpi-subtext">
            {isEligible ? (
              <span>Gross Win: {formatCurrency(metrics.grossWinningProfit, curr, { maximumFractionDigits: 0 })} • Loss: {formatCurrency(Math.abs(metrics.grossLosingProfit), curr, { maximumFractionDigits: 0 })}</span>
            ) : (
              <span>Currency-dependent metric</span>
            )}
          </div>
        </div>

        {/* 4. Win Rate */}
        <div className="kpi-card" id="kpi-portfolio-winrate">
          <div className="kpi-header">
            <span className="kpi-title">Win Rate</span>
            <div className="kpi-icon-wrap positive">
              <Percent size={14} />
            </div>
          </div>
          <div className="kpi-value-row">
            <span className="kpi-value text-positive">{metrics.winRate.toFixed(1)}%</span>
            <span className="kpi-badge neutral">
              {metrics.wins}W / {metrics.losses}L
            </span>
          </div>
          <div className="kpi-subtext">
            <span>{metrics.wins} winning trades • {metrics.breakeven} breakeven</span>
          </div>
        </div>

        {/* 5. Max P/L Drawdown */}
        <div className="kpi-card" id="kpi-portfolio-drawdown">
          <div className="kpi-header">
            <span className="kpi-title">Max P/L Drawdown</span>
            <div className={`kpi-icon-wrap ${isEligible ? 'negative' : 'muted'}`}>
              <ShieldAlert size={14} />
            </div>
          </div>
          <div className="kpi-value-row">
            {isEligible ? (
              <span className="kpi-value text-negative">
                {formatCurrency(-metrics.maxPortfolioPnLDrawdown, curr)}
              </span>
            ) : (
              <span className="kpi-value text-muted" style={{ fontSize: '1.25rem' }}>
                N/A
              </span>
            )}
          </div>
          <div className="kpi-subtext">
            <span title="Portfolio DD % is N/A in Phase 2 without authoritative portfolio balance basis">
              Absolute peak-to-trough (DD %: N/A)
            </span>
          </div>
        </div>

        {/* 6. Canonical Trades */}
        <div className="kpi-card" id="kpi-portfolio-trades">
          <div className="kpi-header">
            <span className="kpi-title">Canonical Trades</span>
            <div className="kpi-icon-wrap primary">
              <Hash size={14} />
            </div>
          </div>
          <div className="kpi-value-row">
            <span className="kpi-value">{metrics.canonicalTradesCount.toLocaleString()}</span>
            {metrics.duplicateTradesRemoved > 0 && (
              <span className="kpi-badge neutral" title={`${metrics.duplicateTradesRemoved} exact duplicate trades removed`}>
                -{metrics.duplicateTradesRemoved} dedup
              </span>
            )}
          </div>
          <div className="kpi-subtext">
            <span>Deduplicated from {metrics.rawTradesCount} raw trades</span>
          </div>
        </div>

      </div>

      {/* ── Data Quality Summary Box (Req #40) ── */}
      <div className="card" id="portfolio-data-quality-panel">
        <div className="card-header" style={{ justifyContent: 'space-between' }}>
          <div className="row" style={{ gap: 8, alignItems: 'center' }}>
            <div className="card-header-icon">
              <CheckCircle2 size={15} style={{ color: 'var(--positive)' }} />
            </div>
            <span className="card-title">Portfolio Data Quality & Provenance</span>
          </div>
          <span className="t-label" style={{ fontFamily: 'var(--font-mono)' }}>
            Deterministic Ledger
          </span>
        </div>
        <div className="card-body">
          <div className="data-quality-grid">
            <div className="data-quality-item">
              <span className="dq-label">Reports Processed:</span>
              <span className="dq-value">{metrics.totalReports} files ({metrics.uniqueReportsProcessed} unique)</span>
            </div>
            <div className="data-quality-item">
              <span className="dq-label">Account Groups:</span>
              <span className="dq-value">{metrics.totalAccounts} detected ({metrics.eligibleAccounts} active)</span>
            </div>
            <div className="data-quality-item">
              <span className="dq-label">Currency Authority:</span>
              <span className={`dq-value ${isEligible ? 'text-positive' : 'text-warning'}`}>
                {isEligible ? `Verified ${compatibility.currency}` : `Incompatible (${compatibility.currenciesDetected.join(', ')})`}
              </span>
            </div>
            <div className="data-quality-item">
              <span className="dq-label">Exact Trade Dedup:</span>
              <span className="dq-value">
                {metrics.duplicateTradesRemoved > 0
                  ? `${metrics.duplicateTradesRemoved} duplicate trades removed`
                  : '0 duplicate trades detected'}
              </span>
            </div>
            <div className="data-quality-item">
              <span className="dq-label">Timezone Conflicts:</span>
              <span className={`dq-value ${compatibility.timezoneConflicts.length === 0 ? 'text-positive' : 'text-warning'}`}>
                {compatibility.timezoneConflicts.length === 0
                  ? 'None (Aligned)'
                  : `${compatibility.timezoneConflicts.length} account(s) conflicted`}
              </span>
            </div>
            <div className="data-quality-item">
              <span className="dq-label">Trade Conflicts:</span>
              <span className={`dq-value ${compatibility.tradeConflicts.length === 0 ? 'text-positive' : 'text-negative'}`}>
                {compatibility.tradeConflicts.length === 0
                  ? 'None (Ledger consistent)'
                  : `${compatibility.tradeConflicts.length} conflicting trade(s)`}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* ── Account Comparison Table (Req #38, #11 & #12) ── */}
      <div className="card" id="portfolio-account-comparison-card">
        <div className="card-header" style={{ justifyContent: 'space-between', flexWrap: 'wrap', gap: 10 }}>
          <div className="row" style={{ gap: 8, alignItems: 'center' }}>
            <div className="card-header-icon">
              <Layers size={15} />
            </div>
            <div>
              <span className="card-title">Account Comparison Ledger</span>
              <p className="card-subtitle">
                Cross-account performance metrics. Click any row or inspect button to drill down into source report(s).
              </p>
            </div>
          </div>
          {onNavigateToCharts && (
            <button
              type="button"
              className="btn btn-sm btn-secondary"
              onClick={onNavigateToCharts}
              style={{ fontSize: '0.75rem' }}
            >
              View Normalized Charts
              <ArrowUpRight size={13} />
            </button>
          )}
        </div>

        <div className="table-responsive">
          <table className="portfolio-table" id="account-comparison-table">
            <thead>
              <tr>
                <th onClick={() => handleSort('accountLabel')} className="sortable">
                  <div className="th-content">Account {getSortIcon('accountLabel')}</div>
                </th>
                <th>Currency</th>
                <th onClick={() => handleSort('reportsCount')} className="sortable text-center">
                  <div className="th-content center">Reports {getSortIcon('reportsCount')}</div>
                </th>
                <th>Coverage Period</th>
                <th onClick={() => handleSort('tradeCount')} className="sortable text-right">
                  <div className="th-content right">Trades {getSortIcon('tradeCount')}</div>
                </th>
                <th onClick={() => handleSort('netPnL')} className="sortable text-right">
                  <div className="th-content right">Net P/L {getSortIcon('netPnL')}</div>
                </th>
                <th onClick={() => handleSort('returnPct')} className="sortable text-right">
                  <div className="th-content right">Est. Return % {getSortIcon('returnPct')}</div>
                </th>
                <th onClick={() => handleSort('profitFactor')} className="sortable text-right">
                  <div className="th-content right">Profit Factor {getSortIcon('profitFactor')}</div>
                </th>
                <th onClick={() => handleSort('winRate')} className="sortable text-right">
                  <div className="th-content right">Win Rate {getSortIcon('winRate')}</div>
                </th>
                <th className="text-center">Status</th>
                <th className="text-center">Action</th>
              </tr>
            </thead>
            <tbody>
              {sortedAccounts.map((acc) => {
                const isAccEligible = acc.status === 'ELIGIBLE';
                const isPositive = acc.netPnL >= 0;
                const accCurrency = acc.currency || curr;

                return (
                  <tr
                    key={acc.accountId}
                    className={`portfolio-table-row${!isAccEligible ? ' row-ineligible' : ''}`}
                    onClick={() => handleAccountClick(acc)}
                    title={acc.reportsCount > 1 ? `Click to choose which report to inspect for account ${acc.accountId}` : `Click to open individual report for account ${acc.accountId}`}
                  >
                    {/* Account Identity */}
                    <td>
                      <div className="acc-cell-title">{acc.accountLabel}</div>
                      <div className="acc-cell-sub">
                        ID: {acc.accountId}
                        {acc.reportsCount > 1 && (
                          <span className="badge-sub"> ({acc.reportsCount} merged reports)</span>
                        )}
                      </div>
                    </td>

                    {/* Currency */}
                    <td>
                      <span className="badge-currency" title={acc.currencyVerified ? 'Authoritative MT5 Currency' : 'Unverified Currency'}>
                        {acc.currency || 'N/A'}
                      </span>
                    </td>

                    {/* Reports count */}
                    <td className="text-center">
                      <span className="font-mono text-xs">{acc.reportsCount}</span>
                    </td>

                    {/* Date coverage */}
                    <td>
                      <span className="text-xs text-muted font-mono">{acc.coverage}</span>
                    </td>

                    {/* Trades count */}
                    <td className="text-right font-mono font-medium">
                      {acc.tradeCount}
                    </td>

                    {/* Net P/L: Formatted using each account's own currency (Req #12) */}
                    <td className="text-right font-mono font-semibold">
                      {isAccEligible ? (
                        <span className={isPositive ? 'text-positive' : 'text-negative'}>
                          {formatCurrency(acc.netPnL, accCurrency, { showSign: true })}
                        </span>
                      ) : (
                        <span className="text-muted">Excluded</span>
                      )}
                    </td>

                    {/* Est. Return % */}
                    <td className="text-right font-mono">
                      {acc.balanceBasisEligible && acc.returnPct !== null ? (
                        <span className={acc.returnPct >= 0 ? 'text-positive' : 'text-negative'} title="Estimated return based on chronologically latest ending balance minus net trading P/L. Deposits/withdrawals are not independently reconciled.">
                          {acc.returnPct >= 0 ? '+' : ''}{acc.returnPct.toFixed(2)}%
                        </span>
                      ) : acc.balanceBasisConflict ? (
                        <span className="text-warning" title="Reports for this account share the latest timestamp but report conflicting ending balances. Balance basis is ineligible.">
                          Conflict (N/A)
                        </span>
                      ) : (
                        <span className="text-muted" title="Starting balance could not be determined defensibly">N/A</span>
                      )}
                    </td>

                    {/* Profit Factor */}
                    <td className="text-right font-mono">
                      {isAccEligible ? (
                        <span>{acc.profitFactor === Infinity ? '∞' : acc.profitFactor.toFixed(2)}</span>
                      ) : (
                        <span className="text-muted">N/A</span>
                      )}
                    </td>

                    {/* Win Rate */}
                    <td className="text-right font-mono">
                      {isAccEligible ? (
                        <span>{acc.winRate.toFixed(1)}%</span>
                      ) : (
                        <span className="text-muted">N/A</span>
                      )}
                    </td>

                    {/* Status badge */}
                    <td className="text-center">
                      {acc.status === 'ELIGIBLE' ? (
                        <span className="status-pill positive">Eligible</span>
                      ) : acc.status === 'TIMEZONE_CONFLICT' ? (
                        <span className="status-pill warning" title={acc.exclusionReason}>TZ Conflict</span>
                      ) : acc.status === 'TRADE_CONFLICT' ? (
                        <span className="status-pill danger" title={acc.exclusionReason}>Trade Conflict</span>
                      ) : (
                        <span className="status-pill neutral">{acc.status}</span>
                      )}
                    </td>

                    {/* Drill down action (Req #14 & #15) */}
                    <td className="text-center" onClick={(e) => e.stopPropagation()}>
                      <button
                        type="button"
                        className="btn-drilldown"
                        onClick={() => handleAccountClick(acc)}
                        title={acc.reportsCount > 1 ? `Choose source report for ${acc.accountLabel}` : `Switch to ${acc.accountLabel} individual report`}
                      >
                        <ExternalLink size={13} />
                        <span>{acc.reportsCount > 1 ? 'Choose…' : 'Inspect'}</span>
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* ── Merged Account Source Reports Chooser Modal (Req #14 & #15) ── */}
      {selectedAccountForChooser && (
        <div className="modal-backdrop fade-in" style={{ zIndex: 9999 }}>
          <div className="modal-panel fade-up" style={{ maxWidth: 520 }}>
            <div className="modal-header">
              <div>
                <h3 className="modal-title">Select Source Report to Inspect</h3>
                <p className="t-label mt-1" style={{ fontSize: '0.75rem' }}>
                  Account: <strong>{selectedAccountForChooser.accountLabel}</strong> (ID: {selectedAccountForChooser.accountId})
                </p>
              </div>
              <button
                type="button"
                className="btn-icon btn-sm"
                onClick={() => setSelectedAccountForChooser(null)}
                title="Close chooser"
              >
                <X size={15} />
              </button>
            </div>
            <div className="modal-body" style={{ padding: '16px 20px' }}>
              <div style={{
                background: 'rgba(99, 102, 241, 0.08)',
                border: '1px solid rgba(99, 102, 241, 0.25)',
                borderRadius: 'var(--radius-sm)',
                padding: '10px 14px',
                marginBottom: 16,
                fontSize: '0.75rem',
                color: 'var(--text-secondary)',
                lineHeight: 1.5,
              }}>
                <strong>Canonical Provenance:</strong> The Portfolio comparison table above represents the deduplicated canonical ledger across all {selectedAccountForChooser.reportsCount} source reports. Select an individual report below to inspect its raw data:
              </div>

              <div className="stack" style={{ gap: 8 }}>
                {selectedAccountForChooser.sourceReports.map((r, idx) => (
                  <div
                    key={r.reportId}
                    className="source-report-chooser-item"
                    onClick={() => {
                      onSelectAccount(r.reportId);
                      setSelectedAccountForChooser(null);
                    }}
                  >
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div className="font-semibold text-sm text-primary-hover" style={{ wordBreak: 'break-all' }}>
                        {r.fileName}
                      </div>
                      <div className="text-xs text-muted mt-1 font-mono">
                        {r.tradeCount} trades • UTC{r.timezoneOffset >= 0 ? '+' : ''}{r.timezoneOffset}
                      </div>
                    </div>
                    <button
                      type="button"
                      className="btn btn-sm btn-primary"
                      style={{ fontSize: '0.75rem', padding: '5px 12px', flexShrink: 0 }}
                    >
                      Inspect <ExternalLink size={12} style={{ marginLeft: 4 }} />
                    </button>
                  </div>
                ))}
              </div>
            </div>
            <div className="modal-footer">
              <button
                type="button"
                className="btn btn-sm btn-secondary"
                onClick={() => setSelectedAccountForChooser(null)}
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Signed Account Contribution Overview (Req #30 & #11) ── */}
      {isEligible && contribution.length > 0 && (
        <div className="card" id="portfolio-contribution-card">
          <div className="card-header" style={{ justifyContent: 'space-between' }}>
            <div className="row" style={{ gap: 8, alignItems: 'center' }}>
              <div className="card-header-icon">
                <Wallet size={15} />
              </div>
              <span className="card-title">Net P/L Contribution by Account</span>
            </div>
            <span className="t-label">
              Signed Net P/L after commission & swap
            </span>
          </div>
          <div className="card-body">
            <div className="contribution-list">
              {contribution.map((item) => {
                const isPos = item.netPnL >= 0;
                const maxAbs = Math.max(1, ...contribution.map(c => Math.abs(c.netPnL)));
                const pctWidth = Math.min(100, Math.round((Math.abs(item.netPnL) / maxAbs) * 100));
                const itemCurr = item.currency || curr;

                return (
                  <div key={item.accountId} className="contribution-row">
                    <div className="contribution-label-col">
                      <span className="contribution-name">{item.accountLabel}</span>
                      <span className="contribution-id">ID: {item.accountId} ({item.tradeCount} trades)</span>
                    </div>

                    <div className="contribution-bar-col">
                      <div className="contribution-bar-track">
                        <div
                          className={`contribution-bar-fill ${isPos ? 'pos' : 'neg'}`}
                          style={{ width: `${pctWidth}%` }}
                        />
                      </div>
                    </div>

                    <div className="contribution-val-col">
                      <span className={`font-mono font-semibold ${isPos ? 'text-positive' : 'text-negative'}`}>
                        {formatCurrency(item.netPnL, itemCurr, { showSign: true })}
                      </span>
                    </div>
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
