import { useEffect, useRef, useState } from 'react';
import { useAuth } from './hooks/useAuth';
import { AuthGate } from './components/AuthGate';
import { CourseTabs } from './components/CourseTabs';
import { FileUpload } from './components/FileUpload';
import { ChatPanel } from './components/ChatPanel';
import { WeakSpotDashboard } from './components/WeakSpotDashboard';
import { FileViewerModal } from './components/FileViewerModal';

function AppContent({ session, signOut }) {
  const token = session?.access_token;

  const [courses, setCourses] = useState([]);
  const [activeCourseId, setActiveCourseId] = useState(null);
  const [uploadedFiles, setUploadedFiles] = useState([]);
  const [sessionId, setSessionId] = useState(null);
  const [topicsVersion, setTopicsVersion] = useState(0);
  const [viewingFile, setViewingFile] = useState(null);

  // Stable ref so resetMessages can be called when course switches
  const resetMessagesRef = useRef(null);

  // Load courses on mount
  useEffect(() => {
    fetch('/api/courses', { headers: { Authorization: `Bearer ${token}` } })
      .then((r) => r.json())
      .then(async (data) => {
        let list = data.courses || [];
        // Auto-create a default course for new users
        if (list.length === 0) {
          const res = await fetch('/api/courses', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
            body: JSON.stringify({ name: 'My Course' }),
          });
          const created = await res.json();
          if (created.course) list = [created.course];
        }
        setCourses(list);
        setActiveCourseId(list[0]?.id ?? null);
      })
      .catch(console.error);
  }, [token]);

  // When active course changes, reset files + session
  useEffect(() => {
    setUploadedFiles([]);
    setSessionId(null);
    setTopicsVersion(0);
    resetMessagesRef.current?.();
  }, [activeCourseId]);

  function handleFilesIngested(newFiles) {
    setUploadedFiles((prev) => [...prev, ...newFiles]);
    // If a syllabus was ingested, bump topicsVersion so the dashboard re-fetches
    if (newFiles.some((f) => f.sourceType === 'syllabus')) {
      setTopicsVersion((v) => v + 1);
    }
  }

  async function handleCreateCourse(name) {
    const res = await fetch('/api/courses', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify({ name }),
    });
    const data = await res.json();
    if (data.course) {
      setCourses((prev) => [...prev, data.course]);
      setActiveCourseId(data.course.id);
    }
  }

  async function handleDeleteCourse(courseId) {
    await fetch(`/api/courses/${courseId}`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${token}` },
    });
    setCourses((prev) => {
      const next = prev.filter((c) => c.id !== courseId);
      // Switch to first remaining course, or null
      if (activeCourseId === courseId) {
        setActiveCourseId(next[0]?.id ?? null);
      }
      return next;
    });
  }

  const hasUploads = uploadedFiles.length > 0;
  const activeCourse = courses.find((c) => c.id === activeCourseId);

  return (
    <div style={{ height: '100vh', display: 'flex', flexDirection: 'column', background: '#0f1117' }}>
      {/* Header */}
      <header style={{
        borderBottom: '1px solid #1e293b',
        padding: '10px 20px',
        display: 'flex',
        alignItems: 'center',
        gap: 16,
        background: '#0f1117',
        flexShrink: 0,
      }}>
        {/* Logo */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0 }}>
          <div style={{
            width: 30, height: 30, borderRadius: 8,
            background: 'linear-gradient(135deg, #6366f1, #8b5cf6)',
            display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 15,
          }}>🎓</div>
          <span style={{ fontSize: 14, fontWeight: 600, color: '#f1f5f9', letterSpacing: '-0.01em', whiteSpace: 'nowrap' }}>
            AI Professor Office Hours
          </span>
        </div>

        {/* Divider */}
        <div style={{ width: 1, height: 20, background: '#1e293b', flexShrink: 0 }} />

        {/* Course tabs */}
        <div style={{ flex: 1, minWidth: 0 }}>
          <CourseTabs
            courses={courses}
            activeCourseId={activeCourseId}
            onSelect={(id) => setActiveCourseId(id)}
            onCreate={handleCreateCourse}
            onDelete={handleDeleteCourse}
          />
        </div>

        {/* Right: file count + sign out */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexShrink: 0 }}>
          <div style={{
            fontSize: 11, color: '#6366f1', background: '#1e1b4b',
            padding: '4px 10px', borderRadius: 20, border: '1px solid #312e81', fontWeight: 500,
          }}>
            {hasUploads ? `${uploadedFiles.length} file${uploadedFiles.length > 1 ? 's' : ''} loaded` : 'No materials'}
          </div>
          <button
            onClick={signOut}
            title="Sign out"
            style={{
              background: 'none', border: '1px solid #1e293b', borderRadius: 8,
              color: '#475569', cursor: 'pointer', fontSize: 11, padding: '4px 10px',
              transition: 'all 0.15s',
            }}
            onMouseEnter={(e) => { e.currentTarget.style.borderColor = '#334155'; e.currentTarget.style.color = '#94a3b8'; }}
            onMouseLeave={(e) => { e.currentTarget.style.borderColor = '#1e293b'; e.currentTarget.style.color = '#475569'; }}
          >
            Sign out
          </button>
        </div>
      </header>

      {/* Main layout */}
      <main style={{ flex: 1, display: 'flex', overflow: 'hidden' }}>
        {/* Left sidebar */}
        <aside style={{
          width: 280, borderRight: '1px solid #1e293b',
          display: 'flex', flexDirection: 'column',
          background: '#0d1117', flexShrink: 0, overflow: 'hidden',
        }}>
          <div style={{ padding: '12px 16px 8px', borderBottom: '1px solid #1e293b' }}>
            <div style={{ fontSize: 11, fontWeight: 600, color: '#475569', letterSpacing: '0.08em', textTransform: 'uppercase' }}>
              {activeCourse ? activeCourse.name : 'Course Materials'}
            </div>
          </div>
          <div style={{ overflowY: 'auto', padding: 16, flex: 1 }}>
            {activeCourseId ? (
              <FileUpload
                courseId={activeCourseId}
                onFilesIngested={handleFilesIngested}
                token={token}
                onFileClick={setViewingFile}
              />
            ) : (
              <div style={{ fontSize: 12, color: '#475569', textAlign: 'center', paddingTop: 20 }}>
                Create a course to get started
              </div>
            )}
          </div>

          {/* Divider */}
          <div style={{ borderTop: '1px solid #1e293b', margin: '0 16px' }} />

          {/* Weak Spot Dashboard */}
          <div style={{ overflowY: 'auto', padding: 16 }}>
            <WeakSpotDashboard
              sessionId={sessionId}
              courseId={activeCourseId}
              token={token}
              topicsVersion={topicsVersion}
            />
          </div>
        </aside>

        {/* Chat area */}
        <section style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
          <ChatPanel
            courseId={activeCourseId}
            uploadedFiles={uploadedFiles}
            hasUploads={hasUploads}
            onSessionId={setSessionId}
            token={token}
            onResetRef={resetMessagesRef}
          />
        </section>
      </main>

      {/* File viewer modal */}
      {viewingFile && (
        <FileViewerModal
          file={viewingFile}
          courseId={activeCourseId}
          token={token}
          onClose={() => setViewingFile(null)}
        />
      )}
    </div>
  );
}

export default function App() {
  const { session, loading, signOut } = useAuth();
  return (
    <AuthGate session={session} loading={loading}>
      <AppContent session={session} signOut={signOut} />
    </AuthGate>
  );
}
