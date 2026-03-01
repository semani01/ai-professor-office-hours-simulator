import { useEffect, useRef, useState } from 'react';
import ReactMarkdown from 'react-markdown';
import { useTheme } from '../context/ThemeContext';
import { ElectronIcon } from './ElectronIcon';

function getTier(topic) {
  if (topic.manualTier) return topic.manualTier;
  if (topic.resolved && topic.hintsNeeded <= 1) return 'mastered';
  if (topic.hintsNeeded >= 4 || (!topic.resolved && topic.exchanges >= 2)) return 'revisit';
  return 'inprogress';
}

const TIER_STYLE = {
  mastered:   { label: 'Mastered',    icon: '✓', color: '#22c55e', bg: 'rgba(34,197,94,0.1)',  border: 'rgba(34,197,94,0.25)' },
  inprogress: { label: 'In Progress', icon: '~', color: '#f59e0b', bg: 'rgba(245,158,11,0.1)', border: 'rgba(245,158,11,0.25)' },
  revisit:    { label: 'Revisit',     icon: '↺', color: '#ef4444', bg: 'rgba(239,68,68,0.1)',  border: 'rgba(239,68,68,0.25)' },
};

const TIER_ORDER = ['revisit', 'inprogress', 'mastered'];
function nextTier(t) { const i = TIER_ORDER.indexOf(t); return i < 2 ? TIER_ORDER[i + 1] : null; }
function prevTier(t) { const i = TIER_ORDER.indexOf(t); return i > 0 ? TIER_ORDER[i - 1] : null; }

// ── Shared styles injected once ──────────────────────────────
const GLOBAL_STYLES = `
@keyframes shimmer { 0%,100%{background-position:200% 0} 50%{background-position:0% 0} }
@keyframes bounce  { 0%,80%,100%{transform:translateY(0);opacity:.4} 40%{transform:translateY(-4px);opacity:1} }
@keyframes cardFlip { 0%{transform:rotateY(0deg)} 100%{transform:rotateY(180deg)} }
@keyframes cardFlipBack { 0%{transform:rotateY(180deg)} 100%{transform:rotateY(0deg)} }
@keyframes fadeIn { from{opacity:0;transform:translateY(6px)} to{opacity:1;transform:translateY(0)} }
@keyframes treeExpand { from{opacity:0;transform:scaleY(0.85) translateY(-4px)} to{opacity:1;transform:scaleY(1) translateY(0)} }
.flip-card { perspective: 1000px; }
.flip-inner { position:relative; transition:transform 0.5s cubic-bezier(0.4,0,0.2,1); transform-style:preserve-3d; }
.flip-inner.flipped { transform:rotateY(180deg); }
.flip-face { position:absolute; inset:0; backface-visibility:hidden; -webkit-backface-visibility:hidden; border-radius:16px; display:flex; flex-direction:column; align-items:center; justify-content:center; padding:24px; text-align:center; gap:12px; }
.flip-back { transform:rotateY(180deg); }
`;

function SkeletonCard({ lines = 3 }) {
  const { theme } = useTheme();
  const base = theme.isDark ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.05)';
  const hi   = theme.isDark ? 'rgba(255,255,255,0.10)' : 'rgba(0,0,0,0.10)';
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
      {Array.from({ length: lines }).map((_, i) => (
        <div key={i} style={{
          height: 13, borderRadius: 6,
          background: `linear-gradient(90deg, ${base} 0%, ${hi} 50%, ${base} 100%)`,
          backgroundSize: '200% 100%',
          animation: 'shimmer 1.6s ease-in-out infinite',
          width: `${65 + (i % 3) * 13}%`,
        }} />
      ))}
    </div>
  );
}

function Section({ icon, title, children }) {
  const { theme } = useTheme();
  return (
    <div style={{ background: theme.bgCard, border: `1px solid ${theme.border}`, borderRadius: 12, padding: '14px 16px' }}>
      <div style={{
        fontSize: 11, fontWeight: 700, color: theme.textFaint,
        letterSpacing: '0.08em', textTransform: 'uppercase',
        marginBottom: 10, display: 'flex', alignItems: 'center', gap: 6,
      }}>
        <span>{icon}</span> {title}
      </div>
      {children}
    </div>
  );
}

// ────────────────────────────────────────────────────────────
// Flashcards tab — generate on demand, 3D flip, custom cards
// ────────────────────────────────────────────────────────────
function FlashcardsTab({ courseId, topicTag, tier, token, aiCards, setAiCards }) {
  const { theme } = useTheme();
  const STORAGE_KEY = `maieutic_fc_${courseId}_${topicTag}`;

  const [generating, setGenerating] = useState(false);
  const [genError, setGenError] = useState(null);
  const [customCards, setCustomCards] = useState(() => {
    try { return JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]'); } catch { return []; }
  });

  const [idx, setIdx] = useState(0);
  const [flipped, setFlipped] = useState(false);

  // Custom card form state
  const [showForm, setShowForm] = useState(false);
  const [formQ, setFormQ] = useState('');
  const [formA, setFormA] = useState('');

  const allCards = [...(aiCards || []), ...customCards];

  // Reset idx/flip when deck changes
  useEffect(() => { setIdx(0); setFlipped(false); }, [aiCards, customCards.length]);

  async function generate() {
    setGenerating(true);
    setGenError(null);
    try {
      const tag = encodeURIComponent(topicTag);
      const res = await fetch(`/api/topic-room/${courseId}/flashcards?tag=${tag}&tier=${tier}&count=15`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to generate');
      setAiCards(data.flashcards);
    } catch (err) {
      setGenError(err.message);
    } finally {
      setGenerating(false);
    }
  }

  function saveCustomCard() {
    if (!formQ.trim() || !formA.trim()) return;
    const card = { question: formQ.trim(), answer: formA.trim(), custom: true };
    const updated = [...customCards, card];
    setCustomCards(updated);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
    setFormQ(''); setFormA(''); setShowForm(false);
  }

  function deleteCustomCard(i) {
    const updated = customCards.filter((_, ci) => ci !== i);
    setCustomCards(updated);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
    if (idx >= allCards.length - 1) setIdx(Math.max(0, idx - 1));
  }

  // ── Empty state ──
  if (!aiCards && !generating) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 20, padding: '32px 16px' }}>
        <div style={{ fontSize: 48 }}>🃏</div>
        <div style={{ textAlign: 'center' }}>
          <div style={{ fontSize: 15, fontWeight: 600, color: theme.textPrimary, marginBottom: 6 }}>No flashcards yet</div>
          <div style={{ fontSize: 13, color: theme.textMuted, lineHeight: 1.6, maxWidth: 260 }}>
            Generate AI-powered cards from your course materials, or add your own.
          </div>
        </div>
        <button
          onClick={generate}
          style={{
            padding: '10px 24px', borderRadius: 10, border: 'none',
            background: 'linear-gradient(135deg, #6366f1, #8b5cf6)',
            color: '#fff', cursor: 'pointer', fontSize: 14, fontWeight: 600,
            display: 'flex', alignItems: 'center', gap: 8,
          }}
        >
          <span>✨</span> Generate Flashcards
        </button>
        {/* Still allow adding custom cards even before generating */}
        <button
          onClick={() => setShowForm(true)}
          style={{
            padding: '8px 18px', borderRadius: 10,
            background: 'none', border: `1px solid ${theme.border}`,
            color: theme.textSecondary, cursor: 'pointer', fontSize: 13,
          }}
        >
          + Add my own card
        </button>
        {showForm && <CustomCardForm theme={theme} formQ={formQ} formA={formA} setFormQ={setFormQ} setFormA={setFormA} onSave={saveCustomCard} onCancel={() => setShowForm(false)} />}
        {customCards.length > 0 && (
          <div style={{ width: '100%', marginTop: 8 }}>
            <div style={{ fontSize: 11, fontWeight: 700, color: theme.textFaint, letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: 8 }}>Your Cards</div>
            {customCards.map((c, i) => (
              <CustomCardRow key={i} card={c} theme={theme} onDelete={() => deleteCustomCard(i)} />
            ))}
          </div>
        )}
      </div>
    );
  }

  // ── Generating spinner ──
  if (generating) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 16, padding: '40px 0' }}>
        <div style={{ width: 36, height: 36, border: '3px solid #6366f1', borderTopColor: 'transparent', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
        <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
        <div style={{ fontSize: 13, color: theme.textMuted }}>Generating flashcards from your materials…</div>
      </div>
    );
  }

  // ── Error ──
  if (genError) {
    return (
      <div style={{ textAlign: 'center', padding: '24px 16px' }}>
        <div style={{ fontSize: 13, color: '#f87171', marginBottom: 12 }}>⚠️ {genError}</div>
        <button onClick={generate} style={{ fontSize: 12, padding: '6px 16px', borderRadius: 8, background: 'none', border: '1px solid rgba(239,68,68,0.4)', color: '#f87171', cursor: 'pointer' }}>
          Try again
        </button>
      </div>
    );
  }

  // ── Deck view ──
  const card = allCards[idx] || null;
  if (!card) return null;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 14, animation: 'fadeIn 0.3s ease' }}>
      {/* Top bar: progress + regenerate */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <span style={{ fontSize: 12, color: theme.textMuted }}>{idx + 1} / {allCards.length} cards</span>
        <button
          onClick={generate}
          title="Regenerate AI cards"
          style={{ fontSize: 11, padding: '4px 10px', borderRadius: 8, background: 'none', border: `1px solid ${theme.border}`, color: theme.textMuted, cursor: 'pointer' }}
        >
          ↺ Regenerate
        </button>
      </div>

      {/* Progress dots */}
      <div style={{ display: 'flex', justifyContent: 'center', gap: 4, flexWrap: 'wrap' }}>
        {allCards.map((c, i) => (
          <div key={i} onClick={() => { setIdx(i); setFlipped(false); }} style={{
            width: i === idx ? 18 : 6, height: 6, borderRadius: 3,
            background: c.custom ? (i === idx ? '#f59e0b' : 'rgba(245,158,11,0.35)') : (i === idx ? '#6366f1' : theme.border),
            cursor: 'pointer', transition: 'all 0.2s',
          }} />
        ))}
      </div>

      {/* 3D flip card */}
      <div
        className="flip-card"
        style={{ minHeight: 180, cursor: 'pointer' }}
        onClick={() => setFlipped((f) => !f)}
      >
        <div className={`flip-inner${flipped ? ' flipped' : ''}`} style={{ minHeight: 180 }}>
          {/* Front — Question */}
          <div className="flip-face" style={{
            background: theme.bgCard, border: `1px solid ${theme.border}`,
            minHeight: 180,
          }}>
            {card.custom && (
              <span style={{ position: 'absolute', top: 10, right: 12, fontSize: 10, color: '#f59e0b', fontWeight: 700, background: 'rgba(245,158,11,0.1)', border: '1px solid rgba(245,158,11,0.3)', borderRadius: 6, padding: '2px 7px' }}>
                ✏️ Custom
              </span>
            )}
            <div style={{ fontSize: 10, fontWeight: 700, color: theme.textFaint, letterSpacing: '0.1em', textTransform: 'uppercase' }}>❓ Question</div>
            <div style={{ fontSize: 15, fontWeight: 600, color: theme.textPrimary, lineHeight: 1.6 }}>{card.question}</div>
            <div style={{ fontSize: 10, color: theme.textFaint }}>tap to reveal answer</div>
          </div>
          {/* Back — Answer */}
          <div className="flip-face flip-back" style={{
            background: 'linear-gradient(135deg, rgba(99,102,241,0.12), rgba(139,92,246,0.08))',
            border: '1px solid rgba(99,102,241,0.3)',
            minHeight: 180,
          }}>
            {card.custom && (
              <span style={{ position: 'absolute', top: 10, right: 12, fontSize: 10, color: '#f59e0b', fontWeight: 700, background: 'rgba(245,158,11,0.1)', border: '1px solid rgba(245,158,11,0.3)', borderRadius: 6, padding: '2px 7px' }}>
                ✏️ Custom
              </span>
            )}
            <div style={{ fontSize: 10, fontWeight: 700, color: '#a5b4fc', letterSpacing: '0.1em', textTransform: 'uppercase' }}>💡 Answer</div>
            <div style={{ fontSize: 14, color: theme.textBody, lineHeight: 1.65 }}>{card.answer}</div>
            <div style={{ fontSize: 10, color: '#a5b4fc' }}>tap to flip back</div>
          </div>
        </div>
      </div>

      {/* Prev / Next + delete custom */}
      <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
        <button
          onClick={(e) => { e.stopPropagation(); setIdx((i) => Math.max(0, i - 1)); setFlipped(false); }}
          disabled={idx === 0}
          style={{ flex: 1, padding: '8px', borderRadius: 10, border: `1px solid ${theme.border}`, background: 'none', color: idx === 0 ? theme.textFaint : theme.textSecondary, cursor: idx === 0 ? 'not-allowed' : 'pointer', fontSize: 13 }}
        >← Prev</button>
        {card.custom && (
          <button
            onClick={() => deleteCustomCard(idx - (aiCards?.length || 0))}
            style={{ padding: '8px 12px', borderRadius: 10, border: '1px solid rgba(239,68,68,0.3)', background: 'none', color: '#f87171', cursor: 'pointer', fontSize: 12 }}
            title="Delete this custom card"
          >🗑</button>
        )}
        <button
          onClick={(e) => { e.stopPropagation(); setIdx((i) => Math.min(allCards.length - 1, i + 1)); setFlipped(false); }}
          disabled={idx === allCards.length - 1}
          style={{ flex: 1, padding: '8px', borderRadius: 10, border: `1px solid ${theme.border}`, background: 'none', color: idx === allCards.length - 1 ? theme.textFaint : theme.textSecondary, cursor: idx === allCards.length - 1 ? 'not-allowed' : 'pointer', fontSize: 13 }}
        >Next →</button>
      </div>

      {/* Add custom card */}
      {!showForm ? (
        <button
          onClick={() => setShowForm(true)}
          style={{ padding: '8px', borderRadius: 10, border: `1px dashed ${theme.border}`, background: 'none', color: theme.textMuted, cursor: 'pointer', fontSize: 12, marginTop: 4 }}
        >
          + Add my own card
        </button>
      ) : (
        <CustomCardForm theme={theme} formQ={formQ} formA={formA} setFormQ={setFormQ} setFormA={setFormA} onSave={saveCustomCard} onCancel={() => { setShowForm(false); setFormQ(''); setFormA(''); }} />
      )}
    </div>
  );
}

function CustomCardForm({ theme, formQ, formA, setFormQ, setFormA, onSave, onCancel }) {
  return (
    <div style={{ background: theme.bgCard, border: `1px solid ${theme.border}`, borderRadius: 12, padding: 14, display: 'flex', flexDirection: 'column', gap: 10, width: '100%', animation: 'fadeIn 0.2s ease' }}>
      <div style={{ fontSize: 11, fontWeight: 700, color: '#f59e0b', letterSpacing: '0.08em', textTransform: 'uppercase' }}>✏️ New Custom Card</div>
      <textarea
        value={formQ}
        onChange={(e) => setFormQ(e.target.value)}
        placeholder="Question…"
        rows={2}
        style={{ resize: 'none', borderRadius: 8, border: `1px solid ${theme.border}`, background: theme.bgBase, color: theme.textPrimary, padding: '8px 10px', fontSize: 13, fontFamily: 'inherit', outline: 'none' }}
      />
      <textarea
        value={formA}
        onChange={(e) => setFormA(e.target.value)}
        placeholder="Answer…"
        rows={3}
        style={{ resize: 'none', borderRadius: 8, border: `1px solid ${theme.border}`, background: theme.bgBase, color: theme.textPrimary, padding: '8px 10px', fontSize: 13, fontFamily: 'inherit', outline: 'none' }}
      />
      <div style={{ display: 'flex', gap: 8 }}>
        <button
          onClick={onSave}
          disabled={!formQ.trim() || !formA.trim()}
          style={{ flex: 1, padding: '8px', borderRadius: 8, border: 'none', background: formQ.trim() && formA.trim() ? 'linear-gradient(135deg,#6366f1,#8b5cf6)' : theme.border, color: formQ.trim() && formA.trim() ? '#fff' : theme.textFaint, cursor: formQ.trim() && formA.trim() ? 'pointer' : 'not-allowed', fontSize: 13, fontWeight: 600 }}
        >Save Card</button>
        <button
          onClick={onCancel}
          style={{ padding: '8px 14px', borderRadius: 8, border: `1px solid ${theme.border}`, background: 'none', color: theme.textMuted, cursor: 'pointer', fontSize: 13 }}
        >Cancel</button>
      </div>
    </div>
  );
}

function CustomCardRow({ card, theme, onDelete }) {
  return (
    <div style={{ display: 'flex', alignItems: 'flex-start', gap: 8, padding: '8px 10px', background: theme.bgCard, border: `1px solid ${theme.border}`, borderRadius: 8, marginBottom: 6 }}>
      <span style={{ fontSize: 10, color: '#f59e0b', flexShrink: 0, marginTop: 2 }}>✏️</span>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 12, fontWeight: 600, color: theme.textSecondary, marginBottom: 2, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{card.question}</div>
        <div style={{ fontSize: 11, color: theme.textMuted, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{card.answer}</div>
      </div>
      <button onClick={onDelete} style={{ background: 'none', border: 'none', color: theme.textFaint, cursor: 'pointer', fontSize: 14, flexShrink: 0, padding: '0 2px' }}>×</button>
    </div>
  );
}

// ────────────────────────────────────────────────────────────
// Mind Map tab — left-to-right collapsible tree, SVG bezier
// ────────────────────────────────────────────────────────────

const NODE_H = 36;      // node box height
const NODE_W = 130;     // branch / sub node width
const ROOT_W = 140;     // root node width
const H_GAP  = 56;      // horizontal gap between levels
const V_GAP  = 10;      // vertical gap between sibling nodes

function MindMapTab({ mindMap, tag, loading, onRefresh }) {
  const { theme } = useTheme();
  const [collapsed, setCollapsed] = useState({});  // key = branch index

  if (loading) return <SkeletonCard lines={5} />;
  if (!mindMap || mindMap.length === 0) return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 14, padding: '32px 16px' }}>
      <div style={{ fontSize: 36 }}>🗺</div>
      <div style={{ fontSize: 13, color: theme.textMuted, textAlign: 'center' }}>No mind map yet — reload the topic to generate one.</div>
      <button
        onClick={onRefresh}
        style={{
          padding: '8px 20px', borderRadius: 10, border: 'none',
          background: 'linear-gradient(135deg, #6366f1, #8b5cf6)',
          color: '#fff', cursor: 'pointer', fontSize: 13, fontWeight: 600,
        }}
      >↺ Reload Topic</button>
    </div>
  );

  function toggleBranch(i) {
    setCollapsed((prev) => ({ ...prev, [i]: !prev[i] }));
  }

  // Layout calculation — pure data, no React
  // Each branch has some visible children (unless collapsed)
  const branches = mindMap.map((b, i) => ({
    ...b,
    isCollapsed: !!collapsed[i],
    visibleChildren: collapsed[i] ? [] : (b.children || []),
  }));

  // Total rows needed:
  // Each branch occupies max(1, visibleChildren.length) rows
  function branchRows(b) { return Math.max(1, b.visibleChildren.length); }
  const totalRows = branches.reduce((s, b) => s + branchRows(b), 0);

  const SVG_W = ROOT_W + H_GAP + NODE_W + H_GAP + NODE_W + 24;
  const SVG_H = Math.max(200, totalRows * (NODE_H + V_GAP) + V_GAP * 4);

  const cy = (y) => y + NODE_H / 2;

  // Build rows: assign Y to each branch and each sub-node
  let currentY = (SVG_H - totalRows * (NODE_H + V_GAP)) / 2;
  const branchLayouts = branches.map((b, i) => {
    const rows = branchRows(b);
    const blockH = rows * (NODE_H + V_GAP) - V_GAP;
    const bY = currentY + blockH / 2 - NODE_H / 2;  // vertically centred
    const childYs = b.visibleChildren.map((_, ci) => currentY + ci * (NODE_H + V_GAP));
    currentY += blockH + V_GAP;
    return { ...b, index: i, bY, childYs };
  });

  const rootY = (SVG_H - NODE_H) / 2;
  const rootX = 8;
  const branchX = rootX + ROOT_W + H_GAP;
  const subX = branchX + NODE_W + H_GAP;

  // Accent colors
  const accent = theme.isDark ? '#6366f1' : '#4f46e5';
  const accentFaint = theme.isDark ? 'rgba(99,102,241,0.25)' : 'rgba(79,70,229,0.2)';
  const nodeF = theme.isDark ? 'rgba(30,27,75,0.9)' : 'rgba(238,242,255,0.97)';
  const nodeText = theme.isDark ? '#c7d2fe' : '#3730a3';
  const subF = theme.isDark ? 'rgba(15,23,42,0.85)' : 'rgba(248,250,252,0.97)';
  const subText = theme.isDark ? '#94a3b8' : '#475569';

  function bezier(x1, y1, x2, y2) {
    const mx = (x1 + x2) / 2;
    return `M ${x1} ${y1} C ${mx} ${y1}, ${mx} ${y2}, ${x2} ${y2}`;
  }

  return (
    <div style={{ overflow: 'auto', cursor: 'grab', userSelect: 'none' }}>
      <svg
        viewBox={`0 0 ${SVG_W} ${SVG_H}`}
        width={SVG_W}
        height={SVG_H}
        style={{ display: 'block' }}
      >
        {/* Root node */}
        <rect x={rootX} y={rootY} width={ROOT_W} height={NODE_H} rx={10}
          fill="rgba(99,102,241,0.18)" stroke={accent} strokeWidth={1.5} />
        <foreignObject x={rootX + 6} y={rootY + 2} width={ROOT_W - 12} height={NODE_H - 4}>
          <div xmlns="http://www.w3.org/1999/xhtml" style={{
            fontSize: 10, fontWeight: 800, color: theme.isDark ? '#a5b4fc' : '#4338ca',
            textAlign: 'center', lineHeight: '32px',
            overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
          }}>
            {tag.length > 18 ? tag.slice(0, 16) + '…' : tag}
          </div>
        </foreignObject>

        {branchLayouts.map((b) => {
          const bCY = cy(b.bY);
          const rootRightX = rootX + ROOT_W;
          const branchLeftX = branchX;
          const branchRightX = branchX + NODE_W;

          return (
            <g key={b.index}>
              {/* Root → Branch bezier */}
              <path d={bezier(rootRightX, cy(rootY), branchLeftX, bCY)}
                fill="none" stroke={accentFaint} strokeWidth={1.5} />

              {/* Branch node */}
              <rect
                x={branchX} y={b.bY} width={NODE_W} height={NODE_H} rx={8}
                fill={nodeF} stroke={accent} strokeWidth={1}
                style={{ cursor: b.children && b.children.length ? 'pointer' : 'default' }}
                onClick={() => b.children && b.children.length && toggleBranch(b.index)}
              />
              <foreignObject x={branchX + 6} y={b.bY + 2} width={NODE_W - 24} height={NODE_H - 4}>
                <div xmlns="http://www.w3.org/1999/xhtml" style={{
                  fontSize: 10, fontWeight: 700, color: nodeText,
                  lineHeight: '32px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                }}>
                  {b.label}
                </div>
              </foreignObject>

              {/* Expand/collapse indicator */}
              {b.children && b.children.length > 0 && (
                <text
                  x={branchX + NODE_W - 12} y={b.bY + NODE_H / 2 + 4}
                  fontSize={11} fontWeight={700} fill={accent}
                  style={{ cursor: 'pointer', userSelect: 'none' }}
                  onClick={() => toggleBranch(b.index)}
                >
                  {b.isCollapsed ? '+' : '−'}
                </text>
              )}

              {/* Sub-nodes */}
              {b.visibleChildren.map((sub, ci) => {
                const sY = b.childYs[ci];
                const sCY = cy(sY);
                return (
                  <g key={ci} style={{ animation: 'treeExpand 0.2s ease' }}>
                    {/* Branch → Sub bezier */}
                    <path d={bezier(branchRightX, bCY, subX, sCY)}
                      fill="none" stroke={accentFaint} strokeWidth={1} strokeDasharray="3 2" />
                    {/* Sub node */}
                    <rect x={subX} y={sY} width={NODE_W} height={NODE_H} rx={7}
                      fill={subF} stroke={accentFaint} strokeWidth={1} />
                    <foreignObject x={subX + 6} y={sY + 2} width={NODE_W - 12} height={NODE_H - 4}>
                      <div xmlns="http://www.w3.org/1999/xhtml" style={{
                        fontSize: 9, color: subText,
                        lineHeight: '32px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                      }}>
                        {sub.label}
                      </div>
                    </foreignObject>
                  </g>
                );
              })}
            </g>
          );
        })}
      </svg>
      <p style={{ fontSize: 10, color: theme.textFaint, textAlign: 'center', margin: '8px 0 0' }}>
        Click a branch to expand / collapse · topic → branches → sub-topics
      </p>
    </div>
  );
}

// ────────────────────────────────────────────────────────────
// Main TopicRoom
// ────────────────────────────────────────────────────────────
export function TopicRoom({ topic, courseId, token, onBack, onNewBadges, onTierChange, flashcardCache, contentCache }) {
  const { theme } = useTheme();
  const [tier, setTier] = useState(() => getTier(topic));
  const ts = TIER_STYLE[tier];

  const [activeTab, setActiveTab] = useState('overview');
  // Initialize from cache so re-opens are instant
  const ccKey = `${courseId}_${topic.tag}_${getTier(topic)}`;
  const [content, setContent] = useState(() => contentCache?.current?.[ccKey] ?? null);
  const [loadingContent, setLoadingContent] = useState(() => !contentCache?.current?.[ccKey]);
  const [contentError, setContentError] = useState(null);

  // aiCards: initialized from App-level cache ref so it survives back-navigation and topic switching
  const fcKey = `${courseId}_${topic.tag}`;
  const [aiCards, setAiCardsState] = useState(() => flashcardCache?.current?.[fcKey] ?? null);
  function setAiCards(cards) {
    if (flashcardCache?.current) flashcardCache.current[fcKey] = cards;
    setAiCardsState(cards);
  }

  // Scoped chat
  const [chatMessages, setChatMessages] = useState([]);
  const [chatInput, setChatInput] = useState('');
  const [chatLoading, setChatLoading] = useState(false);
  const sessionId = useRef(crypto.randomUUID()).current;
  const bottomRef = useRef(null);
  const textareaRef = useRef(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [chatMessages, chatLoading]);

  useEffect(() => {
    const newTier = getTier(topic);
    setTier(newTier);
    setChatMessages([]);
    setChatInput('');
    // Restore flashcards from cache (or clear) when topic changes
    setAiCardsState(flashcardCache?.current?.[`${courseId}_${topic.tag}`] ?? null);
    // Restore overview content from cache — no flash, no spinner if already loaded
    const cached = contentCache?.current?.[`${courseId}_${topic.tag}_${newTier}`] ?? null;
    setContent(cached);
    setLoadingContent(!cached);
  }, [topic.tag]);

  async function loadContent(tierOverride) {
    const useTier = tierOverride ?? tier;
    const key = `${courseId}_${topic.tag}_${useTier}`;

    // Cache hit — serve instantly, no fetch needed
    if (contentCache?.current?.[key]) {
      setContent(contentCache.current[key]);
      setLoadingContent(false);
      setContentError(null);
      return;
    }

    setLoadingContent(true);
    setContentError(null);
    setContent(null);
    try {
      const tag = encodeURIComponent(topic.tag);
      const res = await fetch(`/api/topic-room/${courseId}?tag=${tag}&tier=${useTier}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to load');
      if (contentCache?.current) contentCache.current[key] = data;  // write to cache
      setContent(data);
    } catch (err) {
      setContentError(err.message);
    } finally {
      setLoadingContent(false);
    }
  }

  useEffect(() => { loadContent(); }, [topic.tag, courseId]);

  function handleTierChange(newTier) {
    setTier(newTier);
    if (onTierChange) onTierChange(topic.tag, newTier);
    loadContent(newTier);
  }

  async function handleChatSend() {
    const text = chatInput.trim();
    if (!text || chatLoading) return;
    setChatInput('');
    if (textareaRef.current) textareaRef.current.style.height = '24px';
    const userMsg = { role: 'user', content: text };
    setChatMessages((prev) => [...prev, userMsg]);
    setChatLoading(true);
    try {
      const history = chatMessages.slice(-8);
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ message: `[Topic: ${topic.tag}] ${text}`, history, sessionId, courseId }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Chat failed');
      setChatMessages((prev) => [...prev, { role: 'assistant', content: data.response }]);
      if (onNewBadges && data.newBadges?.length > 0) onNewBadges(data.newBadges);
    } catch (err) {
      setChatMessages((prev) => [...prev, { role: 'error', content: err.message }]);
    } finally {
      setChatLoading(false);
    }
  }

  function handleChatKey(e) {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleChatSend(); }
  }

  const up = nextTier(tier);
  const down = prevTier(tier);

  const TABS = [
    { id: 'overview',   label: '📖 Overview' },
    { id: 'flashcards', label: '🃏 Flashcards' },
    { id: 'mindmap',    label: '🗺 Mind Map' },
  ];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', background: theme.bgBase }}>
      <style>{GLOBAL_STYLES}</style>

      {/* Header */}
      <div style={{
        display: 'flex', alignItems: 'center', gap: 10,
        padding: '10px 16px', borderBottom: `1px solid ${theme.border}`,
        background: theme.bgSurface, flexShrink: 0, flexWrap: 'wrap',
      }}>
        <button
          onClick={onBack}
          style={{
            background: 'none', border: `1px solid ${theme.border}`, borderRadius: 8,
            color: theme.textMuted, cursor: 'pointer', fontSize: 12, fontWeight: 500,
            padding: '4px 10px', flexShrink: 0, transition: 'all 0.15s',
          }}
          onMouseEnter={(e) => { e.currentTarget.style.borderColor = theme.borderStrong; e.currentTarget.style.color = theme.textSecondary; }}
          onMouseLeave={(e) => { e.currentTarget.style.borderColor = theme.border; e.currentTarget.style.color = theme.textMuted; }}
        >← Back</button>

        <span style={{
          fontSize: 11, fontWeight: 700, padding: '3px 10px', borderRadius: 20,
          background: ts.bg, border: `1px solid ${ts.border}`, color: ts.color, flexShrink: 0,
        }}>
          {ts.icon} {ts.label}
        </span>

        <span style={{ fontSize: 14, fontWeight: 600, color: theme.textPrimary, flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
          {topic.tag}
        </span>

        <div style={{ display: 'flex', gap: 6, flexShrink: 0 }}>
          {down && (
            <button onClick={() => handleTierChange(down)} title={`Step back to ${TIER_STYLE[down].label}`} style={{ fontSize: 10, padding: '4px 10px', borderRadius: 20, cursor: 'pointer', background: 'none', border: `1px solid ${TIER_STYLE[down].border}`, color: TIER_STYLE[down].color, transition: 'all 0.15s' }}>
              ↓ {TIER_STYLE[down].label}
            </button>
          )}
          {up && (
            <button onClick={() => handleTierChange(up)} title={`Advance to ${TIER_STYLE[up].label}`} style={{ fontSize: 10, padding: '4px 10px', borderRadius: 20, cursor: 'pointer', background: TIER_STYLE[up].bg, border: `1px solid ${TIER_STYLE[up].border}`, color: TIER_STYLE[up].color, fontWeight: 700, transition: 'all 0.15s' }}>
              ↑ I'm ready → {TIER_STYLE[up].label}
            </button>
          )}
        </div>
      </div>

      {/* Tabs */}
      <div style={{ display: 'flex', borderBottom: `1px solid ${theme.border}`, background: theme.bgSurface, flexShrink: 0 }}>
        {TABS.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            style={{
              padding: '9px 16px', background: 'none', border: 'none',
              borderBottom: activeTab === tab.id ? '2px solid #6366f1' : '2px solid transparent',
              color: activeTab === tab.id ? '#a5b4fc' : theme.textMuted,
              cursor: 'pointer', fontSize: 12, fontWeight: activeTab === tab.id ? 600 : 400,
              transition: 'all 0.15s',
            }}
          >{tab.label}</button>
        ))}
      </div>

      {/* Content */}
      <div style={{ flex: 1, overflow: activeTab === 'mindmap' ? 'hidden' : 'auto', padding: activeTab === 'mindmap' ? 0 : '16px 20px', display: 'flex', flexDirection: 'column', gap: 12 }}>

        {contentError && (
          <div style={{ padding: '16px', background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.25)', borderRadius: 12, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 10 }}>
            <div style={{ fontSize: 13, color: '#f87171', textAlign: 'center' }}>⚠️ {contentError}</div>
            <button onClick={() => loadContent()} style={{ fontSize: 11, padding: '5px 14px', borderRadius: 8, background: 'none', border: '1px solid rgba(239,68,68,0.4)', color: '#f87171', cursor: 'pointer' }}>Try again</button>
          </div>
        )}

        {/* ── OVERVIEW ── */}
        {activeTab === 'overview' && (
          <>
            {loadingContent ? (
              <>
                <Section icon="📖" title="Key Concepts"><SkeletonCard lines={4} /></Section>
                <Section icon="🔍" title="Practice Questions"><SkeletonCard lines={3} /></Section>
                <Section icon="💡" title="Coaching Tips"><SkeletonCard lines={2} /></Section>
              </>
            ) : content && (
              <>
                <Section icon="📖" title="Key Concepts">
                  <ul style={{ margin: 0, padding: '0 0 0 16px', display: 'flex', flexDirection: 'column', gap: 7 }}>
                    {content.concepts.map((c, i) => <li key={i} style={{ fontSize: 13, color: theme.textBody, lineHeight: 1.55 }}>{c}</li>)}
                  </ul>
                </Section>

                <Section icon="🔍" title="Practice Questions">
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                    {content.questions.map((q, i) => (
                      <div key={i} style={{ display: 'flex', gap: 10, padding: '10px 12px', background: theme.bgBase, borderRadius: 8, border: `1px solid ${theme.border}` }}>
                        <span style={{ fontSize: 11, fontWeight: 700, color: ts.color, flexShrink: 0, marginTop: 1, minWidth: 18 }}>Q{i + 1}</span>
                        <span style={{ fontSize: 13, color: theme.textBody, lineHeight: 1.55 }}>{q}</span>
                      </div>
                    ))}
                  </div>
                </Section>

                <Section icon="💡" title="Coaching Tips">
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                    {content.coachingTips.map((tip, i) => (
                      <div key={i} style={{ display: 'flex', gap: 10, alignItems: 'flex-start' }}>
                        <span style={{ fontSize: 14, flexShrink: 0, marginTop: 1 }}>
                          {tier === 'mastered' ? '🚀' : tier === 'revisit' ? '🌱' : '⭐'}
                        </span>
                        <span style={{ fontSize: 13, color: theme.textBody, lineHeight: 1.55 }}>{tip}</span>
                      </div>
                    ))}
                  </div>
                </Section>

                {up && (
                  <div style={{ padding: '12px 16px', borderRadius: 12, background: TIER_STYLE[up].bg, border: `1px solid ${TIER_STYLE[up].border}`, display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>
                    <span style={{ fontSize: 12, color: TIER_STYLE[up].color, lineHeight: 1.5 }}>Feeling confident? Only you know when you're truly ready.</span>
                    <button onClick={() => handleTierChange(up)} style={{ fontSize: 11, fontWeight: 700, padding: '5px 14px', borderRadius: 20, background: TIER_STYLE[up].bg, border: `1px solid ${TIER_STYLE[up].border}`, color: TIER_STYLE[up].color, cursor: 'pointer', whiteSpace: 'nowrap' }}>
                      ↑ Move to {TIER_STYLE[up].label}
                    </button>
                  </div>
                )}
                {tier === 'mastered' && (
                  <div style={{ padding: '10px 14px', borderRadius: 12, background: 'rgba(34,197,94,0.08)', border: '1px solid rgba(34,197,94,0.2)', fontSize: 12, color: '#4ade80', textAlign: 'center' }}>
                    🏆 You've marked this topic as Mastered. Keep it up!
                  </div>
                )}
              </>
            )}

            {/* Scoped chat */}
            {chatMessages.length > 0 && (
              <div style={{ borderTop: `1px solid ${theme.border}`, paddingTop: 12, display: 'flex', flexDirection: 'column', gap: 0, marginTop: 4 }}>
                <div style={{ fontSize: 10, fontWeight: 600, color: theme.textFaint, letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: 10 }}>Chat about this topic</div>
                {chatMessages.map((msg, i) => (
                  <div key={i} style={{ display: 'flex', justifyContent: msg.role === 'user' ? 'flex-end' : 'flex-start', marginBottom: 12 }}>
                    {msg.role === 'assistant' && (
                      <div style={{ width: 24, height: 24, borderRadius: 6, flexShrink: 0, background: 'linear-gradient(135deg,#1e1b4b,#312e81)', display: 'flex', alignItems: 'center', justifyContent: 'center', marginRight: 8, marginTop: 2, border: '1px solid #4c1d95' }}><ElectronIcon size={15} color="#a78bfa" /></div>
                    )}
                    <div style={{
                      maxWidth: '80%', padding: '10px 14px',
                      borderRadius: msg.role === 'user' ? '16px 16px 4px 16px' : '16px 16px 16px 4px',
                      fontSize: 13, lineHeight: 1.6,
                      ...(msg.role === 'user'
                        ? { background: 'linear-gradient(135deg,#6366f1,#8b5cf6)', color: '#fff' }
                        : msg.role === 'error'
                        ? { background: 'rgba(239,68,68,0.1)', color: '#f87171', border: '1px solid rgba(239,68,68,0.3)' }
                        : { background: theme.bgCard, border: `1px solid ${theme.border}`, color: theme.textBody }),
                    }}>
                      {msg.role === 'assistant' ? <div className="prose-chat"><ReactMarkdown>{msg.content}</ReactMarkdown></div> : msg.content}
                    </div>
                  </div>
                ))}
                {chatLoading && (
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
                    <div style={{ width: 24, height: 24, borderRadius: 6, background: 'linear-gradient(135deg,#1e1b4b,#312e81)', display: 'flex', alignItems: 'center', justifyContent: 'center', border: '1px solid #4c1d95' }}><ElectronIcon size={15} color="#a78bfa" /></div>
                    <div style={{ background: theme.bgCard, border: `1px solid ${theme.border}`, borderRadius: '16px 16px 16px 4px', padding: '10px 14px', display: 'flex', gap: 4, alignItems: 'center' }}>
                      {[0, 150, 300].map((d) => <span key={d} style={{ width: 5, height: 5, borderRadius: '50%', background: theme.textFaint, animation: 'bounce 1.2s ease-in-out infinite', animationDelay: `${d}ms` }} />)}
                    </div>
                  </div>
                )}
              </div>
            )}
            <div ref={bottomRef} />
          </>
        )}

        {/* ── FLASHCARDS ── */}
        {activeTab === 'flashcards' && (
          <FlashcardsTab
            courseId={courseId}
            topicTag={topic.tag}
            tier={tier}
            token={token}
            aiCards={aiCards}
            setAiCards={setAiCards}
          />
        )}

        {/* ── MIND MAP ── */}
        {activeTab === 'mindmap' && (
          <div style={{ flex: 1, overflow: 'auto', padding: 16 }}>
            <MindMapTab
              loading={loadingContent}
              mindMap={content?.mindMap}
              tag={topic.tag}
              onRefresh={() => loadContent()}
            />
          </div>
        )}
      </div>

      {/* Chat input — overview only */}
      {activeTab === 'overview' && (
        <div style={{ borderTop: `1px solid ${theme.border}`, padding: '12px 20px', background: theme.bgSurface, flexShrink: 0 }}>
          <div style={{ display: 'flex', gap: 8, alignItems: 'flex-end', background: theme.bgInput, border: `1px solid ${theme.borderStrong}`, borderRadius: 12, padding: '6px 6px 6px 14px' }}>
            <textarea
              ref={textareaRef}
              value={chatInput}
              onChange={(e) => {
                setChatInput(e.target.value);
                const el = e.target;
                el.style.height = '24px';
                el.style.height = Math.min(el.scrollHeight, 100) + 'px';
              }}
              onKeyDown={handleChatKey}
              disabled={chatLoading}
              placeholder={`Ask about ${topic.tag}…`}
              rows={1}
              style={{ flex: 1, resize: 'none', border: 'none', outline: 'none', background: 'transparent', color: theme.textPrimary, fontSize: 13, lineHeight: 1.5, height: '24px', maxHeight: 100, overflowY: 'auto', fontFamily: 'inherit' }}
            />
            <button
              onClick={handleChatSend}
              disabled={chatLoading || !chatInput.trim()}
              style={{ width: 32, height: 32, borderRadius: 8, border: 'none', background: chatLoading || !chatInput.trim() ? theme.border : 'linear-gradient(135deg,#6366f1,#8b5cf6)', color: chatLoading || !chatInput.trim() ? theme.textFaint : '#fff', cursor: chatLoading || !chatInput.trim() ? 'not-allowed' : 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 14, flexShrink: 0, transition: 'all 0.15s' }}
            >{chatLoading ? '⏳' : '↑'}</button>
          </div>
        </div>
      )}
    </div>
  );
}
