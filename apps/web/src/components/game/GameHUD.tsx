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
    <div className="pointer-events-none absolute inset-0 z-10">
      {/* ─── Top Bar ─── */}
      <div className="flex items-center justify-between gap-2 p-3">
        {/* Left cluster: room info */}
        <div className="pointer-events-auto flex items-center gap-2">
          <button
            onClick={onLeave}
            className="rounded-full border border-white/15 bg-black/50 px-3 py-1.5 text-xs text-white/85 backdrop-blur-md transition hover:bg-white/12"
            title="Leave room"
          >
            ← Leave
          </button>
          <div className="flex items-center gap-2 rounded-full border border-white/10 bg-black/50 px-3 py-1.5 backdrop-blur-md">
            <span className={`h-2 w-2 rounded-full ${connected ? 'bg-emerald-400' : 'bg-rose-400'}`} />
            <span className="text-xs font-medium text-white/90">{roomName}</span>
            <span className="text-[10px] capitalize text-white/50">· {formatRoomType(roomType)}</span>
          </div>
          <span className="rounded-full border border-white/10 bg-black/50 px-2.5 py-1.5 text-[10px] text-white/60 backdrop-blur-md">
            {players.size + 1} online
          </span>
        </div>

        {/* Right cluster: action buttons */}
        <div className="pointer-events-auto flex items-center gap-1.5">
          <button
            onClick={toggleChat}
            className="rounded-full border border-white/15 bg-black/50 px-3 py-1.5 text-xs text-white/85 backdrop-blur-md transition hover:bg-white/12"
            title="Toggle chat"
          >
            💬
          </button>
          <button
            onClick={toggleVideo}
            className="rounded-full border border-white/15 bg-black/50 px-3 py-1.5 text-xs text-white/85 backdrop-blur-md transition hover:bg-white/12"
            title="Toggle video"
          >
            📹
          </button>
          {canJoinRoomCall && (
            <button
              onClick={onToggleRoomCall}
              className={`rounded-full border px-3 py-1.5 text-xs backdrop-blur-md transition ${
                joinedRoomCall
                  ? 'border-rose-300/30 bg-rose-500/30 text-rose-50 hover:bg-rose-500/40'
                  : 'border-sky-200/20 bg-sky-500/25 text-sky-50 hover:bg-sky-500/35'
              }`}
            >
              {joinedRoomCall ? '📞 End' : '📞 Join'}
            </button>
          )}
          {seatedObjectId && (
            <button
              onClick={handleStand}
              className="rounded-full border border-amber-200/30 bg-amber-500/25 px-3 py-1.5 text-xs text-amber-50 backdrop-blur-md transition hover:bg-amber-500/35"
            >
              Stand Up
            </button>
          )}
          {otherRooms.length > 0 && (
            <button
              onClick={() => { setShowRoomsPanel((v) => !v); setShowPeoplePanel(false); }}
              className={`rounded-full border px-3 py-1.5 text-xs backdrop-blur-md transition ${
                showRoomsPanel
                  ? 'border-emerald-300/30 bg-emerald-500/25 text-emerald-50'
                  : 'border-white/15 bg-black/50 text-white/85 hover:bg-white/12'
              }`}
            >
              🚪 Rooms
            </button>
          )}
          <button
            onClick={() => { setShowPeoplePanel((v) => !v); setShowRoomsPanel(false); }}
            className={`rounded-full border px-3 py-1.5 text-xs backdrop-blur-md transition ${
              showPeoplePanel
                ? 'border-emerald-300/30 bg-emerald-500/25 text-emerald-50'
                : 'border-white/15 bg-black/50 text-white/85 hover:bg-white/12'
            }`}
          >
            👥 {nearbyUsers.length > 0 ? nearbyUsers.length : ''}
          </button>
        </div>
      </div>

      {/* ─── Rooms Dropdown ─── */}
      {showRoomsPanel && otherRooms.length > 0 && (
        <div className="pointer-events-auto absolute right-3 top-14 z-30 w-56 rounded-2xl border border-white/10 bg-black/80 p-3 shadow-2xl backdrop-blur-xl">
          <p className="mb-2 text-[10px] uppercase tracking-widest text-white/50">Teleport</p>
          <div className="space-y-1">
            {otherRooms.map((room) => (
              <button
                key={room._id}
                onClick={() => { handleRoomSwitch(room._id); setShowRoomsPanel(false); }}
                className="w-full rounded-xl border border-white/8 bg-white/5 px-3 py-2 text-left text-sm text-white/85 transition hover:bg-emerald-500/15"
              >
                {room.name}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* ─── People Dropdown ─── */}
      {showPeoplePanel && (
        <div className="pointer-events-auto absolute right-3 top-14 z-30 w-64 rounded-2xl border border-white/10 bg-black/80 p-3 shadow-2xl backdrop-blur-xl">
          <p className="mb-2 text-[10px] uppercase tracking-widest text-white/50">
            {canJoinRoomCall ? 'Nearby' : 'Call Targets'}
          </p>
          <div className="space-y-1">
            {nearbyUsers.length === 0 ? (
              <p className="py-3 text-center text-xs text-white/40">No one nearby</p>
            ) : (
              nearbyUsers.map((player) => {
                const callLive = activeDirectCallUserIds.includes(player.userId);
                return (
                  <div
                    key={player.userId}
                    className="flex items-center justify-between rounded-xl border border-white/8 bg-white/5 px-3 py-2"
                  >
                    <span className="text-sm text-white/85">{player.displayName}</span>
                    {!canJoinRoomCall && (
                      <button
                        onClick={() => onStartDirectCall(player.userId)}
                        className={`rounded-full px-2.5 py-1 text-[10px] uppercase tracking-wide transition ${
                          callLive
                            ? 'bg-emerald-500/25 text-emerald-50'
                            : 'bg-white/10 text-white/70 hover:bg-sky-500/20 hover:text-sky-50'
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
        <div className="pointer-events-none absolute bottom-4 left-4 max-w-xs rounded-2xl border border-white/10 bg-black/75 px-4 py-3 text-white shadow-2xl backdrop-blur-xl">
          <p className="text-[10px] uppercase tracking-widest text-amber-200/70">
            {activeInteraction.kind}
          </p>
          <h2 className="mt-1 text-base font-semibold">{activeInteraction.title}</h2>
          <p className="mt-1 text-xs leading-5 text-white/70">{activeInteraction.body}</p>
          {seatedObjectId && (
            <p className="mt-2 text-[10px] text-amber-100/60">
              Press <span className="font-semibold text-white">Space</span> to stand
            </p>
          )}
        </div>
      )}
    </div>
  );
}
