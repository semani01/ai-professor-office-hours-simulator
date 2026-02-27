import { useState } from 'react';
import { FileUpload } from './components/FileUpload';
import { ChatPanel } from './components/ChatPanel';
import { WeakSpotDashboard } from './components/WeakSpotDashboard';

const COURSE_ID = 'default';

export default function App() {
  const [uploadedFiles, setUploadedFiles] = useState([]);
  const [sessionId, setSessionId] = useState(null);

  function handleFilesIngested(newFiles) {
    setUploadedFiles((prev) => [...prev, ...newFiles]);
  }

  const hasUploads = uploadedFiles.length > 0;

  return (
    <div style={{ height: '100vh', display: 'flex', flexDirection: 'column', background: '#0f1117' }}>
      {/* Header */}
      <header style={{
        borderBottom: '1px solid #1e293b',
        padding: '14px 28px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        background: '#0f1117',
        flexShrink: 0,
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <div style={{
            width: 32, height: 32, borderRadius: 8,
            background: 'linear-gradient(135deg, #6366f1, #8b5cf6)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: 16,
          }}>🎓</div>
          <div>
            <div style={{ fontSize: 15, fontWeight: 600, color: '#f1f5f9', letterSpacing: '-0.01em' }}>
              AI Professor Office Hours
            </div>
            <div style={{ fontSize: 11, color: '#475569', marginTop: 1 }}>
              Socratic tutor grounded in your course materials
            </div>
          </div>
        </div>
        <div style={{
          fontSize: 11, color: '#6366f1', background: '#1e1b4b',
          padding: '4px 10px', borderRadius: 20, border: '1px solid #312e81',
          fontWeight: 500,
        }}>
          {hasUploads ? `${uploadedFiles.length} file${uploadedFiles.length > 1 ? 's' : ''} loaded` : 'No materials'}
        </div>
      </header>

      {/* Main layout */}
      <main style={{
        flex: 1, display: 'flex', gap: 0, overflow: 'hidden',
      }}>
        {/* Left sidebar */}
        <aside style={{
          width: 280, borderRight: '1px solid #1e293b',
          display: 'flex', flexDirection: 'column',
          background: '#0d1117', flexShrink: 0, overflow: 'hidden',
        }}>
          <div style={{ padding: '16px 16px 8px', borderBottom: '1px solid #1e293b' }}>
            <div style={{ fontSize: 11, fontWeight: 600, color: '#475569', letterSpacing: '0.08em', textTransform: 'uppercase' }}>
              Course Materials
            </div>
          </div>
          <div style={{ overflowY: 'auto', padding: 16 }}>
            <FileUpload courseId={COURSE_ID} onFilesIngested={handleFilesIngested} />
          </div>

          {/* Divider */}
          <div style={{ borderTop: '1px solid #1e293b', margin: '0 16px' }} />

          {/* Weak Spot Dashboard */}
          <div style={{ overflowY: 'auto', padding: 16 }}>
            <WeakSpotDashboard sessionId={sessionId} courseId={COURSE_ID} />
          </div>
        </aside>

        {/* Chat area */}
        <section style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
          <ChatPanel
            courseId={COURSE_ID}
            uploadedFiles={uploadedFiles}
            hasUploads={hasUploads}
            onSessionId={setSessionId}
          />
        </section>
      </main>
    </div>
  );
}
