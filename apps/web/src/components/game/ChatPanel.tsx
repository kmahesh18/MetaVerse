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
  const [proximityRange, setProximityRange] = useState(3); // tiles, default
  const [minimized, setMinimized] = useState(() => {
    if (typeof window !== 'undefined') return window.innerWidth < 640;
    return false;
  });
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
      socket.emit('chat:proximity', { content: text, range: proximityRange });
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
        className="pointer-events-auto absolute bottom-3 left-3 z-20 flex items-center gap-2 rounded-full border border-border bg-card/90 px-3 py-2 text-[10px] sm:text-xs text-foreground shadow-xl backdrop-blur-xl transition hover:bg-card"
      >
        💬 Chat {filteredMessages.length > 0 && <span className="rounded-full bg-foreground/15 px-1.5 text-[10px] text-foreground">{filteredMessages.length}</span>}
      </button>
    );
  }

  return (
    <div
      className="pointer-events-auto absolute bottom-3 left-2 sm:left-3 z-20 flex w-[calc(100%-1rem)] sm:w-80 flex-col rounded-2xl border border-border bg-card/90 text-foreground shadow-2xl backdrop-blur-xl"
      style={{ maxHeight: 'min(22rem, calc(100dvh - 6rem))' }}
    >
      {/* Header */}
      <div className="flex items-center justify-between border-b border-border px-3 py-2">
        <div className="flex items-center gap-2 min-w-0">
          <h2 className="text-xs font-semibold text-foreground truncate">{room?.name ?? 'Chat'}</h2>
          <div className="flex rounded-full border border-border bg-secondary">
            {(['room', 'proximity'] as const).map((mode) => (
              <button
                key={mode}
                onClick={() => setChatMode(mode)}
                className={`rounded-full px-2 py-0.5 text-[10px] uppercase tracking-wide transition ${
                  chatMode === mode
                    ? 'bg-foreground/15 text-foreground font-medium'
                    : 'text-muted-foreground hover:text-foreground'
                }`}
              >
                {mode}
              </button>
            ))}
          </div>
        </div>
        <button
          onClick={() => setMinimized(true)}
          className="shrink-0 rounded-full bg-secondary px-2 py-0.5 text-[10px] text-foreground transition hover:bg-muted"
        >
          ─
        </button>
      </div>

      {/* Proximity Range Slider */}
      {chatMode === 'proximity' && (
        <div className="border-b border-border px-3 py-2">
          <div className="flex items-center justify-between gap-2">
            <span className="text-[10px] text-muted-foreground">Range</span>
            <span className="text-[10px] font-medium text-foreground">{proximityRange} tiles</span>
          </div>
          <input
            type="range"
            min={1}
            max={10}
            value={proximityRange}
            onChange={(e) => setProximityRange(Number(e.target.value))}
            className="mt-1 w-full h-1.5 rounded-full appearance-none bg-secondary cursor-pointer accent-foreground"
          />
          <div className="flex justify-between mt-0.5">
            <span className="text-[8px] text-muted-foreground">1</span>
            <span className="text-[8px] text-muted-foreground">10</span>
          </div>
        </div>
      )}

      {/* Messages */}
      <div ref={scrollRef} className="flex-1 space-y-1 overflow-y-auto px-3 py-2" style={{ minHeight: '6rem', maxHeight: '14rem' }}>
        {filteredMessages.map((msg, i) => (
          <div
            key={`${msg.timestamp}-${i}`}
            className={`rounded-xl px-2.5 py-1.5 text-xs ${
              msg.senderId === user?._id
                ? 'bg-foreground/10 text-foreground'
                : 'bg-secondary text-foreground'
            }`}
          >
            <div className="flex items-center justify-between gap-2">
              <span className="text-[10px] font-semibold text-foreground">{msg.senderName}</span>
            </div>
            <p className="mt-0.5 break-words leading-4">{msg.content}</p>
          </div>
        ))}
        {filteredMessages.length === 0 && (
          <div className="py-4 text-center text-[10px] text-muted-foreground">
            {chatMode === 'room' ? 'Room is quiet…' : `No messages within ${proximityRange} tiles`}
          </div>
        )}
      </div>

      {/* Input */}
      <form onSubmit={handleSend} className="border-t border-border px-3 py-2">
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          maxLength={2000}
          placeholder={chatMode === 'room' ? 'Room chat…' : `Proximity (${proximityRange} tiles)…`}
          className="w-full rounded-full border border-border bg-secondary px-3 py-1.5 text-xs text-foreground outline-none placeholder:text-muted-foreground focus:border-foreground/30"
        />
      </form>
    </div>
  );
}
