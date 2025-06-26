// mediaHandler.ts
import { Client } from "../classes/Client";
import { mediasoupRouter } from "../mediasoup/setup";
import { getUserAvatarName } from "../services/userService";
import { roomsById } from "../state/state";

//will need to call it twice in frontend for each client one for recv transport and the other for send transport
export async function createWebRtcTransport(client: Client, msg: any) {
	// console.log("Create webrtc transport reached");

	if (!client.userId || !client.roomId) {
		return client.sendToSelf({
			type: "error",
			payload: "Must be authenticated and in a room first",
		});
	}

	const msRoom = roomsById.get(client.roomId)!;

	const transport = await mediasoupRouter.createWebRtcTransport({
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
		// ❌ REMOVE: Custom ICE servers - this was causing the "stuck at connecting" issue
		// iceServers: [
		// 	{
		// 		urls: ["stun:stun.l.google.com:19302"],
		// 	},
		// ],
	});

	// // ✅ ENABLE: Server-side transport monitoring
	// transport.on("icestatechange", (iceState) => {
	// 	console.log(
	// 		`🧊 Transport ${transport.id} ICE state changed to: ${iceState}`
	// 	);

	// 	// Notify client of ICE state changes
	// 	client.sendToSelf({
	// 		type: "transportIceStateChange",
	// 		payload: { transportId: transport.id, iceState },
	// 	});
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

	// 	// Notify client of DTLS state changes
	// 	client.sendToSelf({
	// 		type: "transportDtlsStateChange",
	// 		payload: { transportId: transport.id, dtlsState },
	// 	});
	// });

	// transport.on("sctpstatechange", (sctpState) => {
	// 	console.log(
	// 		`📦 Transport ${transport.id} SCTP state changed to: ${sctpState}`
	// 	);
	// });

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

//<----------------------------------Player sync------------------------------->

//makes a data stream for the client to send data using the transports created earlier
export async function produceData(client: Client, message: any) {
	try {
		if (!client.userId || !client.roomId) {
			return client.sendToSelf({
				type: "error",
				payload: "Must be authenticated and in a room first",
			});
		}

		const { transportId, sctpStreamParameters, label, protocol } =
			message.payload;
		const msRoom = roomsById.get(client.roomId)!;
		const transport = msRoom.allTransportsById.get(transportId);

		if (!transport) {
			return client.sendToSelf({
				type: "error",
				payload: "Transport not found",
			});
		}

		const existingProducer = msRoom.dataProducers.get(client.userId);
		if (existingProducer) {
			return client.sendToSelf({
				type: "dataProduced",
				payload: { dataProducerId: existingProducer.id },
			});
		}

		const dataProducer = await transport.produceData({
			sctpStreamParameters,
			label,
			protocol,
			appData: { clientId: client.userId },
		});

		msRoom.dataProducers.set(client.userId, dataProducer);
		client.sendToSelf({
			type: "dataProduced",
			payload: { dataProducerId: dataProducer.id },
		});

		const avatarName = await getUserAvatarName(client.userId);

		console.log("data produced and the clients are:", msRoom.clients.keys());
		msRoom.clients.forEach((otherClient) => {
			if (otherClient.userId !== client.userId) {
				// console.log("called producer with data", client.userId, avatarName);
				console.log(`sent to ${otherClient.userId}`);
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

		//for the neww player to consume old player's data
		const existingProducers = msRoom.dataProducers;
		console.log("exisiting producerss");
		for (const [clientId, dataProducer] of existingProducers) {
			if (clientId == client.userId) {
				continue;
			}
			const otherClient = msRoom.getClient(clientId);
			if (!otherClient?.userId) {
				console.log(
					"otherclient doesnt have aa valid userId in join room function"
				);
				return;
			}
			const avatarName = (await getUserAvatarName(
				otherClient.userId
			)) as string;
			client.sendToSelf({
				type: "newDataProducer",
				payload: {
					producerId: dataProducer.id,
					userId: otherClient!.userId,
					avatarName: avatarName,
				},
			});
		}
	} catch (error) {
		console.log("error at produceData func:", error);
	}
}

//makes a data stream for the client to recv data using the transports created earlier
export async function consumeData(client: Client, message: any) {
	const { producerId, transportId } = message.payload;
	if (!client.roomId) {
		console.log("User not in room");
		return;
	}
	if (!client.userId) {
		console.log("UserId not found");
		return;
	}
	const msRoom = roomsById.get(client.roomId)!;
	const transport = msRoom.allTransportsById.get(transportId);

	// find the DataProducer whose .id matches producerId
	const producer = Array.from(msRoom.dataProducers.values()).find(
		(dp) => dp.id === producerId
	);

	if (!transport || !producer) {
		return client.sendToSelf({
			type: "error",
			payload: "Transport or producer not found",
		});
	}

	const dataConsumer = await transport.consumeData({
		dataProducerId: producer.id,
	});

	if (!msRoom.dataConsumers.has(client.userId)) {
		msRoom.dataConsumers.set(client.userId, []);
	}
	msRoom.dataConsumers.get(client.userId)!.push(dataConsumer);

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
}

//<----------------------------------Video Calls------------------------------->

//mediaproducer for video calls;
export async function produceMedia(client: Client, msg: any) {
	// console.log("reached produce media with details", msg);
	if (!client.userId || !client.roomId) {
		return client.sendToSelf({
			type: "error",
			payload: "Must be authenticated and in a room first",
		});
	}
	const { transportId, rtpParameters, kind } = msg.payload;
	const msRoom = roomsById.get(client.roomId)!;
	const transport = msRoom.allTransportsById.get(transportId);
  let producerId = "";
	
	if (!transport) {
		console.log("transport not found");
		return client.sendToSelf({
			type: "error",
			payload: "Transport not found",
		});
	}

	const existingProducer = msRoom.mediaProducers.get(client.userId);
  console.log(existingProducer);

  if (existingProducer) {
    console.log(
      `Client ${client.userId} already has meida producer ${existingProducer.id}`
    );
    producerId = existingProducer.id;
  }
  else {

    const producer = await transport.produce({
      rtpParameters,
      kind,
      appData: { clientId: client.userId },
    });
    producerId = producer.id;
    console.log("media producer created with details", producer.id);
    msRoom.mediaProducers.set(client.userId, producer);
  }
	client.sendToSelf({
		type: "mediaProducerCreated",
		payload: { producerId: producerId },
	});

	const avatarName = await getUserAvatarName(client.userId);
	msRoom.clients.forEach((otherClient) => {
		if (otherClient.userId !== client.userId) {
			console.log("called producer with data", client.userId, avatarName);
			otherClient.sendToSelf({
				type: "newMediaProducer",
				payload: {
					producerId: producerId,
					userId: client.userId,
					avatarName: avatarName,
				},
			});
		}
	});
}


export async function consumeMedia(client: Client, msg: any) {
  // console.log("reached consume media",msg)
	const { producerId, transportId,rtpCapabilities,userId,avatarName} = msg.payload;
	if (!client.roomId) {
		console.log("User not in room");
		return;
	}
	if (!client.userId) {
		console.log("UserId not found");
		return;
	}
	const msRoom = roomsById.get(client.roomId)!;
	const transport = msRoom.allTransportsById.get(transportId);

	// find the mediaProducer whose .id matches producerId
	const producer = Array.from(msRoom.mediaProducers.values()).find(
		(dp) => dp.id === producerId
	);

	if (!transport || !producer) {
		return client.sendToSelf({
			type: "error",
			payload: "Transport or producer not found",
		});
	}

	const mediaConsumer = await transport.consume({
		producerId: producer.id,
		rtpCapabilities:rtpCapabilities
	});

	if (!msRoom.mediaConsumers.has(client.userId)) {
		msRoom.mediaConsumers.set(client.userId, []);
	}
	msRoom.mediaConsumers.get(client.userId)!.push(mediaConsumer);

	client.sendToSelf({
		type: "mediaConsumerCreated",
		payload: {
			id: mediaConsumer.id,
			producerId: producer.id,
			userId:userId,
			avatarName:avatarName,
			kind: mediaConsumer.kind,
			appData: mediaConsumer.appData,
			rtpParameters: mediaConsumer.rtpParameters,
		},
	});
}







// ✅ NEW: Handle ICE restart requests
export async function restartIce(client: Client, message: any) {
	if (!client.userId || !client.roomId) {
		return client.sendToSelf({
			type: "error",
			payload: "Must be authenticated and in a room first",
		});
	}

	const { transportId } = message.payload;
	const msRoom = roomsById.get(client.roomId)!;
	const transport = msRoom.allTransportsById.get(transportId);

	if (!transport) {
		return client.sendToSelf({
			type: "error",
			payload: "Transport not found for ICE restart",
		});
	}

	try {
		// Restart ICE on server side
		await transport.restartIce();

		// Send new ICE parameters back to client
		client.sendToSelf({
			type: "iceRestarted",
			payload: {
				transportId: transport.id,
				iceParameters: transport.iceParameters,
			},
		});

		console.log(`🔄 ICE restarted for transport ${transportId}`);
	} catch (error) {
		console.error(`❌ ICE restart failed for transport ${transportId}:`, error);
		client.sendToSelf({
			type: "error",
			payload: "ICE restart failed",
		});
	}
}
