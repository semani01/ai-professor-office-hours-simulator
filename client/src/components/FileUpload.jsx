import { useRef, useState } from 'react';
import { useUpload } from '../hooks/useUpload';

const ACCEPTED_TYPES = ['.pdf', '.docx', '.pptx'];
const ACCEPTED_MIME = [
  'application/pdf',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/vnd.openxmlformats-officedocument.presentationml.presentation',
];
const MAX_SIZE_MB = 10;

const SOURCE_TYPE_COLORS = {
  lecture: 'bg-blue-100 text-blue-700',
  notes: 'bg-green-100 text-green-700',
  assignment: 'bg-orange-100 text-orange-700',
  syllabus: 'bg-purple-100 text-purple-700',
  material: 'bg-gray-100 text-gray-700',
};

export function FileUpload({ courseId, onFilesIngested }) {
  const { files, uploading, error, uploadFiles } = useUpload();
  const [dragOver, setDragOver] = useState(false);
  const [validationError, setValidationError] = useState(null);
  const inputRef = useRef(null);

  function validateFiles(fileList) {
    for (const file of fileList) {
      if (file.size > MAX_SIZE_MB * 1024 * 1024) {
        return `"${file.name}" is too large. Maximum file size is ${MAX_SIZE_MB}MB.`;
      }
      const ext = '.' + file.name.split('.').pop().toLowerCase();
      if (!ACCEPTED_TYPES.includes(ext) && !ACCEPTED_MIME.includes(file.type)) {
        return `"${file.name}" is not supported. Please upload PDF, DOCX, or PPTX files only.`;
      }
    }
    return null;
  }

  async function handleFiles(fileList) {
    setValidationError(null);
    const err = validateFiles(Array.from(fileList));
    if (err) { setValidationError(err); return; }

    const result = await uploadFiles(fileList, courseId);
    if (result?.ingested?.length > 0 && onFilesIngested) {
      onFilesIngested(result.ingested);
    }
  }

  function onDrop(e) {
    e.preventDefault();
    setDragOver(false);
    if (e.dataTransfer.files.length > 0) handleFiles(e.dataTransfer.files);
  }

  const displayError = validationError || error;

  return (
    <div className="flex flex-col gap-4">
      {/* Drop zone */}
      <div
        onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
        onDragLeave={() => setDragOver(false)}
        onDrop={onDrop}
        onClick={() => !uploading && inputRef.current?.click()}
        className={`
          border-2 border-dashed rounded-xl p-6 text-center cursor-pointer transition-colors
          ${dragOver ? 'border-indigo-400 bg-indigo-50' : 'border-gray-300 hover:border-indigo-300 hover:bg-gray-50'}
          ${uploading ? 'opacity-60 cursor-not-allowed' : ''}
        `}
      >
        <input
          ref={inputRef}
          type="file"
          multiple
          accept={ACCEPTED_TYPES.join(',')}
          className="hidden"
          onChange={(e) => e.target.files?.length && handleFiles(e.target.files)}
          disabled={uploading}
        />

        {uploading ? (
          <div className="flex flex-col items-center gap-2">
            <div className="w-6 h-6 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin" />
            <p className="text-sm text-indigo-600 font-medium">Processing files...</p>
            <p className="text-xs text-gray-400">Parsing, chunking, and embedding — this may take a moment</p>
          </div>
        ) : (
          <div className="flex flex-col items-center gap-2">
            <span className="text-3xl">📂</span>
            <p className="text-sm font-medium text-gray-700">Drop files here or click to browse</p>
            <p className="text-xs text-gray-400">PDF, DOCX, PPTX · Max {MAX_SIZE_MB}MB each</p>
          </div>
        )}
      </div>

      {/* Error */}
      {displayError && (
        <div className="flex items-start gap-2 p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">
          <span>⚠️</span>
          <span>{displayError}</span>
        </div>
      )}

      {/* Ingested files list */}
      {files.length > 0 && (
        <div className="flex flex-col gap-2">
          <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Uploaded Materials</p>
          {files.map((f, i) => (
            <div key={i} className="flex items-center justify-between p-2.5 bg-white border border-gray-200 rounded-lg">
              <div className="flex items-center gap-2 min-w-0">
                <span className="text-base">📄</span>
                <span className="text-sm text-gray-700 truncate">{f.fileName}</span>
              </div>
              <div className="flex items-center gap-2 shrink-0 ml-2">
                {f.weekNumber && (
                  <span className="text-xs text-gray-400">Wk {f.weekNumber}</span>
                )}
                <span className={`text-xs px-2 py-0.5 rounded-full font-medium capitalize ${SOURCE_TYPE_COLORS[f.sourceType] || SOURCE_TYPE_COLORS.material}`}>
                  {f.sourceType}
                </span>
                <span className="text-xs text-gray-400">{f.chunkCount} chunks</span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
