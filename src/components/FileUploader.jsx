import { Upload, FileText, Zap, AlertCircle, Globe } from 'lucide-react';
import { useState, useCallback } from 'react';

const FEATURES = [
  { label: 'Gamified Grades', desc: 'S / A / B / C / F Rating', color: 'var(--accent-bright)', gradient: 'linear-gradient(135deg, #10b981, #059669)' },
  { label: 'Behavioral AI',   desc: 'Smart Pattern Detection',  color: 'var(--accent-violet)', gradient: 'linear-gradient(135deg, #8b5cf6, #6d28d9)' },
  { label: 'Leakage Finder',  desc: 'Find & Fix Profit Drains', color: 'var(--particle-hot)',  gradient: 'linear-gradient(135deg, #f97316, #ea580c)' },
];

const TIMEZONE_OPTIONS = [
  { label: 'UTC−12', value: -12 }, { label: 'UTC−11', value: -11 }, { label: 'UTC−10', value: -10 },
  { label: 'UTC−9',  value: -9  }, { label: 'UTC−8',  value: -8  }, { label: 'UTC−7',  value: -7  },
  { label: 'UTC−6',  value: -6  }, { label: 'UTC−5',  value: -5  }, { label: 'UTC−4',  value: -4  },
  { label: 'UTC−3',  value: -3  }, { label: 'UTC−2',  value: -2  }, { label: 'UTC−1',  value: -1  },
  { label: 'UTC±0',  value:  0  }, { label: 'UTC+1',  value:  1  },
  { label: 'UTC+2 (MT5 Default)', value: 2 },
  { label: 'UTC+3',  value:  3  }, { label: 'UTC+4',  value:  4  }, { label: 'UTC+5',  value:  5  },
  { label: 'UTC+5:30 (IST)', value: 5.5 },
  { label: 'UTC+6',  value:  6  }, { label: 'UTC+7',  value:  7  }, { label: 'UTC+8',  value:  8  },
  { label: 'UTC+9',  value:  9  }, { label: 'UTC+10', value: 10  }, { label: 'UTC+11', value: 11  },
  { label: 'UTC+12', value: 12  }, { label: 'UTC+13', value: 13  }, { label: 'UTC+14', value: 14  },
];

export default function FileUploader({ onFileLoaded }) {
  const [isDragging,     setIsDragging]     = useState(false);
  const [error,          setError]          = useState('');
  const [isLoading,      setIsLoading]      = useState(false);
  const [timezoneOffset, setTimezoneOffset] = useState(2);

  const handleFile = useCallback(async (file) => {
    if (!file) return;
    if (!file.name.endsWith('.html') && !file.name.endsWith('.htm')) {
      setError('Please upload a valid MT5 HTML report file (.html or .htm).');
      return;
    }
    setIsLoading(true);
    setError('');
    try {
      const text = await file.text();
      onFileLoaded(text, file.name, timezoneOffset);
    } catch (err) {
      setError('Failed to read the file. Please try again.');
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  }, [onFileLoaded, timezoneOffset]);

  const handleDrop      = useCallback((e) => { e.preventDefault(); setIsDragging(false); handleFile(e.dataTransfer.files[0]); }, [handleFile]);
  const handleDragOver  = useCallback((e) => { e.preventDefault(); setIsDragging(true);  }, []);
  const handleDragLeave = useCallback((e) => { e.preventDefault(); setIsDragging(false); }, []);
  const handleChange    = useCallback((e) => handleFile(e.target.files[0]), [handleFile]);

  const loadDemo = async (e) => {
    e.preventDefault();
    e.stopPropagation();
    setIsLoading(true);
    try {
      const res = await fetch('/ReportHistorytest.html');
      if (res.ok) {
        const text = await res.text();
        onFileLoaded(text, 'ReportHistorytest.html', timezoneOffset);
      }
    } catch (err) { console.error(err); }
    finally { setIsLoading(false); }
  };

  return (
    <div className="upload-screen">
      <div className="upload-panel">

        {/* ── Header ── */}
        <div className="upload-panel-header">
          <div className="upload-logo-pill">
            <Zap size={12} style={{ color: 'var(--accent-bright)' }} />
            <span className="t-label" style={{ color: 'var(--accent-bright)' }}>MT5 Analytics Engine</span>
          </div>

          <h1 className="upload-title">
            Trading Analytics<br />
            <span className="upload-title-gradient">Dashboard</span>
          </h1>

          <p className="upload-subtitle">
            Upload your MetaTrader 5 HTML report to unlock deep behavioral
            insights, gamified performance tracking, and AI-driven recommendations.
          </p>
        </div>

        {/* ── Timezone Selector ── */}
        <div className="upload-tz-row">
          <Globe size={15} style={{ color: 'var(--accent-bright)', flexShrink: 0 }} />
          <div style={{ flex: 1 }}>
            <p style={{ color: 'var(--ink)', fontSize: '0.875rem', fontWeight: 500, marginBottom: 2 }}>
              Report Timezone
            </p>
            <p style={{ color: 'var(--ink-mute)', fontSize: '0.75rem' }}>
              MT5 brokers typically use UTC+2 (EET).
            </p>
          </div>
          <select
            className="select"
            value={timezoneOffset}
            onChange={(e) => setTimezoneOffset(parseFloat(e.target.value))}
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
          onClick={() => document.getElementById('mt5-file-input').click()}
        >
          <input
            id="mt5-file-input"
            type="file"
            accept=".html,.htm"
            onChange={handleChange}
            style={{ display: 'none' }}
          />

          {isLoading ? (
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 16 }}>
              <div style={{
                width: 48, height: 48, borderRadius: '50%',
                border: '2px solid rgba(16,185,129,0.2)',
                borderTopColor: 'var(--accent-bright)',
              }} className="spin-anim" />
              <span className="t-label" style={{ letterSpacing: '0.12em', color: 'var(--accent-bright)' }}>
                Processing report…
              </span>
            </div>
          ) : (
            <>
              <div className="upload-icon-ring" style={{ color: isDragging ? 'var(--accent-bright)' : 'var(--ink-mute)' }}>
                {isDragging ? <FileText size={24} /> : <Upload size={24} />}
              </div>
              <p style={{ color: 'var(--ink)', fontSize: '1rem', marginBottom: 6, fontWeight: 500 }}>
                {isDragging ? 'Drop your report here' : 'Drop MT5 Report or Click to Upload'}
              </p>
              <p style={{ color: 'var(--ink-mute)', fontSize: '0.8125rem', marginBottom: 24 }}>
                HTML reports exported from MetaTrader 5
              </p>
              <span className="btn btn-primary">Choose File</span>
            </>
          )}
        </div>

        {/* ── Error ── */}
        {error && (
          <div className="upload-error" style={{ marginBottom: 14 }}>
            <AlertCircle size={15} style={{ color: 'var(--danger)', flexShrink: 0 }} />
            <span style={{ color: 'var(--danger)', fontSize: '0.8125rem' }}>{error}</span>
          </div>
        )}

        {/* ── Feature Grid ── */}
        <div className="upload-features">
          {FEATURES.map((f) => (
            <div key={f.label} className="upload-feature-tile">
              <div className="upload-feature-line" style={{ background: f.gradient }} />
              <p style={{ color: 'var(--ink)', fontSize: '0.8125rem', marginBottom: 4, fontWeight: 500 }}>
                {f.label}
              </p>
              <p className="t-label" style={{ fontSize: '0.65rem' }}>{f.desc}</p>
            </div>
          ))}
        </div>

        {/* ── Demo Button ── */}
        <div style={{ textAlign: 'center', marginTop: 20 }}>
          <button onClick={loadDemo} className="btn" style={{ fontSize: '0.8rem' }}>
            Load Demo Report
          </button>
        </div>
      </div>
    </div>
  );
}
