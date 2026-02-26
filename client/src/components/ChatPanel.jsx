import { useEffect, useRef, useState } from 'react';
import { useChat } from '../hooks/useChat';
import { SourceCitation } from './SourceCitation';

function TypingDots() {
  return (
    <div className="flex items-center gap-1 px-4 py-3">
      <span className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
      <span className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
      <span className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
    </div>
  );
}

export function ChatPanel({ courseId, uploadedFiles, hasUploads }) {
  const { messages, loading, error, sendMessage } = useChat(courseId);
  const [input, setInput] = useState('');
  const bottomRef = useRef(null);

  // Auto-scroll to latest message
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, loading]);

  function handleSend() {
    const text = input.trim();
    if (!text || loading || !hasUploads) return;
    setInput('');
    sendMessage(text);
  }

  function handleKeyDown(e) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  }

  return (
    <div className="flex flex-col h-full">
      {/* Course context bar */}
      {uploadedFiles.length > 0 && (
        <div className="px-4 py-2 bg-indigo-50 border-b border-indigo-100 flex items-center gap-2 flex-wrap">
          <span className="text-xs font-semibold text-indigo-500 uppercase tracking-wide">Active materials:</span>
          {uploadedFiles.map((f, i) => (
            <span key={i} className="text-xs bg-white border border-indigo-200 text-indigo-700 px-2 py-0.5 rounded-full truncate max-w-[200px]">
              {f.fileName}
            </span>
          ))}
        </div>
      )}

      {/* Message thread */}
      <div className="flex-1 overflow-y-auto p-4 flex flex-col gap-4">
        {messages.length === 0 && !loading && (
          <div className="flex-1 flex items-center justify-center text-center text-gray-400 py-16">
            <div>
              <p className="text-4xl mb-3">🎓</p>
              <p className="text-sm font-medium text-gray-500">
                {hasUploads
                  ? 'Ask me anything about your course materials'
                  : 'Upload your course materials to begin'}
              </p>
            </div>
          </div>
        )}

        {messages.map((msg, i) => (
          <div key={i} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
            <div className={`max-w-[80%] ${msg.role === 'user' ? 'items-end' : 'items-start'} flex flex-col`}>
              <div
                className={`px-4 py-3 rounded-2xl text-sm leading-relaxed whitespace-pre-wrap ${
                  msg.role === 'user'
                    ? 'bg-indigo-600 text-white rounded-br-sm'
                    : 'bg-white border border-gray-200 text-gray-800 rounded-bl-sm shadow-sm'
                }`}
              >
                {msg.content}
              </div>
              {msg.role === 'assistant' && msg.sources?.length > 0 && (
                <SourceCitation sources={msg.sources} />
              )}
            </div>
          </div>
        ))}

        {loading && (
          <div className="flex justify-start">
            <div className="bg-white border border-gray-200 rounded-2xl rounded-bl-sm shadow-sm">
              <TypingDots />
            </div>
          </div>
        )}

        {error && (
          <div className="flex justify-center">
            <div className="text-xs text-red-600 bg-red-50 border border-red-200 px-3 py-2 rounded-lg">
              ⚠️ {error}
            </div>
          </div>
        )}

        <div ref={bottomRef} />
      </div>

      {/* Input area */}
      <div className="border-t border-gray-200 p-4">
        {!hasUploads && (
          <p className="text-xs text-center text-gray-400 mb-3">
            Upload your course materials above to start asking questions
          </p>
        )}
        <div className="flex gap-2">
          <textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            disabled={!hasUploads || loading}
            placeholder={hasUploads ? 'Ask a question about your course...' : 'Upload materials to begin'}
            rows={1}
            className="flex-1 resize-none px-4 py-3 rounded-xl border border-gray-300 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent disabled:bg-gray-50 disabled:text-gray-400 disabled:cursor-not-allowed"
            style={{ maxHeight: '120px' }}
            onInput={(e) => {
              e.target.style.height = 'auto';
              e.target.style.height = Math.min(e.target.scrollHeight, 120) + 'px';
            }}
          />
          <button
            onClick={handleSend}
            disabled={!hasUploads || loading || !input.trim()}
            className="px-4 py-3 bg-indigo-600 text-white rounded-xl text-sm font-medium hover:bg-indigo-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
          >
            {loading ? '...' : 'Send'}
          </button>
        </div>
      </div>
    </div>
  );
}
