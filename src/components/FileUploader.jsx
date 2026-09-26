import { useState, useCallback, useEffect, useRef } from 'react';
import { Upload, FileText, Zap, AlertCircle, Globe, X, Layers, CheckCircle2 } from 'lucide-react';
import { parseMT5Report, computeAllMetrics } from '../utils/mt5Engine';
import { TIMEZONE_OPTIONS } from '../constants/timezone';

const FEATURES = [
  { label: 'Multi-Report Workspace', desc: 'Load & Switch Multiple Accounts', color: 'var(--primary)', gradient: 'linear-gradient(135deg, #3b82f6, #1d4ed8)' },
  { label: 'Gamified Grades', desc: 'S / A / B / C / F Rating', color: 'var(--positive)', gradient: 'linear-gradient(135deg, #10b981, #059669)' },
  { label: 'Behavioral AI', desc: 'Pattern & Leakage Detection', color: 'var(--accent-violet)', gradient: 'linear-gradient(135deg, #8b5cf6, #6d28d9)' },
];

export default function FileUploader({
  onFilesLoaded,
  onLoadDemo,
  isModal = false,
  onClose,
  existingReportsCount = 0,
  initialErrors = [],
}) {
  const [isDragging, setIsDragging] = useState(false);
  const [error, setError] = useState('');
  const [batchErrors, setBatchErrors] = useState(initialErrors);
  const [isLoading, setIsLoading] = useState(false);
  const [loadingStatus, setLoadingStatus] = useState('');
  const [timezoneOffset, setTimezoneOffset] = useState(2);
  const fileInputRef = useRef(null);

  useEffect(() => {
    if (initialErrors && initialErrors.length > 0) {
      setBatchErrors(initialErrors);
    }
  }, [initialErrors]);

  const processFiles = useCallback(async (fileList) => {
    if (!fileList || fileList.length === 0) return;

    const files = Array.from(fileList);
    setIsLoading(true);
    setError('');
    setBatchErrors([]);
    setLoadingStatus(`Reading ${files.length} report${files.length > 1 ? 's' : ''}…`);

    const successful = [];
    const failed = [];

    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      setLoadingStatus(`Parsing (${i + 1}/${files.length}): ${file.name}…`);

      if (!file.name.toLowerCase().endsWith('.html') && !file.name.toLowerCase().endsWith('.htm')) {
        failed.push({
          fileName: file.name,
          error: 'Unsupported file extension. Only .html or .htm MetaTrader reports are supported.',
        });
        continue;
      }

      try {
        const text = await file.text();
        const { trades, meta, reportStats } = parseMT5Report(text, timezoneOffset);

        if (!trades || trades.length === 0) {
          failed.push({
            fileName: file.name,
            error: 'No valid closed trade positions or deals found in report.',
          });
          continue;
        }

        const metrics = computeAllMetrics(trades, reportStats);
        const accountKey = meta.account || meta.name || file.name.replace(/\.[^/.]+$/, '');
        const id = `rep_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;

        successful.push({
          id,
          fileName: file.name,
          accountKey,
          meta,
          reportStats,
          trades,
          metrics,
          timezoneOffset,
          htmlContent: text,
          importedAt: Date.now(),
        });
      } catch (err) {
        console.error(`Error parsing file ${file.name}:`, err);
        failed.push({
          fileName: file.name,
          error: err.message || 'Corrupt or incompatible MT5 report format.',
        });
      }
    }

    setIsLoading(false);
    setLoadingStatus('');

    // Reset input value to allow immediate retry with the same file
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }

    if (successful.length === 0 && failed.length > 0) {
      setBatchErrors(failed);
    } else if (successful.length > 0) {
      onFilesLoaded(successful, failed);
      if (isModal) {
        onClose?.();
      }
    }
  }, [timezoneOffset, onFilesLoaded, isModal, onClose]);

  // Expose dev-only automated test helper strictly in development mode
  useEffect(() => {
    if (import.meta.env.DEV) {
      window.__mt5LoadTestFiles = async (fileUrls) => {
        const files = [];
        for (const url of fileUrls) {
          const res = await fetch(url);
          const text = await res.text();
          const name = url.split('/').pop();
          files.push(new File([text], name, { type: 'text/html' }));
        }
        return processFiles(files);
      };
      return () => {
        delete window.__mt5LoadTestFiles;
      };
    }
  }, [processFiles]);

  const handleDrop = useCallback((e) => {
    e.preventDefault();
    setIsDragging(false);
    processFiles(e.dataTransfer.files);
  }, [processFiles]);

  const handleDragOver = useCallback((e) => {
    e.preventDefault();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((e) => {
    e.preventDefault();
    setIsDragging(false);
  }, []);

  const handleChange = useCallback((e) => {
    if (e.target.files && e.target.files.length > 0) {
      processFiles(e.target.files);
    }
    // Reset file input value so selecting the same file again fires onChange
    e.target.value = '';
  }, [processFiles]);

  const handleLoadDemoClick = async (e) => {
    e.preventDefault();
    e.stopPropagation();
    setIsLoading(true);
    setLoadingStatus('Loading demo report…');
    setError('');
    setBatchErrors([]);
    try {
      if (onLoadDemo) {
        await onLoadDemo(timezoneOffset);
        if (isModal) onClose?.();
      } else {
        const res = await fetch('/ReportHistorytest.html');
        if (res.ok) {
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
          onFilesLoaded([demoReport], []);
          if (isModal) onClose?.();
        }
      }
    } catch (err) {
      console.error(err);
      setError('Failed to load demo report.');
    } finally {
      setIsLoading(false);
      setLoadingStatus('');
    }
  };

  const content = (
    <div className={`upload-panel${isModal ? ' upload-modal-panel' : ''}`}>
      {/* ── Modal Close Button ── */}
      {isModal && (
        <button
          type="button"
          className="btn-icon modal-close-btn"
          onClick={onClose}
          title="Close"
          style={{ position: 'absolute', top: 20, right: 20 }}
        >
          <X size={16} />
        </button>
      )}

      {/* ── Header ── */}
      <div className="upload-panel-header">
        <div className="upload-logo-pill">
          {isModal ? (
            <>
              <Layers size={12} style={{ color: 'var(--primary)' }} />
              <span className="t-label" style={{ color: 'var(--primary)' }}>
                {existingReportsCount > 0 ? `${existingReportsCount} Reports Currently Loaded` : 'Add Reports'}
              </span>
            </>
          ) : (
            <>
              <Zap size={12} style={{ color: 'var(--primary)' }} />
              <span className="t-label" style={{ color: 'var(--primary)' }}>Multi-Report Analytics Engine</span>
            </>
          )}
        </div>

        <h1 className="upload-title">
          {isModal ? 'Add MT5 Reports' : 'Trading Analytics'}<br />
          <span className="upload-title-gradient">
            {isModal ? 'To Workspace' : 'Dashboard'}
          </span>
        </h1>

        <p className="upload-subtitle">
          {isModal
            ? 'Select one or more MT5 HTML reports to add to your current workspace without replacing existing reports.'
            : 'Upload single or multiple MetaTrader 5 HTML reports simultaneously to analyze performance across accounts.'}
        </p>
      </div>

      {/* ── Timezone Selector ── */}
      <div className="upload-tz-row">
        <Globe size={15} style={{ color: 'var(--primary)', flexShrink: 0 }} />
        <div style={{ flex: 1 }}>
          <p style={{ color: 'var(--text-primary)', fontSize: '0.875rem', fontWeight: 500, marginBottom: 2 }}>
            Report Timezone
          </p>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.75rem' }}>
            Broker server time offset (MT5 typically uses UTC+2 EET).
          </p>
        </div>
        <select
          className="select"
          value={timezoneOffset}
          onChange={(e) => setTimezoneOffset(parseFloat(e.target.value))}
          disabled={isLoading}
        >
          {TIMEZONE_OPTIONS.map(opt => (
            <option key={opt.value} value={opt.value}>{opt.label}</option>
          ))}
        </select>
      </div>

      {/* ── Drop Zone ── */}
      <div
        className={`upload-dropzone${isDragging ? ' dragging' : ''}`}
        onDrop={handleDrop}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onClick={() => !isLoading && fileInputRef.current?.click()}
      >
        <input
          ref={fileInputRef}
          type="file"
          accept=".html,.htm"
          multiple
          onChange={handleChange}
          style={{ display: 'none' }}
          disabled={isLoading}
        />

        {isLoading ? (
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 14 }}>
            <div
              style={{
                width: 44,
                height: 44,
                borderRadius: '50%',
                border: '2px solid rgba(59,130,246,0.2)',
                borderTopColor: 'var(--primary)',
              }}
              className="spin-anim"
            />
            <span className="t-label" style={{ color: 'var(--primary)', letterSpacing: '0.08em' }}>
              {loadingStatus || 'Processing reports…'}
            </span>
          </div>
        ) : (
          <>
            <div className="upload-icon-ring" style={{ color: isDragging ? 'var(--primary)' : 'var(--text-muted)' }}>
              {isDragging ? <FileText size={24} /> : <Upload size={24} />}
            </div>
            <p style={{ color: 'var(--text-primary)', fontSize: '1rem', marginBottom: 6, fontWeight: 600 }}>
              {isDragging ? 'Drop MT5 reports here' : 'Drop MT5 Reports or Click to Browse'}
            </p>
            <p style={{ color: 'var(--text-muted)', fontSize: '0.8125rem', marginBottom: 20 }}>
              Select single or multiple HTML reports (.html, .htm)
            </p>
            <span className="btn btn-primary" style={{ pointerEvents: 'none' }}>
              <Upload size={13} />
              Select HTML Files
            </span>
          </>
        )}
      </div>

      {/* ── Detailed Batch Failure Error Display ── */}
      {batchErrors.length > 0 && (
        <div className="upload-batch-error-card">
          <div className="upload-batch-error-header">
            <AlertCircle size={16} style={{ color: 'var(--negative)', flexShrink: 0, marginTop: 2 }} />
            <div style={{ flex: 1 }}>
              <span style={{ fontWeight: 600, color: 'var(--text-primary)', fontSize: '0.875rem' }}>
                {batchErrors.length} {batchErrors.length === 1 ? 'report' : 'reports'} could not be imported
              </span>
              <p style={{ color: 'var(--text-muted)', fontSize: '0.75rem', marginTop: 2 }}>
                Please ensure your files are valid MetaTrader 5 HTML trade reports.
              </p>
            </div>
            <button
              type="button"
              className="btn-icon btn-sm"
              onClick={() => setBatchErrors([])}
              title="Dismiss error list"
            >
              <X size={12} />
            </button>
          </div>
          <div className="upload-batch-error-list">
            {batchErrors.map((err, idx) => (
              <div key={idx} className="upload-batch-error-item">
                <span className="upload-batch-error-filename">{err.fileName}</span>
                <span className="upload-batch-error-reason">{err.error}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── Generic Single Error Notice ── */}
      {error && (
        <div className="upload-error" style={{ marginBottom: 14 }}>
          <AlertCircle size={15} style={{ color: 'var(--negative)', flexShrink: 0 }} />
          <span style={{ color: 'var(--negative)', fontSize: '0.8125rem' }}>{error}</span>
        </div>
      )}

      {/* ── Feature Grid (Only shown in full landing mode) ── */}
      {!isModal && (
        <div className="upload-features">
          {FEATURES.map((f) => (
            <div key={f.label} className="upload-feature-tile">
              <div className="upload-feature-line" style={{ background: f.gradient }} />
              <p style={{ color: 'var(--text-primary)', fontSize: '0.8125rem', marginBottom: 4, fontWeight: 500 }}>
                {f.label}
              </p>
              <p className="t-label" style={{ fontSize: '0.65rem' }}>{f.desc}</p>
            </div>
          ))}
        </div>
      )}

      {/* ── Footer Actions ── */}
      <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'center', gap: 10, marginTop: 20 }}>
        <button
          type="button"
          onClick={handleLoadDemoClick}
          disabled={isLoading}
          className="btn"
          style={{ fontSize: '0.8125rem' }}
        >
          <CheckCircle2 size={13} style={{ color: 'var(--positive)' }} />
          {existingReportsCount > 0 ? 'Load Demo Report into Workspace' : 'Load Demo Report'}
        </button>

        {isModal && (
          <button
            type="button"
            onClick={onClose}
            className="btn btn-secondary"
            style={{ fontSize: '0.8125rem' }}
          >
            Cancel
          </button>
        )}
      </div>
    </div>
  );

  if (isModal) {
    return (
      <div className="modal-backdrop fade-in" onClick={onClose}>
        <div onClick={(e) => e.stopPropagation()} style={{ width: '100%', maxWidth: 580 }}>
          {content}
        </div>
      </div>
    );
  }

  return (
    <div className="upload-screen">
      {content}
    </div>
  );
}
