import React, { useEffect, useRef } from "react";
import { useParams } from "react-router-dom";
import { useAuth } from "@clerk/clerk-react";
import axios from "axios";
import { types, Device, detectDeviceAsync } from "mediasoup-client";
import { ChatInterface } from "../../components/ChatInterface";
const GameComponent: React.FC = () => {
  const containerRef = useRef<HTMLDivElement>(null);
  const gameRef = useRef<any>(null);
  const wsRef = useRef<WebSocket | null>(null);
  const isInit = useRef(false);
  const deviceRef = useRef<types.Device | null>(null);
  const { spaceId, roomId } = useParams<{ spaceId: string; roomId: string }>();
  const { userId } = useAuth();
  const clientIdRef = useRef<string | null>(null);
  const userid = userId ?? "";
  const sendTransportRef = useRef<types.Transport | null>(null);
  const recvTransportRef = useRef<types.Transport | null>(null);
  const producedataCallbackRef = useRef<any | null>(null);
  const dataProducerRef = useRef<types.DataProducer | null>(null);
  const roomSceneRef = useRef<any>(null);
  const dataConsumersRef = useRef<types.DataConsumer[]>([]);
  const phaserStartedRef = useRef(false);

  async function joinSpace() {
    if (!spaceId || !userid) return;
    try {
      await axios.post(`http://localhost:5001/api/spaces/${spaceId}/join`, {
        clerkId: userid,
      });
      console.log("Joined space:", spaceId);
    } catch (e) {
      console.error("Failed to join space", e);
    }
  }

  useEffect(() => {
    if (!spaceId || !roomId || !userid || isInit.current) return;
    isInit.current = true;

    (async () => {
      await joinSpace();

      const handlerName = await detectDeviceAsync();
      deviceRef.current = new Device({ handlerName });

      const protocol = window.location.protocol === "https:" ? "wss" : "ws";
      const wsUrl = `${protocol}://localhost:5001/ws?userId=${encodeURIComponent(userid)}`;
      const ws = new WebSocket(wsUrl);
      wsRef.current = ws;

      ws.onopen = () => {
        ws.send(JSON.stringify({ type: "joinRoom", payload: { roomId } }));
        ws.send(JSON.stringify({ type: "getRtpCapabilites" }));
      };

      ws.onmessage = async (e) => {
        const msg = JSON.parse(e.data);

        if (msg.type === "JoinedRoom") {
          clientIdRef.current = msg.payload.clientId;
        }

        if (msg.type === "GotRouterRtpCapabilities") {
          await deviceRef.current!.load({ routerRtpCapabilities: msg.payload });
          ws.send(JSON.stringify({ type: "createWebRtcTransportSend" }));
          ws.send(JSON.stringify({ type: "createWebRtcTransportRecv" }));
          return;
        }

        if (msg.type === "SendWebRtcTransportCreated") {
          const {
            id,
            iceParameters,
            iceCandidates,
            dtlsParameters,
            sctpParameters,
          } = msg.payload;

          sendTransportRef.current = deviceRef.current!.createSendTransport({
            id,
            iceParameters,
            iceCandidates,
            dtlsParameters,
            sctpParameters,
            iceServers: [{ urls: "stun:stun.l.google.com:19302" }],
          });

          sendTransportRef.current.on(
            "connect",
            ({ dtlsParameters }, callback) => {
              ws.send(
                JSON.stringify({
                  type: "connectWebRtcTransport",
                  payload: { transportId: id, dtlsParameters },
                }),
              );
              callback();
            },
          );

          sendTransportRef.current.on(
            "producedata",
            ({ sctpStreamParameters, label, protocol }, callback) => {
              producedataCallbackRef.current = callback;
              ws.send(
                JSON.stringify({
                  type: "produceData",
                  payload: {
                    transportId: id,
                    sctpStreamParameters,
                    label,
                    protocol,
                  },
                }),
              );
            },
          );

          // Auto-create DataProducer
          if (!dataProducerRef.current) {
            const streamId = Math.floor(Math.random() * 65535);
            dataProducerRef.current =
              await sendTransportRef.current.produceData({
                ordered: true,
                label: "player-sync",
                protocol: "json",
                sctpStreamParameters: {
                  streamId,
                  ordered: true,
                  maxPacketLifeTime: undefined,
                  maxRetransmits: undefined,
                },
              });
          }
        }

        if (msg.type === "dataProduced" && producedataCallbackRef.current) {
          producedataCallbackRef.current({ id: msg.payload.dataProducerId });
          producedataCallbackRef.current = null;
          console.log("DataProducer ready!");
        }

        if (msg.type === "RecvWebRtcTransportCreated") {
          const {
            id,
            iceParameters,
            iceCandidates,
            dtlsParameters,
            sctpParameters,
          } = msg.payload;

          recvTransportRef.current = deviceRef.current!.createRecvTransport({
            id,
            iceParameters,
            iceCandidates,
            dtlsParameters,
            sctpParameters,
            iceServers: [{ urls: "stun:stun.l.google.com:19302" }],
          });

          recvTransportRef.current.on(
            "connect",
            ({ dtlsParameters }, callback) => {
              ws.send(
                JSON.stringify({
                  type: "connectWebRtcTransport",
                  payload: { transportId: id, dtlsParameters },
                }),
              );
              callback();
            },
          );
        }

        // ✅ HANDLE: New DataProducers from other players
        if (msg.type === "newDataProducer") {
          const { producerId } = msg.payload;
          console.log("🆕 New DataProducer detected:", producerId);

          if (recvTransportRef.current) {
            ws.send(
              JSON.stringify({
                type: "consumeData",
                payload: {
                  producerId,
                  transportId: recvTransportRef.current.id,
                },
              }),
            );
          }

          // ✅ FORWARD TO SCENE: If scene exists, notify it
          if (
            roomSceneRef.current &&
            typeof roomSceneRef.current.handleNewDataProducer === "function"
          ) {
            roomSceneRef.current.handleNewDataProducer(msg);
          }
        }

        // ✅ HANDLE: DataConsumer creation
        if (msg.type === "dataConsumerCreated") {
          const { id, producerId, sctpStreamParameters, label, protocol } =
            msg.payload;
          console.log("🔗 Creating DataConsumer:", id);

          const dataConsumer = await recvTransportRef.current!.consumeData({
            id,
            dataProducerId: producerId,
            sctpStreamParameters,
            label,
            protocol,
          });

          dataConsumersRef.current.push(dataConsumer);
          console.log(
            `✅ DataConsumer created. Total: ${dataConsumersRef.current.length}`,
          );

          // ✅ FORWARD TO SCENE: Notify scene of new DataConsumer
          if (
            roomSceneRef.current &&
            typeof roomSceneRef.current.addDataConsumer === "function"
          ) {
            roomSceneRef.current.addDataConsumer(dataConsumer);
          }
        }

        // ✅ START PHASER: After WebRTC setup is complete
        if (msg.type === "webRtcTransportConnected") {
          setTimeout(async () => {
            if (!phaserStartedRef.current && dataProducerRef.current) {
              console.log("🚀 Starting Phaser game");
              phaserStartedRef.current = true;
              await createPhaserGame();
            }
          }, 1000);
        }

        console.log(msg);
      };

      async function createPhaserGame() {
        // ✅ METHOD 2: Use Phaser Events to get scene reference
        const [PhaserModule, roomModule] = await Promise.all([
          import("phaser"),
          import("../scenes/room"),
        ]);
        const Phaser = PhaserModule as typeof import("phaser");
        const { room: RoomScene } = roomModule;

        gameRef.current = new Phaser.Game({
          type: Phaser.AUTO,
          parent: containerRef.current!,
          width: window.innerWidth,
          height: window.innerHeight,
          backgroundColor: "#000",
          physics: { default: "arcade", arcade: { gravity: { x: 0, y: 0 } } },
        });

        // ✅ METHOD 2: Register scene without auto-start
        gameRef.current.scene.add("RoomScene", RoomScene, false);

        // ✅ METHOD 2: Listen for scene creation event
        gameRef.current.events.once("create-RoomScene", () => {
          roomSceneRef.current = gameRef.current!.scene.getScene("RoomScene");
          console.log("🏁 RoomScene reference acquired:", roomSceneRef.current);
        });

        // ✅ METHOD 2: Start scene with data
        const launchData = {
          clientId: clientIdRef.current!,
          RoomId: roomId,
          userId: userId,
          ws: wsRef.current!,
          sendTransport: sendTransportRef.current!,
          recvTransport: recvTransportRef.current!,
          dataConsumers: dataConsumersRef.current,
          dataProducer: dataProducerRef.current!,
        };

        gameRef.current.scene.start("RoomScene", launchData);
      }

      ws.onerror = (err) => {
        console.error("WS error:", err);
      };
    })();

    return () => {
      if (wsRef.current) {
        wsRef.current.send(
          JSON.stringify({ type: "leaveRoom", payload: { roomId } }),
        );
        wsRef.current.close();
      }
      if (gameRef.current) {
        gameRef.current.destroy(true);
      }
    };
  }, [spaceId, roomId, userid]);

  return (
    <>
      <div ref={containerRef} id="game-container">
        {wsRef.current && <ChatInterface ws={wsRef.current} userId={userid} />}
      </div>
    </>
  );
};

export default GameComponent;
