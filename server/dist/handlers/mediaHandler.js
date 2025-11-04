"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.createWebRtcTransport = createWebRtcTransport;
exports.connectWebRtcTransport = connectWebRtcTransport;
exports.produceData = produceData;
exports.consumeData = consumeData;
exports.produceMedia = produceMedia;
exports.consumeMedia = consumeMedia;
exports.restartIce = restartIce;
const setup_1 = require("../mediasoup/setup");
const userService_1 = require("../services/userService");
const state_1 = require("../state/state");
/**
 * Get announced IP for WebRTC transport
 * For development: 127.0.0.1
 * For production: Should be set via ANNOUNCED_IP env variable
 */
function getAnnouncedIp() {
    if (process.env.ANNOUNCED_IP) {
        return process.env.ANNOUNCED_IP;
    }
    // Development fallback
    const isDevelopment = process.env.NODE_ENV !== 'production';
    return isDevelopment ? '127.0.0.1' : '0.0.0.0';
}
//gotta call it twice in frontend for each client one for recv transport and the other for send transport
function createWebRtcTransport(client, msg) {
    return __awaiter(this, void 0, void 0, function* () {
        console.log(`🚀 Creating WebRTC transport for user: ${client.userId}, type: ${msg.type}`);
        if (!client.userId || !client.roomId) {
            return client.sendToSelf({
                type: "error",
                payload: "Must be authenticated and in a room first",
            });
        }
        const msRoom = state_1.roomsById.get(client.roomId);
        const transport = yield setup_1.mediasoupRouter.createWebRtcTransport({
            listenIps: [
                {
                    ip: "0.0.0.0",
                    announcedIp: getAnnouncedIp(),
                },
            ],
            enableTcp: true,
            enableUdp: true,
            preferUdp: true,
            enableSctp: true,
            numSctpStreams: { OS: 1024, MIS: 1024 },
            // Additional settings for better connectivity
            initialAvailableOutgoingBitrate: 1000000,
            maxSctpMessageSize: 262144,
        });
        // ✅ ENABLE: Server-side transport monitoring
        transport.on("icestatechange", (iceState) => {
            console.log(`🧊 Transport ${transport.id.substr(0, 8)} (${client.userId}) ICE state: ${iceState}`);
            // Notify client of ICE state changes
            client.sendToSelf({
                type: "transportIceStateChange",
                payload: { transportId: transport.id, iceState },
            });
        });
        transport.on("iceselectedtuplechange", (iceSelectedTuple) => {
            console.log(`🎯 Transport ${transport.id.substr(0, 8)} ICE selected tuple:`, iceSelectedTuple);
        });
        transport.on("dtlsstatechange", (dtlsState) => {
            console.log(`🔒 Transport ${transport.id.substr(0, 8)} (${client.userId}) DTLS state: ${dtlsState}`);
            // Notify client of DTLS state changes
            client.sendToSelf({
                type: "transportDtlsStateChange",
                payload: { transportId: transport.id, dtlsState },
            });
        });
        transport.on("sctpstatechange", (sctpState) => {
            console.log(`📦 Transport ${transport.id.substr(0, 8)} (${client.userId}) SCTP state: ${sctpState}`);
        });
        msRoom.allTransportsById.set(transport.id, transport);
        console.log(`✅ WebRTC transport created: ${transport.id.substr(0, 8)} for user ${client.userId}`);
        const common = {
            id: transport.id,
            iceCandidates: transport.iceCandidates,
            iceParameters: transport.iceParameters,
            dtlsParameters: transport.dtlsParameters,
            sctpParameters: transport.sctpParameters,
        };
        if (msg.type === "createWebRtcTransportSend") {
            console.log(`📤 Sending Send Transport params to ${client.userId}`);
            client.sendToSelf({
                type: "SendWebRtcTransportCreated",
                payload: common,
            });
        }
        else {
            console.log(`📥 Sending Recv Transport params to ${client.userId}`);
            client.sendToSelf({
                type: "RecvWebRtcTransportCreated",
                payload: common,
            });
        }
    });
}
//the device makes the dtls handshake in this method  kinda like fingerprint for the device connecting to complete the connection
function connectWebRtcTransport(client, message) {
    return __awaiter(this, void 0, void 0, function* () {
        console.log(`🔗 Connecting WebRTC transport for user: ${client.userId}`);
        if (!client.userId || !client.roomId) {
            return client.sendToSelf({
                type: "error",
                payload: "Must be authenticated and in a room first",
            });
        }
        const { transportId, dtlsParameters } = message.payload;
        const msRoom = state_1.roomsById.get(client.roomId);
        const transport = msRoom.allTransportsById.get(transportId);
        if (!transport) {
            console.error(`❌ Transport not found: ${transportId} for user ${client.userId}`);
            return client.sendToSelf({
                type: "error",
                payload: "Transport not found",
            });
        }
        try {
            yield transport.connect({ dtlsParameters });
            console.log(`✅ WebRTC transport connected: ${transportId.substr(0, 8)} for user ${client.userId}`);
            client.sendToSelf({
                type: "webRtcTransportConnected",
                payload: { transportId },
            });
        }
        catch (error) {
            console.error(`❌ Failed to connect transport ${transportId}:`, error);
            client.sendToSelf({
                type: "error",
                payload: "Failed to connect transport",
            });
        }
    });
}
//<----------------------------------Player sync------------------------------->
//makes a data stream for the client to send data using the transports created earlier
function produceData(client, message) {
    return __awaiter(this, void 0, void 0, function* () {
        try {
            console.log(`📊 ProduceData request from user: ${client.userId}`);
            if (!client.userId || !client.roomId) {
                return client.sendToSelf({
                    type: "error",
                    payload: "Must be authenticated and in a room first",
                });
            }
            const { transportId, sctpStreamParameters, label, protocol } = message.payload;
            const msRoom = state_1.roomsById.get(client.roomId);
            const transport = msRoom.allTransportsById.get(transportId);
            if (!transport) {
                console.error(`❌ Transport not found: ${transportId}`);
                return client.sendToSelf({
                    type: "error",
                    payload: "Transport not found",
                });
            }
            // Check if user already has a data producer
            const existingProducer = msRoom.dataProducers.get(client.userId);
            if (existingProducer && !existingProducer.closed) {
                console.log(`♻️  User ${client.userId} already has DataProducer, reusing: ${existingProducer.id.substr(0, 8)}`);
                return client.sendToSelf({
                    type: "dataProduced",
                    payload: { dataProducerId: existingProducer.id },
                });
            }
            const dataProducer = yield transport.produceData({
                sctpStreamParameters,
                label,
                protocol,
                appData: { clientId: client.userId },
            });
            console.log(`✅ DataProducer created: ${dataProducer.id.substr(0, 8)} for user ${client.userId}`);
            // Monitor DataProducer lifecycle
            dataProducer.on('transportclose', () => {
                console.log(`🚪 DataProducer ${dataProducer.id.substr(0, 8)} transport closed`);
                if (client.userId) {
                    msRoom.dataProducers.delete(client.userId);
                }
            });
            msRoom.dataProducers.set(client.userId, dataProducer);
            client.sendToSelf({
                type: "dataProduced",
                payload: { dataProducerId: dataProducer.id },
            });
            const avatarName = yield (0, userService_1.getUserAvatarName)(client.userId);
            // Notify all other clients in the room about the new data producer
            console.log(`📢 Notifying ${msRoom.clients.size - 1} other clients about new DataProducer`);
            msRoom.clients.forEach((otherClient) => {
                if (otherClient.userId !== client.userId) {
                    console.log(`  → Sending newDataProducer to ${otherClient.userId}`);
                    otherClient.sendToSelf({
                        type: "newDataProducer",
                        payload: {
                            producerId: dataProducer.id,
                            userId: client.userId,
                            avatarName: avatarName,
                        },
                    });
                }
            });
            //for the new player to consume old player's data
            const existingProducers = msRoom.dataProducers;
            console.log(`📥 Sending ${existingProducers.size - 1} existing DataProducers to new user`);
            for (const [clientId, dataProducer] of existingProducers) {
                if (clientId === client.userId) {
                    continue;
                }
                const otherClient = msRoom.getClient(clientId);
                if (!(otherClient === null || otherClient === void 0 ? void 0 : otherClient.userId)) {
                    console.warn(`⚠️  Client ${clientId} has no valid userId`);
                    continue;
                }
                const avatarName = (yield (0, userService_1.getUserAvatarName)(otherClient.userId));
                console.log(`  → Sending existing DataProducer ${dataProducer.id.substr(0, 8)} (${otherClient.userId}) to ${client.userId}`);
                client.sendToSelf({
                    type: "newDataProducer",
                    payload: {
                        producerId: dataProducer.id,
                        userId: otherClient.userId,
                        avatarName: avatarName,
                    },
                });
            }
        }
        catch (error) {
            console.error("❌ Error at produceData function:", error);
            client.sendToSelf({
                type: "error",
                payload: "Failed to produce data channel",
            });
        }
    });
}
//makes a data stream for the client to recv data using the transports created earlier
function consumeData(client, message) {
    return __awaiter(this, void 0, void 0, function* () {
        var _a;
        console.log(`📊 ConsumeData request from ${client.userId} for producer ${(_a = message.payload.producerId) === null || _a === void 0 ? void 0 : _a.substr(0, 8)}`);
        const { producerId, transportId } = message.payload;
        if (!client.roomId) {
            console.error("❌ User not in room");
            return client.sendToSelf({
                type: "error",
                payload: "User not in room",
            });
        }
        if (!client.userId) {
            console.error("❌ UserId not found");
            return client.sendToSelf({
                type: "error",
                payload: "UserId not found",
            });
        }
        const msRoom = state_1.roomsById.get(client.roomId);
        const transport = msRoom.allTransportsById.get(transportId);
        // find the DataProducer whose .id matches producerId
        const producer = Array.from(msRoom.dataProducers.values()).find((dp) => dp.id === producerId);
        if (!transport || !producer) {
            console.error(`❌ Transport or producer not found. Transport: ${!!transport}, Producer: ${!!producer}`);
            return client.sendToSelf({
                type: "error",
                payload: "Transport or producer not found",
            });
        }
        try {
            const dataConsumer = yield transport.consumeData({
                dataProducerId: producer.id,
            });
            console.log(`✅ DataConsumer created: ${dataConsumer.id.substr(0, 8)} for user ${client.userId}`);
            // Monitor DataConsumer lifecycle
            dataConsumer.on('transportclose', () => {
                console.log(`🚪 DataConsumer ${dataConsumer.id.substr(0, 8)} transport closed`);
            });
            if (!msRoom.dataConsumers.has(client.userId)) {
                msRoom.dataConsumers.set(client.userId, []);
            }
            msRoom.dataConsumers.get(client.userId).push(dataConsumer);
            client.sendToSelf({
                type: "dataConsumerCreated",
                payload: {
                    id: dataConsumer.id,
                    producerId: producer.id,
                    sctpStreamParameters: dataConsumer.sctpStreamParameters,
                    label: dataConsumer.label,
                    protocol: dataConsumer.protocol,
                },
            });
            console.log(`📥 User ${client.userId} now has ${msRoom.dataConsumers.get(client.userId).length} DataConsumers`);
        }
        catch (error) {
            console.error(`❌ Failed to consume data:`, error);
            client.sendToSelf({
                type: "error",
                payload: "Failed to consume data channel",
            });
        }
    });
}
//<----------------------------------Video/Audio Calls------------------------------->
//mediaproducer for video/audio calls - broadcasts to entire space
function produceMedia(client, msg) {
    return __awaiter(this, void 0, void 0, function* () {
        console.log(`🎥 ProduceMedia request from user: ${client.userId}, kind: ${msg.payload.kind}`);
        if (!client.userId || !client.roomId) {
            return client.sendToSelf({
                type: "error",
                payload: "Must be authenticated and in a room first",
            });
        }
        const { transportId, rtpParameters, kind } = msg.payload;
        const msRoom = state_1.roomsById.get(client.roomId);
        const transport = msRoom.allTransportsById.get(transportId);
        let producerId = "";
        if (!transport) {
            console.error(`❌ Transport not found: ${transportId}`);
            return client.sendToSelf({
                type: "error",
                payload: "Transport not found",
            });
        }
        // Check for existing producer - store separately by kind (audio/video)
        const producerKey = `${client.userId}-${kind}`;
        const existingProducers = Array.from(msRoom.mediaProducers.values()).filter((p) => p.appData.clientId === client.userId && p.kind === kind);
        if (existingProducers.length > 0 && !existingProducers[0].closed) {
            const existingProducer = existingProducers[0];
            console.log(`♻️  User ${client.userId} already has ${kind} MediaProducer, reusing: ${existingProducer.id.substr(0, 8)}`);
            producerId = existingProducer.id;
            return client.sendToSelf({
                type: "mediaProducerCreated",
                payload: { producerId: producerId, kind },
            });
        }
        try {
            const producer = yield transport.produce({
                rtpParameters,
                kind,
                appData: { clientId: client.userId, kind },
            });
            producerId = producer.id;
            console.log(`✅ ${kind} MediaProducer created: ${producer.id.substr(0, 8)} for user ${client.userId}`);
            // Monitor MediaProducer lifecycle
            producer.on('transportclose', () => {
                console.log(`🚪 ${kind} MediaProducer ${producer.id.substr(0, 8)} transport closed`);
                msRoom.mediaProducers.delete(producerKey);
            });
            producer.on('score', (score) => {
                console.log(`📊 ${kind} Producer ${producer.id.substr(0, 8)} score:`, score);
            });
            msRoom.mediaProducers.set(producerKey, producer);
            client.sendToSelf({
                type: "mediaProducerCreated",
                payload: { producerId: producerId, kind },
            });
            const avatarName = yield (0, userService_1.getUserAvatarName)(client.userId);
            // ✅ IMPORTANT: Broadcast to ALL users in the space (room)
            console.log(`📢 Broadcasting ${kind} MediaProducer to ${msRoom.clients.size - 1} users in space`);
            msRoom.clients.forEach((otherClient) => {
                if (otherClient.userId !== client.userId) {
                    console.log(`  → Notifying ${otherClient.userId} about ${client.userId}'s ${kind} stream`);
                    otherClient.sendToSelf({
                        type: "newMediaProducer",
                        payload: {
                            producerId: producerId,
                            userId: client.userId,
                            avatarName: avatarName,
                            kind: kind,
                        },
                    });
                }
            });
            // Send existing media producers to the new user
            console.log(`📥 Sending existing MediaProducers to ${client.userId}`);
            for (const [key, producer] of msRoom.mediaProducers) {
                if (key.startsWith(client.userId))
                    continue; // Skip own producers
                const producerClientId = producer.appData.clientId;
                const producerKind = producer.appData.kind;
                const otherClient = msRoom.getClient(producerClientId);
                if (otherClient === null || otherClient === void 0 ? void 0 : otherClient.userId) {
                    const avatarName = yield (0, userService_1.getUserAvatarName)(otherClient.userId);
                    console.log(`  → Sending existing ${producerKind} producer from ${otherClient.userId}`);
                    client.sendToSelf({
                        type: "newMediaProducer",
                        payload: {
                            producerId: producer.id,
                            userId: otherClient.userId,
                            avatarName: avatarName,
                            kind: producerKind,
                        },
                    });
                }
            }
        }
        catch (error) {
            console.error(`❌ Failed to produce ${kind}:`, error);
            client.sendToSelf({
                type: "error",
                payload: `Failed to produce ${kind}`,
            });
        }
    });
}
function consumeMedia(client, msg) {
    return __awaiter(this, void 0, void 0, function* () {
        var _a;
        console.log(`🎥 ConsumeMedia request from ${client.userId} for producer ${(_a = msg.payload.producerId) === null || _a === void 0 ? void 0 : _a.substr(0, 8)}`);
        const { producerId, transportId, rtpCapabilities, userId, avatarName } = msg.payload;
        if (!client.roomId) {
            console.error("❌ User not in room");
            return client.sendToSelf({
                type: "error",
                payload: "User not in room",
            });
        }
        if (!client.userId) {
            console.error("❌ UserId not found");
            return client.sendToSelf({
                type: "error",
                payload: "UserId not found",
            });
        }
        const msRoom = state_1.roomsById.get(client.roomId);
        const transport = msRoom.allTransportsById.get(transportId);
        // find the mediaProducer whose .id matches producerId
        const producer = Array.from(msRoom.mediaProducers.values()).find((dp) => dp.id === producerId);
        if (!transport || !producer) {
            console.error(`❌ Transport or producer not found. Transport: ${!!transport}, Producer: ${!!producer}`);
            return client.sendToSelf({
                type: "error",
                payload: "Transport or producer not found",
            });
        }
        // Check if router can consume this producer
        if (!setup_1.mediasoupRouter.canConsume({ producerId: producer.id, rtpCapabilities })) {
            console.error(`❌ Router cannot consume producer ${producerId}`);
            return client.sendToSelf({
                type: "error",
                payload: "Cannot consume this producer",
            });
        }
        try {
            const mediaConsumer = yield transport.consume({
                producerId: producer.id,
                rtpCapabilities: rtpCapabilities,
                paused: false, // Start unpaused for immediate playback
            });
            console.log(`✅ ${mediaConsumer.kind} MediaConsumer created: ${mediaConsumer.id.substr(0, 8)} for user ${client.userId}`);
            // Monitor MediaConsumer lifecycle
            mediaConsumer.on('transportclose', () => {
                console.log(`🚪 MediaConsumer ${mediaConsumer.id.substr(0, 8)} transport closed`);
            });
            mediaConsumer.on('producerclose', () => {
                console.log(`📴 MediaConsumer ${mediaConsumer.id.substr(0, 8)} producer closed`);
                // Notify client that producer closed
                client.sendToSelf({
                    type: "mediaProducerClosed",
                    payload: {
                        producerId: producer.id,
                        userId: userId,
                    },
                });
            });
            mediaConsumer.on('score', (score) => {
                // console.log(`📊 ${mediaConsumer.kind} Consumer ${mediaConsumer.id.substr(0, 8)} score:`, score);
            });
            if (!msRoom.mediaConsumers.has(client.userId)) {
                msRoom.mediaConsumers.set(client.userId, []);
            }
            msRoom.mediaConsumers.get(client.userId).push(mediaConsumer);
            client.sendToSelf({
                type: "mediaConsumerCreated",
                payload: {
                    id: mediaConsumer.id,
                    producerId: producer.id,
                    userId: userId,
                    avatarName: avatarName,
                    kind: mediaConsumer.kind,
                    appData: mediaConsumer.appData,
                    rtpParameters: mediaConsumer.rtpParameters,
                },
            });
            console.log(`📥 User ${client.userId} now has ${msRoom.mediaConsumers.get(client.userId).length} MediaConsumers`);
        }
        catch (error) {
            console.error(`❌ Failed to consume media:`, error);
            client.sendToSelf({
                type: "error",
                payload: "Failed to consume media",
            });
        }
    });
}
//  Handle ICE restart requests
function restartIce(client, message) {
    return __awaiter(this, void 0, void 0, function* () {
        if (!client.userId || !client.roomId) {
            return client.sendToSelf({
                type: "error",
                payload: "Must be authenticated and in a room first",
            });
        }
        const { transportId } = message.payload;
        const msRoom = state_1.roomsById.get(client.roomId);
        const transport = msRoom.allTransportsById.get(transportId);
        if (!transport) {
            return client.sendToSelf({
                type: "error",
                payload: "Transport not found for ICE restart",
            });
        }
        try {
            // Restart ICE on server side
            yield transport.restartIce();
            // Send new ICE parameters back to client
            client.sendToSelf({
                type: "iceRestarted",
                payload: {
                    transportId: transport.id,
                    iceParameters: transport.iceParameters,
                },
            });
            console.log(`🔄 ICE restarted for transport ${transportId}`);
        }
        catch (error) {
            console.error(`❌ ICE restart failed for transport ${transportId}:`, error);
            client.sendToSelf({
                type: "error",
                payload: "ICE restart failed",
            });
        }
    });
}
