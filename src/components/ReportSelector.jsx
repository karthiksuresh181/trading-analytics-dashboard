import { useState, useRef, useEffect } from 'react';
import { Layers, ChevronDown, Check, Trash2, Plus, Search, AlertCircle } from 'lucide-react';

export default function ReportSelector({
  reports = [],
  activeReportId,
  onSelectReport,
  onRemoveReport,
  onOpenAddReports,
  onConfirmRemoveAll,
}) {
  const [isOpen, setIsOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const dropdownRef = useRef(null);

  const activeReport = reports.find(r => r.id === activeReportId) || reports[0] || null;

  // Close dropdown on outside click
  useEffect(() => {
    function handleClickOutside(event) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    }
    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen]);

  // Close on Escape key
  useEffect(() => {
    function handleKeyDown(e) {
      if (e.key === 'Escape' && isOpen) {
        setIsOpen(false);
      }
    }
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen]);

  const filteredReports = reports.filter(r => {
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase();
    const acc = (r.meta?.account || '').toLowerCase();
    const name = (r.meta?.name || '').toLowerCase();
    const file = (r.fileName || '').toLowerCase();
    return acc.includes(q) || name.includes(q) || file.includes(q);
  });

  if (!activeReport) return null;

  const activeDisplayTitle = activeReport.meta?.account || activeReport.meta?.name || activeReport.fileName;
  const activeDisplaySub = activeReport.meta?.name && activeReport.meta?.account ? activeReport.meta.name : activeReport.fileName;

  return (
    <div className="report-selector-container" ref={dropdownRef}>
      {/* ── Selector Trigger Button ── */}
      <button
        type="button"
        id="report-selector-trigger"
        className={`report-selector-btn${isOpen ? ' active' : ''}`}
        onClick={() => setIsOpen(prev => !prev)}
        aria-haspopup="listbox"
        aria-expanded={isOpen}
        title="Switch active MT5 report"
      >
        <div className="report-selector-icon">
          <Layers size={13} />
        </div>
        <div className="report-selector-text">
          <span className="report-selector-account">{activeDisplayTitle}</span>
          {activeDisplaySub && activeDisplaySub !== activeDisplayTitle && (
            <span className="report-selector-sub">{activeDisplaySub}</span>
          )}
        </div>
        <span className="report-selector-badge" title={`${reports.length} report${reports.length > 1 ? 's' : ''} loaded`}>
          {reports.length}
        </span>
        <ChevronDown size={13} className={`report-selector-chevron${isOpen ? ' rotated' : ''}`} />
      </button>

      {/* ── Popover Dropdown ── */}
      {isOpen && (
        <div className="report-selector-popover fade-up" role="listbox">
          <div className="report-popover-header">
            <div>
              <div className="report-popover-title">Active Report</div>
              <div className="report-popover-sub">
                {reports.length} report{reports.length > 1 ? 's' : ''} loaded in workspace
              </div>
            </div>
            <button
              type="button"
              className="btn btn-sm"
              onClick={() => {
                setIsOpen(false);
                onOpenAddReports();
              }}
              style={{ fontSize: '0.75rem', padding: '4px 8px' }}
            >
              <Plus size={12} />
              Add
            </button>
          </div>

          {/* Search filter if 3 or more reports */}
          {reports.length >= 3 && (
            <div className="report-popover-search">
              <Search size={12} className="report-search-icon" />
              <input
                type="text"
                placeholder="Search account, name, file..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="report-search-input"
                autoFocus
              />
            </div>
          )}

          {/* Scrollable Reports List */}
          <div className="report-popover-list">
            {filteredReports.length === 0 ? (
              <div className="report-popover-empty">
                <AlertCircle size={14} style={{ color: 'var(--text-muted)' }} />
                <span>No matching reports found</span>
              </div>
            ) : (
              filteredReports.map((report) => {
                const isSelected = report.id === activeReportId;
                const title = report.meta?.account || report.meta?.name || report.fileName;
                const sub = report.meta?.name && report.meta?.account ? report.meta.name : report.fileName;

                return (
                  <div
                    key={report.id}
                    className={`report-list-item${isSelected ? ' selected' : ''}`}
                    onClick={() => {
                      onSelectReport(report.id);
                      setIsOpen(false);
                    }}
                    role="option"
                    aria-selected={isSelected}
                  >
                    <div className="report-item-check">
                      {isSelected ? (
                        <Check size={13} style={{ color: 'var(--primary)' }} />
                      ) : (
                        <div className="report-item-dot" />
                      )}
                    </div>

                    <div className="report-item-info">
                      <div className="report-item-title-row">
                        <span className="report-item-title">{title}</span>
                        {isSelected && <span className="report-item-active-tag">Active</span>}
                      </div>
                      <div className="report-item-details">
                        <span>{report.trades.length} trades</span>
                        <span>•</span>
                        <span>UTC{report.timezoneOffset >= 0 ? '+' : ''}{report.timezoneOffset}</span>
                        <span>•</span>
                        <span className="report-item-file" title={report.fileName}>{report.fileName}</span>
                      </div>
                      {sub && sub !== title && (
                        <div className="report-item-sub-desc">{sub}</div>
                      )}
                    </div>

                    <button
                      type="button"
                      className="report-item-remove-btn"
                      title={`Remove ${title}`}
                      onClick={(e) => {
                        e.stopPropagation();
                        onRemoveReport(report.id);
                      }}
                    >
                      <Trash2 size={13} />
                    </button>
                  </div>
                );
              })
            )}
          </div>

          {/* Popover Footer */}
          <div className="report-popover-footer">
            <button
              type="button"
              className="btn btn-sm btn-primary"
              style={{ flex: 1, fontSize: '0.75rem' }}
              onClick={() => {
                setIsOpen(false);
                onOpenAddReports();
              }}
            >
              <Plus size={12} />
              Add More Reports
            </button>
            <button
              type="button"
              className="report-clear-all-btn"
              onClick={() => {
                setIsOpen(false);
                onConfirmRemoveAll();
              }}
              title="Remove all loaded reports from workspace"
            >
              Remove All
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
