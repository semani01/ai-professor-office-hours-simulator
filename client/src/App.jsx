import { useEffect, useRef, useState } from 'react';
import { useAuth } from './hooks/useAuth';
import { useQuests } from './hooks/useQuests';
import { ThemeProvider, useTheme } from './context/ThemeContext';
import { AuthGate } from './components/AuthGate';
import LandingPage from './components/LandingPage';
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
import { ElectronIcon } from './components/ElectronIcon';
import { UserMenu } from './components/UserMenu';
import { DeleteCourseDialog } from './components/DeleteCourseDialog';
import StudySessionModal from './components/StudySessionModal';
import { ActiveSessionBanner } from './components/ActiveSessionBanner';
import { SessionSummaryPanel } from './components/SessionSummaryPanel';
import { WelcomeBackPanel } from './components/WelcomeBackPanel';
import { QuestPanel } from './components/QuestPanel';
import { SideQuestPanel } from './components/SideQuestPanel';
import { FocusTimer } from './components/FocusTimer';

const INTENT_LABELS = {
  general: 'General Study',
  exam_prep: 'Exam Prep',
  assignment: 'Assignment',
  review_weak: 'Review Weak Spots',
  explore_new: 'Explore New Topics',
};

function makeDragHandler(setter, direction, min, max) {
  return function onMouseDown(e) {
    e.preventDefault();
    const onMove = (ev) => setter((w) => Math.max(min, Math.min(max, w + ev.movementX * direction)));
    const onUp = () => {
      window.removeEventListener('mousemove', onMove);
      window.removeEventListener('mouseup', onUp);
    };
    window.addEventListener('mousemove', onMove);
    window.addEventListener('mouseup', onUp);
  };
}

function AppContent({ session, signOut }) {
  const token = session?.access_token;
  const { theme, toggleTheme } = useTheme();

  const [logoHovered, setLogoHovered] = useState(false);
  const [courses, setCourses] = useState([]);
  const [activeCourseId, setActiveCourseId] = useState(null);
  const [coursesError, setCoursesError] = useState(false);
  const [uploadedFiles, setUploadedFiles] = useState([]);
  const [topicsVersion, setTopicsVersion] = useState(0);
  const [viewingFile, setViewingFile] = useState(null);
  const [quizOpen, setQuizOpen] = useState(false);
  const [xpData, setXpData] = useState(null);
  const [xpVersion, setXpVersion] = useState(0);
  const [portfolioVersion, setPortfolioVersion] = useState(0);
  const [activeConversationId, setActiveConversationId] = useState(null);
  const [activeTopic, setActiveTopic] = useState(null);
  const [pendingDelete, setPendingDelete] = useState(null);
  const [manualTiers, setManualTiers] = useState(() => {
    try { return JSON.parse(localStorage.getItem('maieutic_manual_tiers') || '{}'); } catch { return {}; }
  });
  const [newBadgeKeys, setNewBadgeKeys] = useState([]);

  // Panel widths (resizable)
  const [leftWidth, setLeftWidth] = useState(() => parseInt(localStorage.getItem('maieutic_left_w') || '240', 10));
  const [rightWidth, setRightWidth] = useState(() => parseInt(localStorage.getItem('maieutic_right_w') || '260', 10));
  useEffect(() => { localStorage.setItem('maieutic_left_w', leftWidth); }, [leftWidth]);
  useEffect(() => { localStorage.setItem('maieutic_right_w', rightWidth); }, [rightWidth]);
  const onLeftHandleDrag = makeDragHandler(setLeftWidth, 1, 180, 400);
  const onRightHandleDrag = makeDragHandler(setRightWidth, -1, 200, 420);

  // Study session state
  const [activeStudySession, setActiveStudySession] = useState(null);
  const [showSessionSetup, setShowSessionSetup] = useState(false);
  const [sessionSummary, setSessionSummary] = useState(null);
  const [welcomeBackSummary, setWelcomeBackSummary] = useState(null);
  const [endingSession, setEndingSession] = useState(false);
  // quiz results accumulated during this session (passed to end-session endpoint)
  const sessionQuizResultsRef = useRef([]);
  // ref to send a message programmatically into the active ChatPanel
  const sendMessageRef = useRef(null);

  // Quests
  const { quests, adoptQuests, updateQuestStatus, deleteQuest, checkQuestCompletion } =
    useQuests(activeCourseId, token);

  const conversationIdRef = useRef(null);
  const flashcardCacheRef = useRef({});
  const topicContentCacheRef = useRef({});
  const resetMessagesRef = useRef(null);

  useEffect(() => { conversationIdRef.current = activeConversationId; }, [activeConversationId]);

  // Load courses on mount
  function loadCourses() {
    setCoursesError(false);
    fetch((import.meta.env.VITE_API_URL ?? '') + '/api/courses', { headers: { Authorization: `Bearer ${token}` } })
      .then((r) => r.json())
      .then(async (data) => {
        let list = data.courses || [];
        if (list.length === 0) {
          const res = await fetch((import.meta.env.VITE_API_URL ?? '') + '/api/courses', {
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
    fetch((import.meta.env.VITE_API_URL ?? '') + '/api/xp', { headers: { Authorization: `Bearer ${token}` } })
      .then((r) => r.json())
      .then((data) => { if (!data.error) setXpData(data); })
      .catch(() => {});
  }, [token, xpVersion]);

  // On mount: check for an existing active session (browser-close recovery)
  useEffect(() => {
    if (!token) return;
    fetch((import.meta.env.VITE_API_URL ?? '') + '/api/study-sessions/active', { headers: { Authorization: `Bearer ${token}` } })
      .then((r) => r.json())
      .then((data) => { if (data.session) setActiveStudySession(data.session); })
      .catch(() => {});
  }, [token]);

  // Check for welcome-back summary once course is loaded and no active session running
  useEffect(() => {
    if (!token || !activeCourseId || activeStudySession) return;
    fetch(`${import.meta.env.VITE_API_URL ?? ''}/api/study-sessions/latest-summary?courseId=${activeCourseId}`, {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then((r) => r.json())
      .then((data) => { if (data.summary) setWelcomeBackSummary(data.summary); })
      .catch(() => {});
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token, activeCourseId]);

  // When active course changes, reset local state
  useEffect(() => {
    setUploadedFiles([]);
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
    const res = await fetch((import.meta.env.VITE_API_URL ?? '') + '/api/courses', {
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
    const res = await fetch(`${import.meta.env.VITE_API_URL ?? ''}/api/courses/${courseId}`, {
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
    await fetch(`${import.meta.env.VITE_API_URL ?? ''}/api/courses/${courseId}`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${token}` },
    });
    setCourses((prev) => {
      const next = prev.filter((c) => c.id !== courseId);
      if (activeCourseId === courseId) setActiveCourseId(next[0]?.id ?? null);
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
    setActiveTopic((prev) => prev ? { ...prev, manualTier: newTier } : prev);
  }

  function handleTopicClick(topic) {
    const key = `${activeCourseId}_${topic.tag}`;
    const override = manualTiers[key];
    setActiveTopic(override ? { ...topic, manualTier: override } : topic);
    checkQuestCompletion('topic_room_opened', { topicTag: topic.tag });
  }

  // Build portfolio snapshot for session-end summary
  function buildPortfolioSnapshot() {
    return Object.entries(manualTiers)
      .filter(([k]) => k.startsWith(`${activeCourseId}_`))
      .map(([k, v]) => ({ tag: k.slice(activeCourseId.length + 1), tier: v }));
  }

  async function handleSessionStarted(sess) {
    setActiveStudySession(sess);
    sessionQuizResultsRef.current = [];
    setShowSessionSetup(false);
    // Create a named conversation for this session
    try {
      const res = await fetch((import.meta.env.VITE_API_URL ?? '') + '/api/conversations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ courseId: activeCourseId, title: `__session__${sess.id}` }),
      });
      const data = await res.json();
      if (data.conversation) {
        setActiveConversationId(data.conversation.id);
      }
    } catch { /* ignore */ }
    // After state settles, send guided opening message
    setTimeout(() => {
      const plan = sess.study_plan;
      const steps = plan?.steps || [];
      let intro = `Let's start your **${INTENT_LABELS[sess.intent] || 'study'}** session! 🎯\n\n`;
      if (steps.length > 0) {
        intro += `Here's your plan:\n${steps.map((s, i) => `**${i + 1}.** ${s.action}${s.estimatedMinutes ? ` — ${s.estimatedMinutes} min` : ''}`).join('\n')}\n\n`;
      }
      intro += `Type a question to get started, or open a topic from the Knowledge Portfolio on the right.`;
      sendMessageRef.current?.(intro, { isSystem: true });
    }, 200);
    handleXpEarned();
  }

  async function handleEndSession() {
    if (!activeStudySession || endingSession) return;
    setEndingSession(true);
    try {
      const res = await fetch(`${import.meta.env.VITE_API_URL ?? ''}/api/study-sessions/${activeStudySession.id}/end`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({
          quizResults: sessionQuizResultsRef.current,
          portfolioSnapshot: buildPortfolioSnapshot(),
        }),
      });
      const data = await res.json();
      if (data.summary) setSessionSummary(data.summary);
    } catch {
      // session end failed silently — UI still resets below
    } finally {
      setActiveStudySession(null);
      sessionQuizResultsRef.current = [];
      setEndingSession(false);
    }
  }

  // Route quest "Go" clicks to the appropriate UI
  function handleQuestAction(quest) {
    const td = quest.target_data || {};
    if (quest.quest_type === 'topic_room' || quest.quest_type === 'chat') {
      if (td.topicTag) {
        const key = `${activeCourseId}_${td.topicTag}`;
        const override = manualTiers[key];
        setActiveTopic(override
          ? { tag: td.topicTag, manualTier: override }
          : { tag: td.topicTag });
        // Refresh portfolio to reflect topic interaction
        handleXpEarned();
      }
    } else if (quest.quest_type === 'quiz') {
      setQuizOpen(true);
    }
    if (quest.status === 'pending') updateQuestStatus(quest.id, 'in_progress');
  }

  const hasUploads = uploadedFiles.length > 0;
  const activeCourse = courses.find((c) => c.id === activeCourseId);

  const tierOverridesForCourse = Object.fromEntries(
    Object.entries(manualTiers)
      .filter(([k]) => k.startsWith(`${activeCourseId}_`))
      .map(([k, v]) => [k.slice(activeCourseId.length + 1), v])
  );

  return (
    <div style={{ height: '100vh', display: 'flex', flexDirection: 'column', background: theme.bgBase }}>
      {/* ── Header ─────────────────────────────────────────────── */}
      <header style={{
        borderBottom: `1px solid ${theme.border}`,
        padding: '8px 16px',
        display: 'flex', alignItems: 'center', gap: 12,
        background: theme.bgBase, flexShrink: 0,
      }}>
        {/* Logo — clickable button to go home */}
        <button
          onClick={() => {
            setActiveTopic(null);
            setActiveConversationId(null);
          }}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 8,
            flexShrink: 0,
            cursor: 'pointer',
            background: 'none',
            border: 'none',
            padding: 0,
          }}
          onMouseEnter={() => setLogoHovered(true)}
          onMouseLeave={() => setLogoHovered(false)}
          title="Go to home"
        >
          <div style={{
            width: 28, height: 28, borderRadius: 8,
            background: 'linear-gradient(135deg, #1e1b4b, #312e81)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            border: `1px solid ${logoHovered ? '#818cf8' : '#4c1d95'}`,
            transition: 'border-color 0.2s',
          }}><ElectronIcon size={18} color="#a78bfa" animate={logoHovered} /></div>
          <span style={{ fontSize: 13, fontWeight: 600, color: theme.textPrimary, letterSpacing: '-0.01em', whiteSpace: 'nowrap' }}>
            Maieutic
          </span>
        </button>

        <div style={{ width: 1, height: 18, background: theme.border, flexShrink: 0 }} />

        {/* Course tabs */}
        <div style={{ flex: 1, minWidth: 0 }}>
          <CourseTabs
            courses={courses}
            activeCourseId={activeCourseId}
            onSelect={(id) => setActiveCourseId(id)}
            onCreate={handleCreateCourse}
            onDeleteRequest={(id, name) => setPendingDelete({ id, name })}
            onRename={handleRenameCourse}
          />
        </div>

        {/* Right controls */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0 }}>
          {/* Study Session button — hidden while a session is active */}
          {!activeStudySession && (
            <button
              onClick={() => activeCourseId && setShowSessionSetup(true)}
              disabled={!activeCourseId}
              style={{
                display: 'flex', alignItems: 'center', gap: 5,
                padding: '5px 12px', borderRadius: 8,
                background: activeCourseId ? 'linear-gradient(135deg, #0f172a, #1e293b)' : theme.border,
                border: activeCourseId ? '1px solid #4f46e5' : `1px solid ${theme.border}`,
                color: activeCourseId ? '#c7d2fe' : theme.textFaint,
                cursor: activeCourseId ? 'pointer' : 'not-allowed',
                fontSize: 12, fontWeight: 600, transition: 'all 0.15s', flexShrink: 0,
              }}
              onMouseEnter={(e) => { if (activeCourseId) e.currentTarget.style.background = 'linear-gradient(135deg, #1e1b4b, #312e81)'; }}
              onMouseLeave={(e) => { if (activeCourseId) e.currentTarget.style.background = 'linear-gradient(135deg, #0f172a, #1e293b)'; }}
            >
              <span>📖</span><span>Study Session</span>
            </button>
          )}

          {/* Focus Timer — always available */}
          <FocusTimer />

          {/* Quiz Me */}
          <button
            onClick={() => activeCourseId && setQuizOpen(true)}
            disabled={!activeCourseId || !hasUploads}
            title={!hasUploads ? 'Upload materials first' : 'Take a quiz'}
            style={{
              display: 'flex', alignItems: 'center', gap: 5,
              padding: '5px 12px', borderRadius: 8, border: 'none',
              background: activeCourseId && hasUploads ? 'linear-gradient(135deg, #6366f1, #8b5cf6)' : theme.border,
              color: activeCourseId && hasUploads ? '#fff' : theme.textFaint,
              cursor: activeCourseId && hasUploads ? 'pointer' : 'not-allowed',
              fontSize: 12, fontWeight: 600, transition: 'all 0.15s', flexShrink: 0,
            }}
          >
            <span>⚡</span><span>Quiz Me</span>
          </button>

          <XpBar xpData={xpData} />
          <AchievementsButton token={token} newBadgeKeys={newBadgeKeys} />

          <div style={{ width: 1, height: 18, background: theme.border, flexShrink: 0 }} />

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

          <UserMenu
            email={session?.user?.email}
            token={token}
            signOut={signOut}
            onCourseRestored={(course) => {
              setCourses((prev) => [...prev, course]);
              setActiveCourseId(course.id);
            }}
          />
        </div>
      </header>

      {/* ── Active session banner ───────────────────────────────── */}
      {activeStudySession && (
        <ActiveSessionBanner
          session={activeStudySession}
          onEndSession={handleEndSession}
        />
      )}

      {/* ── 3-column layout ────────────────────────────────────── */}
      <main style={{ flex: 1, display: 'flex', overflow: 'hidden' }}>
        {/* Left panel */}
        <aside style={{
          width: leftWidth,
          display: 'flex', flexDirection: 'column',
          background: theme.bgSurface, flexShrink: 0, overflow: 'hidden',
        }}>
          <div style={{ padding: '10px 14px 8px', borderBottom: `1px solid ${theme.border}` }}>
            <div style={{ fontSize: 10, fontWeight: 600, color: theme.textFaint, letterSpacing: '0.08em', textTransform: 'uppercase' }}>
              {activeCourse ? activeCourse.name : 'Course Materials'}
            </div>
          </div>

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
                <div style={{ fontSize: 12, color: '#f87171', textAlign: 'center' }}>Failed to load courses.</div>
                <button
                  onClick={loadCourses}
                  style={{
                    fontSize: 11, padding: '5px 14px', borderRadius: 8,
                    background: 'none', border: `1px solid ${theme.borderStrong}`,
                    color: theme.textSecondary, cursor: 'pointer',
                  }}
                  onMouseEnter={(e) => e.currentTarget.style.borderColor = theme.accent}
                  onMouseLeave={(e) => e.currentTarget.style.borderColor = theme.borderStrong}
                >Try again</button>
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

        {/* Left drag handle */}
        <div
          onMouseDown={onLeftHandleDrag}
          style={{
            width: 4, flexShrink: 0, cursor: 'col-resize',
            background: 'transparent', borderRight: `1px solid ${theme.border}`,
            transition: 'background 0.15s',
          }}
          onMouseEnter={(e) => { e.currentTarget.style.background = '#6366f133'; e.currentTarget.style.borderRightColor = '#6366f1'; }}
          onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.borderRightColor = theme.border; }}
        />

        {/* Center panel */}
        <section style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden', minWidth: 0 }}>
          {activeTopic ? (
            <TopicRoom
              topic={activeTopic}
              courseId={activeCourseId}
              token={token}
              onBack={() => setActiveTopic(null)}
              onNewBadges={(keys) => setNewBadgeKeys((prev) => [...prev, ...keys])}
              onTierChange={handleTierChange}
              flashcardCache={flashcardCacheRef}
              contentCache={topicContentCacheRef}
              studySessionId={activeStudySession?.id ?? null}
            />
          ) : (
            <ChatPanel
              courseId={activeCourseId}
              hasUploads={hasUploads}
              token={token}
              onResetRef={resetMessagesRef}
              onSendRef={sendMessageRef}
              onXpEarned={handleXpEarned}
              conversationId={activeConversationId}
              conversationIdRef={conversationIdRef}
              onNewBadges={(keys) => setNewBadgeKeys((prev) => [...prev, ...keys])}
              onAutoConversation={(newConvId) => {
                setActiveConversationId(newConvId);
              }}
              studySessionId={activeStudySession?.id ?? null}
            />
          )}
        </section>

        {/* Right drag handle */}
        <div
          onMouseDown={onRightHandleDrag}
          style={{
            width: 4, flexShrink: 0, cursor: 'col-resize',
            background: 'transparent', borderLeft: `1px solid ${theme.border}`,
            transition: 'background 0.15s',
          }}
          onMouseEnter={(e) => { e.currentTarget.style.background = '#6366f133'; e.currentTarget.style.borderLeftColor = '#6366f1'; }}
          onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.borderLeftColor = theme.border; }}
        />

        {/* Right panel — Knowledge Portfolio + Quests + Side Quests */}
        <aside style={{
          width: rightWidth,
          display: 'flex', flexDirection: 'column',
          background: theme.bgSurface, flexShrink: 0, overflow: 'hidden',
        }}>
          <div style={{ padding: '10px 14px 8px', borderBottom: `1px solid ${theme.border}` }}>
            <div style={{ fontSize: 10, fontWeight: 600, color: theme.textFaint, letterSpacing: '0.08em', textTransform: 'uppercase' }}>
              Knowledge Portfolio
            </div>
          </div>
          <div style={{ overflowY: 'auto', flex: 1 }}>
            <div style={{ padding: 14 }}>
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

            <QuestPanel
              quests={quests}
              onQuestAction={handleQuestAction}
              onStatusChange={updateQuestStatus}
              onDelete={deleteQuest}
            />

            {activeCourseId && (
              <SideQuestPanel courseId={activeCourseId} token={token} />
            )}
          </div>
        </aside>
      </main>

      {/* ── Overlays ───────────────────────────────────────────── */}

      {viewingFile && (
        <FileViewerModal
          file={viewingFile}
          courseId={activeCourseId}
          token={token}
          onClose={() => setViewingFile(null)}
        />
      )}

      {quizOpen && activeCourseId && (
        <QuizMode
          courseId={activeCourseId}
          token={token}
          onClose={() => {
            setQuizOpen(false);
            handleXpEarned();
            checkQuestCompletion('quiz_completed', {});
          }}
          onXpEarned={handleXpEarned}
          onNewBadges={(keys) => setNewBadgeKeys((prev) => [...prev, ...keys])}
        />
      )}

      {pendingDelete && (
        <DeleteCourseDialog
          courseName={pendingDelete.name}
          onConfirm={() => { handleDeleteCourse(pendingDelete.id); setPendingDelete(null); }}
          onCancel={() => setPendingDelete(null)}
        />
      )}

      {showSessionSetup && activeCourseId && (
        <StudySessionModal
          courseId={activeCourseId}
          token={token}
          onSessionStarted={handleSessionStarted}
          onClose={() => setShowSessionSetup(false)}
        />
      )}

      {sessionSummary && (
        <SessionSummaryPanel
          summary={sessionSummary}
          onClose={() => setSessionSummary(null)}
          onAdoptQuests={async (actions) => { await adoptQuests(actions); handleXpEarned(); }}
        />
      )}

      {endingSession && (
        <div style={{
          position: 'fixed', inset: 0, zIndex: 4000,
          background: 'rgba(0,0,0,0.75)',
          display: 'flex', flexDirection: 'column',
          alignItems: 'center', justifyContent: 'center', gap: 16,
        }}>
          <div style={{
            width: 40, height: 40, border: '3px solid #6366f1',
            borderTopColor: 'transparent', borderRadius: '50%',
            animation: 'spin 0.8s linear infinite',
          }} />
          <div style={{ fontSize: 14, color: '#c7d2fe', fontWeight: 500 }}>
            Generating your session report…
          </div>
          <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
        </div>
      )}

      {welcomeBackSummary && !sessionSummary && (
        <WelcomeBackPanel
          summary={welcomeBackSummary}
          existingQuests={quests}
          onAdoptQuests={async (actions) => {
            await adoptQuests(actions);
            handleXpEarned();
            setWelcomeBackSummary(null);
          }}
          onDismiss={() => {
            fetch(`${import.meta.env.VITE_API_URL ?? ''}/api/study-sessions/summaries/${welcomeBackSummary.id}/dismiss`, {
              method: 'POST',
              headers: { Authorization: `Bearer ${token}` },
            }).catch(() => {});
            setWelcomeBackSummary(null);
          }}
        />
      )}
    </div>
  );
}

function LoadingSpinner() {
  const { theme } = useTheme();
  return (
    <div style={{
      height: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center',
      background: theme.bgBase,
    }}>
      <div style={{
        width: 28, height: 28,
        border: '2px solid #6366f1', borderTopColor: 'transparent',
        borderRadius: '50%', animation: 'spin 0.8s linear infinite',
      }} />
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}

export default function App() {
  const { session, loading, signOut } = useAuth();
  const [showAuth, setShowAuth] = useState(null); // null = landing, 'signin' | 'signup'

  useEffect(() => {
    if (!session && !loading) setShowAuth(null);
  }, [session, loading]);

  const handleShowAuth = (mode) => {
    window.scrollTo(0, 0);
    setShowAuth(mode);
  };

  return (
    <ThemeProvider>
      {loading ? (
        <LoadingSpinner />
      ) : session ? (
        <AppContent session={session} signOut={signOut} />
      ) : showAuth ? (
        <AuthGate
          session={session}
          loading={false}
          initialMode={showAuth}
          onBackToLanding={() => handleShowAuth(null)}
        />
      ) : (
        <LandingPage
          onGetStarted={() => handleShowAuth('signup')}
          onSignIn={() => handleShowAuth('signin')}
        />
      )}
    </ThemeProvider>
  );
}
