// mediaHandler.ts
import { Client } from "../classes/Client";
import { mediasoupRouter } from "../mediasoup/setup";
import { roomsById } from "../state/state";

//will need to call it twice in frontend for each client one for recv transport and the other for send transport
export async function createWebRtcTransport(client: Client, msg: any) {
  console.log("Create webrtc transport reached");

  if (!client.userId || !client.roomId) {
    return client.sendToSelf({
      type: "error",
      payload: "Must be authenticated and in a room first",
    });
  }

  const msRoom = roomsById.get(client.roomId)!;
  const transport = await mediasoupRouter.createWebRtcTransport({
    listenIps: [{ ip: "0.0.0.0", announcedIp: "192.168.1.100"}],
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
  } else {
    client.sendToSelf({
      type: "RecvWebRtcTransportCreated",
      payload: common,
    });
  }
}

//the device makes the dtls handshake in this method  kinda like fingerprint for the device connecting to complete the connection
export async function connectWebRtcTransport(client: Client, message: any) {
  if (!client.userId || !client.roomId) {
    return client.sendToSelf({
      type: "error",
      payload: "Must be authenticated and in a room first",
    });
  }

  const { transportId, dtlsParameters } = message.payload;
  const msRoom = roomsById.get(client.roomId)!;
  const transport = msRoom.allTransportsById.get(transportId);

  if (!transport) {
    return client.sendToSelf({
      type: "error",
      payload: "Transport not found",
    });
  }

  await transport.connect({ dtlsParameters });

  client.sendToSelf({
    type: "webRtcTransportConnected",
    payload: { transportId },
  });
}

//makes a data stream for the client to send data using the transports created earlier
export async function produceData(client: Client, message: any) {
  try {
    console.log("produce data reached for client:", client.id);
    if (!client.userId || !client.roomId) {
      return client.sendToSelf({
        type: "error",
        payload: "Must be authenticated and in a room first",
      });
    }

    const { transportId, sctpStreamParameters, label, protocol } = message.payload;
    const msRoom = roomsById.get(client.roomId)!;
    const transport = msRoom.allTransportsById.get(transportId);

    if (!transport) {
      return client.sendToSelf({
        type: "error",
        payload: "Transport not found",
      });
    }

    // ✅ CHECK: Don't create duplicate DataProducers for same client
    const existingProducer = Array.from(msRoom.dataProducers.entries())
      .find(([id, producer]) => (producer as any).appData?.clientId === client.id);
    
    if (existingProducer) {
      console.log(`Client ${client.id} already has DataProducer ${existingProducer[0]}`);
      return client.sendToSelf({
        type: "dataProduced",
        payload: { dataProducerId: existingProducer[0] },
      });
    }

    const dataProducer = await transport.produceData({
      sctpStreamParameters,
      label,
      protocol,
      appData: { clientId: client.id } // ✅ ADD: Track which client owns this producer
    });

    msRoom.dataProducers.set(dataProducer.id, dataProducer);
    console.log(`Created DataProducer ${dataProducer.id} for client ${client.id}`);

    client.sendToSelf({
      type: "dataProduced",
      payload: { dataProducerId: dataProducer.id },
    });

    // ✅ ONLY notify other clients about NEW producer
    msRoom.clients.forEach((otherClient) => {
      if (otherClient.id !== client.id) {
        otherClient.sendToSelf({
          type: "newDataProducer",
          payload: { producerId: dataProducer.id }
        });
      }
    });

    console.log("produce data completed");
  } catch (error) {
    console.log("error at produceData func:", error);
  }
}

//makes a data stream for the client to recv data using the transports created earlier
export async function consumeData(client: Client, message: any) {
  console.log("consume data reached by ",client.id);
  if (!client.userId || !client.roomId) {
    return client.sendToSelf({
      type: "error",
      payload: "Must be authenticated and in a room first",
    });
  }

  //get req info
  const { producerId, transportId } = message.payload;
  const msRoom = roomsById.get(client.roomId)!;
  const transport = msRoom.allTransportsById.get(transportId);
  const producer = msRoom.dataProducers.get(producerId);

  if (!transport || !producer) {
    return client.sendToSelf({
      type: "error",
      payload: "Transport or producer not found",
    });
  }

  const dataConsumer = await transport.consumeData({
    dataProducerId: producerId,
  });

  // initialize array if needed
  if (!msRoom.dataConsumers.has(client.id)) {
    msRoom.dataConsumers.set(client.id, []);
  }
  msRoom.dataConsumers.get(client.id)!.push(dataConsumer);
  console.log("conssumer created with id",dataConsumer.id);
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
}
