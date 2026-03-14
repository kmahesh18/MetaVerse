'use client';

import { useEffect, useRef, useState, type ReactNode } from 'react';
import { useGameStore } from '@/lib/game-store';
import type { RemoteMediaTile } from '@/lib/use-room-media';

interface VideoOverlayProps {
  roomName: string;
  canJoinRoomCall: boolean;
  joinedRoomCall: boolean;
  localStream: MediaStream | null;
  remoteTiles: RemoteMediaTile[];
  mediaError: string | null;
  isPreparingMedia: boolean;
  isAudioMuted: boolean;
  isVideoMuted: boolean;
  onToggleRoomCall: () => void;
  onToggleAudioMute: () => void;
  onToggleVideoMute: () => void;
  onEndDirectCall: (userId: string) => void;
}

export function VideoOverlay({
  roomName,
  canJoinRoomCall,
  joinedRoomCall,
  localStream,
  remoteTiles,
  mediaError,
  isPreparingMedia,
  isAudioMuted,
  isVideoMuted,
  onToggleRoomCall,
  onToggleAudioMute,
  onToggleVideoMute,
  onEndDirectCall,
}: VideoOverlayProps) {
  const isVideoOpen = useGameStore((s) => s.isVideoOpen);
  const [expanded, setExpanded] = useState(false);

  if (!isVideoOpen) return null;

  const hasStreams = localStream !== null || remoteTiles.length > 0;

  return (
    <div className={`absolute right-0 top-12 z-20 flex flex-col transition-all duration-300 ${
      expanded ? 'w-80' : 'w-48'
    }`}>
      {/* ─── Compact Header ─── */}
      <div className="pointer-events-auto m-2 rounded-2xl border border-white/10 bg-black/80 p-2.5 shadow-2xl backdrop-blur-xl">
        <div className="flex items-center justify-between gap-2">
          <div className="min-w-0 flex-1">
            <p className="truncate text-xs font-medium text-white/90">{roomName}</p>
            <p className="text-[10px] text-white/40">
              {joinedRoomCall ? 'In call' : canJoinRoomCall ? 'Room call available' : 'Direct calls'}
            </p>
          </div>
          <button
            onClick={() => setExpanded((v) => !v)}
            className="rounded-full bg-white/10 px-2 py-1 text-[10px] text-white/70 transition hover:bg-white/20"
          >
            {expanded ? '▸' : '◂'}
          </button>
        </div>

        {/* Control buttons */}
        <div className="mt-2 flex flex-wrap gap-1">
          {canJoinRoomCall && (
            <button
              onClick={onToggleRoomCall}
              className={`flex-1 rounded-full px-2 py-1 text-[10px] transition ${
                joinedRoomCall
                  ? 'bg-rose-500/30 text-rose-50 hover:bg-rose-500/40'
                  : 'bg-sky-500/25 text-sky-50 hover:bg-sky-500/35'
              }`}
            >
              {joinedRoomCall ? 'Leave' : 'Join Call'}
            </button>
          )}
          <button
            onClick={onToggleAudioMute}
            className={`rounded-full px-2 py-1 text-[10px] transition ${
              isAudioMuted
                ? 'bg-rose-500/25 text-rose-100'
                : 'bg-white/10 text-white/70 hover:bg-white/20'
            }`}
            title={isAudioMuted ? 'Unmute mic' : 'Mute mic'}
          >
            {isAudioMuted ? '🔇' : '🎤'}
          </button>
          <button
            onClick={onToggleVideoMute}
            className={`rounded-full px-2 py-1 text-[10px] transition ${
              isVideoMuted
                ? 'bg-rose-500/25 text-rose-100'
                : 'bg-white/10 text-white/70 hover:bg-white/20'
            }`}
            title={isVideoMuted ? 'Enable camera' : 'Disable camera'}
          >
            {isVideoMuted ? '📷' : '🎥'}
          </button>
        </div>

        {mediaError && (
          <p className="mt-2 rounded-lg bg-rose-500/15 px-2 py-1.5 text-[10px] text-rose-200">
            {mediaError}
          </p>
        )}
        {isPreparingMedia && (
          <p className="mt-2 text-[10px] text-white/50">Requesting media access…</p>
        )}
      </div>

      {/* ─── Video Tiles ─── */}
      <div className="pointer-events-auto mx-2 space-y-1.5 overflow-y-auto" style={{ maxHeight: 'calc(100vh - 200px)' }}>
        {localStream && (
          <VideoTile
            title="You"
            stream={localStream}
            muted
            compact={!expanded}
          />
        )}
        {remoteTiles.map((tile) => (
          <VideoTile
            key={tile.userId}
            title={tile.displayName}
            subtitle={tile.mode === 'room' ? 'room' : 'direct'}
            stream={tile.stream}
            compact={!expanded}
            action={
              tile.mode === 'direct' ? (
                <button
                  onClick={() => onEndDirectCall(tile.userId)}
                  className="rounded-full bg-rose-500/25 px-2 py-0.5 text-[9px] uppercase text-rose-100 transition hover:bg-rose-500/40"
                >
                  End
                </button>
              ) : null
            }
          />
        ))}

        {!hasStreams && !mediaError && !isPreparingMedia && (
          <div className="rounded-2xl border border-dashed border-white/10 bg-black/50 px-3 py-4 text-center text-[10px] text-white/40">
            Join a call or start one from the people panel
          </div>
        )}
      </div>
    </div>
  );
}

function VideoTile({
  title,
  stream,
  subtitle,
  muted = false,
  compact = false,
  action,
}: {
  title: string;
  stream: MediaStream | null;
  subtitle?: string;
  muted?: boolean;
  compact?: boolean;
  action?: ReactNode;
}) {
  const videoRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    if (!videoRef.current) return;
    videoRef.current.srcObject = stream;
  }, [stream]);

  return (
    <div className="overflow-hidden rounded-2xl border border-white/10 bg-black/80 shadow-xl backdrop-blur-xl">
      <div className={`relative bg-black/60 ${compact ? 'aspect-[4/3]' : 'aspect-video'}`}>
        {stream ? (
          <video
            ref={videoRef}
            autoPlay
            playsInline
            muted={muted}
            className="h-full w-full object-cover"
          />
        ) : (
          <div className="flex h-full items-center justify-center text-[10px] text-white/30">
            Waiting…
          </div>
        )}
      </div>
      <div className="flex items-center justify-between gap-2 px-2.5 py-1.5">
        <div className="min-w-0">
          <p className="truncate text-xs font-medium text-white/85">{title}</p>
          {subtitle && (
            <p className="text-[9px] uppercase tracking-wider text-white/40">{subtitle}</p>
          )}
        </div>
        {action}
      </div>
    </div>
  );
}
