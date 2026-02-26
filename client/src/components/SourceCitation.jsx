import { useState } from 'react';

const SOURCE_TYPE_LABELS = {
  lecture: 'Lecture',
  notes: 'Notes',
  assignment: 'Assignment',
  syllabus: 'Syllabus',
  material: 'Material',
};

export function SourceCitation({ sources }) {
  const [expanded, setExpanded] = useState(null);

  if (!sources || sources.length === 0) return null;

  // Deduplicate by sourceFile so we don't show the same file 5 times
  const unique = sources.filter(
    (s, i, arr) => arr.findIndex((x) => x.sourceFile === s.sourceFile) === i
  );

  return (
    <div className="mt-2 flex flex-wrap gap-1.5">
      {unique.map((source, i) => {
        const label = SOURCE_TYPE_LABELS[source.sourceType] || 'Source';
        const week = source.weekNumber ? `Week ${source.weekNumber}` : null;
        const tag = week ? `${week} · ${label}` : label;
        const isOpen = expanded === i;

        return (
          <div key={i} className="relative">
            <button
              onClick={() => setExpanded(isOpen ? null : i)}
              className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-indigo-50 text-indigo-700 border border-indigo-200 hover:bg-indigo-100 transition-colors"
            >
              <span>📄</span>
              <span>{tag}</span>
            </button>

            {isOpen && source.excerpt && (
              <div className="absolute bottom-full left-0 mb-1 z-10 w-72 p-3 bg-white border border-gray-200 rounded-lg shadow-lg text-xs text-gray-600 leading-relaxed">
                <p className="font-medium text-gray-800 mb-1 truncate">{source.sourceFile}</p>
                <p className="italic">"{source.excerpt}..."</p>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
