import { useEffect, useRef, useState } from 'react';
import ReactMarkdown from 'react-markdown';
import { useChat } from '../hooks/useChat';
import { SourceCitation } from './SourceCitation';
import { useTheme } from '../context/ThemeContext';
import { ElectronIcon } from './ElectronIcon';

function TypingDots({ theme }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 5, padding: '14px 16px' }}>
      {[0, 150, 300].map((delay) => (
        <span key={delay} style={{
          width: 7, height: 7, borderRadius: '50%', background: theme.textFaint,
          display: 'inline-block',
          animation: 'bounce 1.2s ease-in-out infinite',
          animationDelay: `${delay}ms`,
        }} />
      ))}
      <style>{`
        @keyframes bounce {
          0%, 80%, 100% { transform: translateY(0); opacity: 0.4; }
          40% { transform: translateY(-5px); opacity: 1; }
        }
      `}</style>
    </div>
  );
}

export function ChatPanel({ courseId, hasUploads, onSessionId, token, onResetRef, onSendRef, onXpEarned, conversationId, conversationIdRef, onNewBadges, studySessionId }) {
  const { messages, loading, loadingHistory, error, sendMessage, sessionId, resetMessages } = useChat(courseId, token, onXpEarned, conversationId, conversationIdRef, studySessionId);
  const { theme } = useTheme();

  const [input, setInput] = useState('');
  const [logoHovered, setLogoHovered] = useState(false);
  const bottomRef = useRef(null);
  const textareaRef = useRef(null);

  // Expose resetMessages to parent via ref so course switching can clear the chat
  useEffect(() => {
    if (onResetRef) onResetRef.current = resetMessages;
  }, [resetMessages]);

  // Expose sendMessage to parent via ref (for session start guided message)
  useEffect(() => {
    if (onSendRef) onSendRef.current = sendMessage;
  }, [sendMessage]);

  // Bubble sessionId up to App once on mount so the dashboard can use it
  useEffect(() => {
    if (onSessionId && sessionId) onSessionId(sessionId);
  }, [sessionId]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, loading]);

  const hasCourse = !!courseId;

  function handleSend() {
    const text = input.trim();
    if (!text || loading || !hasUploads || !hasCourse) return;
    setInput('');
    if (textareaRef.current) {
      textareaRef.current.style.height = '24px';
    }
    sendMessage(text, { onNewBadges });
  }

  function handleKeyDown(e) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', background: theme.bgBase }}>

      {/* Message thread */}
      <div style={{ flex: 1, overflowY: 'auto', padding: '24px 20px', display: 'flex', flexDirection: 'column', gap: 20 }}>
        {messages.length === 0 && !loading && !loadingHistory && (
          <div style={{
            flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center',
            flexDirection: 'column', gap: 12, color: theme.textFaint, paddingTop: 80,
          }}>
            <div
              onMouseEnter={() => setLogoHovered(true)}
              onMouseLeave={() => setLogoHovered(false)}
              style={{
                width: 56, height: 56, borderRadius: 16,
                background: 'linear-gradient(135deg, #1e1b4b, #312e81)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                border: `1px solid ${logoHovered ? '#818cf8' : '#4c1d95'}`,
                transition: 'border-color 0.2s',
                cursor: 'default',
              }}
            ><ElectronIcon size={36} color="#a78bfa" animate={logoHovered} /></div>
            <p style={{ fontSize: 14, color: theme.textMuted, margin: 0, fontWeight: 500 }}>
              {hasUploads
                ? 'What would you like to understand better?'
                : 'Upload your course materials to get started'}
            </p>
            {hasUploads && (
              <p style={{ fontSize: 12, color: theme.textFaint, margin: 0 }}>
                I'll guide you Socratically — no direct answers, just good questions
              </p>
            )}
          </div>
        )}

        {messages.map((msg, i) => (
          <div key={i} style={{
            display: 'flex',
            justifyContent: msg.role === 'user' ? 'flex-end' : 'flex-start',
          }}>
            {/* Avatar for assistant */}
            {msg.role === 'assistant' && (
              <div style={{
                width: 28, height: 28, borderRadius: 8, flexShrink: 0,
                background: 'linear-gradient(135deg, #1e1b4b, #312e81)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                marginRight: 10, marginTop: 2, alignSelf: 'flex-start',
                border: '1px solid #4c1d95',
              }}><ElectronIcon size={18} color="#a78bfa" /></div>
            )}

            <div style={{ maxWidth: '72%', display: 'flex', flexDirection: 'column', alignItems: msg.role === 'user' ? 'flex-end' : 'flex-start' }}>
              <div style={{
                padding: '12px 16px',
                borderRadius: msg.role === 'user' ? '18px 18px 4px 18px' : '18px 18px 18px 4px',
                fontSize: 14, lineHeight: 1.6,
                ...(msg.role === 'user'
                  ? {
                      background: msg.failed
                        ? 'transparent'
                        : 'linear-gradient(135deg, #6366f1, #8b5cf6)',
                      color: msg.failed ? '#f87171' : '#fff',
                      border: msg.failed ? '1px solid #7f1d1d' : 'none',
                    }
                  : {
                      background: theme.bgCard,
                      border: `1px solid ${theme.border}`,
                      color: theme.textBody,
                    }),
              }}>
                {msg.role === 'assistant' ? (
                  <div className="prose-chat">
                    <ReactMarkdown>{msg.content}</ReactMarkdown>
                  </div>
                ) : (
                  msg.content
                )}
              </div>
              {/* Retry button for failed user messages */}
              {msg.failed && (
                <button
                  onClick={() => sendMessage(msg.content)}
                  style={{
                    marginTop: 4, fontSize: 11, padding: '3px 10px', borderRadius: 8,
                    background: 'none', border: '1px solid #7f1d1d',
                    color: '#f87171', cursor: 'pointer',
                  }}
                  onMouseEnter={(e) => { e.currentTarget.style.background = '#450a0a'; }}
                  onMouseLeave={(e) => { e.currentTarget.style.background = 'none'; }}
                >
                  ↩ Retry
                </button>
              )}
              {msg.role === 'assistant' && msg.sources?.length > 0 && (
                <SourceCitation sources={msg.sources} />
              )}
            </div>
          </div>
        ))}

        {loading && (
          <div style={{ display: 'flex', alignItems: 'flex-start', gap: 10 }}>
            <div style={{
              width: 28, height: 28, borderRadius: 8, flexShrink: 0,
              background: 'linear-gradient(135deg, #1e1b4b, #312e81)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              border: '1px solid #4c1d95',
            }}><ElectronIcon size={18} color="#a78bfa" /></div>
            <div style={{ background: theme.bgCard, border: `1px solid ${theme.border}`, borderRadius: '18px 18px 18px 4px' }}>
              <TypingDots theme={theme} />
            </div>
          </div>
        )}

        {error && (
          <div style={{
            textAlign: 'center', fontSize: 12, color: '#fca5a5',
            background: '#450a0a', border: '1px solid #7f1d1d',
            padding: '8px 14px', borderRadius: 8, alignSelf: 'center',
          }}>
            ⚠️ {error}
          </div>
        )}

        <div ref={bottomRef} />
      </div>

      {/* Input area */}
      <div style={{
        borderTop: `1px solid ${theme.border}`, padding: '16px 20px',
        background: theme.bgSurface, flexShrink: 0,
      }}>
        <div style={{
          display: 'flex', gap: 10, alignItems: 'flex-end',
          background: theme.bgInput, border: `1px solid ${hasUploads ? theme.borderStrong : theme.border}`,
          borderRadius: 14, padding: '8px 8px 8px 16px',
          transition: 'border-color 0.15s',
        }}>
          <textarea
            ref={textareaRef}
            value={input}
            onChange={(e) => {
              setInput(e.target.value);
              const el = e.target;
              el.style.height = '24px';
              el.style.height = Math.min(el.scrollHeight, 120) + 'px';
            }}
            onKeyDown={handleKeyDown}
            disabled={!hasCourse || !hasUploads || loading}
            placeholder={
              !hasCourse ? 'Create a course to start chatting' :
              hasUploads ? 'Ask a question about your course...' :
              'Upload materials to begin'
            }
            rows={1}
            style={{
              flex: 1, resize: 'none', border: 'none', outline: 'none',
              background: 'transparent', color: theme.textPrimary, fontSize: 14, lineHeight: 1.5,
              height: '24px', maxHeight: 120, overflowY: 'auto', fontFamily: 'inherit',
              cursor: !hasCourse || !hasUploads ? 'not-allowed' : 'text',
            }}
          />
          <button
            onClick={handleSend}
            disabled={!hasCourse || !hasUploads || loading || !input.trim()}
            style={{
              width: 36, height: 36, borderRadius: 10, border: 'none',
              background: !hasCourse || !hasUploads || loading || !input.trim()
                ? theme.border
                : 'linear-gradient(135deg, #6366f1, #8b5cf6)',
              color: !hasCourse || !hasUploads || loading || !input.trim() ? theme.textFaint : '#fff',
              cursor: !hasCourse || !hasUploads || loading || !input.trim() ? 'not-allowed' : 'pointer',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: 16, flexShrink: 0,
              transition: 'all 0.15s',
            }}
          >
            {loading ? '⏳' : '↑'}
          </button>
        </div>
        <p style={{ fontSize: 11, color: theme.border, textAlign: 'center', margin: '8px 0 0', letterSpacing: '0.01em' }}>
          Enter to send · Shift+Enter for new line
        </p>
      </div>
    </div>
  );
}
