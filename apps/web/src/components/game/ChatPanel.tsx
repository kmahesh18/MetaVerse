'use client';

import { useState, useRef, useEffect, type FormEvent } from 'react';
import { useGameStore } from '@/lib/game-store';
import { useAuthStore } from '@/lib/auth-store';
import { getSocket } from '@/lib/socket';

export function ChatPanel({ roomId }: { roomId: string }) {
  const { messages, isChatOpen, room } = useGameStore();
  const user = useAuthStore((s) => s.user);
  const [input, setInput] = useState('');
  const [chatMode, setChatMode] = useState<'room' | 'proximity'>('room');
  const [minimized, setMinimized] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  function handleSend(e: FormEvent) {
    e.preventDefault();
    const text = input.trim();
    if (!text) return;

    const socket = getSocket();
    if (!socket) return;

    if (chatMode === 'room') {
      socket.emit('chat:room', { roomId, content: text });
    } else {
      socket.emit('chat:proximity', { content: text });
    }
    setInput('');
  }

  if (!isChatOpen) return null;

  const filteredMessages = messages.filter((m) =>
    chatMode === 'room' ? m.type === 'room' : m.type === 'proximity'
  );

  if (minimized) {
    return (
      <button
        onClick={() => setMinimized(false)}
        className="pointer-events-auto absolute bottom-3 left-3 z-10 flex items-center gap-2 rounded-full border border-white/10 bg-black/70 px-3 py-2 text-xs text-white/80 shadow-xl backdrop-blur-xl transition hover:bg-black/80"
      >
        💬 Chat {filteredMessages.length > 0 && <span className="rounded-full bg-emerald-500/30 px-1.5 text-[10px] text-emerald-50">{filteredMessages.length}</span>}
      </button>
    );
  }

  return (
    <div className="pointer-events-auto absolute bottom-3 left-3 z-10 flex w-80 flex-col rounded-2xl border border-white/10 bg-black/80 text-white shadow-2xl backdrop-blur-xl" style={{ maxHeight: '22rem' }}>
      {/* Header */}
      <div className="flex items-center justify-between border-b border-white/8 px-3 py-2">
        <div className="flex items-center gap-2">
          <h2 className="text-xs font-semibold text-white/90">{room?.name ?? 'Chat'}</h2>
          <div className="flex rounded-full border border-white/10 bg-white/5">
            {(['room', 'proximity'] as const).map((mode) => (
              <button
                key={mode}
                onClick={() => setChatMode(mode)}
                className={`rounded-full px-2 py-0.5 text-[10px] uppercase tracking-wide transition ${
                  chatMode === mode
                    ? 'bg-emerald-500/25 text-emerald-50'
                    : 'text-white/40 hover:text-white/65'
                }`}
              >
                {mode}
              </button>
            ))}
          </div>
        </div>
        <button
          onClick={() => setMinimized(true)}
          className="rounded-full bg-white/8 px-2 py-0.5 text-[10px] text-white/50 transition hover:bg-white/15"
        >
          ─
        </button>
      </div>

      {/* Messages */}
      <div ref={scrollRef} className="flex-1 space-y-1 overflow-y-auto px-3 py-2" style={{ minHeight: '6rem', maxHeight: '14rem' }}>
        {filteredMessages.map((msg, i) => (
          <div
            key={`${msg.timestamp}-${i}`}
            className={`rounded-xl px-2.5 py-1.5 text-xs ${
              msg.senderId === user?._id
                ? 'bg-emerald-500/15 text-emerald-50'
                : 'bg-white/5 text-white/80'
            }`}
          >
            <div className="flex items-center justify-between gap-2">
              <span className="text-[10px] font-semibold text-white/70">{msg.senderName}</span>
            </div>
            <p className="mt-0.5 break-words leading-4">{msg.content}</p>
          </div>
        ))}
        {filteredMessages.length === 0 && (
          <div className="py-4 text-center text-[10px] text-white/30">
            {chatMode === 'room' ? 'Room is quiet…' : 'Walk closer to someone'}
          </div>
        )}
      </div>

      {/* Input */}
      <form onSubmit={handleSend} className="border-t border-white/8 px-3 py-2">
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          maxLength={2000}
          placeholder={`${chatMode} chat…`}
          className="w-full rounded-full border border-white/10 bg-white/5 px-3 py-1.5 text-xs text-white outline-none placeholder:text-white/30 focus:border-emerald-300/30"
        />
      </form>
    </div>
  );
}
