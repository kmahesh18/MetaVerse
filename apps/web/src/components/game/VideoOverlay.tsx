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
  const [minimized, setMinimized] = useState(false);

  if (!isVideoOpen) return null;

  const hasStreams = localStream !== null || remoteTiles.length > 0;
  const totalTiles = (localStream ? 1 : 0) + remoteTiles.length;

  // Minimized pill
  if (minimized) {
    return (
      <button
        onClick={() => setMinimized(false)}
        className="pointer-events-auto absolute bottom-3 right-3 z-20 flex items-center gap-2 rounded-full border border-border bg-card/90 px-3 py-2 text-[10px] sm:text-xs text-foreground shadow-xl backdrop-blur-xl transition hover:bg-card"
      >
        📹 Video {totalTiles > 0 && <span className="rounded-full bg-foreground/15 px-1.5 text-[10px] text-foreground">{totalTiles}</span>}
      </button>
    );
  }

  return (
    <div
      className="pointer-events-auto absolute bottom-3 right-2 sm:right-3 z-20 flex flex-col rounded-2xl border border-border bg-card/90 text-foreground shadow-2xl backdrop-blur-xl"
      style={{
        width: 'min(20rem, calc(100vw - 1rem))',
        maxHeight: 'min(28rem, calc(100dvh - 6rem))',
      }}
    >
      {/* Header */}
      <div className="flex items-center justify-between border-b border-border px-3 py-2">
        <div className="min-w-0 flex-1">
          <p className="truncate text-xs font-medium text-foreground">{roomName}</p>
          <p className="text-[10px] text-muted-foreground">
            {joinedRoomCall ? `In call · ${totalTiles} stream${totalTiles !== 1 ? 's' : ''}` : 'Video calls'}
          </p>
        </div>
        <button
          onClick={() => setMinimized(true)}
          className="shrink-0 rounded-full bg-secondary px-2 py-0.5 text-[10px] text-foreground transition hover:bg-muted"
        >
          ─
        </button>
      </div>

      {/* Control bar */}
      <div className="flex items-center gap-1 border-b border-border px-3 py-2">
        <button
          onClick={onToggleRoomCall}
          className={`flex-1 rounded-full px-2 py-1.5 text-[10px] font-medium transition ${
            joinedRoomCall
              ? 'bg-destructive/20 text-foreground hover:bg-destructive/30'
              : 'bg-foreground/10 text-foreground hover:bg-foreground/20'
          }`}
        >
          {joinedRoomCall ? '📞 Leave Call' : '📞 Join Call'}
        </button>
        <button
          onClick={onToggleAudioMute}
          className={`rounded-full p-2 text-xs transition ${
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
          className={`rounded-full p-2 text-xs transition ${
            isVideoMuted
              ? 'bg-destructive/15 text-foreground'
              : 'bg-secondary text-foreground hover:bg-muted'
          }`}
          title={isVideoMuted ? 'Enable camera' : 'Disable camera'}
        >
          {isVideoMuted ? '📷' : '🎥'}
        </button>
      </div>

      {/* Status messages */}
      {mediaError && (
        <div className="px-3 py-2">
          <p className="rounded-lg bg-destructive/10 px-2 py-1.5 text-[10px] text-destructive">
            {mediaError}
          </p>
        </div>
      )}
      {isPreparingMedia && (
        <div className="px-3 py-2">
          <p className="text-[10px] text-muted-foreground">Requesting media access…</p>
        </div>
      )}

      {/* Video Tiles — scrollable grid */}
      <div className="overflow-y-auto px-2 py-2 space-y-2" style={{ maxHeight: 'calc(100% - 120px)' }}>
        {localStream && (
          <VideoTile
            title="You"
            stream={localStream}
            muted
          />
        )}
        {remoteTiles.map((tile) => (
          <VideoTile
            key={tile.userId}
            title={tile.displayName}
            subtitle={tile.mode === 'room' ? 'room' : 'direct'}
            stream={tile.stream}
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
            Join a call or start one from the 👥 People panel
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
  action,
}: {
  title: string;
  stream: MediaStream | null;
  subtitle?: string;
  muted?: boolean;
  action?: ReactNode;
}) {
  const videoRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    if (!videoRef.current) return;
    videoRef.current.srcObject = stream;
  }, [stream]);

  return (
    <div className="overflow-hidden rounded-xl border border-border bg-card/90 shadow-lg backdrop-blur-xl">
      <div className="relative bg-card aspect-video">
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
