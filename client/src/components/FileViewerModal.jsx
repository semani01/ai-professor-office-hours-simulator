import { useEffect, useRef, useState } from 'react';
import { useTheme } from '../context/ThemeContext';

const MIN_WIDTH = 360;
const MAX_WIDTH = 1100;
const DEFAULT_WIDTH = 600;

function isPdf(fileName) {
  return fileName?.toLowerCase().endsWith('.pdf');
}

export function FileViewerModal({ file, courseId, token, onClose }) {
  const { theme } = useTheme();
  const [docText, setDocText] = useState('');
  const [meta, setMeta] = useState({ sourceType: file.sourceType, weekNumber: file.weekNumber });
  const [textLoading, setTextLoading] = useState(false);
  const [fileAvailable, setFileAvailable] = useState(null); // null=checking, true, false
  const [visible, setVisible] = useState(false);
  const [width, setWidth] = useState(DEFAULT_WIDTH);
  const [tipDismissed, setTipDismissed] = useState(
    () => sessionStorage.getItem('pdf-tip-dismissed') === '1'
  );

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
      fetch(`${import.meta.env.VITE_API_URL ?? ''}/api/files/${courseId}/download?sourceFile=${encoded}`, {
        method: 'HEAD',
        headers: { Authorization: `Bearer ${token}` },
      }).then((r) => setFileAvailable(r.ok)).catch(() => setFileAvailable(false));
    } else {
      // Non-PDF: fetch extracted text
      setTextLoading(true);
      fetch(`${import.meta.env.VITE_API_URL ?? ''}/api/files/${courseId}/raw?sourceFile=${encoded}`, {
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

  const colors = theme[meta.sourceType] || theme.material;
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
          background: theme.bgBase,
          borderLeft: `1px solid ${theme.border}`,
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
            style={{ width: 3, height: 40, borderRadius: 2, background: theme.borderStrong, transition: 'background 0.15s' }}
            onMouseEnter={(e) => e.currentTarget.style.background = '#6366f1'}
            onMouseLeave={(e) => e.currentTarget.style.background = theme.borderStrong}
          />
        </div>

        {/* Header */}
        <div style={{
          padding: '14px 18px 12px 18px',
          borderBottom: `1px solid ${theme.border}`,
          display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between',
          gap: 12, flexShrink: 0,
        }}>
          <div style={{ minWidth: 0 }}>
            <div style={{ fontSize: 13, fontWeight: 600, color: theme.textPrimary, wordBreak: 'break-word', lineHeight: 1.4 }}>
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
                <span style={{ fontSize: 11, color: theme.textMuted }}>Week {meta.weekNumber}</span>
              )}
              {/* Download link — always shown */}
              <a
                href={downloadUrl}
                download={file.fileName}
                onClick={(e) => e.stopPropagation()}
                style={{
                  fontSize: 11, color: theme.accent, textDecoration: 'none',
                  display: 'flex', alignItems: 'center', gap: 3,
                }}
                onMouseEnter={(e) => e.currentTarget.style.color = theme.accentLight}
                onMouseLeave={(e) => e.currentTarget.style.color = theme.accent}
              >
                ↓ Download {ext}
              </a>
            </div>
          </div>
          <button
            onClick={handleClose}
            style={{
              background: 'none', border: 'none', color: theme.textFaint,
              cursor: 'pointer', fontSize: 20, lineHeight: 1, padding: 4, flexShrink: 0,
            }}
            onMouseEnter={(e) => e.currentTarget.style.color = theme.textPrimary}
            onMouseLeave={(e) => e.currentTarget.style.color = theme.textFaint}
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
              <>
                {/* Dismissible tip strip for PDF controls */}
                {!tipDismissed && (
                  <div style={{
                    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                    padding: '7px 14px', flexShrink: 0,
                    background: theme.isDark ? '#0d1b2e' : '#eff6ff',
                    borderBottom: `1px solid ${theme.isDark ? '#1e3a5f' : '#bfdbfe'}`,
                    fontSize: 11, color: theme.isDark ? '#7dd3fc' : '#1d4ed8',
                  }}>
                    <span>💡 Use Ctrl+scroll to zoom · browser toolbar to navigate pages</span>
                    <button
                      onClick={() => { setTipDismissed(true); sessionStorage.setItem('pdf-tip-dismissed', '1'); }}
                      style={{ background: 'none', border: 'none', color: theme.isDark ? '#7dd3fc' : '#1d4ed8', cursor: 'pointer', fontSize: 14, lineHeight: 1, padding: '0 0 0 8px' }}
                    >×</button>
                  </div>
                )}
                <iframe
                  src={downloadUrl}
                  title={file.fileName}
                  style={{ flex: 1, border: 'none', width: '100%', height: '100%' }}
                />
              </>
            ) : (
              <div style={{
                flex: 1, display: 'flex', flexDirection: 'column',
                alignItems: 'center', justifyContent: 'center', gap: 12, padding: 32,
              }}>
                <div style={{ fontSize: 32 }}>📤</div>
                <div style={{ fontSize: 13, color: theme.textMuted, textAlign: 'center', lineHeight: 1.7 }}>
                  This file was uploaded before file storage was enabled.<br />
                  Re-upload it to view the original document.<br />
                  <span style={{ fontSize: 11, color: theme.textFaint }}>Drag it to the upload area in the sidebar.</span>
                </div>
              </div>
            )
          ) : (
            // DOCX / PPTX — can't render natively; show extracted text as paragraphs
            <div style={{ flex: 1, overflowY: 'auto', padding: '20px 24px 32px 20px' }}>
              <div style={{
                marginBottom: 14, padding: '10px 14px', borderRadius: 8,
                background: theme.isDark ? '#1c1a00' : '#fffbeb',
                border: `1px solid ${theme.isDark ? '#854d0e' : '#fde68a'}`,
                fontSize: 12, color: theme.isDark ? '#fbbf24' : '#92400e', lineHeight: 1.5,
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
              ) : docText ? (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                  {docText.split('\n\n').filter(Boolean).map((para, i) => (
                    <p key={i} style={{
                      margin: 0, fontSize: 13, color: theme.textBody,
                      lineHeight: 1.75, wordBreak: 'break-word',
                    }}>
                      {para.trim()}
                    </p>
                  ))}
                </div>
              ) : (
                <p style={{ fontSize: 13, color: theme.textFaint, margin: 0 }}>No text content found.</p>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
