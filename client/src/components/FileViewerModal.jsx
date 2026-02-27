import { useEffect, useRef, useState } from 'react';

const SOURCE_TYPE_COLORS = {
  lecture:    { bg: '#1e1b4b', text: '#818cf8', border: '#312e81' },
  notes:      { bg: '#052e16', text: '#4ade80', border: '#14532d' },
  assignment: { bg: '#431407', text: '#fb923c', border: '#7c2d12' },
  syllabus:   { bg: '#2e1065', text: '#c084fc', border: '#4c1d95' },
  material:   { bg: '#1e293b', text: '#94a3b8', border: '#334155' },
};

export function FileViewerModal({ file, courseId, token, onClose }) {
  const [chunks, setChunks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [visible, setVisible] = useState(false);
  const panelRef = useRef(null);

  // Trigger slide-in animation after mount
  useEffect(() => {
    const t = setTimeout(() => setVisible(true), 10);
    return () => clearTimeout(t);
  }, []);

  // Close on Escape key
  useEffect(() => {
    function handleKey(e) {
      if (e.key === 'Escape') handleClose();
    }
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, []);

  // Fetch chunks for this file
  useEffect(() => {
    if (!file || !courseId) return;
    setLoading(true);
    const encoded = encodeURIComponent(file.fileName);
    fetch(`/api/files/${courseId}/chunks?sourceFile=${encoded}`, {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then((r) => r.json())
      .then((data) => setChunks(data.chunks || []))
      .catch(() => setChunks([]))
      .finally(() => setLoading(false));
  }, [file, courseId, token]);

  function handleClose() {
    setVisible(false);
    // Wait for slide-out animation before unmounting
    setTimeout(onClose, 250);
  }

  const colors = SOURCE_TYPE_COLORS[file.sourceType] || SOURCE_TYPE_COLORS.material;

  return (
    // Backdrop
    <div
      onClick={handleClose}
      style={{
        position: 'fixed', inset: 0, zIndex: 50,
        background: `rgba(0,0,0,${visible ? 0.6 : 0})`,
        transition: 'background 0.25s ease',
        display: 'flex', justifyContent: 'flex-end',
      }}
    >
      {/* Slide-in panel */}
      <div
        ref={panelRef}
        onClick={(e) => e.stopPropagation()}
        style={{
          width: 480, maxWidth: '90vw',
          height: '100%',
          background: '#0d1117',
          borderLeft: '1px solid #1e293b',
          display: 'flex', flexDirection: 'column',
          transform: visible ? 'translateX(0)' : 'translateX(100%)',
          transition: 'transform 0.25s ease',
          overflow: 'hidden',
        }}
      >
        {/* Header */}
        <div style={{
          padding: '16px 20px',
          borderBottom: '1px solid #1e293b',
          display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between',
          gap: 12, flexShrink: 0,
        }}>
          <div style={{ minWidth: 0 }}>
            <div style={{ fontSize: 14, fontWeight: 600, color: '#f1f5f9', wordBreak: 'break-word' }}>
              {file.fileName}
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 6 }}>
              <span style={{
                fontSize: 11, padding: '2px 8px', borderRadius: 10, fontWeight: 500,
                background: colors.bg, color: colors.text, border: `1px solid ${colors.border}`,
                textTransform: 'capitalize',
              }}>
                {file.sourceType}
              </span>
              {file.weekNumber && (
                <span style={{ fontSize: 11, color: '#64748b' }}>Week {file.weekNumber}</span>
              )}
              {!loading && (
                <span style={{ fontSize: 11, color: '#475569' }}>
                  {chunks.length} chunk{chunks.length !== 1 ? 's' : ''}
                </span>
              )}
            </div>
          </div>
          <button
            onClick={handleClose}
            style={{
              background: 'none', border: 'none',
              color: '#475569', cursor: 'pointer', fontSize: 20,
              lineHeight: 1, padding: 4, flexShrink: 0,
            }}
            onMouseEnter={(e) => e.currentTarget.style.color = '#f1f5f9'}
            onMouseLeave={(e) => e.currentTarget.style.color = '#475569'}
          >
            ×
          </button>
        </div>

        {/* Body */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '16px 20px' }}>
          {loading ? (
            <div style={{ display: 'flex', justifyContent: 'center', paddingTop: 40 }}>
              <div style={{
                width: 24, height: 24,
                border: '2px solid #6366f1', borderTopColor: 'transparent',
                borderRadius: '50%', animation: 'spin 0.8s linear infinite',
              }} />
              <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
            </div>
          ) : chunks.length === 0 ? (
            <div style={{ textAlign: 'center', paddingTop: 40, color: '#475569', fontSize: 13 }}>
              No content chunks found for this file.
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              {chunks.map((chunk, i) => (
                <div key={chunk.id || i} style={{
                  background: '#111827', border: '1px solid #1e293b',
                  borderRadius: 10, padding: '12px 14px',
                }}>
                  <div style={{ fontSize: 11, color: '#475569', marginBottom: 8, fontWeight: 500 }}>
                    Chunk {i + 1}
                    {chunk.week_number && ` · Week ${chunk.week_number}`}
                  </div>
                  <p style={{
                    margin: 0, fontSize: 13, color: '#94a3b8',
                    lineHeight: 1.65, whiteSpace: 'pre-wrap', wordBreak: 'break-word',
                  }}>
                    {chunk.content}
                  </p>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
