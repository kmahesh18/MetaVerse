'use client';

import { useEffect, useRef, useState, useCallback, use } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/lib/auth-store';
import { useGameStore } from '@/lib/game-store';
import { connectSocket, getSocket } from '@/lib/socket';
import { api } from '@/lib/api';
import { AuthGuard } from '@/components/AuthGuard';
import { GameHUD } from '@/components/game/GameHUD';
import { ChatPanel } from '@/components/game/ChatPanel';
import { VideoOverlay } from '@/components/game/VideoOverlay';
import type { PlayerState, ChatMessagePayload } from '@metaverse/shared';
import { useRoomMedia } from '@/lib/use-room-media';

interface RoomWorldResponse {
  room: {
    _id: string;
    spaceId: string;
    name: string;
    description?: string;
    type: string;
    templateKey?: string;
    mapConfig: {
      width: number;
      height: number;
      tileSize: number;
      backgroundTileId: string;
      collisionMap: number[][];
      spawn?: {
        x: number;
        y: number;
      };
    };
  };
  objects: Array<{
    _id: string;
    roomId: string;
    position: { x: number; y: number };
    rotation: number;
    zIndex: number;
    isObstacle: boolean;
    isInteractive: boolean;
    interactionType: string;
    interactionData?: {
      content?: string;
      targetRoomId?: string;
      targetTemplateKey?: string;
      mediaUrl?: string;
    };
    asset: {
      slug: string;
      name: string;
      category?: string;
      dimensions?: { widthTiles: number; heightTiles: number };
      tags?: string[];
    } | null;
  }>;
  connectedRooms: Array<{
    _id: string;
    name: string;
    type: string;
    templateKey?: string;
    order: number;
  }>;
}

function GameContent({ params }: { params: Promise<{ roomId: string }> }) {
  const { roomId } = use(params);
  const router = useRouter();
  const { user, accessToken } = useAuthStore();
  const room = useGameStore((s) => s.room);
  const players = useGameStore((s) => s.players);
  const proximityUsers = useGameStore((s) => s.proximityUsers);
  const canvasRef = useRef<HTMLDivElement>(null);
  const gameRef = useRef<Phaser.Game | null>(null);
  const [connected, setConnected] = useState(false);
  const [worldLoading, setWorldLoading] = useState(true);

  const setupSocketListeners = useCallback(() => {
    const socket = getSocket();
    if (!socket) return () => {};

    const handleRoomPlayers = (players: PlayerState[]) => {
      const others = players.filter((p) => p.userId !== user?._id);
      useGameStore.getState().setPlayers(others);
      const me = players.find((p) => p.userId === user?._id);
      if (me) useGameStore.getState().setLocalPlayer(me);
    };

    const handlePlayerJoined = (player: PlayerState) => {
      if (player.userId !== user?._id) {
        useGameStore.getState().addPlayer(player);
      }
    };

    const handlePlayerLeft = ({ userId }: { userId: string }) => {
      useGameStore.getState().removePlayer(userId);
    };

    const handlePlayerMoved = ({
      userId,
      x,
      y,
      direction,
    }: {
      userId: string;
      x: number;
      y: number;
      direction: PlayerState['direction'];
    }) => {
      if (userId !== user?._id) {
        useGameStore.getState().updatePlayer(userId, { x, y, direction });
      }
    };

    const handlePlayerStopped = ({
      userId,
      x,
      y,
      direction,
    }: {
      userId: string;
      x: number;
      y: number;
      direction: PlayerState['direction'];
    }) => {
      if (userId !== user?._id) {
        useGameStore.getState().updatePlayer(userId, { x, y, direction });
      }
    };

    const handlePlayerSat = ({
      userId,
      objectId,
      direction,
    }: {
      userId: string;
      objectId: string;
      direction: PlayerState['direction'];
    }) => {
      if (userId !== user?._id) {
        useGameStore.getState().updatePlayer(userId, {
          isSitting: true,
          seatedObjectId: objectId,
          direction,
        });
      }
    };

    const handlePlayerStood = ({ userId }: { userId: string }) => {
      if (userId !== user?._id) {
        useGameStore.getState().updatePlayer(userId, {
          isSitting: false,
          seatedObjectId: undefined,
        });
      }
    };

    const handleChatMessage = (message: ChatMessagePayload) => {
      useGameStore.getState().addMessage(message);
    };

    const handleProximityEnter = ({ userId }: { userId: string }) => {
      useGameStore.getState().addProximityUser(userId);
    };

    const handleProximityLeave = ({ userId }: { userId: string }) => {
      useGameStore.getState().removeProximityUser(userId);
    };

    socket.on('room:players', handleRoomPlayers);
    socket.on('player:joined', handlePlayerJoined);
    socket.on('player:left', handlePlayerLeft);
    socket.on('player:moved', handlePlayerMoved);
    socket.on('player:stopped', handlePlayerStopped);
    socket.on('player:sat', handlePlayerSat);
    socket.on('player:stood', handlePlayerStood);
    socket.on('chat:message', handleChatMessage);
    socket.on('proximity:enter', handleProximityEnter);
    socket.on('proximity:leave', handleProximityLeave);

    return () => {
      socket.off('room:players', handleRoomPlayers);
      socket.off('player:joined', handlePlayerJoined);
      socket.off('player:left', handlePlayerLeft);
      socket.off('player:moved', handlePlayerMoved);
      socket.off('player:stopped', handlePlayerStopped);
      socket.off('player:sat', handlePlayerSat);
      socket.off('player:stood', handlePlayerStood);
      socket.off('chat:message', handleChatMessage);
      socket.off('proximity:enter', handleProximityEnter);
      socket.off('proximity:leave', handleProximityLeave);
    };
  }, [user?._id]);

  useEffect(() => {
    if (!accessToken) return;

    let cancelled = false;
    setWorldLoading(true);

    (async () => {
      try {
        const data = await api<RoomWorldResponse>(`/rooms/${roomId}/world`, {
          token: accessToken,
        });
        if (cancelled) return;
        useGameStore.getState().setWorld(data.room, data.objects, data.connectedRooms);
      } catch {
        if (!cancelled) {
          router.replace('/dashboard');
        }
      } finally {
        if (!cancelled) {
          setWorldLoading(false);
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [accessToken, roomId, router]);

  useEffect(() => {
    if (!accessToken || !user || worldLoading) return;

    const socket = connectSocket(accessToken);
    const handleConnect = () => {
      setConnected(true);
      socket.emit('room:join', { roomId });
    };
    const handleConnectError = async (err: Error) => {
      if (err.message === 'Invalid token' || err.message === 'Authentication required') {
        getSocket()?.disconnect();
        await useAuthStore.getState().refresh();
      }
    };
    const handleTeleport = (event: Event) => {
      const customEvent = event as CustomEvent<{ roomId?: string }>;
      const targetRoomId = customEvent.detail?.roomId;
      if (targetRoomId && targetRoomId !== roomId) {
        router.push(`/game/${targetRoomId}`);
      }
    };

    socket.on('connect', handleConnect);
    socket.on('connect_error', handleConnectError);
    const cleanupSocketListeners = setupSocketListeners();
    window.addEventListener('metaverse:teleport', handleTeleport as EventListener);

    if (socket.connected) {
      handleConnect();
    }

    return () => {
      socket.off('connect', handleConnect);
      socket.off('connect_error', handleConnectError);
      cleanupSocketListeners();
      socket.emit('room:leave', { roomId });
      window.removeEventListener('metaverse:teleport', handleTeleport as EventListener);
      useGameStore.getState().reset();
      setConnected(false);
    };
  }, [accessToken, user, roomId, worldLoading, router, setupSocketListeners]);

  // Initialize Phaser
  useEffect(() => {
    if (!canvasRef.current || !connected || worldLoading || gameRef.current) return;

    let game: Phaser.Game | null = null;

    (async () => {
      const { createPhaserGame } = await import('@/game/PhaserGame');
      if (!canvasRef.current) return;
      game = createPhaserGame(canvasRef.current, roomId);
      gameRef.current = game;
    })();

    return () => {
      if (game) {
        game.destroy(true);
        gameRef.current = null;
      }
    };
  }, [connected, roomId, worldLoading]);

  function handleLeave() {
    router.push('/dashboard');
  }

  const nearbyUsers = Array.from(proximityUsers)
    .map((userId) => {
      const player = players.get(userId);
      if (!player) return null;
      return { userId, displayName: player.displayName };
    })
    .filter((entry): entry is { userId: string; displayName: string } => Boolean(entry));

  const roomMedia = useRoomMedia({
    roomId,
    roomType: room?.type ?? 'office',
    localUserId: user?._id,
    resolveDisplayName: (userId) => players.get(userId)?.displayName ?? `Peer ${userId.slice(-4)}`,
  });

  if (worldLoading || !room) {
    return (
      <div className="flex h-screen w-screen items-center justify-center bg-[#111827]">
        <div className="rounded-3xl border border-white/10 bg-black/20 px-8 py-6 text-center text-white/80 shadow-2xl backdrop-blur">
          <div className="mx-auto mb-4 h-10 w-10 animate-spin rounded-full border-4 border-emerald-300/80 border-t-transparent" />
          <p className="text-sm uppercase tracking-[0.22em] text-emerald-200/70">Preparing Room</p>
          <p className="mt-2 text-lg font-semibold text-white">Loading the office world</p>
        </div>
      </div>
    );
  }

  return (
    <div className="relative h-screen w-screen overflow-hidden bg-[#0b0d17]">
      {/* Game Canvas */}
      <div ref={canvasRef} className="h-full w-full" />

      {/* HUD Overlay */}
      <GameHUD
        roomId={roomId}
        onLeave={handleLeave}
        connected={connected}
        roomName={room.name}
        roomType={room.type}
        nearbyUsers={nearbyUsers}
        canJoinRoomCall={roomMedia.canJoinRoomCall}
        joinedRoomCall={roomMedia.joinedRoomCall}
        onToggleRoomCall={() =>
          roomMedia.joinedRoomCall ? roomMedia.leaveRoomCall() : roomMedia.joinRoomCall()
        }
        onStartDirectCall={roomMedia.startDirectCall}
        activeDirectCallUserIds={roomMedia.directCallTargets}
      />

      {/* Chat Panel */}
      <ChatPanel roomId={roomId} />

      {/* Video Overlay */}
      <VideoOverlay
        roomName={room.name}
        canJoinRoomCall={roomMedia.canJoinRoomCall}
        joinedRoomCall={roomMedia.joinedRoomCall}
        localStream={roomMedia.localStream}
        remoteTiles={roomMedia.remoteTiles}
        mediaError={roomMedia.mediaError}
        isPreparingMedia={roomMedia.isPreparingMedia}
        isAudioMuted={roomMedia.isAudioMuted}
        isVideoMuted={roomMedia.isVideoMuted}
        onToggleRoomCall={() =>
          roomMedia.joinedRoomCall ? roomMedia.leaveRoomCall() : roomMedia.joinRoomCall()
        }
        onToggleAudioMute={roomMedia.toggleAudioMute}
        onToggleVideoMute={roomMedia.toggleVideoMute}
        onEndDirectCall={roomMedia.endDirectCall}
      />
    </div>
  );
}

export default function GamePage({ params }: { params: Promise<{ roomId: string }> }) {
  return (
    <AuthGuard>
      <GameContent params={params} />
    </AuthGuard>
  );
}
