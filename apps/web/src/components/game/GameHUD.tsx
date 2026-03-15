'use client';

import { useState } from 'react';
import { useGameStore } from '@/lib/game-store';
import { getSocket } from '@/lib/socket';

interface NearbyUser {
  userId: string;
  displayName: string;
}

interface GameHUDProps {
  roomId: string;
  onLeave: () => void;
  connected: boolean;
  roomName: string;
  roomType: string;
  nearbyUsers: NearbyUser[];
  canJoinRoomCall: boolean;
  joinedRoomCall: boolean;
  onToggleRoomCall: () => void;
  onStartDirectCall: (userId: string) => void;
  activeDirectCallUserIds: string[];
}

function formatRoomType(roomType: string) {
  return roomType.replace(/-/g, ' ');
}

export function GameHUD({
  roomId,
  onLeave,
  connected,
  roomName,
  roomType,
  nearbyUsers,
  canJoinRoomCall,
  joinedRoomCall,
  onToggleRoomCall,
  onStartDirectCall,
  activeDirectCallUserIds,
}: GameHUDProps) {
  const {
    toggleChat,
    toggleVideo,
    players,
    connectedRooms,
    activeInteraction,
    seatedObjectId,
  } = useGameStore();
  const [showRoomsPanel, setShowRoomsPanel] = useState(false);
  const [showPeoplePanel, setShowPeoplePanel] = useState(false);

  function handleRoomSwitch(targetRoomId: string) {
    window.dispatchEvent(
      new CustomEvent('metaverse:teleport', {
        detail: { roomId: targetRoomId },
      })
    );
  }

  function handleStand() {
    getSocket()?.emit('player:stand');
    const localPlayer = useGameStore.getState().localPlayer;
    useGameStore.getState().setSeatedObjectId(null);
    if (localPlayer) {
      useGameStore.getState().setLocalPlayer({
        ...localPlayer,
        isSitting: false,
        seatedObjectId: undefined,
      });
    }
  }

  const otherRooms = connectedRooms.filter((room) => room._id !== roomId);

  return (
    <div className="pointer-events-none absolute inset-0 z-10 flex flex-col">
      {/* ─── Top Bar ─── */}
      <div className="flex flex-wrap items-center justify-between gap-1.5 p-2 sm:gap-2 sm:p-3">
        {/* Left cluster: room info */}
        <div className="pointer-events-auto flex flex-wrap items-center gap-1 sm:gap-2">
          <button
            onClick={onLeave}
            className="rounded-full border border-border bg-card/90 px-2.5 py-1.5 text-[10px] sm:text-xs text-foreground backdrop-blur-md transition hover:bg-secondary"
            title="Leave room"
          >
            ← Leave
          </button>
          <div className="flex items-center gap-1.5 rounded-full border border-border bg-card/90 px-2.5 py-1.5 backdrop-blur-md">
            <span className={`h-2 w-2 shrink-0 rounded-full ${connected ? 'bg-foreground' : 'bg-destructive'}`} />
            <span className="text-[10px] sm:text-xs font-medium text-foreground truncate max-w-[100px] sm:max-w-none">{roomName}</span>
            <span className="hidden sm:inline text-[10px] capitalize text-muted-foreground">· {formatRoomType(roomType)}</span>
          </div>
          <span className="rounded-full border border-border bg-card/90 px-2 py-1 text-[10px] text-foreground backdrop-blur-md">
            {players.size + 1}
          </span>
        </div>

        {/* Right cluster: action buttons */}
        <div className="pointer-events-auto flex flex-wrap items-center gap-1 sm:gap-1.5">
          <button
            onClick={toggleChat}
            className="rounded-full border border-border bg-card/90 p-2 sm:px-3 sm:py-1.5 text-xs text-foreground backdrop-blur-md transition hover:bg-secondary"
            title="Toggle chat"
          >
            💬
          </button>
          <button
            onClick={toggleVideo}
            className="rounded-full border border-border bg-card/90 p-2 sm:px-3 sm:py-1.5 text-xs text-foreground backdrop-blur-md transition hover:bg-secondary"
            title="Toggle video"
          >
            📹
          </button>
          {canJoinRoomCall && (
            <button
              onClick={onToggleRoomCall}
              className={`rounded-full border p-2 sm:px-3 sm:py-1.5 text-xs backdrop-blur-md transition ${
                joinedRoomCall
                  ? 'border-destructive/30 bg-destructive/20 text-foreground hover:bg-destructive/30'
                  : 'border-border bg-card/90 text-foreground hover:bg-secondary'
              }`}
            >
              📞
            </button>
          )}
          {seatedObjectId && (
            <button
              onClick={handleStand}
              className="rounded-full border border-border bg-foreground/15 p-2 sm:px-3 sm:py-1.5 text-[10px] sm:text-xs text-foreground backdrop-blur-md transition hover:bg-foreground/25"
            >
              Stand
            </button>
          )}
          {otherRooms.length > 0 && (
            <button
              onClick={() => { setShowRoomsPanel((v) => !v); setShowPeoplePanel(false); }}
              className={`rounded-full border p-2 sm:px-3 sm:py-1.5 text-xs backdrop-blur-md transition ${
                showRoomsPanel
                  ? 'border-foreground/30 bg-foreground/15 text-foreground'
                  : 'border-border bg-card/90 text-foreground hover:bg-secondary'
              }`}
            >
              🚪
            </button>
          )}
          <button
            onClick={() => { setShowPeoplePanel((v) => !v); setShowRoomsPanel(false); }}
            className={`rounded-full border p-2 sm:px-3 sm:py-1.5 text-xs backdrop-blur-md transition ${
              showPeoplePanel
                ? 'border-foreground/30 bg-foreground/15 text-foreground'
                : 'border-border bg-card/90 text-foreground hover:bg-secondary'
            }`}
          >
            👥{nearbyUsers.length > 0 ? ` ${nearbyUsers.length}` : ''}
          </button>
          </div>
        </div>

        {/* ─── Dropdown area — positioned right below the top bar ─── */}
        {showRoomsPanel && otherRooms.length > 0 && (
          <div className="pointer-events-auto ml-auto mr-2 z-30 w-52 sm:w-56 rounded-2xl border border-border bg-card/95 p-3 shadow-2xl backdrop-blur-xl">
            <p className="mb-2 text-[10px] uppercase tracking-widest text-muted-foreground">Teleport</p>
            <div className="space-y-1 max-h-48 overflow-y-auto">
              {otherRooms.map((room) => (
                <button
                  key={room._id}
                  onClick={() => { handleRoomSwitch(room._id); setShowRoomsPanel(false); }}
                  className="w-full rounded-xl border border-border bg-secondary px-3 py-2 text-left text-sm text-foreground transition hover:bg-foreground/10"
                >
                  {room.name}
                </button>
              ))}
            </div>
          </div>
        )}

        {showPeoplePanel && (
          <div className="pointer-events-auto ml-auto mr-2 z-30 w-56 sm:w-64 rounded-2xl border border-border bg-card/95 p-3 shadow-2xl backdrop-blur-xl">
            <p className="mb-2 text-[10px] uppercase tracking-widest text-muted-foreground">
              {canJoinRoomCall ? 'Nearby' : 'Call Targets'}
            </p>
            <div className="space-y-1 max-h-48 overflow-y-auto">
              {nearbyUsers.length === 0 ? (
                <p className="py-3 text-center text-xs text-muted-foreground">No one nearby</p>
              ) : (
                nearbyUsers.map((player) => {
                  const callLive = activeDirectCallUserIds.includes(player.userId);
                  return (
                    <div
                      key={player.userId}
                      className="flex items-center justify-between rounded-xl border border-border bg-secondary px-3 py-2"
                    >
                      <span className="text-sm text-foreground truncate max-w-[120px]">{player.displayName}</span>
                      {!canJoinRoomCall && (
                        <button
                          onClick={() => onStartDirectCall(player.userId)}
                          className={`shrink-0 rounded-full px-2.5 py-1 text-[10px] uppercase tracking-wide transition ${
                            callLive
                              ? 'bg-foreground/15 text-foreground'
                              : 'bg-background text-muted-foreground hover:bg-foreground/10 hover:text-foreground'
                          }`}
                        >
                          {callLive ? '● Live' : 'Call'}
                        </button>
                      )}
                    </div>
                  );
                })
              )}
            </div>
          </div>
        )}

      {/* ─── Interaction Toast (bottom-left) ─── */}
      {activeInteraction && (
        <div className="pointer-events-none absolute bottom-3 left-3 right-auto max-w-[min(calc(100%-6rem),16rem)] rounded-2xl border border-border bg-card/95 px-4 py-3 text-foreground shadow-2xl backdrop-blur-xl">
          <p className="text-[10px] uppercase tracking-widest text-muted-foreground">
            {activeInteraction.kind}
          </p>
          <h2 className="mt-1 text-base font-semibold">{activeInteraction.title}</h2>
          <p className="mt-1 text-xs leading-5 text-muted-foreground">{activeInteraction.body}</p>
          {seatedObjectId && (
            <p className="mt-2 text-[10px] text-muted-foreground">
              Press <span className="font-semibold text-foreground">Space</span> to stand
            </p>
          )}
        </div>
      )}
    </div>
  );
}
