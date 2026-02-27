import { useEffect, useRef, useState } from 'react';

const SOURCE_TYPE_COLORS = {
  lecture:    { bg: '#1e1b4b', text: '#818cf8', border: '#312e81' },
  notes:      { bg: '#052e16', text: '#4ade80', border: '#14532d' },
  assignment: { bg: '#431407', text: '#fb923c', border: '#7c2d12' },
  syllabus:   { bg: '#2e1065', text: '#c084fc', border: '#4c1d95' },
  material:   { bg: '#1e293b', text: '#94a3b8', border: '#334155' },
};

const MIN_WIDTH = 360;
const MAX_WIDTH = 1100;
const DEFAULT_WIDTH = 600;

function isPdf(fileName) {
  return fileName?.toLowerCase().endsWith('.pdf');
}

export function FileViewerModal({ file, courseId, token, onClose }) {
  const [docText, setDocText] = useState('');
  const [meta, setMeta] = useState({ sourceType: file.sourceType, weekNumber: file.weekNumber });
  const [textLoading, setTextLoading] = useState(false);
  const [fileAvailable, setFileAvailable] = useState(null); // null=checking, true, false
  const [visible, setVisible] = useState(false);
  const [width, setWidth] = useState(DEFAULT_WIDTH);

  const dragging = useRef(false);
  const startX = useRef(0);
  const startWidth = useRef(DEFAULT_WIDTH);

  const pdf = isPdf(file.fileName);
  const encoded = encodeURIComponent(file.fileName);
  // The download URL goes through Vite's /api proxy in dev, direct in prod
  const downloadUrl = `/api/files/${courseId}/download?sourceFile=${encoded}&token=${encodeURIComponent(token)}`;

  // Slide-in after mount
  useEffect(() => {
    const t = setTimeout(() => setVisible(true), 10);
    return () => clearTimeout(t);
  }, []);

  // Escape key
  useEffect(() => {
    function onKey(e) { if (e.key === 'Escape') handleClose(); }
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  // For PDFs: check if the file exists on the server
  // For DOCX/PPTX: fetch extracted text for display
  useEffect(() => {
    if (!file || !courseId) return;

    if (pdf) {
      // Quick HEAD check to see if the stored file exists
      fetch(`/api/files/${courseId}/download?sourceFile=${encoded}`, {
        method: 'HEAD',
        headers: { Authorization: `Bearer ${token}` },
      }).then((r) => setFileAvailable(r.ok)).catch(() => setFileAvailable(false));
    } else {
      // Non-PDF: fetch extracted text
      setTextLoading(true);
      fetch(`/api/files/${courseId}/raw?sourceFile=${encoded}`, {
        headers: { Authorization: `Bearer ${token}` },
      })
        .then((r) => r.json())
        .then((data) => {
          setDocText(data.text || '');
          setMeta({
            sourceType: data.sourceType || file.sourceType,
            weekNumber: data.weekNumber ?? file.weekNumber,
          });
        })
        .catch(() => setDocText(''))
        .finally(() => setTextLoading(false));
    }
  }, [file, courseId, token]);

  function handleClose() {
    setVisible(false);
    setTimeout(onClose, 250);
  }

  // Drag-to-resize (left edge)
  function onResizeMouseDown(e) {
    e.preventDefault();
    dragging.current = true;
    startX.current = e.clientX;
    startWidth.current = width;

    function onMove(ev) {
      if (!dragging.current) return;
      const delta = startX.current - ev.clientX;
      setWidth(Math.min(MAX_WIDTH, Math.max(MIN_WIDTH, startWidth.current + delta)));
    }
    function onUp() {
      dragging.current = false;
      window.removeEventListener('mousemove', onMove);
      window.removeEventListener('mouseup', onUp);
    }
    window.addEventListener('mousemove', onMove);
    window.addEventListener('mouseup', onUp);
  }

  const colors = SOURCE_TYPE_COLORS[meta.sourceType] || SOURCE_TYPE_COLORS.material;
  const ext = file.fileName?.split('.').pop().toUpperCase() || '';

  return (
    <div
      onClick={handleClose}
      style={{
        position: 'fixed', inset: 0, zIndex: 50,
        background: `rgba(0,0,0,${visible ? 0.55 : 0})`,
        transition: 'background 0.25s ease',
        display: 'flex', justifyContent: 'flex-end',
      }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          width,
          maxWidth: '94vw',
          height: '100%',
          background: '#0d1117',
          borderLeft: '1px solid #1e293b',
          display: 'flex',
          flexDirection: 'column',
          transform: visible ? 'translateX(0)' : 'translateX(100%)',
          transition: dragging.current ? 'none' : 'transform 0.25s ease',
          overflow: 'hidden',
          position: 'relative',
        }}
      >
        {/* Resize handle */}
        <div
          onMouseDown={onResizeMouseDown}
          style={{
            position: 'absolute', left: 0, top: 0, bottom: 0, width: 6,
            cursor: 'ew-resize', zIndex: 10,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}
        >
          <div
            style={{ width: 3, height: 40, borderRadius: 2, background: '#334155', transition: 'background 0.15s' }}
            onMouseEnter={(e) => e.currentTarget.style.background = '#6366f1'}
            onMouseLeave={(e) => e.currentTarget.style.background = '#334155'}
          />
        </div>

        {/* Header */}
        <div style={{
          padding: '14px 18px 12px 18px',
          borderBottom: '1px solid #1e293b',
          display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between',
          gap: 12, flexShrink: 0,
        }}>
          <div style={{ minWidth: 0 }}>
            <div style={{ fontSize: 13, fontWeight: 600, color: '#f1f5f9', wordBreak: 'break-word', lineHeight: 1.4 }}>
              {file.fileName}
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 6, flexWrap: 'wrap' }}>
              <span style={{
                fontSize: 11, padding: '2px 8px', borderRadius: 10, fontWeight: 500,
                background: colors.bg, color: colors.text, border: `1px solid ${colors.border}`,
                textTransform: 'capitalize',
              }}>
                {meta.sourceType}
              </span>
              {meta.weekNumber && (
                <span style={{ fontSize: 11, color: '#64748b' }}>Week {meta.weekNumber}</span>
              )}
              {/* Download link — always shown */}
              <a
                href={downloadUrl}
                download={file.fileName}
                onClick={(e) => e.stopPropagation()}
                style={{
                  fontSize: 11, color: '#6366f1', textDecoration: 'none',
                  display: 'flex', alignItems: 'center', gap: 3,
                }}
                onMouseEnter={(e) => e.currentTarget.style.color = '#818cf8'}
                onMouseLeave={(e) => e.currentTarget.style.color = '#6366f1'}
              >
                ↓ Download {ext}
              </a>
            </div>
          </div>
          <button
            onClick={handleClose}
            style={{
              background: 'none', border: 'none', color: '#475569',
              cursor: 'pointer', fontSize: 20, lineHeight: 1, padding: 4, flexShrink: 0,
            }}
            onMouseEnter={(e) => e.currentTarget.style.color = '#f1f5f9'}
            onMouseLeave={(e) => e.currentTarget.style.color = '#475569'}
          >
            ×
          </button>
        </div>

        {/* Body */}
        <div style={{ flex: 1, overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
          {pdf ? (
            // PDF viewer
            fileAvailable === null ? (
              <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', flex: 1 }}>
                <div style={{
                  width: 24, height: 24, border: '2px solid #6366f1',
                  borderTopColor: 'transparent', borderRadius: '50%',
                  animation: 'spin 0.8s linear infinite',
                }} />
                <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
              </div>
            ) : fileAvailable ? (
              <iframe
                src={downloadUrl}
                title={file.fileName}
                style={{ flex: 1, border: 'none', width: '100%', height: '100%' }}
              />
            ) : (
              <div style={{
                flex: 1, display: 'flex', flexDirection: 'column',
                alignItems: 'center', justifyContent: 'center', gap: 12, padding: 32,
              }}>
                <div style={{ fontSize: 32 }}>📄</div>
                <div style={{ fontSize: 13, color: '#64748b', textAlign: 'center', lineHeight: 1.6 }}>
                  This file was uploaded before file storage was enabled.<br />
                  Re-upload it to view the original document.
                </div>
              </div>
            )
          ) : (
            // DOCX / PPTX — can't render natively; show extracted text
            <div style={{ flex: 1, overflowY: 'auto', padding: '20px 24px 32px 20px' }}>
              <div style={{
                marginBottom: 14, padding: '10px 14px', borderRadius: 8,
                background: '#1c1a00', border: '1px solid #854d0e',
                fontSize: 12, color: '#fbbf24', lineHeight: 1.5,
              }}>
                {ext} files can't be rendered in the browser. Showing extracted text below.
                Use the download link above to open the original file.
              </div>
              {textLoading ? (
                <div style={{ display: 'flex', justifyContent: 'center', paddingTop: 32 }}>
                  <div style={{
                    width: 22, height: 22, border: '2px solid #6366f1',
                    borderTopColor: 'transparent', borderRadius: '50%',
                    animation: 'spin 0.8s linear infinite',
                  }} />
                  <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
                </div>
              ) : (
                <pre style={{
                  margin: 0, fontFamily: 'inherit', fontSize: 13,
                  color: '#cbd5e1', lineHeight: 1.75,
                  whiteSpace: 'pre-wrap', wordBreak: 'break-word',
                }}>
                  {docText || 'No text content found.'}
                </pre>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
