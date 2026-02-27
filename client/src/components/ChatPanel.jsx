import { useEffect, useRef, useState } from 'react';
import ReactMarkdown from 'react-markdown';
import { useChat } from '../hooks/useChat';
import { SourceCitation } from './SourceCitation';

function TypingDots() {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 5, padding: '14px 16px' }}>
      {[0, 150, 300].map((delay) => (
        <span key={delay} style={{
          width: 7, height: 7, borderRadius: '50%', background: '#475569',
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

export function ChatPanel({ courseId, uploadedFiles, hasUploads, onSessionId }) {
  const { messages, loading, error, sendMessage, sessionId } = useChat(courseId);

  const [input, setInput] = useState('');
  const bottomRef = useRef(null);
  const textareaRef = useRef(null);

  // Bubble sessionId up to App once on mount so the dashboard can use it
  useEffect(() => {
    if (onSessionId && sessionId) onSessionId(sessionId);
  }, [sessionId]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, loading]);

  function handleSend() {
    const text = input.trim();
    if (!text || loading || !hasUploads) return;
    setInput('');
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
    }
    sendMessage(text);
  }

  function handleKeyDown(e) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', background: '#0f1117' }}>
      {/* Active materials bar */}
      {uploadedFiles.length > 0 && (
        <div style={{
          padding: '8px 20px', borderBottom: '1px solid #1e293b',
          display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap',
          background: '#0d1117', flexShrink: 0,
        }}>
          <span style={{ fontSize: 10, fontWeight: 600, color: '#475569', letterSpacing: '0.08em', textTransform: 'uppercase', flexShrink: 0 }}>
            Active:
          </span>
          {uploadedFiles.map((f, i) => (
            <span key={i} style={{
              fontSize: 11, padding: '2px 8px', borderRadius: 10,
              background: '#1e1b4b', color: '#818cf8',
              border: '1px solid #312e81',
              maxWidth: 200, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
            }}>
              {f.fileName}
            </span>
          ))}
        </div>
      )}

      {/* Message thread */}
      <div style={{ flex: 1, overflowY: 'auto', padding: '24px 20px', display: 'flex', flexDirection: 'column', gap: 20 }}>
        {messages.length === 0 && !loading && (
          <div style={{
            flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center',
            flexDirection: 'column', gap: 12, color: '#475569', paddingTop: 80,
          }}>
            <div style={{
              width: 56, height: 56, borderRadius: 16,
              background: 'linear-gradient(135deg, #1e1b4b, #312e81)',
              display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 26,
              border: '1px solid #312e81',
            }}>🎓</div>
            <p style={{ fontSize: 14, color: '#334155', margin: 0, fontWeight: 500 }}>
              {hasUploads
                ? 'What would you like to understand better?'
                : 'Upload your course materials to get started'}
            </p>
            {hasUploads && (
              <p style={{ fontSize: 12, color: '#1e293b', margin: 0 }}>
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
                background: 'linear-gradient(135deg, #6366f1, #8b5cf6)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: 14, marginRight: 10, marginTop: 2, alignSelf: 'flex-start',
              }}>🎓</div>
            )}

            <div style={{ maxWidth: '72%', display: 'flex', flexDirection: 'column', alignItems: msg.role === 'user' ? 'flex-end' : 'flex-start' }}>
              <div style={{
                padding: '12px 16px',
                borderRadius: msg.role === 'user' ? '18px 18px 4px 18px' : '18px 18px 18px 4px',
                fontSize: 14, lineHeight: 1.6,
                ...(msg.role === 'user'
                  ? {
                      background: 'linear-gradient(135deg, #6366f1, #8b5cf6)',
                      color: '#fff',
                    }
                  : {
                      background: '#111827',
                      border: '1px solid #1e293b',
                      color: '#cbd5e1',
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
              background: 'linear-gradient(135deg, #6366f1, #8b5cf6)',
              display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 14,
            }}>🎓</div>
            <div style={{ background: '#111827', border: '1px solid #1e293b', borderRadius: '18px 18px 18px 4px' }}>
              <TypingDots />
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
        borderTop: '1px solid #1e293b', padding: '16px 20px',
        background: '#0d1117', flexShrink: 0,
      }}>
        <div style={{
          display: 'flex', gap: 10, alignItems: 'flex-end',
          background: '#111827', border: `1px solid ${hasUploads ? '#334155' : '#1e293b'}`,
          borderRadius: 14, padding: '8px 8px 8px 16px',
          transition: 'border-color 0.15s',
        }}>
          <textarea
            ref={textareaRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            disabled={!hasUploads || loading}
            placeholder={hasUploads ? 'Ask a question about your course...' : 'Upload materials to begin'}
            rows={1}
            style={{
              flex: 1, resize: 'none', border: 'none', outline: 'none',
              background: 'transparent', color: '#e2e8f0', fontSize: 14, lineHeight: 1.5,
              maxHeight: 120, fontFamily: 'inherit',
              cursor: !hasUploads ? 'not-allowed' : 'text',
            }}
            onInput={(e) => {
              e.target.style.height = 'auto';
              e.target.style.height = Math.min(e.target.scrollHeight, 120) + 'px';
            }}
          />
          <button
            onClick={handleSend}
            disabled={!hasUploads || loading || !input.trim()}
            style={{
              width: 36, height: 36, borderRadius: 10, border: 'none',
              background: !hasUploads || loading || !input.trim()
                ? '#1e293b'
                : 'linear-gradient(135deg, #6366f1, #8b5cf6)',
              color: !hasUploads || loading || !input.trim() ? '#475569' : '#fff',
              cursor: !hasUploads || loading || !input.trim() ? 'not-allowed' : 'pointer',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: 16, flexShrink: 0,
              transition: 'all 0.15s',
            }}
          >
            {loading ? '⏳' : '↑'}
          </button>
        </div>
        <p style={{ fontSize: 11, color: '#1e293b', textAlign: 'center', margin: '8px 0 0', letterSpacing: '0.01em' }}>
          Enter to send · Shift+Enter for new line
        </p>
      </div>
    </div>
  );
}
