import { Upload, FileText, Zap, AlertCircle } from 'lucide-react';
import { useState, useCallback } from 'react';

const FEATURES = [
  { label: 'Gamified Grades',   desc: 'S/A/B/C/F Performance Rating' },
  { label: 'Behavioral AI',     desc: 'Smart Pattern Detection'      },
  { label: 'Leakage Detector',  desc: 'Find & Fix Profit Drains'     },
];

export default function FileUploader({ onFileLoaded }) {
  const [isDragging, setIsDragging] = useState(false);
  const [error,      setError]      = useState('');
  const [isLoading,  setIsLoading]  = useState(false);

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
      onFileLoaded(text, file.name);
    } catch (err) {
      setError('Failed to read the file. Please try again.');
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  }, [onFileLoaded]);

  const handleDrop       = useCallback((e) => { e.preventDefault(); setIsDragging(false); handleFile(e.dataTransfer.files[0]); }, [handleFile]);
  const handleDragOver   = useCallback((e) => { e.preventDefault(); setIsDragging(true);  }, []);
  const handleDragLeave  = useCallback((e) => { e.preventDefault(); setIsDragging(false); }, []);
  const handleInputChange = useCallback((e) => handleFile(e.target.files[0]), [handleFile]);

  const loadDemo = async (e) => {
    e.preventDefault(); e.stopPropagation();
    setIsLoading(true);
    try {
      const res = await fetch('/ReportHistorytest.html');
      if (res.ok) { const text = await res.text(); onFileLoaded(text, 'ReportHistorytest.html'); }
    } catch (err) { console.error(err); }
    finally { setIsLoading(false); }
  };

  return (
    <div style={{
      minHeight: '100vh',
      background: 'var(--canvas)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '32px 16px',
    }}>
      <div style={{ width: '100%', maxWidth: 560 }}>

        {/* Header */}
        <div style={{ textAlign: 'center', marginBottom: 36 }}>
          {/* Logo pill */}
          <div style={{
            display: 'inline-flex', alignItems: 'center', gap: 7,
            padding: '5px 14px', borderRadius: 99,
            border: '1px solid var(--hairline)',
            marginBottom: 24,
          }}>
            <Zap size={12} style={{ color: 'var(--accent)' }} />
            <span className="t-label">MT5 Analytics Engine</span>
          </div>

          <h1 style={{
            fontSize: 'clamp(1.75rem, 4vw, 2.5rem)',
            lineHeight: 1.1,
            letterSpacing: '-0.03em',
            color: 'var(--ink)',
            marginBottom: 12,
          }}>
            Trading Analytics<br />Dashboard
          </h1>

          <p style={{ color: 'var(--ink-mute)', fontSize: '0.875rem', lineHeight: 1.6, maxWidth: 380, margin: '0 auto' }}>
            Upload your MetaTrader 5 HTML report to unlock deep behavioral insights,
            gamified performance tracking, and AI-driven recommendations.
          </p>
        </div>

        {/* Drop Zone */}
        <div
          onDrop={handleDrop}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onClick={() => document.getElementById('mt5-file-input').click()}
          style={{
            position: 'relative',
            cursor: 'pointer',
            borderRadius: 'var(--radius-lg)',
            padding: '40px 32px',
            textAlign: 'center',
            transition: 'all 0.2s ease',
            border: isDragging ? '1.5px solid var(--ink)' : '1.5px dashed var(--hairline)',
            background: isDragging ? 'rgba(255,255,255,0.04)' : 'var(--canvas-card)',
          }}
        >
          <input
            id="mt5-file-input"
            type="file"
            accept=".html,.htm"
            onChange={handleInputChange}
            style={{ display: 'none' }}
          />

          {isLoading ? (
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 16 }}>
              <div style={{
                width: 44, height: 44, borderRadius: '50%',
                border: '2px solid var(--hairline)',
                borderTopColor: 'var(--accent)',
              }} className="spin-anim" />
              <span className="t-label" style={{ letterSpacing: '0.1em' }}>Processing report…</span>
            </div>
          ) : (
            <>
              <div style={{
                width: 56, height: 56, margin: '0 auto 20px',
                borderRadius: '50%',
                border: '1px solid var(--hairline)',
                background: 'var(--canvas-soft)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                color: isDragging ? 'var(--ink)' : 'var(--ink-mute)',
                transition: 'all 0.2s',
              }}>
                {isDragging ? <FileText size={22} /> : <Upload size={22} />}
              </div>

              <p style={{ color: 'var(--ink)', fontSize: '0.9375rem', marginBottom: 6 }}>
                {isDragging ? 'Drop your report here' : 'Drop MT5 Report or Click to Upload'}
              </p>
              <p style={{ color: 'var(--ink-mute)', fontSize: '0.8125rem' }}>
                Supports HTML reports exported from MetaTrader 5
              </p>

              <div style={{ marginTop: 24 }}>
                <span className="btn">Choose File</span>
              </div>
            </>
          )}
        </div>

        {/* Error */}
        {error && (
          <div style={{
            display: 'flex', alignItems: 'center', gap: 10,
            marginTop: 12, padding: '12px 16px',
            borderRadius: 'var(--radius-sm)',
            border: '1px solid rgba(244,63,94,0.25)',
            background: 'var(--danger-soft)',
          }}>
            <AlertCircle size={15} style={{ color: 'var(--danger)', flexShrink: 0 }} />
            <span style={{ color: 'var(--danger)', fontSize: '0.8125rem' }}>{error}</span>
          </div>
        )}

        {/* Feature Grid */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 10, marginTop: 28 }}>
          {FEATURES.map((f) => (
            <div key={f.label} style={{
              padding: '14px',
              borderRadius: 'var(--radius)',
              border: '1px solid var(--hairline)',
              background: 'var(--canvas-card)',
              textAlign: 'center',
            }}>
              <p style={{ color: 'var(--ink)', fontSize: '0.8125rem', marginBottom: 4 }}>{f.label}</p>
              <p className="t-label" style={{ fontSize: '0.625rem' }}>{f.desc}</p>
            </div>
          ))}
        </div>

        {/* Demo Button */}
        <div style={{ textAlign: 'center', marginTop: 24 }}>
          <button onClick={loadDemo} className="btn">
            Load Demo Report
          </button>
        </div>

      </div>
    </div>
  );
}
