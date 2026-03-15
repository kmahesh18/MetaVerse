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
      expanded ? 'w-72 sm:w-80' : 'w-40 sm:w-48'
    }`}>
      {/* ─── Compact Header ─── */}
      <div className="pointer-events-auto m-2 rounded-2xl border border-border bg-card/90 p-2.5 shadow-2xl backdrop-blur-xl">
        <div className="flex items-center justify-between gap-2">
          <div className="min-w-0 flex-1">
            <p className="truncate text-xs font-medium text-foreground">{roomName}</p>
            <p className="text-[10px] text-muted-foreground">
              {joinedRoomCall ? 'In call' : canJoinRoomCall ? 'Room call available' : 'Direct calls'}
            </p>
          </div>
          <button
            onClick={() => setExpanded((v) => !v)}
            className="rounded-full bg-secondary px-2 py-1 text-[10px] text-foreground transition hover:bg-muted"
          >
            {expanded ? '▸' : '◂'}
          </button>
        </div>

        {/* Control buttons */}
        <div className="mt-2 flex flex-wrap gap-1">
          {canJoinRoomCall && (
            <button
              onClick={onToggleRoomCall}
              className={`flex-1 rounded-full px-2 py-1.5 text-[10px] transition ${
                joinedRoomCall
                  ? 'bg-destructive/20 text-foreground hover:bg-destructive/30'
                  : 'bg-foreground/10 text-foreground hover:bg-foreground/20'
              }`}
            >
              {joinedRoomCall ? 'Leave' : 'Join Call'}
            </button>
          )}
          <button
            onClick={onToggleAudioMute}
            className={`rounded-full px-2 py-1.5 text-[10px] transition ${
              isAudioMuted
                ? 'bg-destructive/15 text-foreground'
                : 'bg-secondary text-foreground hover:bg-muted'
            }`}
            title={isAudioMuted ? 'Unmute mic' : 'Mute mic'}
          >
            {isAudioMuted ? '🔇' : '🎤'}
          </button>
          <button
            onClick={onToggleVideoMute}
            className={`rounded-full px-2 py-1.5 text-[10px] transition ${
              isVideoMuted
                ? 'bg-destructive/15 text-foreground'
                : 'bg-secondary text-foreground hover:bg-muted'
            }`}
            title={isVideoMuted ? 'Enable camera' : 'Disable camera'}
          >
            {isVideoMuted ? '📷' : '🎥'}
          </button>
        </div>

        {mediaError && (
          <p className="mt-2 rounded-lg bg-destructive/10 px-2 py-1.5 text-[10px] text-destructive">
            {mediaError}
          </p>
        )}
        {isPreparingMedia && (
          <p className="mt-2 text-[10px] text-muted-foreground">Requesting media access…</p>
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
                  className="rounded-full bg-destructive/15 px-2 py-0.5 text-[9px] uppercase text-destructive transition hover:bg-destructive/25"
                >
                  End
                </button>
              ) : null
            }
          />
        ))}

        {!hasStreams && !mediaError && !isPreparingMedia && (
          <div className="rounded-2xl border border-dashed border-border bg-card/90 px-3 py-4 text-center text-[10px] text-muted-foreground">
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
    <div className="overflow-hidden rounded-2xl border border-border bg-card/90 shadow-xl backdrop-blur-xl">
      <div className={`relative bg-card ${compact ? 'aspect-[4/3]' : 'aspect-video'}`}>
        {stream ? (
          <video
            ref={videoRef}
            autoPlay
            playsInline
            muted={muted}
            className="h-full w-full object-cover"
          />
        ) : (
          <div className="flex h-full items-center justify-center text-[10px] text-muted-foreground">
            Waiting…
          </div>
        )}
      </div>
      <div className="flex items-center justify-between gap-2 px-2.5 py-1.5">
        <div className="min-w-0">
          <p className="truncate text-xs font-medium text-foreground">{title}</p>
          {subtitle && (
            <p className="text-[9px] uppercase tracking-wider text-muted-foreground">{subtitle}</p>
          )}
        </div>
        {action}
      </div>
    </div>
  );
}
