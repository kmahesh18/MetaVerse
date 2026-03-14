'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import type {
  MediaParticipant,
  RTCIceCandidateInit as SharedIceCandidateInit,
  RTCSessionDescriptionInit as SharedSessionDescriptionInit,
} from '@metaverse/shared';
import { getSocket } from './socket';
import { useGameStore } from './game-store';

export interface RemoteMediaTile {
  userId: string;
  displayName: string;
  stream: MediaStream;
  mode: 'room' | 'direct';
}

interface UseRoomMediaOptions {
  roomId: string;
  roomType: string;
  localUserId?: string;
  resolveDisplayName: (userId: string) => string;
}

import { api } from './api';

let rtcConfigPromise: Promise<RTCConfiguration> | null = null;

async function getRtcConfig(): Promise<RTCConfiguration> {
  if (rtcConfigPromise) return rtcConfigPromise;

  rtcConfigPromise = (async () => {
    const config: RTCConfiguration = {
      iceServers: [
        { urls: process.env.NEXT_PUBLIC_STUN_URL || 'stun:stun.l.google.com:19302' },
        { urls: 'stun:stun1.l.google.com:19302' },
        { urls: 'stun:stun2.l.google.com:19302' },
        { urls: 'stun:stun3.l.google.com:19302' },
        { urls: 'stun:stun4.l.google.com:19302' },
      ],
      iceCandidatePoolSize: 10,
    };

    try {
      const turnCreds = await api<{ urls: string[], username: string, credential: string }>('/turn-credentials');
      if (turnCreds && turnCreds.urls) {
        config.iceServers!.push(turnCreds);
        console.log('[webrtc] Fetched TURN credentials');
      }
    } catch (err) {
      console.warn('[webrtc] Failed to fetch TURN credentials, falling back to STUN only', err);
    }

    return config;
  })();

  return rtcConfigPromise;
}

function toSharedDescription(
  description: RTCSessionDescriptionInit
): SharedSessionDescriptionInit {
  return {
    type: description.type === 'offer' ? 'offer' : 'answer',
    sdp: description.sdp ?? undefined,
  };
}

function toSharedCandidate(candidate: RTCIceCandidate): SharedIceCandidateInit {
  return candidate.toJSON();
}

export function useRoomMedia({
  roomId,
  roomType,
  localUserId,
  resolveDisplayName,
}: UseRoomMediaOptions) {
  const socket = getSocket();
  const peersRef = useRef<Map<string, RTCPeerConnection>>(new Map());
  const remoteStreamsRef = useRef<Map<string, RemoteMediaTile>>(new Map());
  const directPeerIdsRef = useRef<Set<string>>(new Set());
  const roomPeerIdsRef = useRef<Set<string>>(new Set());
  const localStreamRef = useRef<MediaStream | null>(null);

  const [localStream, setLocalStream] = useState<MediaStream | null>(null);
  const [remoteTiles, setRemoteTiles] = useState<RemoteMediaTile[]>([]);
  const [roomParticipants, setRoomParticipants] = useState<MediaParticipant[]>([]);
  const [joinedRoomCall, setJoinedRoomCall] = useState(false);
  const [mediaError, setMediaError] = useState<string | null>(null);
  const [isPreparingMedia, setIsPreparingMedia] = useState(false);
  const [isAudioMuted, setIsAudioMuted] = useState(false);
  const [isVideoMuted, setIsVideoMuted] = useState(false);

  const canJoinRoomCall = roomType === 'meeting';

  const syncRemoteTiles = useCallback(() => {
    setRemoteTiles(Array.from(remoteStreamsRef.current.values()));
  }, []);

  const cleanupPeer = useCallback(
    (userId: string) => {
      peersRef.current.get(userId)?.close();
      peersRef.current.delete(userId);
      remoteStreamsRef.current.delete(userId);
      directPeerIdsRef.current.delete(userId);
      roomPeerIdsRef.current.delete(userId);
      syncRemoteTiles();
    },
    [syncRemoteTiles]
  );

  const ensureLocalStream = useCallback(async () => {
    if (localStreamRef.current) return localStreamRef.current;

    setIsPreparingMedia(true);
    setMediaError(null);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: true,
        video: true,
      });
      localStreamRef.current = stream;
      setLocalStream(stream);
      setIsAudioMuted(false);
      setIsVideoMuted(false);
      return stream;
    } catch (error) {
      setMediaError(error instanceof Error ? error.message : 'Unable to access camera and microphone');
      throw error;
    } finally {
      setIsPreparingMedia(false);
    }
  }, []);

  const createPeer = useCallback(
    async (userId: string, mode: 'room' | 'direct') => {
      const existing = peersRef.current.get(userId);
      if (existing) return existing;

      const config = await getRtcConfig();
      const peer = new RTCPeerConnection(config);
      peersRef.current.set(userId, peer);
      if (mode === 'room') {
        roomPeerIdsRef.current.add(userId);
      } else {
        directPeerIdsRef.current.add(userId);
      }

      peer.onicecandidate = (event) => {
        if (!event.candidate) return;
        getSocket()?.emit('webrtc:ice-candidate', {
          targetUserId: userId,
          candidate: toSharedCandidate(event.candidate),
        });
      };

      peer.ontrack = (event) => {
        const stream = remoteStreamsRef.current.get(userId)?.stream ?? new MediaStream();
        for (const track of event.streams[0]?.getTracks() ?? [event.track]) {
          if (!stream.getTracks().some((existingTrack) => existingTrack.id === track.id)) {
            stream.addTrack(track);
          }
        }
        remoteStreamsRef.current.set(userId, {
          userId,
          displayName: resolveDisplayName(userId),
          stream,
          mode,
        });
        syncRemoteTiles();
      };

      peer.onconnectionstatechange = () => {
        console.log(`[webrtc] peer ${userId} connection: ${peer.connectionState}`);
        if (peer.connectionState === 'failed' || peer.connectionState === 'closed') {
          cleanupPeer(userId);
        }
      };

      peer.oniceconnectionstatechange = () => {
        console.log(`[webrtc] peer ${userId} ICE: ${peer.iceConnectionState}`);
        if (peer.iceConnectionState === 'failed') {
          // Try ICE restart before giving up
          peer.restartIce();
        }
      };

      const stream = await ensureLocalStream();
      if (peer.getSenders().length === 0) {
        for (const track of stream.getTracks()) {
          peer.addTrack(track, stream);
        }
      }

      return peer;
    },
    [cleanupPeer, ensureLocalStream, resolveDisplayName, syncRemoteTiles]
  );

  const createOfferForPeer = useCallback(
    async (userId: string, mode: 'room' | 'direct') => {
      const peer = await createPeer(userId, mode);
      const offer = await peer.createOffer();
      await peer.setLocalDescription(offer);
      getSocket()?.emit('webrtc:offer', {
        targetUserId: userId,
        offer: toSharedDescription(offer),
      });
    },
    [createPeer]
  );

  const joinRoomCall = useCallback(async () => {
    if (!canJoinRoomCall) return;
    await ensureLocalStream();
    useGameStore.setState({ isVideoOpen: true });
    setJoinedRoomCall(true);
    getSocket()?.emit('media:room-join', { roomId });
  }, [canJoinRoomCall, ensureLocalStream, roomId]);

  const leaveRoomCall = useCallback(() => {
    getSocket()?.emit('media:room-leave', { roomId });
    setJoinedRoomCall(false);
    setRoomParticipants([]);
    for (const userId of Array.from(roomPeerIdsRef.current)) {
      if (!directPeerIdsRef.current.has(userId)) {
        cleanupPeer(userId);
      }
    }
    roomPeerIdsRef.current.clear();
  }, [cleanupPeer, roomId]);

  const startDirectCall = useCallback(
    async (userId: string) => {
      useGameStore.setState({ isVideoOpen: true });
      getSocket()?.emit('webrtc:call-start', { targetUserId: userId });
      await createOfferForPeer(userId, 'direct');
    },
    [createOfferForPeer]
  );

  const endDirectCall = useCallback((userId: string) => {
    getSocket()?.emit('webrtc:call-end', { targetUserId: userId });
    cleanupPeer(userId);
  }, [cleanupPeer]);

  const toggleAudioMute = useCallback(() => {
    const nextMuted = !isAudioMuted;
    localStreamRef.current?.getAudioTracks().forEach((track) => {
      track.enabled = !nextMuted;
    });
    setIsAudioMuted(nextMuted);
  }, [isAudioMuted]);

  const toggleVideoMute = useCallback(() => {
    const nextMuted = !isVideoMuted;
    localStreamRef.current?.getVideoTracks().forEach((track) => {
      track.enabled = !nextMuted;
    });
    setIsVideoMuted(nextMuted);
  }, [isVideoMuted]);

  useEffect(() => {
    if (!socket) return;

    const handleRoomParticipants = async ({
      roomId: joinedRoomId,
      participants,
    }: {
      roomId: string;
      participants: MediaParticipant[];
    }) => {
      if (joinedRoomId !== roomId) return;
      setRoomParticipants(participants);
      roomPeerIdsRef.current = new Set(
        participants.filter((participant) => participant.userId !== localUserId).map((participant) => participant.userId)
      );

      for (const participant of participants) {
        if (participant.userId === localUserId) continue;
        await createOfferForPeer(participant.userId, 'room');
      }
    };

    const handleParticipantJoined = ({
      roomId: activeRoomId,
      participant,
    }: {
      roomId: string;
      participant: MediaParticipant;
    }) => {
      if (activeRoomId !== roomId || participant.userId === localUserId) return;
      setRoomParticipants((current) => {
        const withoutExisting = current.filter((entry) => entry.userId !== participant.userId);
        return [...withoutExisting, participant];
      });
      roomPeerIdsRef.current.add(participant.userId);
    };

    const handleParticipantLeft = ({
      roomId: activeRoomId,
      userId,
    }: {
      roomId: string;
      userId: string;
    }) => {
      if (activeRoomId !== roomId) return;
      setRoomParticipants((current) => current.filter((participant) => participant.userId !== userId));
      if (!directPeerIdsRef.current.has(userId)) {
        cleanupPeer(userId);
      }
    };

    const handleOffer = async ({
      fromUserId,
      offer,
    }: {
      fromUserId: string;
      offer: RTCSessionDescriptionInit;
    }) => {
      try {
        useGameStore.setState({ isVideoOpen: true });
        const mode = roomPeerIdsRef.current.has(fromUserId) ? 'room' : 'direct';
        const peer = await createPeer(fromUserId, mode);
        await peer.setRemoteDescription(offer);
        const answer = await peer.createAnswer();
        await peer.setLocalDescription(answer);
        getSocket()?.emit('webrtc:answer', {
          targetUserId: fromUserId,
          answer: toSharedDescription(answer),
        });
      } catch (error) {
        setMediaError(error instanceof Error ? error.message : 'Failed to answer peer connection');
      }
    };

    const handleAnswer = async ({
      fromUserId,
      answer,
    }: {
      fromUserId: string;
      answer: RTCSessionDescriptionInit;
    }) => {
      const peer = peersRef.current.get(fromUserId);
      if (!peer) return;
      try {
        await peer.setRemoteDescription(answer);
      } catch (error) {
        setMediaError(error instanceof Error ? error.message : 'Failed to apply remote answer');
      }
    };

    const handleCandidate = async ({
      fromUserId,
      candidate,
    }: {
      fromUserId: string;
      candidate: RTCIceCandidateInit;
    }) => {
      const peer = peersRef.current.get(fromUserId);
      if (!peer || !candidate) return;
      try {
        await peer.addIceCandidate(candidate);
      } catch {
        // ignore late ICE after disconnect
      }
    };

    const handleCallStart = () => {
      useGameStore.setState({ isVideoOpen: true });
    };

    const handleCallEnd = ({ fromUserId }: { fromUserId: string }) => {
      cleanupPeer(fromUserId);
    };

    socket.on('media:room-participants', handleRoomParticipants);
    socket.on('media:participant-joined', handleParticipantJoined);
    socket.on('media:participant-left', handleParticipantLeft);
    socket.on('webrtc:offer', handleOffer);
    socket.on('webrtc:answer', handleAnswer);
    socket.on('webrtc:ice-candidate', handleCandidate);
    socket.on('webrtc:call-start', handleCallStart);
    socket.on('webrtc:call-end', handleCallEnd);

    return () => {
      socket.off('media:room-participants', handleRoomParticipants);
      socket.off('media:participant-joined', handleParticipantJoined);
      socket.off('media:participant-left', handleParticipantLeft);
      socket.off('webrtc:offer', handleOffer);
      socket.off('webrtc:answer', handleAnswer);
      socket.off('webrtc:ice-candidate', handleCandidate);
      socket.off('webrtc:call-start', handleCallStart);
      socket.off('webrtc:call-end', handleCallEnd);
    };
  }, [cleanupPeer, createOfferForPeer, createPeer, localUserId, roomId, socket]);

  useEffect(() => {
    const directPeerIds = directPeerIdsRef.current;
    const peers = peersRef.current;
    const remoteStreams = remoteStreamsRef.current;
    const roomPeerIds = roomPeerIdsRef.current;

    return () => {
      getSocket()?.emit('media:room-leave', { roomId });
      for (const userId of Array.from(directPeerIds)) {
        getSocket()?.emit('webrtc:call-end', { targetUserId: userId });
      }
      peers.forEach((peer) => peer.close());
      peers.clear();
      remoteStreams.clear();
      directPeerIds.clear();
      roomPeerIds.clear();
      if (localStreamRef.current) {
        localStreamRef.current.getTracks().forEach((track) => track.stop());
        localStreamRef.current = null;
      }
      setLocalStream(null);
      setRemoteTiles([]);
      setRoomParticipants([]);
      setJoinedRoomCall(false);
    };
  }, [roomId]);

  const directCallTargets = Array.from(directPeerIdsRef.current);

  return {
    canJoinRoomCall,
    localStream,
    remoteTiles,
    roomParticipants,
    joinedRoomCall,
    directCallTargets,
    mediaError,
    isPreparingMedia,
    isAudioMuted,
    isVideoMuted,
    joinRoomCall,
    leaveRoomCall,
    startDirectCall,
    endDirectCall,
    toggleAudioMute,
    toggleVideoMute,
  };
}
