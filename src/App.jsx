import { useState, useCallback, useMemo, useEffect } from 'react';
import { parseMT5Report, computeAllMetrics, generateHtmlReport } from './utils/mt5Engine';
import FileUploader from './components/FileUploader';
import GamifiedOverview from './components/GamifiedOverview';
import AdvancedAnalytics from './components/AdvancedAnalytics';
import InteractiveCharts from './components/InteractiveCharts';
import JournalCalendar from './components/JournalCalendar';
import TradeHistory from './components/TradeHistory';
import ReportSelector from './components/ReportSelector';
import ConfirmModal from './components/ConfirmModal';
import { TIMEZONE_OPTIONS } from './constants/timezone';
import {
  LayoutDashboard, BarChart3, Brain, CalendarDays, ClipboardList,
  Download, Plus, Zap, ChevronRight, Globe, AlertTriangle, X, Trash2, Calendar
} from 'lucide-react';

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
    }
  }, []);

  // Demo report handler
  const handleLoadDemo = useCallback(async (timezoneOffset = 2) => {
    try {
      const existingDemo = reports.find(r => r.fileName === 'ReportHistorytest.html');
      if (existingDemo) {
        setActiveReportId(existingDemo.id);
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
    } catch (err) {
      console.error('Failed to load demo report:', err);
      alert('Could not load demo report.');
    }
  }, [reports]);

  // Batch demo reports loader (loads all 5 test reports)
  const handleLoadBatchDemo = useCallback(async (timezoneOffset = 2) => {
    try {
      const testFiles = [
        { url: '/test-reports/A026.html', name: 'A026.html' },
        { url: '/test-reports/A095.html', name: 'A095.html' },
        { url: '/test-reports/A109.html', name: 'A109.html' },
        { url: '/test-reports/A155.html', name: 'A155.html' },
        { url: '/test-reports/A160.html', name: 'A160.html' },
      ];

      const loaded = [];
      for (const item of testFiles) {
        const res = await fetch(item.url);
        if (res.ok) {
          const text = await res.text();
          const { trades, meta, reportStats } = parseMT5Report(text, timezoneOffset);
          const metrics = computeAllMetrics(trades, reportStats);
          loaded.push({
            id: `rep_${item.name.replace(/\.[^/.]+$/, '')}`,
            fileName: item.name,
            accountKey: meta.account || meta.name || item.name,
            meta,
            reportStats,
            trades,
            metrics,
            timezoneOffset,
            htmlContent: text,
            importedAt: Date.now(),
          });
        }
      }

      if (loaded.length > 0) {
        setReports(prev => {
          const existingIds = new Set(prev.map(r => r.id));
          const newUnique = loaded.filter(r => !existingIds.has(r.id));
          return [...prev, ...newUnique];
        });
        setActiveReportId(loaded[0].id);
        setIsAddModalOpen(false);
      }
    } catch (err) {
      console.error('Failed to load batch demo reports:', err);
      alert('Could not load test batch reports.');
    }
  }, []);

  // Check URL query parameters for test automation
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get('loadTestBatch') === '1') {
      handleLoadBatchDemo(2);
    }
  }, [handleLoadBatchDemo]);

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
              // 1. Next report in list
              // 2. If none, previous report
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
        setActiveTab('overview');
        setImportErrors([]);
        setConfirmModal(prev => ({ ...prev, isOpen: false }));
      },
    });
  }, [reports.length]);

  // If no reports are loaded, show empty state (file uploader)
  if (reports.length === 0 || !activeReport) {
    return (
      <FileUploader
        onFilesLoaded={handleFilesLoaded}
        onLoadDemo={handleLoadDemo}
        onLoadBatchDemo={handleLoadBatchDemo}
        isModal={false}
        existingReportsCount={0}
      />
    );
  }

  const { trades, metrics, meta, fileName, timezoneOffset } = activeReport;
  const activeAccountLabel = meta?.account || meta?.name || fileName;

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

          {/* Multi-Report Switcher */}
          <div className="topbar-switcher-wrapper">
            <ReportSelector
              reports={reports}
              activeReportId={activeReport.id}
              onSelectReport={setActiveReportId}
              onRemoveReport={handleRemoveReport}
              onOpenAddReports={() => setIsAddModalOpen(true)}
              onConfirmRemoveAll={handleConfirmRemoveAll}
            />
          </div>

          {/* Desktop Nav Tabs */}
          <nav className="topbar-nav">
            {TABS.map((tab) => {
              const Icon = tab.icon;
              const isActive = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`nav-tab${isActive ? ' active' : ''}`}
                >
                  <Icon size={13} />
                  {tab.label}
                </button>
              );
            })}
          </nav>

          {/* Actions */}
          <div className="topbar-actions">
            <button
              onClick={() => setIsAddModalOpen(true)}
              className="btn btn-sm"
              title="Add more MT5 reports to workspace"
            >
              <Plus size={13} />
              <span className="hide-on-xs">Add Reports</span>
            </button>

            <button
              onClick={handleExportReport}
              disabled={isExporting}
              className="btn btn-sm btn-primary"
              title={`Export active report (${activeAccountLabel}) to HTML`}
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
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`nav-tab${isActive ? ' active' : ''}`}
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

      {/* ── Active Report Context Strip ── */}
      <div className="breadcrumb-bar">
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

      {/* ── Main Analytical Content ── */}
      <main className="content-area">
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
      </main>

      {/* ── Add Reports Modal ── */}
      {isAddModalOpen && (
        <FileUploader
          onFilesLoaded={handleFilesLoaded}
          onLoadDemo={handleLoadDemo}
          onLoadBatchDemo={handleLoadBatchDemo}
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
    </div>
  );
}
