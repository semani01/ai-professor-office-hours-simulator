import { useState } from 'react';
import { FileUpload } from './components/FileUpload';
import { ChatPanel } from './components/ChatPanel';

const COURSE_ID = 'default';

export default function App() {
  const [uploadedFiles, setUploadedFiles] = useState([]);

  function handleFilesIngested(newFiles) {
    setUploadedFiles((prev) => [...prev, ...newFiles]);
  }

  const hasUploads = uploadedFiles.length > 0;

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      {/* Header */}
      <header className="bg-white border-b border-gray-200 px-6 py-4">
        <div className="max-w-6xl mx-auto">
          <h1 className="text-lg font-semibold text-gray-900">AI Professor Office Hours</h1>
          <p className="text-xs text-gray-400 mt-0.5">Upload your course materials, then ask questions — Socratic style</p>
        </div>
      </header>

      {/* Main layout: two-column */}
      <main className="flex-1 max-w-6xl mx-auto w-full px-6 py-6 flex gap-6 min-h-0">
        {/* Left sidebar: file upload */}
        <aside className="w-72 shrink-0 flex flex-col gap-4">
          <div className="bg-white border border-gray-200 rounded-2xl p-4 shadow-sm">
            <h2 className="text-sm font-semibold text-gray-700 mb-3">Course Materials</h2>
            <FileUpload
              courseId={COURSE_ID}
              onFilesIngested={handleFilesIngested}
            />
          </div>
        </aside>

        {/* Right: chat panel */}
        <section className="flex-1 bg-white border border-gray-200 rounded-2xl shadow-sm overflow-hidden flex flex-col min-h-[600px]">
          <ChatPanel
            courseId={COURSE_ID}
            uploadedFiles={uploadedFiles}
            hasUploads={hasUploads}
          />
        </section>
      </main>
    </div>
  );
}
