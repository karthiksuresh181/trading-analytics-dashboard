import { useState, useCallback, useMemo, useEffect } from 'react';
import { parseMT5Report, computeAllMetrics, generateHtmlReport } from './utils/mt5Engine';
import { buildPortfolioAnalytics } from './utils/portfolioEngine';
import FileUploader from './components/FileUploader';
import GamifiedOverview from './components/GamifiedOverview';
import AdvancedAnalytics from './components/AdvancedAnalytics';
import InteractiveCharts from './components/InteractiveCharts';
import JournalCalendar from './components/JournalCalendar';
import TradeHistory from './components/TradeHistory';
import ReportSelector from './components/ReportSelector';
import PortfolioOverview from './components/PortfolioOverview';
import PortfolioCharts from './components/PortfolioCharts';
import ConfirmModal from './components/ConfirmModal';
import { TIMEZONE_OPTIONS } from './constants/timezone';
import {
  LayoutDashboard, BarChart3, Brain, CalendarDays, ClipboardList,
  Download, Plus, Zap, ChevronRight, Globe, AlertTriangle, X, Trash2, Calendar
} from 'lucide-react';
import { DEV_SCENARIOS } from './utils/testScenarios';

const TABS = [
  { id: 'overview', label: 'Overview',   icon: LayoutDashboard },
  { id: 'analytics', label: 'Analytics', icon: Brain           },
  { id: 'charts',   label: 'Charts',     icon: BarChart3       },
  { id: 'journal',  label: 'Journal',    icon: CalendarDays    },
  { id: 'history',  label: 'History',    icon: ClipboardList   },
];


export default function App() {
  // Multi-report state collection
  const [reports, setReports] = useState([]);
  const [activeReportId, setActiveReportId] = useState(null);
  const [scope, setScope] = useState('report'); // 'report' | 'portfolio' (Req #33)
  const [activeTab, setActiveTab] = useState('overview');
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const [importErrors, setImportErrors] = useState([]);

  // Confirmation modal state
  const [confirmModal, setConfirmModal] = useState({
    isOpen: false,
    title: '',
    message: '',
    confirmLabel: 'Confirm',
    isDanger: false,
    onConfirm: null,
  });

  // Active report resolution with fallback
  const activeReport = useMemo(() => {
    if (reports.length === 0) return null;
    return reports.find(r => r.id === activeReportId) || reports[0];
  }, [reports, activeReportId]);

  // Pure portfolio analytics calculation (Req #5 & #31)
  const portfolioData = useMemo(() => {
    if (reports.length === 0) return null;
    return buildPortfolioAnalytics(reports);
  }, [reports]);

  // Requirement #35: If only one report remains, automatically revert to report scope
  useEffect(() => {
    if (reports.length < 2 && scope === 'portfolio') {
      setScope('report');
    }
  }, [reports.length, scope]);

  // Handle files loaded from Uploader (batch support & partial failure handling)
  const handleFilesLoaded = useCallback((newReports, failedList) => {
    if (failedList && failedList.length > 0) {
      setImportErrors(failedList);
    } else {
      setImportErrors([]);
    }

    if (newReports && newReports.length > 0) {
      setReports(prev => [...prev, ...newReports]);
      // Select the first newly imported report
      setActiveReportId(newReports[0].id);
      setScope('report');
    }
  }, []);

  // Demo report handler
  const handleLoadDemo = useCallback(async (timezoneOffset = 2) => {
    try {
      const existingDemo = reports.find(r => r.fileName === 'ReportHistorytest.html');
      if (existingDemo) {
        setActiveReportId(existingDemo.id);
        setScope('report');
        return;
      }

      const res = await fetch('/ReportHistorytest.html');
      if (!res.ok) throw new Error('Demo report file not found');
      const text = await res.text();
      const { trades, meta, reportStats } = parseMT5Report(text, timezoneOffset);
      const metrics = computeAllMetrics(trades, reportStats);

      const demoReport = {
        id: `rep_demo_${Date.now()}`,
        fileName: 'ReportHistorytest.html',
        accountKey: meta.account || '26222962',
        meta,
        reportStats,
        trades,
        metrics,
        timezoneOffset,
        htmlContent: text,
        importedAt: Date.now(),
      };

      setReports(prev => [...prev, demoReport]);
      setActiveReportId(demoReport.id);
      setScope('report');
    } catch (err) {
      console.error('Failed to load demo report:', err);
      alert('Could not load demo report.');
    }
  }, [reports]);

  // Load DEV Scenario for testing/certification
  const handleLoadScenario = useCallback((scenarioName) => {
    const scenarioReports = DEV_SCENARIOS[scenarioName];
    if (scenarioReports && scenarioReports.length > 0) {
      setReports(scenarioReports);
      setActiveReportId(scenarioReports[0].id);
      setScope('portfolio');
      setActiveTab('overview');
      setImportErrors([]);
    }
  }, []);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      window.__loadScenario = handleLoadScenario;
      window.__setReports = setReports;
      window.__setScope = setScope;
      window.__setActiveTab = setActiveTab;
    }
  }, [handleLoadScenario]);

  // Timezone adjustment for active report (isolated per report)
  const handleActiveTimezoneChange = useCallback((newOffset) => {
    if (!activeReport) return;
    setReports(prev => prev.map(rep => {
      if (rep.id !== activeReport.id) return rep;
      try {
        const { trades, meta, reportStats } = parseMT5Report(rep.htmlContent, newOffset);
        const metrics = computeAllMetrics(trades, reportStats);
        return {
          ...rep,
          timezoneOffset: newOffset,
          trades,
          meta,
          reportStats,
          metrics,
        };
      } catch (err) {
        console.error('Failed to update timezone for report:', err);
        return rep;
      }
    }));
  }, [activeReport]);

  // Export HTML for currently active report only
  const handleExportReport = useCallback(() => {
    if (!activeReport) return;
    setIsExporting(true);
    try {
      const reportHtml = generateHtmlReport(activeReport.trades, activeReport.metrics, activeReport.meta);
      const blob = new Blob([reportHtml], { type: 'text/html;charset=utf-8' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      const safeAcc = (activeReport.meta?.account || activeReport.fileName || 'report').replace(/[^a-zA-Z0-9_-]/g, '_');
      a.download = `mt5-analytics-${safeAcc}-${new Date().toISOString().slice(0, 10)}.html`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (err) {
      console.error('Export error:', err);
    } finally {
      setIsExporting(false);
    }
  }, [activeReport]);

  // Remove individual report with confirmation
  const handleRemoveReport = useCallback((reportId) => {
    const reportToRemove = reports.find(r => r.id === reportId);
    if (!reportToRemove) return;
    const accountLabel = reportToRemove.meta?.account || reportToRemove.meta?.name || reportToRemove.fileName;

    setConfirmModal({
      isOpen: true,
      title: 'Remove Report',
      message: `Are you sure you want to remove "${accountLabel}" from your workspace? Other loaded reports will remain intact.`,
      confirmLabel: 'Remove Report',
      isDanger: true,
      onConfirm: () => {
        setReports(prev => {
          const index = prev.findIndex(r => r.id === reportId);
          const nextReports = prev.filter(r => r.id !== reportId);

          if (activeReportId === reportId) {
            if (nextReports.length === 0) {
              setActiveReportId(null);
            } else {
              const nextActive = nextReports[index] || nextReports[index - 1] || nextReports[0];
              setActiveReportId(nextActive.id);
            }
          }
          return nextReports;
        });
        setConfirmModal(prev => ({ ...prev, isOpen: false }));
      },
    });
  }, [reports, activeReportId]);

  // Remove all reports with confirmation
  const handleConfirmRemoveAll = useCallback(() => {
    setConfirmModal({
      isOpen: true,
      title: 'Remove All Reports',
      message: `Are you sure you want to remove all ${reports.length} loaded reports from memory? This will return to the upload screen.`,
      confirmLabel: 'Remove All Reports',
      isDanger: true,
      onConfirm: () => {
        setReports([]);
        setActiveReportId(null);
        setScope('report');
        setActiveTab('overview');
        setImportErrors([]);
        setConfirmModal(prev => ({ ...prev, isOpen: false }));
      },
    });
  }, [reports.length]);

  // Switch to Portfolio scope (Req #36: redirect from Journal/History to Overview)
  const handleSelectPortfolio = useCallback(() => {
    setScope('portfolio');
    if (activeTab === 'journal' || activeTab === 'history') {
      setActiveTab('overview');
    }
  }, [activeTab]);

  // Switch to Report scope
  const handleSelectReport = useCallback((reportId) => {
    setActiveReportId(reportId);
    setScope('report');
  }, []);

  // Drill down from portfolio account comparison table to individual report
  const handleSelectAccountFromPortfolio = useCallback((reportId) => {
    setActiveReportId(reportId);
    setScope('report');
  }, []);

  // Dev scenario testing bar
  const devScenariosBar = import.meta.env.DEV ? (
    <div className="dev-scenarios-bar" id="dev-scenarios-bar">
      <span className="dev-scenarios-label">TEST PRESETS:</span>
      <button id="btn-scenario-usd" type="button" className="btn btn-xs" onClick={() => handleLoadScenario('usd')}>
        USD Portfolio
      </button>
      <button id="btn-scenario-eur" type="button" className="btn btn-xs" onClick={() => handleLoadScenario('eur')}>
        EUR Portfolio
      </button>
      <button id="btn-scenario-mixed" type="button" className="btn btn-xs" onClick={() => handleLoadScenario('mixed')}>
        Mixed USD/EUR
      </button>
      <button id="btn-scenario-multi" type="button" className="btn btn-xs" onClick={() => handleLoadScenario('multi')}>
        Multi-Report Merged
      </button>
      {reports.length > 0 && (
        <button id="btn-scenario-clear" type="button" className="btn btn-xs btn-secondary" onClick={() => { setReports([]); setScope('report'); }}>
          Clear
        </button>
      )}
    </div>
  ) : null;

  // If no reports are loaded, show empty state (file uploader)
  if (reports.length === 0 || !activeReport) {
    return (
      <>
        <FileUploader
          onFilesLoaded={handleFilesLoaded}
          onLoadDemo={handleLoadDemo}
          isModal={false}
          existingReportsCount={0}
          initialErrors={importErrors}
        />
        {devScenariosBar}
      </>
    );
  }

  const { trades, metrics, meta, fileName, timezoneOffset } = activeReport;
  const activeAccountLabel = meta?.account || meta?.name || fileName;
  const isPortfolio = scope === 'portfolio';

  return (
    <div className="app-root">

      {/* ── Top Bar ── */}
      <header className="topbar">
        <div className="topbar-inner">

          {/* Brand */}
          <div className="topbar-brand">
            <div className="topbar-logo">
              <Zap size={15} />
            </div>
            <div>
              <div className="topbar-brand-text">MT5 Analytics</div>
              <div className="topbar-brand-sub">Workspace</div>
            </div>
          </div>

          {/* Multi-Report / Portfolio Switcher (Req #33 & #34) */}
          <div className="topbar-switcher-wrapper">
            <ReportSelector
              reports={reports}
              activeReportId={activeReport.id}
              scope={scope}
              uniqueAccountsCount={portfolioData?.metrics?.totalAccounts || 0}
              onSelectReport={handleSelectReport}
              onSelectPortfolio={handleSelectPortfolio}
              onRemoveReport={handleRemoveReport}
              onOpenAddReports={() => setIsAddModalOpen(true)}
              onConfirmRemoveAll={handleConfirmRemoveAll}
            />
          </div>

          {/* Desktop Nav Tabs (Req #36: disable Journal/History in Portfolio) */}
          <nav className="topbar-nav">
            {TABS.map((tab) => {
              const Icon = tab.icon;
              const isActive = activeTab === tab.id;
              const isPortfolioDisabled = isPortfolio && (tab.id === 'journal' || tab.id === 'history');

              return (
                <button
                  key={tab.id}
                  id={`nav-tab-${tab.id}`}
                  onClick={() => {
                    if (isPortfolioDisabled) {
                      setActiveTab(tab.id);
                    } else {
                      setActiveTab(tab.id);
                    }
                  }}
                  className={`nav-tab${isActive ? ' active' : ''}${isPortfolioDisabled ? ' is-disabled-scope' : ''}`}
                  title={isPortfolioDisabled ? `${tab.label} requires an individual account` : undefined}
                >
                  <Icon size={13} />
                  {tab.label}
                  {isPortfolioDisabled && (
                    <span className="tab-account-required-dot" title="Requires individual account" />
                  )}
                </button>
              );
            })}
          </nav>

          {/* Actions */}
          <div className="topbar-actions">
            <button
              id="btn-topbar-add-reports"
              onClick={() => setIsAddModalOpen(true)}
              className="btn btn-sm"
              title="Add more MT5 reports to workspace"
            >
              <Plus size={13} />
              <span className="hide-on-xs">Add Reports</span>
            </button>

            <button
              id="btn-topbar-export"
              onClick={handleExportReport}
              disabled={isExporting}
              className="btn btn-sm btn-primary"
              title={isPortfolio ? `Export active report (${activeAccountLabel}) to HTML` : `Export active report (${activeAccountLabel}) to HTML`}
            >
              <Download size={13} />
              <span className="hide-on-xs">{isExporting ? 'Exporting…' : 'Export HTML'}</span>
            </button>
          </div>
        </div>
      </header>

      {/* ── Mobile Tabs ── */}
      <div className="mobile-tabs">
        {TABS.map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          const isPortfolioDisabled = isPortfolio && (tab.id === 'journal' || tab.id === 'history');

          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`nav-tab${isActive ? ' active' : ''}${isPortfolioDisabled ? ' is-disabled-scope' : ''}`}
            >
              <Icon size={12} />
              {tab.label}
            </button>
          );
        })}
      </div>

      {/* ── Partial Import Failure Alert Banner ── */}
      {importErrors.length > 0 && (
        <div className="import-error-banner-container">
          <div className="import-error-banner">
            <AlertTriangle size={15} style={{ color: 'var(--warning)', flexShrink: 0 }} />
            <div style={{ flex: 1 }}>
              <div style={{ fontWeight: 600, fontSize: '0.8125rem', marginBottom: 2 }}>
                {importErrors.length} file{importErrors.length > 1 ? 's' : ''} could not be loaded:
              </div>
              <ul className="import-error-list">
                {importErrors.map((err, idx) => (
                  <li key={idx}>
                    <strong>{err.fileName}</strong>: {err.error}
                  </li>
                ))}
              </ul>
            </div>
            <button
              type="button"
              className="btn-icon btn-sm"
              onClick={() => setImportErrors([])}
              title="Dismiss warning"
            >
              <X size={12} />
            </button>
          </div>
        </div>
      )}

      {/* ── Context Bar: Portfolio Scope vs Report Scope ── */}
      {isPortfolio ? (
        <div className="breadcrumb-bar" id="breadcrumb-portfolio-bar">
          <div className="row" style={{ gap: 6, alignItems: 'center' }}>
            <span className="breadcrumb-portfolio-badge">PORTFOLIO</span>
            <ChevronRight size={10} style={{ color: 'var(--text-muted)' }} />
            <span className="breadcrumb-account-badge" style={{ background: 'rgba(99, 102, 241, 0.15)', borderColor: 'rgba(99, 102, 241, 0.3)', color: '#C7D2FE' }}>
              All Accounts ({portfolioData?.metrics?.eligibleAccounts || 0} Active)
            </span>
          </div>

          <div className="row hide-on-xs" style={{ gap: 6, alignItems: 'center' }}>
            <ChevronRight size={10} style={{ color: 'var(--text-muted)' }} />
            <span className="t-label">
              {reports.length} Reports Loaded
            </span>
          </div>

          <div className="row hide-on-xs" style={{ gap: 6, alignItems: 'center' }}>
            <ChevronRight size={10} style={{ color: 'var(--text-muted)' }} />
            <span className="badge-currency">
              {portfolioData?.compatibility?.currency ? `Currency: ${portfolioData.compatibility.currency}` : 'Mixed Currencies'}
            </span>
          </div>

          <span className="t-label" style={{ marginLeft: 'auto' }}>
            <strong>{portfolioData?.metrics?.canonicalTradesCount || 0}</strong> canonical trades
          </span>
        </div>
      ) : (
        <div className="breadcrumb-bar" id="breadcrumb-report-bar">
          {/* Account context */}
          <div className="row" style={{ gap: 6 }}>
            <span className="t-label">Account</span>
            <ChevronRight size={10} style={{ color: 'var(--text-muted)' }} />
            <span className="breadcrumb-account-badge">
              {activeAccountLabel}
            </span>
          </div>

          {/* File name */}
          <div className="row hide-on-xs" style={{ gap: 6 }}>
            <ChevronRight size={10} style={{ color: 'var(--text-muted)' }} />
            <span className="t-label" style={{ maxWidth: 180, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={fileName}>
              {fileName}
            </span>
          </div>

          {/* Date / Period context */}
          {meta?.date && (
            <div className="row hide-on-xs" style={{ gap: 6 }}>
              <ChevronRight size={10} style={{ color: 'var(--text-muted)' }} />
              <Calendar size={11} style={{ color: 'var(--text-muted)' }} />
              <span className="t-label" title={meta.date}>{meta.date}</span>
            </div>
          )}

          {/* Isolated Timezone Selector for Active Report */}
          <div className="breadcrumb-tz-container">
            <Globe size={11} style={{ color: 'var(--primary-hover)', flexShrink: 0 }} />
            <label htmlFor="active-report-tz-select" className="t-label" style={{ whiteSpace: 'nowrap' }}>
              TZ:
            </label>
            <select
              id="active-report-tz-select"
              className="select-xs"
              value={timezoneOffset ?? 2}
              onChange={(e) => handleActiveTimezoneChange(parseFloat(e.target.value))}
              title="Change timezone offset for this active report"
            >
              {TIMEZONE_OPTIONS.map(opt => (
                <option key={opt.value} value={opt.value}>{opt.label}</option>
              ))}
            </select>
          </div>

          {/* Trade count */}
          <span className="t-label" style={{ marginLeft: 'auto' }}>
            <strong>{trades.length}</strong> trades analyzed
          </span>

          {/* Quick remove button for active report */}
          <button
            type="button"
            className="breadcrumb-remove-btn"
            onClick={() => handleRemoveReport(activeReport.id)}
            title={`Remove ${activeAccountLabel} from workspace`}
          >
            <Trash2 size={12} />
            <span className="hide-on-xs">Remove</span>
          </button>
        </div>
      )}

      {/* ── Main Analytical Content ── */}
      <main className="content-area">
        {isPortfolio ? (
          <>
            {activeTab === 'overview' && (
              <div className="stack-lg fade-up">
                <PortfolioOverview
                  portfolioData={portfolioData}
                  onSelectAccount={handleSelectAccountFromPortfolio}
                  onNavigateToCharts={() => setActiveTab('charts')}
                />
                <PortfolioCharts portfolioData={portfolioData} />
              </div>
            )}
            {activeTab === 'analytics' && (
              <div className="fade-up">
                <PortfolioOverview
                  portfolioData={portfolioData}
                  onSelectAccount={handleSelectAccountFromPortfolio}
                  onNavigateToCharts={() => setActiveTab('charts')}
                />
              </div>
            )}
            {activeTab === 'charts' && (
              <div className="fade-up">
                <PortfolioCharts portfolioData={portfolioData} />
              </div>
            )}
            {(activeTab === 'journal' || activeTab === 'history') && (
              <div className="card text-center fade-up" style={{ padding: '48px 24px' }}>
                <AlertTriangle size={36} className="mx-auto text-warning" style={{ marginBottom: 12 }} />
                <h3 className="card-title" style={{ fontSize: '1.125rem' }}>Individual Account Required</h3>
                <p className="t-label" style={{ maxWidth: 480, margin: '8px auto 20px', lineHeight: 1.5 }}>
                  {activeTab === 'journal'
                    ? 'The Journal Calendar view requires an individual account ledger. Cross-account calendar aggregation is not supported in Phase 2.'
                    : 'Combined multi-account trade history is scheduled for a future release. Please select an individual account to inspect trade records.'}
                </p>
                <div className="row justify-center" style={{ gap: 10 }}>
                  <button
                    type="button"
                    className="btn btn-sm btn-primary"
                    onClick={() => setActiveTab('overview')}
                  >
                    Return to Portfolio Overview
                  </button>
                  <button
                    type="button"
                    className="btn btn-sm btn-secondary"
                    onClick={() => setScope('report')}
                  >
                    Switch to Individual Account ({activeAccountLabel})
                  </button>
                </div>
              </div>
            )}
          </>
        ) : (
          <>
            {activeTab === 'overview' && (
              <div className="stack-lg fade-up">
                <GamifiedOverview metrics={metrics} />
                <InteractiveCharts metrics={metrics} trades={trades} />
              </div>
            )}
            {activeTab === 'analytics' && (
              <div className="fade-up">
                <AdvancedAnalytics metrics={metrics} trades={trades} />
              </div>
            )}
            {activeTab === 'charts' && (
              <div className="fade-up">
                <InteractiveCharts metrics={metrics} trades={trades} />
              </div>
            )}
            {activeTab === 'journal' && (
              <div className="fade-up">
                <JournalCalendar calendarData={metrics?.calendarData} />
              </div>
            )}
            {activeTab === 'history' && (
              <div className="fade-up">
                <TradeHistory trades={trades} />
              </div>
            )}
          </>
        )}
      </main>

      {/* ── Add Reports Modal ── */}
      {isAddModalOpen && (
        <FileUploader
          onFilesLoaded={handleFilesLoaded}
          onLoadDemo={handleLoadDemo}
          isModal={true}
          onClose={() => setIsAddModalOpen(false)}
          existingReportsCount={reports.length}
        />
      )}

      {/* ── Confirmation Modal ── */}
      <ConfirmModal
        isOpen={confirmModal.isOpen}
        title={confirmModal.title}
        message={confirmModal.message}
        confirmLabel={confirmModal.confirmLabel}
        isDanger={confirmModal.isDanger}
        onConfirm={confirmModal.onConfirm}
        onCancel={() => setConfirmModal(prev => ({ ...prev, isOpen: false }))}
      />

      {devScenariosBar}

    </div>
  );
}
