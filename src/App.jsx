import { useState, useCallback } from 'react';
import { parseMT5Report, computeAllMetrics, generateTextReport } from './utils/mt5Engine';
import FileUploader from './components/FileUploader';
import GamifiedOverview from './components/GamifiedOverview';
import AdvancedAnalytics from './components/AdvancedAnalytics';
import InteractiveCharts from './components/InteractiveCharts';
import JournalCalendar from './components/JournalCalendar';
import {
  LayoutDashboard, BarChart3, Brain, CalendarDays,
  Download, Upload, Zap, ChevronRight,
} from 'lucide-react';

const TABS = [
  { id: 'overview',   label: 'Overview',   icon: LayoutDashboard },
  { id: 'analytics',  label: 'Analytics',  icon: Brain           },
  { id: 'charts',     label: 'Charts',     icon: BarChart3       },
  { id: 'journal',    label: 'Journal',    icon: CalendarDays    },
];

export default function App() {
  const [trades, setTrades]       = useState(null);
  const [metrics, setMetrics]     = useState(null);
  const [meta, setMeta]           = useState(null);
  const [activeTab, setActiveTab] = useState('overview');
  const [fileName, setFileName]   = useState('');
  const [isExporting, setIsExporting] = useState(false);

  const handleFileLoaded = useCallback((htmlString, name) => {
    try {
      const { trades: parsed, meta: parsedMeta, reportStats } = parseMT5Report(htmlString);
      if (parsed.length === 0) {
        alert('No trade data found in the report. Please check the file format.');
        return;
      }
      const computed = computeAllMetrics(parsed, reportStats);
      setTrades(parsed);
      setMetrics(computed);
      setMeta(parsedMeta);
      setFileName(name);
    } catch (err) {
      console.error('Parse error:', err);
      alert('Failed to parse the MT5 report. Please ensure it is a valid HTML export.');
    }
  }, []);

  const handleExportReport = useCallback(() => {
    if (!trades || !metrics || !meta) return;
    setIsExporting(true);
    try {
      const report = generateTextReport(trades, metrics, meta);
      const blob = new Blob([report], { type: 'text/plain;charset=utf-8' });
      const url  = URL.createObjectURL(blob);
      const a    = document.createElement('a');
      a.href     = url;
      a.download = `mt5-analytics-report-${new Date().toISOString().slice(0, 10)}.txt`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (err) {
      console.error('Export error:', err);
    } finally {
      setIsExporting(false);
    }
  }, [trades, metrics, meta]);

  const handleReset = useCallback(() => {
    setTrades(null); setMetrics(null); setMeta(null);
    setFileName(''); setActiveTab('overview');
  }, []);

  if (!trades) return <FileUploader onFileLoaded={handleFileLoaded} />;

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
              <div className="topbar-brand-sub">{meta?.name || 'Dashboard'}</div>
            </div>
          </div>

          {/* Desktop Nav */}
          <nav className="topbar-nav">
            {TABS.map((tab) => {
              const Icon     = tab.icon;
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
            <button onClick={handleExportReport} disabled={isExporting} className="btn btn-sm">
              <Download size={13} />
              <span style={{ display: 'none' }} id="export-label-desktop">
                {isExporting ? 'Exporting…' : 'Export'}
              </span>
              <span className="hide-on-xs">{isExporting ? 'Exporting…' : 'Export'}</span>
            </button>
            <button onClick={handleReset} className="btn btn-sm">
              <Upload size={13} />
              <span className="hide-on-xs">New Report</span>
            </button>
          </div>
        </div>
      </header>

      {/* ── Mobile Tabs ── */}
      <div className="mobile-tabs">
        {TABS.map((tab) => {
          const Icon     = tab.icon;
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

      {/* ── Breadcrumb Bar ── */}
      <div className="breadcrumb-bar">
        <span className="t-label">Report</span>
        <ChevronRight size={10} style={{ color: 'var(--ink-mute)' }} />
        <span className="t-label" style={{ color: 'var(--ink-dim)', maxWidth: 200, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
          {fileName}
        </span>
        {meta?.account && (
          <>
            <ChevronRight size={10} style={{ color: 'var(--ink-mute)' }} />
            <span className="t-label" style={{ color: 'var(--accent)' }}>{meta.account}</span>
          </>
        )}
        <span className="t-label" style={{ marginLeft: 'auto' }}>
          {trades.length} trades analyzed
        </span>
      </div>

      {/* ── Main Content ── */}
      <main className="content-area">
        {activeTab === 'overview' && (
          <div className="stack-lg fade-up">
            <GamifiedOverview metrics={metrics} />
            <InteractiveCharts metrics={metrics} trades={trades} />
          </div>
        )}
        {activeTab === 'analytics' && (
          <div className="fade-up">
            <AdvancedAnalytics metrics={metrics} />
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
      </main>
    </div>
  );
}
