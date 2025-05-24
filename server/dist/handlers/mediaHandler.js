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
const setup_1 = require("../mediasoup/setup");
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
            listenIps: [{ ip: "0.0.0.0", announcedIp: "192.168.1.100" }],
            enableTcp: true,
            enableUdp: true,
            preferUdp: true,
            enableSctp: true,
            numSctpStreams: { OS: 1024, MIS: 1024 },
        });
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
//makes a data stream for the client to send data using the transports created earlier
function produceData(client, message) {
    return __awaiter(this, void 0, void 0, function* () {
        try {
            console.log("produce data reached");
            if (!client.userId || !client.roomId) {
                return client.sendToSelf({
                    type: "error",
                    payload: "Must be authenticated and in a room first",
                });
            }
            //get req info
            const { transportId, sctpStreamParameters, label, protocol } = message.payload;
            const msRoom = state_1.roomsById.get(client.roomId);
            const transport = msRoom.allTransportsById.get(transportId);
            if (!transport) {
                return client.sendToSelf({
                    type: "error",
                    payload: "Transport not found",
                });
            }
            const dataProducer = yield transport.produceData({
                sctpStreamParameters,
                label,
                protocol,
            });
            msRoom.dataProducers.set(dataProducer.id, dataProducer);
            client.sendToSelf({
                type: "dataProduced",
                payload: { dataProducerId: dataProducer.id },
            });
            // Notify all other clients to consume this producer
            msRoom.clients.forEach((otherClient) => {
                if (otherClient.id !== client.id) {
                    consumeData(otherClient, {
                        payload: { producerId: dataProducer.id, transportId },
                    });
                }
            });
            console.log("produce data completed");
        }
        catch (error) {
            console.log("error at produceData func:", error);
        }
    });
}
//makes a data stream for the client to recv data using the transports created earlier
function consumeData(client, message) {
    return __awaiter(this, void 0, void 0, function* () {
        console.log("consume data reached by ", client.id);
        if (!client.userId || !client.roomId) {
            return client.sendToSelf({
                type: "error",
                payload: "Must be authenticated and in a room first",
            });
        }
        //get req info
        const { producerId, transportId } = message.payload;
        const msRoom = state_1.roomsById.get(client.roomId);
        const transport = msRoom.allTransportsById.get(transportId);
        const producer = msRoom.dataProducers.get(producerId);
        if (!transport || !producer) {
            return client.sendToSelf({
                type: "error",
                payload: "Transport or producer not found",
            });
        }
        const dataConsumer = yield transport.consumeData({
            dataProducerId: producerId,
        });
        // initialize array if needed
        if (!msRoom.dataConsumers.has(client.id)) {
            msRoom.dataConsumers.set(client.id, []);
        }
        msRoom.dataConsumers.get(client.id).push(dataConsumer);
        console.log("conssumer created with id", dataConsumer.id);
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
