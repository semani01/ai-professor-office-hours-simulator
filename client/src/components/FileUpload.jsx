import { useRef, useState } from 'react';
import { useUpload } from '../hooks/useUpload';
import { useTheme } from '../context/ThemeContext';

const ACCEPTED_TYPES = ['.pdf', '.docx', '.pptx'];
const ACCEPTED_MIME = [
  'application/pdf',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/vnd.openxmlformats-officedocument.presentationml.presentation',
];
const MAX_SIZE_MB = 10;

const FILE_ICONS = {
  pdf: '📕',
  docx: '📘',
  pptx: '📙',
};

const SOURCE_TYPE_ICONS = {
  lecture:    '📙',
  notes:      '📗',
  assignment: '📒',
  syllabus:   '📋',
  material:   '📄',
};

export function FileUpload({ courseId, onFilesIngested, token, onFileClick }) {
  const { files, uploading, error, uploadFiles } = useUpload();
  const { theme } = useTheme();
  const [dragOver, setDragOver] = useState(false);
  const [validationError, setValidationError] = useState(null);
  const [hoveredIdx, setHoveredIdx] = useState(null);
  const inputRef = useRef(null);

  function validateFiles(fileList) {
    for (const file of fileList) {
      if (file.size > MAX_SIZE_MB * 1024 * 1024) {
        return `"${file.name}" exceeds ${MAX_SIZE_MB}MB limit.`;
      }
      const ext = '.' + file.name.split('.').pop().toLowerCase();
      if (!ACCEPTED_TYPES.includes(ext) && !ACCEPTED_MIME.includes(file.type)) {
        return `"${file.name}" is unsupported. PDF, DOCX, PPTX only.`;
      }
    }
    return null;
  }

  async function handleFiles(fileList) {
    setValidationError(null);
    const err = validateFiles(Array.from(fileList));
    if (err) {
      setValidationError(err);
      // Auto-dismiss validation error after 5 seconds
      setTimeout(() => setValidationError(null), 5000);
      return;
    }
    // Capture courseId now — activeCourseId in parent may change before upload completes
    const uploadedForCourse = courseId;
    const result = await uploadFiles(fileList, courseId, token);
    // Reset the file input so the same file can be re-uploaded
    if (inputRef.current) inputRef.current.value = '';
    if (result?.ingested?.length > 0 && onFilesIngested) onFilesIngested(result.ingested, uploadedForCourse);
  }

  function onDrop(e) {
    e.preventDefault();
    setDragOver(false);
    if (uploading) return;
    if (e.dataTransfer.files.length > 0) handleFiles(e.dataTransfer.files);
  }

  const displayError = validationError || error;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
      {/* Drop zone */}
      <div
        onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
        onDragLeave={() => setDragOver(false)}
        onDrop={onDrop}
        onClick={() => !uploading && inputRef.current?.click()}
        style={{
          border: `2px dashed ${dragOver ? '#6366f1' : theme.border}`,
          borderRadius: 12,
          padding: '20px 16px',
          textAlign: 'center',
          cursor: uploading ? 'not-allowed' : 'pointer',
          background: dragOver ? `${theme.accentBg}44` : 'transparent',
          transition: 'all 0.15s ease',
        }}
      >
        <input
          ref={inputRef}
          type="file"
          multiple
          accept={ACCEPTED_TYPES.join(',')}
          style={{ display: 'none' }}
          onChange={(e) => e.target.files?.length && handleFiles(e.target.files)}
          disabled={uploading}
        />

        {uploading ? (
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8 }}>
            <div style={{
              width: 24, height: 24,
              border: '2px solid #6366f1', borderTopColor: 'transparent',
              borderRadius: '50%',
              animation: 'spin 0.8s linear infinite',
            }} />
            <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
            <p style={{ fontSize: 12, color: '#6366f1', margin: 0, fontWeight: 500 }}>Processing...</p>
            <p style={{ fontSize: 11, color: theme.textFaint, margin: 0 }}>Chunking & embedding</p>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6 }}>
            <div style={{ fontSize: 24 }}>📂</div>
            <p style={{ fontSize: 12, color: theme.textSecondary, margin: 0, fontWeight: 500 }}>
              Drop files or click to browse
            </p>
            <p style={{ fontSize: 11, color: theme.textMuted, margin: 0 }}>
              PDF · DOCX · PPTX · max {MAX_SIZE_MB}MB
            </p>
          </div>
        )}
      </div>

      {/* Error */}
      {displayError && (
        <div style={{
          padding: '8px 12px', borderRadius: 8,
          background: '#450a0a', border: '1px solid #7f1d1d',
          fontSize: 12, color: '#fca5a5',
          display: 'flex', gap: 6, alignItems: 'flex-start',
        }}>
          <span>⚠️</span>
          <span>{displayError}</span>
        </div>
      )}

      {/* Ingested files */}
      {files.length > 0 && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
          {files.map((f, i) => {
            const ext = f.fileName.split('.').pop().toLowerCase();
            const icon = FILE_ICONS[ext] || SOURCE_TYPE_ICONS[f.sourceType] || '📄';
            const colors = theme[f.sourceType] || theme.material;
            const isHovered = hoveredIdx === i;
            return (
              <div
                key={i}
                onClick={() => onFileClick && onFileClick(f)}
                onMouseEnter={() => setHoveredIdx(i)}
                onMouseLeave={() => setHoveredIdx(null)}
                style={{
                  display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                  padding: '8px 10px', borderRadius: 8,
                  background: isHovered ? theme.bgHover : theme.bgCard,
                  border: `1px solid ${isHovered ? theme.borderStrong : theme.border}`,
                  cursor: onFileClick ? 'pointer' : 'default',
                  transition: 'all 0.12s',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, minWidth: 0 }}>
                  <span style={{ fontSize: 14, flexShrink: 0 }}>{icon}</span>
                  <span style={{ fontSize: 11, color: isHovered ? theme.textBody : theme.textSecondary, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', transition: 'color 0.12s' }}>
                    {f.fileName.length > 28 ? f.fileName.slice(0, 25) + '...' : f.fileName}
                  </span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexShrink: 0, marginLeft: 8 }}>
                  {f.weekNumber && (
                    <span style={{ fontSize: 10, color: theme.textFaint }}>Wk {f.weekNumber}</span>
                  )}
                  <span style={{
                    fontSize: 10, padding: '2px 7px', borderRadius: 10, fontWeight: 500,
                    background: colors.bg, color: colors.text, border: `1px solid ${colors.border}`,
                    textTransform: 'capitalize',
                  }}>
                    {f.sourceType}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
