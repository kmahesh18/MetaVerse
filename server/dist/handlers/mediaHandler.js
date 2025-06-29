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
const setup_1 = require("../mediasoup/setup");
const userService_1 = require("../services/userService");
const state_1 = require("../state/state");
//will need to call it twice in frontend for each client one for recv transport and the other for send transport
function createWebRtcTransport(client, msg) {
    return __awaiter(this, void 0, void 0, function* () {
        console.log("Create webrtc transport reached");
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
                    announcedIp: process.env.ANNOUNCED_IP || "127.0.0.1",
                },
            ],
            enableTcp: true,
            enableUdp: true,
            preferUdp: true,
            enableSctp: true,
            numSctpStreams: { OS: 1024, MIS: 1024 },
        });
        // Add server-side transport monitoring
        // transport.on("icestatechange", (iceState) => {
        // 	console.log(
        // 		`🧊 Transport ${transport.id} ICE state changed to: ${iceState}`
        // 	);
        // });
        // transport.on("iceselectedtuplechange", (iceSelectedTuple) => {
        // 	console.log(
        // 		`🎯 Transport ${transport.id} ICE selected tuple:`,
        // 		iceSelectedTuple
        // 	);
        // });
        // transport.on("dtlsstatechange", (dtlsState) => {
        // 	console.log(
        // 		`🔒 Transport ${transport.id} DTLS state changed to: ${dtlsState}`
        // 	);
        // });
        // transport.on("sctpstatechange", (sctpState) => {
        // 	console.log(
        // 		`📦 Transport ${transport.id} SCTP state changed to: ${sctpState}`
        // 	);
        // });
        // // Log transport details for debugging
        // console.log(`🚀 Created transport ${transport.id}`);
        // console.log(`📡 ICE candidates:`, transport.iceCandidates);
        // console.log(`🔧 ICE parameters:`, transport.iceParameters);
        // console.log(`🔒 DTLS parameters:`, transport.dtlsParameters);
        msRoom.allTransportsById.set(transport.id, transport);
        const common = {
            id: transport.id,
            iceCandidates: transport.iceCandidates,
            iceParameters: transport.iceParameters,
            dtlsParameters: transport.dtlsParameters,
            sctpParameters: transport.sctpParameters,
        };
        if (msg.type === "createWebRtcTransportSend") {
            client.sendToSelf({
                type: "SendWebRtcTransportCreated",
                payload: common,
            });
        }
        else {
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
            return client.sendToSelf({
                type: "error",
                payload: "Transport not found",
            });
        }
        yield transport.connect({ dtlsParameters });
        client.sendToSelf({
            type: "webRtcTransportConnected",
            payload: { transportId },
        });
    });
}
//<----------------------------------Player sync------------------------------->
//makes a data stream for the client to send data using the transports created earlier
function produceData(client, message) {
    return __awaiter(this, void 0, void 0, function* () {
        try {
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
                return client.sendToSelf({
                    type: "error",
                    payload: "Transport not found",
                });
            }
            const existingProducer = msRoom.dataProducers.get(client.userId);
            if (existingProducer) {
                console.log(`Client ${client.id} already has DataProducer ${existingProducer}`);
                return client.sendToSelf({
                    type: "dataProduced",
                    payload: { dataProducerId: existingProducer.id },
                });
            }
            const dataProducer = yield transport.produceData({
                sctpStreamParameters,
                label,
                protocol,
                appData: { clientId: client.id },
            });
            msRoom.dataProducers.set(client.userId, dataProducer);
            client.sendToSelf({
                type: "dataProduced",
                payload: { dataProducerId: dataProducer.id },
            });
            const avatarName = yield (0, userService_1.getUserAvatarName)(client.userId);
            msRoom.clients.forEach((otherClient) => {
                if (otherClient.id !== client.id) {
                    // console.log("called producer with data", client.userId, avatarName);
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
        }
        catch (error) {
            console.log("error at produceData func:", error);
        }
    });
}
//makes a data stream for the client to recv data using the transports created earlier
function consumeData(client, message) {
    return __awaiter(this, void 0, void 0, function* () {
        console.log("consume data mediahandler reached with details", client.userId, message);
        if (!client.userId || !client.roomId) {
            return client.sendToSelf({
                type: "error",
                payload: "Must be authenticated and in a room first",
            });
        }
        //get req info
        const { producerId, transportId } = message.payload;
        const msRoom = state_1.roomsById.get(client.roomId);
        console.log("producerId,transportId", producerId, transportId);
        console.log("error occured at consume data", msRoom.allTransportsById, msRoom.dataProducers);
        const transport = msRoom.allTransportsById.get(transportId);
        const producer = msRoom.dataProducers.get(client.userId);
        if (!transport || !producer) {
            return client.sendToSelf({
                type: "error",
                payload: "Transport or producer not found",
            });
        }
        const dataConsumer = yield transport.consumeData({
            dataProducerId: producer.id,
        });
        // initialize array if needed
        if (!msRoom.dataConsumers.has(client.id)) {
            msRoom.dataConsumers.set(client.id, []);
        }
        msRoom.dataConsumers.get(client.id).push(dataConsumer);
        // console.log("conssumer created with id", dataConsumer.id);
        client.sendToSelf({
            type: "dataConsumerCreated",
            payload: {
                producerId,
                id: dataConsumer.id,
                sctpStreamParameters: dataConsumer.sctpStreamParameters,
                label: dataConsumer.label,
                protocol: dataConsumer.protocol,
            },
        });
    });
}
//<----------------------------------Video Calls------------------------------->
//mediaproducer for video calls;
function produceMedia(client, msg) {
    return __awaiter(this, void 0, void 0, function* () {
        console.log("reached produce with details", msg);
        if (!client.userId || !client.roomId) {
            return client.sendToSelf({
                type: "error",
                payload: "Must be authenticated and in a room first",
            });
        }
        const { transportId, rtpParameters, kind } = msg.payload;
        const msRoom = state_1.roomsById.get(client.roomId);
        const transport = msRoom.allTransportsById.get(transportId);
        if (!transport) {
            console.log("transport not found");
            return client.sendToSelf({
                type: "error",
                payload: "Transport not found",
            });
        }
        const existingProducer = msRoom.mediaProducers.get(client.userId);
        if (existingProducer) {
            console.log(`Client ${client.id} already has DataProducer ${existingProducer.id}`);
            client.sendToSelf({
                type: "producer exists",
                payload: { dataProducerId: existingProducer.id },
            });
            return;
        }
        const producer = yield transport.produce({ rtpParameters, kind, appData: { clientId: client.userId } });
        console.log("producer created with details", producer.id);
        msRoom.mediaProducers.set(client.userId, producer);
        console.log(msRoom.mediaProducers.get(client.userId));
        client.sendToSelf({
            type: "producerCreated",
            payload: { producerId: producer.id },
        });
        const avatarName = yield (0, userService_1.getUserAvatarName)(client.userId);
        msRoom.clients.forEach((otherClient) => {
            if (otherClient.id !== client.id) {
                console.log("called producer with data", client.userId, avatarName);
                otherClient.sendToSelf({
                    type: "newProducer",
                    payload: {
                        producerId: producer.id,
                        userId: client.userId,
                        avatarName: avatarName,
                    },
                });
            }
        });
    });
}
