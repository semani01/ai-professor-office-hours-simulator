import { useEffect, useRef, useState } from 'react';
import { useAuth } from './hooks/useAuth';
import { ThemeProvider, useTheme } from './context/ThemeContext';
import { AuthGate } from './components/AuthGate';
import { CourseTabs } from './components/CourseTabs';
import { FileUpload } from './components/FileUpload';
import { ChatPanel } from './components/ChatPanel';
import { KnowledgePortfolio } from './components/KnowledgePortfolio';
import { FileViewerModal } from './components/FileViewerModal';
import { XpBar } from './components/XpBar';
import { AchievementsButton } from './components/Achievements';
import { QuizMode } from './components/QuizMode';
import { ConversationList } from './components/ConversationList';
import { TopicRoom } from './components/TopicRoom';

function AppContent({ session, signOut }) {
  const token = session?.access_token;
  const { theme, toggleTheme } = useTheme();

  const [courses, setCourses] = useState([]);
  const [activeCourseId, setActiveCourseId] = useState(null);
  const [coursesError, setCoursesError] = useState(false);
  const [uploadedFiles, setUploadedFiles] = useState([]);
  const [sessionId, setSessionId] = useState(null);
  const [topicsVersion, setTopicsVersion] = useState(0);
  const [viewingFile, setViewingFile] = useState(null);
  const [quizOpen, setQuizOpen] = useState(false);
  const [xpData, setXpData] = useState(null);
  const [xpVersion, setXpVersion] = useState(0);
  const [portfolioVersion, setPortfolioVersion] = useState(0);
  const [activeConversationId, setActiveConversationId] = useState(null);
  const [activeTopic, setActiveTopic] = useState(null);
  // manualTiers: { [courseId_tag]: tier } — user's self-assessment overrides, persisted to localStorage
  const [manualTiers, setManualTiers] = useState(() => {
    try { return JSON.parse(localStorage.getItem('maieutic_manual_tiers') || '{}'); } catch { return {}; }
  });
  const [newBadgeKeys, setNewBadgeKeys] = useState([]);
  const conversationIdRef = useRef(null);

  const resetMessagesRef = useRef(null);

  // Keep ref in sync with state for synchronous access inside sendMessage closure
  useEffect(() => { conversationIdRef.current = activeConversationId; }, [activeConversationId]);

  // Load courses on mount
  function loadCourses() {
    setCoursesError(false);
    fetch('/api/courses', { headers: { Authorization: `Bearer ${token}` } })
      .then((r) => r.json())
      .then(async (data) => {
        let list = data.courses || [];
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
      .catch(() => setCoursesError(true));
  }

  useEffect(() => { loadCourses(); }, [token]);

  // Load XP data
  useEffect(() => {
    if (!token) return;
    fetch('/api/xp', { headers: { Authorization: `Bearer ${token}` } })
      .then((r) => r.json())
      .then((data) => { if (!data.error) setXpData(data); })
      .catch(() => {});
  }, [token, xpVersion]);

  // When active course changes, reset files + session + conversation + topic room
  useEffect(() => {
    setUploadedFiles([]);
    setSessionId(null);
    setTopicsVersion(0);
    setActiveConversationId(null);
    setActiveTopic(null);
    resetMessagesRef.current?.();
  }, [activeCourseId]);

  function handleFilesIngested(newFiles, forCourseId) {
    if (forCourseId && forCourseId !== activeCourseId) return;
    setUploadedFiles((prev) => {
      const existingNames = new Set(prev.map((f) => f.fileName));
      const fresh = newFiles.filter((f) => !existingNames.has(f.fileName));
      return fresh.length > 0 ? [...prev, ...fresh] : prev;
    });
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

  async function handleRenameCourse(courseId, name) {
    const res = await fetch(`/api/courses/${courseId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify({ name }),
    });
    const data = await res.json();
    if (data.course) {
      setCourses((prev) => prev.map((c) => c.id === courseId ? { ...c, name: data.course.name } : c));
    }
  }

  async function handleDeleteCourse(courseId) {
    await fetch(`/api/courses/${courseId}`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${token}` },
    });
    setCourses((prev) => {
      const next = prev.filter((c) => c.id !== courseId);
      if (activeCourseId === courseId) {
        setActiveCourseId(next[0]?.id ?? null);
      }
      return next;
    });
  }

  function handleXpEarned() {
    setXpVersion((v) => v + 1);
    setPortfolioVersion((v) => v + 1);
  }

  function handleConversationDeleted() {
    setActiveConversationId(null);
    resetMessagesRef.current?.();
  }

  function handleTierChange(tag, newTier) {
    const key = `${activeCourseId}_${tag}`;
    const updated = { ...manualTiers, [key]: newTier };
    setManualTiers(updated);
    localStorage.setItem('maieutic_manual_tiers', JSON.stringify(updated));
    // Keep activeTopic in sync so the header badge updates immediately
    setActiveTopic((prev) => prev ? { ...prev, manualTier: newTier } : prev);
  }

  function handleTopicClick(topic) {
    const key = `${activeCourseId}_${topic.tag}`;
    const override = manualTiers[key];
    setActiveTopic(override ? { ...topic, manualTier: override } : topic);
  }

  const hasUploads = uploadedFiles.length > 0;
  const activeCourse = courses.find((c) => c.id === activeCourseId);

  // Slice manualTiers to just { [tag]: tier } for the active course
  const tierOverridesForCourse = Object.fromEntries(
    Object.entries(manualTiers)
      .filter(([k]) => k.startsWith(`${activeCourseId}_`))
      .map(([k, v]) => [k.slice(activeCourseId.length + 1), v])
  );

  return (
    <div style={{ height: '100vh', display: 'flex', flexDirection: 'column', background: theme.bgBase }}>
      {/* Header */}
      <header style={{
        borderBottom: `1px solid ${theme.border}`,
        padding: '8px 16px',
        display: 'flex',
        alignItems: 'center',
        gap: 12,
        background: theme.bgBase,
        flexShrink: 0,
      }}>
        {/* Logo */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0 }}>
          <div style={{
            width: 28, height: 28, borderRadius: 8,
            background: 'linear-gradient(135deg, #6366f1, #8b5cf6)',
            display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 14,
          }}>🎓</div>
          <span style={{ fontSize: 13, fontWeight: 600, color: theme.textPrimary, letterSpacing: '-0.01em', whiteSpace: 'nowrap' }}>
            AI Professor
          </span>
        </div>

        {/* Divider */}
        <div style={{ width: 1, height: 18, background: theme.border, flexShrink: 0 }} />

        {/* Course tabs */}
        <div style={{ flex: 1, minWidth: 0 }}>
          <CourseTabs
            courses={courses}
            activeCourseId={activeCourseId}
            onSelect={(id) => setActiveCourseId(id)}
            onCreate={handleCreateCourse}
            onDelete={handleDeleteCourse}
            onRename={handleRenameCourse}
          />
        </div>

        {/* Right section: Quiz Me + XP bar + Achievements + theme + signout */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0 }}>
          {/* Quiz Me button */}
          <button
            onClick={() => activeCourseId && setQuizOpen(true)}
            disabled={!activeCourseId || !hasUploads}
            title={!hasUploads ? 'Upload materials first to take a quiz' : 'Take a quiz from your materials'}
            style={{
              display: 'flex', alignItems: 'center', gap: 5,
              padding: '5px 12px', borderRadius: 8, border: 'none',
              background: activeCourseId && hasUploads
                ? 'linear-gradient(135deg, #6366f1, #8b5cf6)'
                : theme.border,
              color: activeCourseId && hasUploads ? '#fff' : theme.textFaint,
              cursor: activeCourseId && hasUploads ? 'pointer' : 'not-allowed',
              fontSize: 12, fontWeight: 600, transition: 'all 0.15s', flexShrink: 0,
            }}
          >
            <span>⚡</span>
            <span>Quiz Me</span>
          </button>

          {/* XP bar */}
          <XpBar xpData={xpData} />

          {/* Achievements */}
          <AchievementsButton token={token} newBadgeKeys={newBadgeKeys} />

          {/* Divider */}
          <div style={{ width: 1, height: 18, background: theme.border, flexShrink: 0 }} />

          {/* Theme toggle */}
          <button
            onClick={toggleTheme}
            title={theme.isDark ? 'Switch to light mode' : 'Switch to dark mode'}
            style={{
              background: 'none', border: `1px solid ${theme.border}`, borderRadius: 8,
              color: theme.textFaint, cursor: 'pointer', fontSize: 14,
              width: 30, height: 28, display: 'flex', alignItems: 'center', justifyContent: 'center',
              transition: 'all 0.15s', flexShrink: 0,
            }}
            onMouseEnter={(e) => { e.currentTarget.style.borderColor = theme.borderStrong; e.currentTarget.style.color = theme.textSecondary; }}
            onMouseLeave={(e) => { e.currentTarget.style.borderColor = theme.border; e.currentTarget.style.color = theme.textFaint; }}
          >
            {theme.isDark ? '☀️' : '🌙'}
          </button>

          {/* Sign out */}
          <button
            onClick={signOut}
            title="Sign out"
            style={{
              background: 'none', border: `1px solid ${theme.border}`, borderRadius: 8,
              color: theme.textFaint, cursor: 'pointer', fontSize: 11, padding: '4px 10px',
              transition: 'all 0.15s',
            }}
            onMouseEnter={(e) => { e.currentTarget.style.borderColor = theme.borderStrong; e.currentTarget.style.color = theme.textSecondary; }}
            onMouseLeave={(e) => { e.currentTarget.style.borderColor = theme.border; e.currentTarget.style.color = theme.textFaint; }}
          >
            Sign out
          </button>
        </div>
      </header>

      {/* 3-column main layout */}
      <main style={{ flex: 1, display: 'flex', overflow: 'hidden' }}>
        {/* Left panel — Sources (240px) */}
        <aside style={{
          width: 240, borderRight: `1px solid ${theme.border}`,
          display: 'flex', flexDirection: 'column',
          background: theme.bgSurface, flexShrink: 0, overflow: 'hidden',
        }}>
          <div style={{ padding: '10px 14px 8px', borderBottom: `1px solid ${theme.border}` }}>
            <div style={{ fontSize: 10, fontWeight: 600, color: theme.textFaint, letterSpacing: '0.08em', textTransform: 'uppercase' }}>
              {activeCourse ? activeCourse.name : 'Course Materials'}
            </div>
          </div>

          {/* Conversation list */}
          {activeCourseId && (
            <div style={{ borderBottom: `1px solid ${theme.border}`, flexShrink: 0 }}>
              <ConversationList
                courseId={activeCourseId}
                token={token}
                activeConversationId={activeConversationId}
                onSelect={setActiveConversationId}
                onCreate={setActiveConversationId}
                onDelete={handleConversationDeleted}
              />
            </div>
          )}

          <div style={{ overflowY: 'auto', padding: 14, flex: 1 }}>
            {coursesError ? (
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 10, paddingTop: 24 }}>
                <div style={{ fontSize: 12, color: '#f87171', textAlign: 'center' }}>
                  Failed to load courses.
                </div>
                <button
                  onClick={loadCourses}
                  style={{
                    fontSize: 11, padding: '5px 14px', borderRadius: 8,
                    background: 'none', border: `1px solid ${theme.borderStrong}`,
                    color: theme.textSecondary, cursor: 'pointer',
                  }}
                  onMouseEnter={(e) => e.currentTarget.style.borderColor = theme.accent}
                  onMouseLeave={(e) => e.currentTarget.style.borderColor = theme.borderStrong}
                >
                  Try again
                </button>
              </div>
            ) : activeCourseId ? (
              <FileUpload
                key={activeCourseId}
                courseId={activeCourseId}
                onFilesIngested={handleFilesIngested}
                token={token}
                onFileClick={setViewingFile}
              />
            ) : (
              <div style={{ fontSize: 12, color: theme.textFaint, textAlign: 'center', paddingTop: 20 }}>
                Create a course to get started
              </div>
            )}
          </div>
        </aside>

        {/* Center panel — Chat or Topic Room (flex 1) */}
        <section style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden', minWidth: 0 }}>
          {activeTopic ? (
            <TopicRoom
              topic={activeTopic}
              courseId={activeCourseId}
              token={token}
              onBack={() => setActiveTopic(null)}
              onNewBadges={(keys) => setNewBadgeKeys((prev) => [...prev, ...keys])}
              onTierChange={handleTierChange}
            />
          ) : (
            <ChatPanel
              courseId={activeCourseId}
              uploadedFiles={uploadedFiles}
              hasUploads={hasUploads}
              onSessionId={setSessionId}
              token={token}
              onResetRef={resetMessagesRef}
              onXpEarned={handleXpEarned}
              conversationId={activeConversationId}
              conversationIdRef={conversationIdRef}
              onNewBadges={(keys) => setNewBadgeKeys((prev) => [...prev, ...keys])}
            />
          )}
        </section>

        {/* Right panel — Knowledge Portfolio (260px) */}
        <aside style={{
          width: 260, borderLeft: `1px solid ${theme.border}`,
          display: 'flex', flexDirection: 'column',
          background: theme.bgSurface, flexShrink: 0, overflow: 'hidden',
        }}>
          <div style={{ padding: '10px 14px 8px', borderBottom: `1px solid ${theme.border}` }}>
            <div style={{ fontSize: 10, fontWeight: 600, color: theme.textFaint, letterSpacing: '0.08em', textTransform: 'uppercase' }}>
              Knowledge Portfolio
            </div>
          </div>
          <div style={{ overflowY: 'auto', padding: 14, flex: 1 }}>
            <KnowledgePortfolio
              courseId={activeCourseId}
              token={token}
              topicsVersion={topicsVersion}
              portfolioVersion={portfolioVersion}
              xpData={xpData}
              onTopicClick={handleTopicClick}
              tierOverrides={tierOverridesForCourse}
            />
          </div>
        </aside>
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

      {/* Quiz overlay */}
      {quizOpen && activeCourseId && (
        <QuizMode
          courseId={activeCourseId}
          token={token}
          onClose={() => { setQuizOpen(false); handleXpEarned(); }}
          onXpEarned={handleXpEarned}
          onNewBadges={(keys) => setNewBadgeKeys((prev) => [...prev, ...keys])}
        />
      )}
    </div>
  );
}

export default function App() {
  const { session, loading, signOut } = useAuth();
  return (
    <ThemeProvider>
      <AuthGate session={session} loading={loading}>
        <AppContent session={session} signOut={signOut} />
      </AuthGate>
    </ThemeProvider>
  );
}
